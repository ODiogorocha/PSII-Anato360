"""Cliente OpenRouter para conversa e embeddings, sem dependência do Ollama."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

import requests

from .client import AIClientError, build_chat_messages
from .config import OpenRouterConfig

_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterClientError(AIClientError):
    """Erro de comunicação ou de formato de resposta do OpenRouter."""


class OpenRouterClient:
    def __init__(self, config: OpenRouterConfig | None = None):
        self.config = config or OpenRouterConfig()

    def _request(self, endpoint: str, payload: dict | None = None) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        try:
            if payload is None:
                # Duas consultas de status cabem no timeout de 15 s do frontend.
                response = requests.get(f"{_BASE_URL}/{endpoint}", headers=headers, timeout=(2, 3))
            else:
                response = requests.post(
                    f"{_BASE_URL}/{endpoint}", headers=headers, json=payload,
                    timeout=(min(3, self.config.request_timeout), self.config.request_timeout),
                )
        except requests.Timeout as exc:
            raise OpenRouterClientError("O OpenRouter excedeu o tempo de resposta. Tente novamente.") from exc
        except requests.RequestException as exc:
            raise OpenRouterClientError("Não foi possível conectar ao OpenRouter.") from exc
        if not response.ok:
            messages = {
                401: "Chave do OpenRouter inválida. Verifique OPENROUTER_API_KEY.",
                402: "Créditos insuficientes no OpenRouter. Verifique o saldo e o limite da chave.",
                403: "A chave do OpenRouter não tem permissão para esta solicitação.",
                404: "Modelo ou endpoint indisponível no OpenRouter. Verifique o modelo configurado.",
                429: "O OpenRouter atingiu o limite de solicitações. Tente novamente mais tarde.",
            }
            # Não propaga o corpo remoto nem credenciais para logs/respostas da API.
            message = messages.get(response.status_code, f"O OpenRouter não concluiu a solicitação (HTTP {response.status_code}).")
            raise OpenRouterClientError(
                message, retryable=response.status_code in {408, 429} or response.status_code >= 500,
            )
        try:
            data = response.json()
        except (ValueError, requests.RequestException) as exc:
            raise OpenRouterClientError("O OpenRouter retornou uma resposta JSON inválida.") from exc
        if not isinstance(data, dict) or data.get("error"):
            raise OpenRouterClientError("O OpenRouter retornou uma resposta inválida ou um erro de geração.")
        return data

    def chat_status(self) -> dict[str, Any]:
        """Verifica chave e catálogo sem executar inferência nem consumir tokens."""
        try:
            key = self._request("key")
            if not isinstance(key.get("data"), dict):
                return {"available": False, "status": "unavailable"}
            models = self._request("models").get("data")
            if not isinstance(models, list):
                return {"available": False, "status": "unavailable"}
            ready = any(isinstance(model, dict) and model.get("id") == self.config.llm_model for model in models)
            return {"available": ready, "status": "ready" if ready else "model_missing"}
        except OpenRouterClientError:
            return {"available": False, "status": "unavailable"}

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        *,
        history: Sequence[Mapping[str, str]] | None = None,
    ) -> str:
        data = self._request("chat/completions", {
            "model": self.config.llm_model,
            "messages": build_chat_messages(system_prompt, user_prompt, history),
            "stream": False,
            "temperature": temperature,
        })
        choices = data.get("choices")
        first = choices[0] if isinstance(choices, list) and choices else None
        message = first.get("message") if isinstance(first, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise OpenRouterClientError("O OpenRouter não retornou uma resposta de texto válida.")
        return content.strip()

    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        dimension = None
        for start in range(0, len(texts), 32):
            batch = texts[start:start + 32]
            data = self._request("embeddings", {
                "model": self.config.embedding_model, "input": batch, "encoding_format": "float",
            }).get("data")
            if not isinstance(data, list) or len(data) != len(batch):
                raise OpenRouterClientError("Quantidade inválida de embeddings retornados pelo OpenRouter.")
            indexed = {}
            for item in data:
                index = item.get("index") if isinstance(item, dict) else None
                if type(index) is not int or not 0 <= index < len(batch) or index in indexed:
                    raise OpenRouterClientError("Índice de embedding inválido retornado pelo OpenRouter.")
                vector = item.get("embedding")
                if not isinstance(vector, list) or not vector or any(
                    type(value) not in (int, float) or not math.isfinite(value) for value in vector
                ):
                    raise OpenRouterClientError("Vetor de embedding inválido retornado pelo OpenRouter.")
                dimension = dimension or len(vector)
                if len(vector) != dimension:
                    raise OpenRouterClientError("Dimensões de embeddings inconsistentes no OpenRouter.")
                indexed[index] = vector
            vectors.extend(indexed[index] for index in range(len(batch)))
        return vectors
