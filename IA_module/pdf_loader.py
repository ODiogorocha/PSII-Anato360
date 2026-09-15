from __future__ import annotations

from pathlib import Path
from typing import List, Union
from pypdf import PdfReader

def extract_text_from_pdf(path: Union[str, Path]) -> str:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"pdf nao encontrado: {path}")
    
    reader = PdfReader(str(path))
    pages_text: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages_text.append(text)
    
    full_text = "\n".join(pages_text)
    if not full_text.strip():
        raise ValueError(
            f"Nenhum texto extraído de '{path.name}'. "
            "O PDF pode ser escaneado (imagem) e precisar de OCR antes de usar este módulo."
        )
    return full_text

