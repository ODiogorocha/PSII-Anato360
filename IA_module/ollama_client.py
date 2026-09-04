from __future__ import annotations

from typing import List, Optional

import requests

from .config import OllamaConfig


class OllamaClientError(RuntimeError):
    """Erro genérico de comunicação com o Ollama."""


class OllamaClient:
    def __init__(self, config: Optional[OllamaConfig] = None):
        self.config = config or OllamaConfig()

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------
    def embed(self, text: str) -> List[float]:
        """Gera o vetor de embedding de um texto usando o modelo configurado."""
        url = f"{self.config.host}/api/embeddings"
        payload = {"model": self.config.embedding_model, "prompt": text}
        try:
            resp = requests.post(url, json=payload, timeout=self.config.request_timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise OllamaClientError(f"Falha ao gerar embedding no Ollama: {exc}") from exc

        data = resp.json()
        embedding = data.get("embedding")
        if not embedding:
            raise OllamaClientError(f"Resposta de embedding inválida do Ollama: {data}")
        return embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings para uma lista de textos (chamada sequencial simples)."""
        return [self.embed(t) for t in texts]

    # ------------------------------------------------------------------
    # Geração de texto (chat)
    # ------------------------------------------------------------------
    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> str:
        """Envia uma conversa de 1 turno (system + user) e retorna a resposta do modelo."""
        url = f"{self.config.host}/api/chat"
        payload = {
            "model": self.config.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {"temperature": temperature},
        }
        try:
            resp = requests.post(url, json=payload, timeout=self.config.request_timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise OllamaClientError(f"Falha ao chamar o Ollama (chat): {exc}") from exc

        data = resp.json()
        message = data.get("message", {})
        content = message.get("content")
        if content is None:
            raise OllamaClientError(f"Resposta de chat inválida do Ollama: {data}")
        return content.strip()