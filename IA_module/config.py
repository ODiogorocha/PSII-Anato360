import math
import os
from dataclasses import dataclass, field


@dataclass
class OllamaConfig:
    """Configuração de conexão e modelos do Ollama."""

    # Endereço do servidor Ollama (local por padrão)
    host: str = field(default_factory=lambda: os.getenv("OLLAMA_HOST", "http://localhost:11434"))

    # Modelo usado para gerar embeddings (precisa estar puxado: `ollama pull nomic-embed-text`)
    embedding_model: str = field(default_factory=lambda: os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"))

    # Modelo usado como decoder/LLM para responder perguntas e gerar dicas
    # (ex: "llama3.1", "mistral", "gemma2" — precisa estar puxado no Ollama)
    llm_model: str = field(default_factory=lambda: os.getenv("OLLAMA_CHAT_MODEL") or os.getenv("OLLAMA_LLM_MODEL", "llama3.1:8b"))

    # Timeout (segundos) para as chamadas HTTP ao Ollama
    request_timeout: float = field(default_factory=lambda: float(os.getenv("OLLAMA_REQUEST_TIMEOUT", "180")))
    fallback_host: str = field(default_factory=lambda: os.getenv("OLLAMA_FALLBACK_HOST", ""))
    primary_timeout: float = field(default_factory=lambda: float(os.getenv("OLLAMA_PRIMARY_TIMEOUT", "60")))

    def __post_init__(self):
        self.host = self.host.rstrip("/")
        self.fallback_host = self.fallback_host.rstrip("/")
        if not self.host.startswith(("http://", "https://")):
            raise ValueError("OLLAMA_HOST deve ser uma URL HTTP, por exemplo http://ollama:11434.")
        if self.request_timeout <= 0:
            raise ValueError("OLLAMA_REQUEST_TIMEOUT deve ser maior que zero.")
        if self.fallback_host and not self.fallback_host.startswith(("http://", "https://")):
            raise ValueError("OLLAMA_FALLBACK_HOST deve ser uma URL HTTP.")
        if self.primary_timeout <= 0:
            raise ValueError("OLLAMA_PRIMARY_TIMEOUT deve ser maior que zero.")

    @property
    def hosts(self) -> list[str]:
        return list(dict.fromkeys(host for host in (self.host, self.fallback_host) if host))


@dataclass
class OpenRouterConfig:
    """Modelos e credenciais lidos do ambiente do container."""

    api_key: str = field(default_factory=lambda: os.getenv("OPENROUTER_API_KEY", ""), repr=False)
    llm_model: str = field(default_factory=lambda: os.getenv("OPENROUTER_MODEL", ""))
    embedding_model: str = field(default_factory=lambda: os.getenv(
        "OPENROUTER_EMBEDDING_MODEL", "openai/text-embedding-3-small",
    ))
    request_timeout: float = field(default_factory=lambda: float(os.getenv("OPENROUTER_REQUEST_TIMEOUT", "300")))

    def __post_init__(self):
        self.api_key = self.api_key.strip()
        self.llm_model = self.llm_model.strip()
        self.embedding_model = self.embedding_model.strip()
        if not self.api_key:
            raise ValueError("Preencha OPENROUTER_API_KEY no .env ao selecionar OpenRouter.")
        if not self.llm_model:
            raise ValueError("Preencha OPENROUTER_MODEL no .env ao selecionar OpenRouter.")
        if not self.embedding_model:
            raise ValueError("OPENROUTER_EMBEDDING_MODEL não pode estar vazio.")
        if not math.isfinite(self.request_timeout) or self.request_timeout <= 0:
            raise ValueError("OPENROUTER_REQUEST_TIMEOUT deve ser finito e maior que zero.")


@dataclass
class ChunkingConfig:
    """Configuração de divisão do texto extraído do PDF em pedaços (chunks)."""

    chunk_size: int = 800       # tamanho aproximado de cada chunk, em caracteres
    chunk_overlap: int = 150    # sobreposição entre chunks consecutivos


@dataclass
class RetrievalConfig:
    """Configuração da busca por similaridade (recuperação de contexto)."""

    top_k: int = 4  # quantos chunks mais relevantes recuperar por pergunta
