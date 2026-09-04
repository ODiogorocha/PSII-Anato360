"""Modelo de um rótulo textual encontrado em uma imagem."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence


@dataclass
class Rotule:
    """Texto reconhecido e sua posição, em pixels, na imagem.

    ``x`` e ``y`` representam o centro do texto. O polígono e a confiança são
    opcionais para manter compatibilidade com o construtor original, mas são
    preenchidos pelo :class:`ImageService` e permitem criar uma máscara precisa.
    """

    text: str
    x: float
    y: float
    confidence: float | None = None
    polygon: list[tuple[int, int]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.text = str(self.text)
        self.x = float(self.x)
        self.y = float(self.y)
        if self.confidence is not None:
            self.confidence = float(self.confidence)
        self.polygon = [
            (int(round(float(point[0]))), int(round(float(point[1]))))
            for point in self.polygon
        ]

    @property
    def bounding_box(self) -> tuple[int, int, int, int] | None:
        """Retorna ``(x1, y1, x2, y2)`` calculado a partir do polígono."""
        if not self.polygon:
            return None
        xs, ys = zip(*self.polygon)
        return min(xs), min(ys), max(xs), max(ys)

    def to_dict(self, image_size: Sequence[int] | None = None) -> dict[str, Any]:
        """Serializa os metadados sem incluir estruturas do NumPy."""
        result: dict[str, Any] = {
            "text": self.text,
            "x": self.x,
            "y": self.y,
            "confidence": self.confidence,
            "polygon": [{"x": x, "y": y} for x, y in self.polygon],
        }
        box = self.bounding_box
        result["boundingBox"] = (
            {"x1": box[0], "y1": box[1], "x2": box[2], "y2": box[3]}
            if box is not None
            else None
        )

        if image_size is not None:
            width, height = int(image_size[0]), int(image_size[1])
            result["normalizedPosition"] = {
                "x": self.x / max(1, width - 1),
                "y": self.y / max(1, height - 1),
            }
            
        return result

