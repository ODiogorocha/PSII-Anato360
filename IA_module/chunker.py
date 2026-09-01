"""
Divisão de texto longo em pedaços menores (chunks) com sobreposição,
para permitir busca por similaridade em granularidade útil.
"""
from __future__ import annotations

from typing import List

from .config import ChunkingConfig


def chunk_text(text: str, config: ChunkingConfig = None) -> List[str]:
    """Divide o texto em chunks de tamanho aproximado `chunk_size`,
    com sobreposição `chunk_overlap` entre chunks consecutivos.

    A divisão respeita, quando possível, quebras de parágrafo/frase para
    não cortar o texto no meio de uma ideia.
    """
    config = config or ChunkingConfig()
    text = text.strip()
    if not text:
        return []

    chunks: List[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + config.chunk_size, text_len)

        # tenta terminar o chunk em uma quebra de linha ou ponto final,
        # procurando um pouco antes do fim ideal, para não cortar frases
        if end < text_len:
            boundary = text.rfind("\n", start, end)
            if boundary == -1 or boundary <= start:
                boundary = text.rfind(". ", start, end)
            if boundary != -1 and boundary > start:
                end = boundary + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        # próximo chunk começa antes do fim do atual, gerando sobreposição
        start = max(end - config.chunk_overlap, start + 1)

    return chunks