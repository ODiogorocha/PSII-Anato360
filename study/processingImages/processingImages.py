"""Remove rótulos de imagens anatômicas e localize suas linhas-guia.

O módulo mantém a API original, mas separa a máscara usada para apagar os
caracteres daquela usada para detectar linhas. Isso evita que traços das letras
sejam confundidos com setas e que retângulos inteiros da anatomia sejam apagados.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path
from typing import Optional, Sequence

import cv2
import easyocr
import numpy as np

class image_processing:
    def __init__(self, add_points = False):
        self.OCR_LANGUAGES = ["pt", "es", "en"]
        self.TEXT_MARGIN = 2
        self.LINE_DETECTION_TEXT_MARGIN = 3
        self.POINT_RADIUS = 6
        self.POINT_BORDER_RADIUS = 8
        self.POINT_COLOR = (0, 0, 255)
        self.POINT_BORDER_COLOR = (255, 255, 255)
        self.INPAINT_RADIUS = 3
        self.ADD_POINTS = add_points

        self.mean_time_processing = 0

    def create_ocr_reader(self, gpu: bool = False) -> easyocr.Reader:
        return easyocr.Reader(self.OCR_LANGUAGES, gpu=gpu)

    def _ocr_box_bounds(self, box: Sequence) -> tuple[float, float, float, float]:
        points = np.asarray(box, dtype=np.float32)
        return (
            float(points[:, 0].min()),
            float(points[:, 1].min()),
            float(points[:, 0].max()),
            float(points[:, 1].max()),
        )

    def _box_iou(self, first: Sequence, second: Sequence) -> float:
        ax1, ay1, ax2, ay2 = self._ocr_box_bounds(first)
        bx1, by1, bx2, by2 = self._ocr_box_bounds(second)
        intersection = max(0.0, min(ax2, bx2) - max(ax1, bx1)) * max(0.0, min(ay2, by2) - max(ay1, by1))
        first_area = max(1.0, (ax2 - ax1) * (ay2 - ay1))
        second_area = max(1.0, (bx2 - bx1) * (by2 - by1))
        return intersection / max(1.0, first_area + second_area - intersection)

    def _read_ocr_results(self, image: np.ndarray, reader: easyocr.Reader) -> list:
        """Combina a leitura normal com uma versão ampliada e realçada.

        A segunda passagem recupera palavras muito pequenas (como ``rim`` e
        ``reto`` nas amostras) sem alterar a resolução da imagem final.
        """
        primary = list(reader.readtext(image, canvas_size=2560, mag_ratio=2.0))
        scale = 3.0 if min(image.shape[:2]) < 500 else 2.0
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        enlarged = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        sharpened = cv2.addWeighted(
            enlarged,
            1.8,
            cv2.GaussianBlur(enlarged, (0, 0), 1.2),
            -0.8,
            0,
        )
        secondary_raw = reader.readtext(
            sharpened,
            canvas_size=2560,
            mag_ratio=1.0,
            text_threshold=0.45,
            low_text=0.20,
            link_threshold=0.25,
        )
        secondary = [
            (np.asarray(box, dtype=np.float32) / scale, text, confidence)
            for box, text, confidence in secondary_raw
        ]

        merged = primary.copy()
        for candidate in secondary:
            duplicate_index = next(
                (index for index, current in enumerate(merged) if self._box_iou(candidate[0], current[0]) >= 0.45),
                None,
            )
            if duplicate_index is None:
                merged.append(candidate)
            elif float(candidate[2]) > float(merged[duplicate_index][2]):
                merged[duplicate_index] = candidate
        return merged

    def load_image(self, input_path: str | Path) -> np.ndarray:
        image = cv2.imread(str(input_path))
        if image is None:
            raise FileNotFoundError(f"Não foi possível abrir a imagem: {input_path}")
        return image

    def _normalize_detected_text(self, text: str) -> str:
        """Remove quebras de linha e normaliza espaços."""
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", " ")
        return " ".join(normalized.split())

    def extract_texts(self, image: np.ndarray, reader: easyocr.Reader, minimum_confidence: float) -> list[dict]:
        results = self._read_ocr_results(image, reader)
        return self._texts_from_ocr_results(image, results, minimum_confidence)

    def _texts_from_ocr_results(self, image: np.ndarray, results: Sequence, minimum_confidence: float) -> list[dict]:
        detected_texts: list[dict] = []
        for box, text, confidence in results:
            if confidence < minimum_confidence:
                continue

            points = np.rint(np.asarray(box, dtype=np.float32)).astype(np.int32)
            points[:, 0] = np.clip(points[:, 0], 0, image.shape[1] - 1)
            points[:, 1] = np.clip(points[:, 1], 0, image.shape[0] - 1)
            x_min = int(points[:, 0].min())
            y_min = int(points[:, 1].min())
            x_max = int(points[:, 0].max())
            y_max = int(points[:, 1].max())
            detected_texts.append(
                {
                    "name": self._normalize_detected_text(text),
                    "confidence": float(confidence),
                    "textBox": {"x1": x_min, "y1": y_min, "x2": x_max, "y2": y_max},
                    "center": {"x": int(round(points[:, 0].mean())), "y": int(round(points[:, 1].mean()))},
                    "_polygon": points.tolist(),
                }
            )
        return detected_texts

    def _polygon_for_text(self, item: dict) -> np.ndarray:
        if "_polygon" in item:
            return np.asarray(item["_polygon"], dtype=np.int32)
        box = item["textBox"]
        return np.asarray(
            [
                [box["x1"], box["y1"]],
                [box["x2"], box["y1"]],
                [box["x2"], box["y2"]],
                [box["x1"], box["y2"]],
            ],
            dtype=np.int32,
        )

    def _create_text_region_mask(self, image: np.ndarray, detected_texts: Sequence[dict]) -> np.ndarray:
        """Cria regiões cheias apenas para impedir que o detector veja as letras."""
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        for item in detected_texts:
            cv2.fillPoly(mask, [self._polygon_for_text(item)], 255)
        if self.LINE_DETECTION_TEXT_MARGIN > 0 and np.any(mask):
            size = self.LINE_DETECTION_TEXT_MARGIN * 2 + 1
            mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size)))
        return mask

    def _create_text_mask(self, image: np.ndarray, detected_texts: Sequence[dict]) -> np.ndarray:
        """Seleciona os traços das letras, sem preencher toda a caixa do OCR."""
        result = np.zeros(image.shape[:2], dtype=np.uint8)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
        height, width = image.shape[:2]

        for item in detected_texts:
            polygon = self._polygon_for_text(item)
            region = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(region, [polygon], 255)

            box = item["textBox"]
            text_height = max(1, box["y2"] - box["y1"] + 1)
            ring_size = max(3, min(9, int(round(text_height * 0.35))))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ring_size * 2 + 1, ring_size * 2 + 1))
            expanded = cv2.dilate(region, kernel)
            ring = cv2.subtract(expanded, region)
            ring_pixels = lab[ring > 0]
            if ring_pixels.size == 0:
                continue

            background = np.median(ring_pixels, axis=0)
            distance = np.linalg.norm(lab - background, axis=2)
            values = np.clip(distance[region > 0], 0, 255).astype(np.uint8)
            if values.size == 0:
                continue

            otsu_threshold, _ = cv2.threshold(values, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            ring_variation = float(np.median(np.linalg.norm(ring_pixels - background, axis=1)))
            contrast_threshold = max(12.0, float(otsu_threshold) * 0.65)
            if ring_variation > 18:
                contrast_threshold = max(contrast_threshold, 20.0)

            letters = ((distance >= contrast_threshold) & (region > 0)).astype(np.uint8) * 255
            letters = cv2.morphologyEx(letters, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
            letters = cv2.dilate(letters, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
            result = cv2.bitwise_or(result, cv2.bitwise_and(letters, expanded))

        if self.TEXT_MARGIN > 1 and np.any(result):
            result = cv2.dilate(
                result,
                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (self.TEXT_MARGIN, self.TEXT_MARGIN)),
            )
        return result

    def _normalize_point(self, x: int, y: int, image: np.ndarray) -> dict:
        height, width = image.shape[:2]
        return {"x": x / max(1, width - 1), "y": y / max(1, height - 1)}

    def _draw_target_point(self, image: np.ndarray, x: int, y: int) -> None:
        if not self.ADD_POINTS:
            return
        scale = max(0.65, min(image.shape[:2]) / 360.0)
        radius = max(4, int(round(self.POINT_RADIUS * scale)))
        border_radius = max(radius + 2, int(round(self.POINT_BORDER_RADIUS * scale)))
        cv2.circle(image, (x, y), border_radius, self.POINT_BORDER_COLOR, thickness=-1, lineType=cv2.LINE_AA)
        cv2.circle(image, (x, y), radius, self.POINT_COLOR, thickness=-1, lineType=cv2.LINE_AA)

    def save_result(self, output_path: str | Path, annotations_path: str | Path, processed_image: np.ndarray, method: str, annotations: list[dict]) -> None:
        output_path = Path(output_path)
        annotations_path = Path(annotations_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        annotations_path.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(output_path), processed_image):
            raise IOError(f"Não foi possível salvar a imagem em: {output_path}")
        with annotations_path.open("w", encoding="utf-8") as file:
            json.dump({"method": method, "annotations": annotations}, file, ensure_ascii=False, indent=2)

    def _point_to_box_distance(self, point: tuple[int, int], box: dict) -> float:
        x, y = point
        dx = max(box["x1"] - x, 0, x - box["x2"])
        dy = max(box["y1"] - y, 0, y - box["y2"])
        return math.hypot(dx, dy)

    def _point_to_box_border_distance(self, point: tuple[int, int], box: dict) -> float:
        outside = self._point_to_box_distance(point, box)
        if outside > 0:
            return outside
        x, y = point
        return float(min(x - box["x1"], box["x2"] - x, y - box["y1"], box["y2"] - y))

    def _detect_line_segments(self, image: np.ndarray, excluded_mask: Optional[np.ndarray] = None) -> list[tuple[int, int, int, int]]:
        """Detecta linhas-guia depois de excluir todas as regiões de texto."""
        working = image
        if excluded_mask is not None and np.any(excluded_mask):
            working = cv2.inpaint(image, excluded_mask, 3, cv2.INPAINT_TELEA)

        gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
        detector = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD)
        lines = detector.detect(gray)[0]
        if lines is None:
            return []

        height, width = image.shape[:2]
        minimum_length = max(8, int(round(min(height, width) * 0.02)))
        border_margin = max(5, int(round(min(height, width) * 0.025)))
        segments: list[tuple[int, int, int, int]] = []
        for values in np.asarray(lines).reshape(-1, 4):
            x1, y1, x2, y2 = (int(round(float(value))) for value in values)
            length = math.hypot(x2 - x1, y2 - y1)
            if length < minimum_length:
                continue
            # Molduras longas são retas perfeitas e ficavam mais atraentes que as
            # linhas-guia próximas aos rótulos situados nas bordas.
            same_border = (
                (x1 <= border_margin and x2 <= border_margin)
                or (x1 >= width - 1 - border_margin and x2 >= width - 1 - border_margin)
                or (y1 <= border_margin and y2 <= border_margin)
                or (y1 >= height - 1 - border_margin and y2 >= height - 1 - border_margin)
            )
            if same_border and length > min(height, width) * 0.12:
                continue
            segments.append((x1, y1, x2, y2))
        return segments + self._merge_collinear_segments(segments, max_gap=max(6.0, min(height, width) * 0.025))

    def _merge_collinear_segments(
        self,
        segments: Sequence[tuple[int, int, int, int]],
        max_gap: float,
        angle_tolerance_degrees: float = 8.0,
        perpendicular_tolerance: float = 3.0,
    ) -> list[tuple[int, int, int, int]]:
        """Cria candidatos longos unindo partes da mesma linha interrompida."""
        merged: list[tuple[int, int, int, int]] = []
        cosine_limit = math.cos(math.radians(angle_tolerance_degrees))
        vectors = []
        for segment in segments:
            start = np.asarray(segment[:2], dtype=np.float32)
            end = np.asarray(segment[2:], dtype=np.float32)
            vector = end - start
            length = float(np.linalg.norm(vector))
            if length > 0:
                vectors.append((start, end, vector / length, length))

        for first_index, (start, end, direction, length) in enumerate(vectors):
            for other_start, other_end, other_direction, _ in vectors[first_index + 1 :]:
                if abs(float(np.dot(direction, other_direction))) < cosine_limit:
                    continue
                relative_start = other_start - start
                relative_end = other_end - start
                perpendicular_start = abs(float(direction[0] * relative_start[1] - direction[1] * relative_start[0]))
                perpendicular_end = abs(float(direction[0] * relative_end[1] - direction[1] * relative_end[0]))
                if max(perpendicular_start, perpendicular_end) > perpendicular_tolerance:
                    continue

                projections = [0.0, length, float(np.dot(relative_start, direction)), float(np.dot(relative_end, direction))]
                first_min, first_max = 0.0, length
                other_min, other_max = sorted(projections[2:])
                gap = max(other_min - first_max, first_min - other_max, 0.0)
                if gap > max_gap:
                    continue
                merged_start = start + direction * min(projections)
                merged_end = start + direction * max(projections)
                candidate = (
                    int(round(float(merged_start[0]))),
                    int(round(float(merged_start[1]))),
                    int(round(float(merged_end[0]))),
                    int(round(float(merged_end[1]))),
                )
                if math.dist(candidate[:2], candidate[2:]) > max(length, math.dist(other_start, other_end)) + 2:
                    merged.append(candidate)
        return list(dict.fromkeys(merged))

    def _point_inside_any_text(self, point: tuple[int, int], text_boxes: Sequence[dict], ignored_box: dict) -> bool:
        x, y = point
        for box in text_boxes:
            if box is ignored_box or box == ignored_box:
                continue
            margin = 2
            if box["x1"] - margin <= x <= box["x2"] + margin and box["y1"] - margin <= y <= box["y2"] + margin:
                return True
        return False

    def _find_arrow_for_text(
        self,
        text_item: dict,
        line_segments: Sequence[tuple[int, int, int, int]],
        maximum_distance: Optional[float] = None,
        text_boxes: Sequence[dict] = (),
    ) -> Optional[dict]:
        """Associa ao texto uma linha que sai de sua borda em direção à anatomia."""
        box = text_item["textBox"]
        center = (float(text_item["center"]["x"]), float(text_item["center"]["y"]))
        text_height = max(1, box["y2"] - box["y1"] + 1)
        max_distance = maximum_distance or max(10.0, min(42.0, text_height * 1.6))
        best_arrow: Optional[dict] = None
        best_score = float("inf")

        for x1, y1, x2, y2 in line_segments:
            point1 = (x1, y1)
            point2 = (x2, y2)
            distance1 = self._point_to_box_distance(point1, box)
            distance2 = self._point_to_box_distance(point2, box)
            if distance1 <= distance2:
                origin, target = point1, point2
                origin_distance, target_distance = distance1, distance2
            else:
                origin, target = point2, point1
                origin_distance, target_distance = distance2, distance1

            length = math.dist(origin, target)
            if origin_distance > max_distance or length < max(8.0, text_height * 0.55):
                continue
            if target_distance <= origin_distance + max(3.0, text_height * 0.25):
                continue
            if self._point_to_box_border_distance(origin, box) > max(5.0, text_height * 0.40):
                continue
            if text_boxes and self._point_inside_any_text(target, text_boxes, box):
                continue

            outward = np.asarray(origin, dtype=np.float32) - np.asarray(center, dtype=np.float32)
            direction = np.asarray(target, dtype=np.float32) - np.asarray(origin, dtype=np.float32)
            outward_norm = float(np.linalg.norm(outward))
            direction_norm = float(np.linalg.norm(direction))
            alignment = 1.0
            if outward_norm > 2 and direction_norm > 0:
                alignment = float(np.dot(outward, direction) / (outward_norm * direction_norm))
                if alignment < -0.10:
                    continue

            score = origin_distance + (1.0 - alignment) * max_distance * 0.45 - min(length, 300.0) * 0.025
            if score < best_score:
                best_score = score
                best_arrow = {
                    "origin": {"x": int(origin[0]), "y": int(origin[1])},
                    "target": {"x": int(target[0]), "y": int(target[1])},
                    "distanceFromText": float(origin_distance),
                    "length": float(length),
                    "alignment": float(alignment),
                }
        return best_arrow

    def _dominant_background(self, image: np.ndarray) -> np.ndarray:
        small = cv2.resize(image, (max(1, image.shape[1] // 8), max(1, image.shape[0] // 8)))
        lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
        light_cutoff = np.percentile(lab[:, 0], 70)
        light_pixels = lab[lab[:, 0] >= light_cutoff]
        return np.median(light_pixels if light_pixels.size else lab, axis=0)

    def _is_text_over_structure(self, image: np.ndarray, text_item: dict, background: Optional[np.ndarray] = None) -> bool:
        """Distingue rótulos sobre a figura de rótulos no fundo branco."""
        polygon = self._polygon_for_text(text_item)
        region = np.zeros(image.shape[:2], dtype=np.uint8)
        cv2.fillPoly(region, [polygon], 255)
        box = text_item["textBox"]
        text_height = max(1, box["y2"] - box["y1"] + 1)
        size = max(4, min(12, text_height // 2))
        expanded = cv2.dilate(region, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size * 2 + 1, size * 2 + 1)))
        ring = cv2.subtract(expanded, region)
        pixels = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)[ring > 0]
        if pixels.size == 0:
            return False
        reference = self._dominant_background(image) if background is None else background
        non_background_ratio = float(np.mean(np.linalg.norm(pixels - reference, axis=1) > 24.0))
        return non_background_ratio >= 0.55

    def create_annotation(
        self,
        text_item: dict,
        target_x: Optional[int],
        target_y: Optional[int],
        image: np.ndarray,
        detection_type: str,
        requires_validation: bool,
    ) -> dict:
        has_target = target_x is not None and target_y is not None
        return {
            "name": text_item["name"],
            "confidence": text_item["confidence"],
            "detectionType": detection_type,
            "requiresValidation": requires_validation,
            "textBox": text_item["textBox"],
            "targetPoint": {"x": target_x, "y": target_y} if has_target else None,
            "normalizedTargetPoint": self._normalize_point(target_x, target_y, image) if has_target else None,
        }

    def _process_with_detections(
        self,
        image: np.ndarray,
        detected_texts: list[dict],
        output_path: str | Path,
        annotations_path: str | Path,
        method: str,
        minimum_arrow_ratio: float = 0.50,
        mask_texts: Optional[list[dict]] = None,
    ) -> list[dict]:
        mask_texts = detected_texts if mask_texts is None else mask_texts
        # A máscara precisa cobrir todo o polígono justo do OCR. A grande perda de
        # anatomia da versão anterior vinha da margem ampla somada a linhas falsas;
        # sem margem, o preenchimento elimina inclusive o antialiasing das letras.
        text_mask = cv2.bitwise_or(
            self._create_text_mask(image, mask_texts),
            self._create_text_region_mask(image, mask_texts),
        )
        region_mask = self._create_text_region_mask(image, mask_texts)
        line_segments = self._detect_line_segments(image, region_mask)
        text_boxes = [item["textBox"] for item in detected_texts]
        arrows = [self._find_arrow_for_text(item, line_segments, text_boxes=text_boxes) for item in detected_texts]
        background = self._dominant_background(image)
        direct_flags = [self._is_text_over_structure(image, item, background) for item in detected_texts]

        if method == "auto":
            possible_arrow_indexes = [index for index, direct in enumerate(direct_flags) if not direct]
            found = sum(arrows[index] is not None for index in possible_arrow_indexes)
            ratio = found / max(1, len(possible_arrow_indexes))
            method = "arrows" if ratio >= minimum_arrow_ratio else "direct"
            print(f"Textos encontrados: {len(detected_texts)}")
            print(f"Linhas associadas: {sum(arrow is not None for arrow in arrows)}")
            print(f"Proporção de linhas entre rótulos externos: {ratio:.2%}")
            print(f"Método selecionado: {method}")

        removal_mask = text_mask.copy()
        annotations: list[dict] = []
        selected_points: list[tuple[int, int]] = []
        line_thickness = max(2, int(round(min(image.shape[:2]) * 0.008)))

        for index, text_item in enumerate(detected_texts):
            arrow = arrows[index] if method == "arrows" and not direct_flags[index] else None
            if method == "direct" or direct_flags[index]:
                center = text_item["center"]
                annotation = self.create_annotation(
                    text_item, center["x"], center["y"], image, "direct", False
                )
                selected_points.append((center["x"], center["y"]))
            elif arrow is not None:
                origin = arrow["origin"]
                target = arrow["target"]
                cv2.line(
                    removal_mask,
                    (origin["x"], origin["y"]),
                    (target["x"], target["y"]),
                    255,
                    line_thickness,
                    cv2.LINE_AA,
                )
                annotation = self.create_annotation(
                    text_item, target["x"], target["y"], image, "arrow", False
                )
                annotation["arrow"] = arrow
                selected_points.append((target["x"], target["y"]))
            else:
                annotation = self.create_annotation(
                    text_item, None, None, image, "arrow_not_found", True
                )
            annotations.append(annotation)

        processed_image = cv2.inpaint(image, removal_mask, self.INPAINT_RADIUS, cv2.INPAINT_TELEA)
        for x, y in selected_points:
            self._draw_target_point(processed_image, x, y)
        self.save_result(output_path, annotations_path, processed_image, method, annotations)
        return annotations

    def _read_and_process(
        self,
        input_path: str | Path,
        output_path: str | Path,
        annotations_path: str | Path,
        minimum_confidence: float,
        gpu: bool,
        method: str,
        minimum_arrow_ratio: float = 0.50,
    ) -> list[dict]:
        image = self.load_image(input_path)
        reader = self.create_ocr_reader(gpu)
        results = self._read_ocr_results(image, reader)
        detected_texts = self._texts_from_ocr_results(image, results, minimum_confidence)
        mask_texts = self._texts_from_ocr_results(image, results, min(0.02, minimum_confidence))
        if not detected_texts:
            raise ValueError("Nenhum texto foi identificado na imagem.")
        return self._process_with_detections(
            image,
            detected_texts,
            output_path,
            annotations_path,
            method,
            minimum_arrow_ratio,
            mask_texts,
        )

    def process_image_with_arrows(
        self,
        input_path: str,
        output_path: str,
        annotations_path: str,
        minimum_confidence: float = 0.50,
        gpu: bool = False,
    ) -> list[dict]:
        return self._read_and_process(input_path, output_path, annotations_path, minimum_confidence, gpu, "arrows")

    def process_image_with_direct_markers(
        self,
        input_path: str,
        output_path: str,
        annotations_path: str,
        minimum_confidence: float = 0.50,
        gpu: bool = False,
    ) -> list[dict]:
        return self._read_and_process(input_path, output_path, annotations_path, minimum_confidence, gpu, "direct")

    def process_image(
        self,
        input_path: str,
        output_path: str,
        annotations_path: str,
        minimum_confidence: float = 0.50,
        minimum_arrow_ratio: float = 0.50,
        gpu: bool = False,
    ) -> list[dict]:
        return self._read_and_process(
            input_path,
            output_path,
            annotations_path,
            minimum_confidence,
            gpu,
            "auto",
            minimum_arrow_ratio,
        )

    def process_folder(
        self,
        input_folder: Path,
        output_folder: Path,
        annotations_folder: Path,
        minimum_confidence: float = 0.30,
        minimum_arrow_ratio: float = 0.50,
        gpu: bool = False,
    ) -> None:
        output_folder.mkdir(parents=True, exist_ok=True)
        annotations_folder.mkdir(parents=True, exist_ok=True)
        extensions = {".png", ".jpg", ".jpeg", ".webp"}
        process_times: list[float] = []
        reader = self.create_ocr_reader(gpu)

        for image_path in sorted(input_folder.iterdir()):
            if image_path.suffix.lower() not in extensions:
                continue
            print(f"\nProcessando: {image_path.name}")
            started_at = time.time()
            image = self.load_image(image_path)
            results = self._read_ocr_results(image, reader)
            detected_texts = self._texts_from_ocr_results(image, results, minimum_confidence)
            if not detected_texts:
                print("Nenhum texto identificado; imagem ignorada.")
                continue
            mask_texts = self._texts_from_ocr_results(image, results, min(0.02, minimum_confidence))
            self._process_with_detections(
                image=image,
                detected_texts=detected_texts,
                output_path=output_folder / f"{image_path.stem}processed.png",
                annotations_path=annotations_folder / f"{image_path.stem}.json",
                method="auto",
                minimum_arrow_ratio=minimum_arrow_ratio,
                mask_texts=mask_texts,
            )
            process_times.append(time.time() - started_at)

        self.mean_time_processing = sum(process_times) / len(process_times)
        if process_times:
            print(f"\nTempo médio: {self.mean_time_processing:.3f}s")
        else:
            print(f"Nenhuma imagem encontrada em: {input_folder}")

    def parse_args(self) -> argparse.Namespace:
        base_folder = Path(__file__).resolve().parent
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("--input", type=Path, default=base_folder / "images")
        parser.add_argument("--output", type=Path, default=base_folder / "images" / "processedImages")
        parser.add_argument("--annotations", type=Path, default=base_folder / "anotations")
        parser.add_argument("--confidence", type=float, default=0.30)
        parser.add_argument("--arrow-ratio", type=float, default=0.50)
        parser.add_argument("--gpu", action="store_true")
        return parser.parse_args()


if __name__ == "__main__":
    image_proc = image_processing()
    args = image_proc.parse_args()
    image_proc.process_folder(
        input_folder=args.input,
        output_folder=args.output,
        annotations_folder=args.annotations,
        minimum_confidence=args.confidence,
        minimum_arrow_ratio=args.arrow_ratio,
        gpu=args.gpu,
    )
