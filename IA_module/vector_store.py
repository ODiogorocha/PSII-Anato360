from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np


@dataclass
class DocumentChunk:
    doc_id: str
    chunk_index: int
    text: str
    embedding: np.ndarray


@dataclass
class VectorStore:
    """Guarda os chunks de um ou mais documentos, indexados por doc_id."""

    _chunks: List[DocumentChunk] = field(default_factory=list)

    def add_document(self, doc_id: str, texts: List[str], embeddings: List[List[float]]) -> None:
        if len(texts) != len(embeddings):
            raise ValueError("texts e embeddings precisam ter o mesmo tamanho")
        for i, (text, emb) in enumerate(zip(texts, embeddings)):
            self._chunks.append(
                DocumentChunk(
                    doc_id=doc_id,
                    chunk_index=i,
                    text=text,
                    embedding=np.array(emb, dtype=np.float32),
                )
            )

    def remove_document(self, doc_id: str) -> None:
        self._chunks = [c for c in self._chunks if c.doc_id != doc_id]

    def has_document(self, doc_id: str) -> bool:
        return any(c.doc_id == doc_id for c in self._chunks)

    def list_documents(self) -> List[str]:
        return sorted({c.doc_id for c in self._chunks})

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        doc_id: Optional[str] = None,
    ) -> List[DocumentChunk]:
        """Retorna os `top_k` chunks mais similares à query (opcionalmente
        filtrando por um documento específico)."""
        candidates = self._chunks if doc_id is None else [c for c in self._chunks if c.doc_id == doc_id]
        if not candidates:
            return []

        query_vec = np.array(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vec) or 1e-8

        scored = []
        for chunk in candidates:
            chunk_norm = np.linalg.norm(chunk.embedding) or 1e-8
            similarity = float(np.dot(query_vec, chunk.embedding) / (query_norm * chunk_norm))
            scored.append((similarity, chunk))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [chunk for _, chunk in scored[:top_k]]

    def get_all_text(self, doc_id: str) -> str:
        """Retorna o texto completo (concatenado, na ordem original) de um documento."""
        doc_chunks = sorted(
            (c for c in self._chunks if c.doc_id == doc_id),
            key=lambda c: c.chunk_index,
        )
        return "\n\n".join(c.text for c in doc_chunks)