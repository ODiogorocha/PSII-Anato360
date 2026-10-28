"""Cliente HTTP compartilhado pelo chatbot e pelo processamento de imagens."""

from __future__ import annotations

import base64
import math
import logging
import time
from collections.abc import Mapping, Sequence
from typing import Any

import requests

from .config import OllamaConfig
from .client import AIClientError, build_chat_messages

logger = logging.getLogger(__name__)


class OllamaClientError(AIClientError):
    """Erro de comunicação ou de formato de resposta do Ollama."""


class OllamaClient:
    def __init__(self, config: OllamaConfig | None = None):
        self.config = config or OllamaConfig()

    def chat_status(self) -> dict[str, Any]:
        """Check the configured model without loading it or running inference."""
        model_missing = False
        for host in self.config.hosts:
            result = self._chat_status_at(host)
            if result['available']:
                return result
            model_missing = model_missing or result['status'] == 'model_missing'
        return {'available': False, 'status': 'model_missing' if model_missing else 'unavailable'}

    def _chat_status_at(self, host: str) -> dict[str, Any]:
        try:
            # Two probes must fit within the frontend's 15-second API timeout.
            response = requests.get(f"{host}/api/tags", timeout=(2, 3))
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
        hosts = self.config.hosts
        deadline = time.monotonic() + self.config.request_timeout
        for index, host in enumerate(hosts):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise OllamaClientError("O Ollama excedeu o tempo de resposta. Tente novamente.")
            # Reserve time for the local model when the preferred host hangs.
            read_timeout = min(self.config.primary_timeout, remaining / 2) if index < len(hosts) - 1 else remaining
            try:
                return self._post_at(host, endpoint, payload, read_timeout)
            except OllamaClientError as error:
                if not error.retryable or index == len(hosts) - 1:
                    raise
                logger.warning('Ollama preferencial indisponível; tentando o fallback: %s', error)
        raise OllamaClientError("Nenhum servidor Ollama configurado.")

    def _post_at(self, host: str, endpoint: str, payload: dict[str, Any], read_timeout: float) -> dict[str, Any]:
        try:
            response = requests.post(
                f"{host}/api/{endpoint}",
                json=payload,
                timeout=(min(3, read_timeout), read_timeout),
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
            raise OllamaClientError(message, retryable=response.status_code in {404, 408, 429} or response.status_code >= 500)
        try:
            data = response.json()
        except (ValueError, requests.RequestException) as exc:
            raise OllamaClientError("O Ollama retornou uma resposta JSON inválida.") from exc
        if not isinstance(data, dict) or data.get("error"):
            raise OllamaClientError("O Ollama retornou uma resposta inválida ou um erro de geração.")
        if endpoint == 'chat':
            message = data.get('message')
            content = message.get('content') if isinstance(message, dict) else None
            if not isinstance(content, str) or not content.strip():
                raise OllamaClientError("O Ollama não retornou uma resposta de texto válida.")
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
        data = self._post("chat", {
            "model": self.config.llm_model,
            "messages": build_chat_messages(system_prompt, user_prompt, history),
            "stream": False,
            "options": {"temperature": temperature},
        })
        return data['message']['content'].strip()

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
