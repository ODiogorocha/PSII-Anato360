"""Interface pública de chat/estudo com Ollama ou OpenRouter e visão com Ollama."""

from .client import AIClientError
from .config import ChunkingConfig, OllamaConfig, OpenRouterConfig, RetrievalConfig
from .ollama_client import OllamaClient, OllamaClientError
from .openrouter_client import OpenRouterClient, OpenRouterClientError

__all__ = [
    "StudyAssistant", "OllamaConfig", "ChunkingConfig", "RetrievalConfig",
    "OllamaClient", "OllamaClientError",
    "OpenRouterConfig", "OpenRouterClient", "OpenRouterClientError", "AIClientError",
]


def __getattr__(name):
    # O cliente de visão não precisa carregar dependências do RAG/PDF.
    if name == "StudyAssistant":
        from .study_assistant import StudyAssistant
        return StudyAssistant
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
