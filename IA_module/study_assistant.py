from __future__ import annotations

import uuid
from pathlib import Path
from typing import List, Optional, Union

from .chunker import chunk_text
from .config import ChunkingConfig, OllamaConfig, RetrievalConfig
from .ollama_client import OllamaClient
from .pdf_loader import extract_text_from_pdf
from .vector_store import VectorStore

_SYSTEM_PROMPT_QA = (
    "Você é um assistente de estudos. Responda à pergunta do usuário "
    "usando APENAS as informações do CONTEXTO fornecido, extraído de um PDF de estudo. "
    "Se a resposta não estiver no contexto, diga claramente que o documento não cobre "
    "esse ponto, em vez de inventar informação. Responda em português, de forma clara "
    "e didática, como se estivesse explicando para um estudante."
)

_SYSTEM_PROMPT_TIPS = (
    "Você é um assistente de estudos. Com base no CONTEXTO fornecido (trechos de um "
    "material de estudo), gere dicas de estudo objetivas: os pontos mais importantes "
    "a revisar, possíveis dúvidas comuns, e uma sugestão de ordem de estudo. "
    "Responda em português, em formato de lista."
)


class StudyAssistant:
    """Módulo de PLN para estudo baseado em PDF, usando Ollama como decoder.

    Responsável por: ingerir PDFs, indexá-los (chunking + embeddings) e
    responder perguntas / gerar dicas de estudo com base no conteúdo indexado.
    """

    def __init__(
        self,
        ollama_config: Optional[OllamaConfig] = None,
        chunking_config: Optional[ChunkingConfig] = None,
        retrieval_config: Optional[RetrievalConfig] = None,
    ):
        self.ollama = OllamaClient(ollama_config)
        self.chunking_config = chunking_config or ChunkingConfig()
        self.retrieval_config = retrieval_config or RetrievalConfig()
        self.store = VectorStore()

    # ------------------------------------------------------------------
    # Ingestão
    # ------------------------------------------------------------------
    def load_pdf(self, path: Union[str, Path], doc_id: Optional[str] = None) -> str:
        """Extrai, divide em chunks, gera embeddings e indexa um PDF.

        Retorna o `doc_id` do documento indexado (gerado automaticamente
        se não for informado), que deve ser guardado pelo sistema chamador
        para referenciar esse documento em `ask` / `generate_study_tips`.
        """
        doc_id = doc_id or str(uuid.uuid4())

        raw_text = extract_text_from_pdf(path)
        chunks = chunk_text(raw_text, self.chunking_config)
        if not chunks:
            raise ValueError(f"Não foi possível gerar chunks a partir do PDF: {path}")

        embeddings = self.ollama.embed_batch(chunks)
        self.store.add_document(doc_id, chunks, embeddings)
        return doc_id

    def unload_document(self, doc_id: str) -> None:
        """Remove um documento indexado da memória."""
        self.store.remove_document(doc_id)

    def list_documents(self) -> List[str]:
        return self.store.list_documents()

    # ------------------------------------------------------------------
    # Perguntas e respostas (RAG)
    # ------------------------------------------------------------------
    def ask(
        self,
        question: str,
        doc_id: Optional[str] = None,
        top_k: Optional[int] = None,
    ) -> str:
        """Responde a uma pergunta com base no(s) documento(s) indexado(s).

        Se `doc_id` for informado, busca apenas nesse documento; caso
        contrário, busca em todos os documentos indexados.
        """
        if not self.store.list_documents():
            raise RuntimeError("Nenhum documento indexado. Chame load_pdf() antes de ask().")

        top_k = top_k or self.retrieval_config.top_k
        question_embedding = self.ollama.embed(question)
        relevant_chunks = self.store.search(question_embedding, top_k=top_k, doc_id=doc_id)

        context = self._build_context(relevant_chunks)
        user_prompt = f"CONTEXTO:\n{context}\n\nPERGUNTA:\n{question}"
        return self.ollama.chat(_SYSTEM_PROMPT_QA, user_prompt)

    # ------------------------------------------------------------------
    # Dicas de estudo
    # ------------------------------------------------------------------
    def generate_study_tips(
        self,
        doc_id: str,
        focus: Optional[str] = None,
        top_k: Optional[int] = None,
    ) -> str:
        """Gera dicas de estudo com base em um documento indexado.

        `focus`: opcionalmente, um tópico/tema para focar as dicas
        (ex: "prova sobre redes neurais"). Se não informado, usa uma
        amostra ampla do documento.
        """
        if not self.store.has_document(doc_id):
            raise RuntimeError(f"Documento '{doc_id}' não está indexado.")

        top_k = top_k or self.retrieval_config.top_k

        if focus:
            focus_embedding = self.ollama.embed(focus)
            relevant_chunks = self.store.search(focus_embedding, top_k=top_k, doc_id=doc_id)
            context = self._build_context(relevant_chunks)
            user_prompt = f"CONTEXTO:\n{context}\n\nFOCO SOLICITADO:\n{focus}"
        else:
            # sem foco específico: usa o texto completo do documento
            context = self.store.get_all_text(doc_id)
            user_prompt = f"CONTEXTO (material completo):\n{context}"

        return self.ollama.chat(_SYSTEM_PROMPT_TIPS, user_prompt)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _build_context(chunks) -> str:
        if not chunks:
            return "(nenhum trecho relevante encontrado)"
        return "\n\n---\n\n".join(c.text for c in chunks)