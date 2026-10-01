"""Interface pública do módulo de chat, visão e estudo com Ollama."""

from .config import ChunkingConfig, OllamaConfig, RetrievalConfig
from .ollama_client import OllamaClient, OllamaClientError

__all__ = [
    "StudyAssistant", "OllamaConfig", "ChunkingConfig", "RetrievalConfig",
    "OllamaClient", "OllamaClientError",
]


def __getattr__(name):
    # O cliente de visão não precisa carregar dependências do RAG/PDF.
    if name == "StudyAssistant":
        from .study_assistant import StudyAssistant
        return StudyAssistant
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
