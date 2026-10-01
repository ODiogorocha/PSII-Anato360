"""Cliente HTTP compartilhado pelo chatbot e pelo processamento de imagens."""

from __future__ import annotations

import base64
import math
from collections.abc import Mapping, Sequence
from typing import Any

import requests

from .config import OllamaConfig


class OllamaClientError(RuntimeError):
    """Erro de comunicação ou de formato de resposta do Ollama."""


class OllamaClient:
    def __init__(self, config: OllamaConfig | None = None):
        self.config = config or OllamaConfig()

    def chat_status(self) -> dict[str, Any]:
        """Check the configured model without loading it or running inference."""
        try:
            response = requests.get(f"{self.config.host}/api/tags", timeout=(3, 5))
            response.raise_for_status()
            data = response.json()
            models = data.get('models') if isinstance(data, dict) else None
            if not isinstance(models, list):
                raise ValueError('Invalid model list')
            names = {item.get('name') for item in models if isinstance(item, dict)}
            model = self.config.llm_model
            ready = model in names or (':' not in model and f'{model}:latest' in names)
            return {'available': ready, 'status': 'ready' if ready else 'model_missing'}
        except (requests.RequestException, ValueError):
            return {'available': False, 'status': 'unavailable'}

    def _post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            response = requests.post(
                f"{self.config.host}/api/{endpoint}",
                json=payload,
                timeout=(10, self.config.request_timeout),
            )
        except requests.Timeout as exc:
            raise OllamaClientError("O Ollama excedeu o tempo de resposta. Tente novamente.") from exc
        except requests.RequestException as exc:
            raise OllamaClientError("Não foi possível conectar ao Ollama. Verifique o serviço e OLLAMA_HOST.") from exc
        if not response.ok:
            if response.status_code == 404:
                message = f"O modelo '{payload.get('model')}' não está disponível no Ollama. Execute ollama pull para esse modelo."
            else:
                message = f"O Ollama não concluiu a solicitação (HTTP {response.status_code}). Verifique os logs e a memória disponível."
            raise OllamaClientError(message)
        try:
            data = response.json()
        except (ValueError, requests.RequestException) as exc:
            raise OllamaClientError("O Ollama retornou uma resposta JSON inválida.") from exc
        if not isinstance(data, dict) or data.get("error"):
            raise OllamaClientError("O Ollama retornou uma resposta inválida ou um erro de geração.")
        return data

    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Gera embeddings em lotes limitados pela API /api/embed."""
        vectors = []
        for start in range(0, len(texts), 32):
            batch = texts[start:start + 32]
            data = self._post("embed", {"model": self.config.embedding_model, "input": batch})
            embeddings = data.get("embeddings")
            if not isinstance(embeddings, list) or len(embeddings) != len(batch):
                raise OllamaClientError("Quantidade inválida de embeddings retornados pelo Ollama.")
            for vector in embeddings:
                if not isinstance(vector, list) or not vector or any(
                    not isinstance(value, (int, float)) or not math.isfinite(value) for value in vector
                ):
                    raise OllamaClientError("Vetor de embedding inválido retornado pelo Ollama.")
                vectors.append(vector)
        return vectors

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        *,
        history: Sequence[Mapping[str, str]] | None = None,
    ) -> str:
        """Envia histórico limitado a turnos de usuário/assistente e a pergunta atual."""
        messages = [{"role": "system", "content": system_prompt}]
        history_budget = 24000
        selected = []
        for item in reversed(list(history or [])[-20:]):
            if not isinstance(item, Mapping) or item.get("role") not in {"user", "assistant"}:
                continue
            content = item.get("content")
            if not isinstance(content, str) or not content.strip():
                continue
            content = content[:6000]
            if len(content) > history_budget:
                break
            selected.append({"role": item["role"], "content": content})
            history_budget -= len(content)
        messages.extend(reversed(selected))
        messages.append({"role": "user", "content": user_prompt})
        data = self._post("chat", {
            "model": self.config.llm_model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        })
        message = data.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise OllamaClientError("O Ollama não retornou uma resposta de texto válida.")
        return content.strip()

    def generate(
        self,
        *,
        model: str,
        prompt: str,
        images: Sequence[bytes | str] = (),
        format: str | dict = "json",
        options: dict | None = None,
    ) -> dict[str, Any]:
        """Contrato usado pelo ImageService: bytes de imagem viram base64 no HTTP."""
        return self._post("generate", {
            "model": model,
            "prompt": prompt,
            "images": [base64.b64encode(item).decode("ascii") if isinstance(item, bytes) else item for item in images],
            "format": format,
            "stream": False,
            "options": options or {"temperature": 0},
        })
