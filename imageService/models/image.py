"""Modelo em memória usado pelo serviço de processamento de imagens."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import cv2
import numpy as np

if __package__:  # Importação normal como ``imageService.models.image``.
    from .rotule import Rotule
else:  # pragma: no cover - compatibilidade com execução direta
    from rotule import Rotule


@dataclass(eq=False)
class Image:
    id: str
    path: str | Path | None
    rotules: list[Rotule] = field(default_factory=list)
    data: np.ndarray | None = field(default=None, repr=False)
    original_data: np.ndarray | None = field(default=None, repr=False)
    text_mask: np.ndarray | None = field(default=None, repr=False)
    is_valid: bool | None = None
    is_processed: bool = False
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.path is not None:
            self.path = str(self.path)
        self.rotules = list(self.rotules)
        self.metadata = dict(self.metadata)

    @property
    def image(self) -> np.ndarray | None:
        return self.data

    @image.setter
    def image(self, value: np.ndarray | None) -> None:
        self.data = value

    @property
    def processedImage(self) -> np.ndarray | None:
        return self.data if self.is_processed else None

    @property
    def valid(self) -> bool | None:
        return self.is_valid

    @property
    def processed(self) -> bool:
        return self.is_processed

    def to_dict(self, include_data: bool = False) -> dict[str, Any]:
        """Retorna metadados serializáveis e, opcionalmente, o ``ndarray``."""

        height = int(self.data.shape[0]) if self.data is not None else None
        width = int(self.data.shape[1]) if self.data is not None else None
        result: dict[str, Any] = {
            "id": self.id,
            "path": self.path,
            "isValid": self.is_valid,
            "isProcessed": self.is_processed,
            "error": self.error,
            "width": width,
            "height": height,
            "rotules": [
                rotule.to_dict((width, height))
                if width is not None and height is not None
                else rotule.to_dict()
                for rotule in self.rotules
            ],
            "metadata": dict(self.metadata),
        }
        if include_data:
            result["data"] = self.data
        return result

    def save(self, output_path: str | Path) -> Path:
        """Salva o resultado sem modificar ``path``, que aponta para a origem."""

        if self.data is None:
            raise ValueError("A imagem ainda não possui conteúdo para salvar.")

        target = Path(output_path)
        if not target.suffix:
            target = target.with_suffix(".png")
        target.parent.mkdir(parents=True, exist_ok=True)
        extension = target.suffix.lower()
        try:
            success, encoded = cv2.imencode(extension, self.data)
        except cv2.error as error:
            raise ValueError(f"Formato de imagem não suportado: {extension}") from error
        if not success:
            raise ValueError(f"Formato de imagem não suportado: {extension}")
        encoded.tofile(str(target))
        return target

