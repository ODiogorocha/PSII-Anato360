"""
Configurações do módulo de assistente de estudos baseado em PDF + Ollama.
"""
from dataclasses import dataclass


@dataclass
class OllamaConfig:
    """Configuração de conexão e modelos do Ollama."""

    # Endereço do servidor Ollama (local por padrão)
    host: str = "http://localhost:11434"

    # Modelo usado para gerar embeddings (precisa estar puxado: `ollama pull nomic-embed-text`)
    embedding_model: str = "nomic-embed-text"

    # Modelo usado como decoder/LLM para responder perguntas e gerar dicas
    # (ex: "llama3.1", "mistral", "gemma2" — precisa estar puxado no Ollama)
    llm_model: str = "llama3.1"

    # Timeout (segundos) para as chamadas HTTP ao Ollama
    request_timeout: int = 120


@dataclass
class ChunkingConfig:
    """Configuração de divisão do texto extraído do PDF em pedaços (chunks)."""

    chunk_size: int = 800       # tamanho aproximado de cada chunk, em caracteres
    chunk_overlap: int = 150    # sobreposição entre chunks consecutivos


@dataclass
class RetrievalConfig:
    """Configuração da busca por similaridade (recuperação de contexto)."""

    top_k: int = 4  # quantos chunks mais relevantes recuperar por pergunta