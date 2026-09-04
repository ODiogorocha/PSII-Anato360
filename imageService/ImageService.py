"""Serviço em memória para validar e tratar imagens anatômicas."""

from __future__ import annotations

import base64
import json
import re
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

import cv2
import numpy as np

if __package__:  # Importação normal: ``from imageService import ImageService``.
    from .models.image import Image
    from .models.rotule import Rotule
    from .verbose import printError, printSuccess
else:  # pragma: no cover - execução direta a partir da pasta
    from models.image import Image
    from models.rotule import Rotule
    from verbose import printError, printSuccess


AnatomyValidator = Callable[[np.ndarray], bool | float | tuple[bool, float]]
ImageEnhancer = Callable[[np.ndarray, str], Any]


class ImageService:
    """
    Coordena validação, OCR, remoção de texto e reconstrução.
    """

    _POSITIVE_ANATOMY_PROMPTS = (
        "an anatomical illustration of an animal or human body",
        "a medical anatomy diagram with organs and body structures",
        "a veterinary anatomy educational image",
        "a labeled anatomical specimen or anatomical drawing",
    )
    _NEGATIVE_ANATOMY_PROMPTS = (
        "an ordinary photograph unrelated to anatomy",
        "a landscape, building, vehicle, or everyday object",
        "a page containing only text, a chart, or a user interface",
        "an abstract decorative image unrelated to medicine",
    )
    _DEFAULT_ENHANCEMENT_PROMPT = """
Analise a imagem anatômica reconstruída e escolha ajustes conservadores para
melhorar a legibilidade sem inventar, remover ou deslocar estruturas. Responda
somente com JSON contendo: contrast (0.8 a 1.3), brightness (-20 a 20),
saturation (0.8 a 1.2), sharpness (0 a 1.0) e denoise (0 a 10).
""".strip()

    def __init__(
        self,
        ollamaClient: Any = None,
        verbose: int = 0,
        *,
        ocr_languages: Sequence[str] | None = None,
        ocr_confidence: float = 0.30,
        ocr_gpu: bool = False,
        ocr_reader: Any = None,
        validate_anatomy: bool = True,
        anatomy_threshold: float = 0.50,
        anatomy_validator: AnatomyValidator | None = None,
        clip_model: str = "ViT-B/32",
        clip_device: str | None = None,
        text_margin: int = 2,
        inpaint_radius: float = 3.0,
        image_enhancer: ImageEnhancer | None = None,
        ollama_model: str | None = None,
        enhancement_prompt: str | None = None,
    ) -> None:
        if not 0.0 <= float(ocr_confidence) <= 1.0:
            raise ValueError("ocr_confidence deve estar entre 0 e 1.")
        if not 0.0 <= float(anatomy_threshold) <= 1.0:
            raise ValueError("anatomy_threshold deve estar entre 0 e 1.")
        if int(text_margin) < 0:
            raise ValueError("text_margin não pode ser negativo.")
        if float(inpaint_radius) <= 0:
            raise ValueError("inpaint_radius deve ser maior que zero.")

        self.ollamaClient = ollamaClient
        self.ollamaModel = ollama_model
        self.enhancementPrompt = enhancement_prompt or self._DEFAULT_ENHANCEMENT_PROMPT
        self.imageEnhancer = image_enhancer

        self.verbose = verbose
        self.ocrLanguages = list(ocr_languages or ("pt", "en"))
        self.ocrConfidence = float(ocr_confidence)
        self.ocrGpu = ocr_gpu
        self.textMargin = int(text_margin)
        self.inpaintRadius = float(inpaint_radius)

        self.validateAnatomy = bool(validate_anatomy)
        self.anatomyThreshold = float(anatomy_threshold)
        self.anatomyValidator = anatomy_validator
        self.clipModelName = clip_model
        self.clipDevice = clip_device

        self._ocrReader = ocr_reader
        self._clipModel: Any = None
        self._clipPreprocess: Any = None
        self._clipTokens: Any = None
        self._torch: Any = None

        # Listas 
        self.processedImages: list[Image] = []
        self.unprocessedImages: list[Image] = []

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------
    def addImage(self, image: Image | Sequence[Image]) -> bool | list[bool]:
        """Valida e adiciona uma imagem (ou sequência delas) à fila.

        O retorno é ``bool`` para uma imagem e ``list[bool]`` para um lote.
        Imagens recusadas recebem uma mensagem em ``error``. ``is_valid`` fica
        ``False`` para conteúdo inválido e ``None`` para falha de infraestrutura.
        """

        if isinstance(image, Sequence) and not isinstance(image, (Image, str, bytes)):
            return [self._add_single_image(item) for item in image]
        return self._add_single_image(image)  # type: ignore[arg-type]

    def processImage(
        self,
        imageId: str | None = None,
        imageIds: Sequence[str] | None = None,
        n_images: int = -1,
    ) -> Image | list[Image] | None:
        """
        Processa uma imagem; filtros de lote antigos continuam suportados.
        """

        if imageId is not None:
            queued = self._popImageById(imageId)
            if queued is None:
                return None
            return self._processSingleImage(queued)

        if imageIds is not None:
            return self.processBatch(imageIds=imageIds, n_images=n_images)

        if n_images != -1:
            return self.processBatch(n_images=n_images)

        queued = self._getNextImage()
        if queued is None:
            return None
        return self._processSingleImage(queued)

    def processBatch(
        self,
        imageIds: Sequence[str] | None = None,
        n_images: int = -1,
    ) -> list[Image]:
        """Processa IDs específicos, as próximas ``n`` imagens ou toda a fila."""

        limit = self._validateCount(n_images)
        selected: list[Image] = []

        if imageIds is not None:
            if isinstance(imageIds, (str, bytes)):
                raise TypeError("imageIds deve ser uma sequência de IDs, não uma string.")
            ids = list(imageIds)
            if limit != -1:
                ids = ids[:limit]
            for image_id in ids:
                queued = self._popImageById(image_id)
                if queued is not None:
                    selected.append(queued)
        else:
            amount = len(self.unprocessedImages) if limit == -1 else min(limit, len(self.unprocessedImages))
            for _ in range(amount):
                queued = self._getNextImage()
                if queued is not None:
                    selected.append(queued)

        return [self._processSingleImage(image) for image in selected]

    # Alias para a grafia presente em uma versão do README.
    def processBarch(
        self,
        imageIds: Sequence[str] | None = None,
        n_images: int = -1,
    ) -> list[Image]:
        return self.processBatch(imageIds=imageIds, n_images=n_images)

    def getResult(
        self,
        imageId: str | None = None,
        imageIds: Sequence[str] | None = None,
        n_images: int = -1,
    ) -> list[Image]:
        """Consulta resultados sem removê-los; sem filtros, retorna todos."""

        if imageIds is not None and isinstance(imageIds, (str, bytes)):
            raise TypeError("imageIds deve ser uma sequência de IDs, não uma string.")
        count = self._validateCount(n_images)

        if not self.processedImages:
            printError(verbose=self.verbose, text="Lista de imagens processadas vazia.")
            return []

        if imageId is not None:
            result = self._getImageById(id=imageId, images=self.processedImages)
            return [result] if result is not None else []

        if imageIds is not None:
            results: list[Image] = []
            for image_id in imageIds:
                result = self._getImageById(id=image_id, images=self.processedImages)
                if result is not None:
                    results.append(result)
            return results

        if count == 0:
            return []
        if count == -1:
            return list(self.processedImages)
        return list(self.processedImages[-count:])

    # ------------------------------------------------------------------
    # Gerenciamento das filas
    # ------------------------------------------------------------------
    def _add_single_image(self, image: Image) -> bool:
        if not isinstance(image, Image):
            printError(verbose=self.verbose, text="O valor fornecido não é uma instância de Image.")
            return False

        existing = self._findExistingImage(image.id)
        if existing is not None:
            # Uma falha pode ser reenfileirada depois que sua causa for corrigida.
            if existing in self.processedImages and not existing.is_processed:
                self.processedImages.remove(existing)
                if existing is image:
                    self._resetForRetry(image)
            else:
                message = f"Já existe uma imagem com o id {image.id}."
                if existing is not image:
                    self._invalidate(image, message)
                else:
                    printError(verbose=self.verbose, text=message)
                return False

        if not self._validateImage(image=image):
            return False

        self.unprocessedImages.append(image)
        printSuccess(verbose=self.verbose, text=f"Imagem {image.id} adicionada à fila.")
        return True

    def _findExistingImage(self, image_id: str) -> Image | None:
        return next(
            (image for image in self.unprocessedImages + self.processedImages if image.id == image_id),
            None,
        )

    @staticmethod
    def _resetForRetry(image: Image) -> None:
        image.rotules = []
        image.data = None
        image.original_data = None
        image.text_mask = None
        image.is_valid = None
        image.is_processed = False
        image.error = None
        image.metadata = {}

    def _getImageById(self, id: str, images: Sequence[Image]) -> Image | None:
        for image in images:
            if image.id == id:
                printSuccess(verbose=self.verbose, text=f"Imagem encontrada para o id {id}.")
                return image

        printError(verbose=self.verbose, text=f"Nenhuma imagem encontrada para o id {id}.")
        return None

    def _popImageById(self, image_id: str) -> Image | None:
        for index, image in enumerate(self.unprocessedImages):
            if image.id == image_id:
                return self.unprocessedImages.pop(index)
        printError(verbose=self.verbose, text=f"Nenhuma imagem pendente encontrada para o id {image_id}.")
        return None

    def _getNextImage(self) -> Image | None:
        if not self.unprocessedImages:
            printError(verbose=self.verbose, text="Sem imagens para processar.")
            return None

        image = self.unprocessedImages.pop(0)
        printSuccess(verbose=self.verbose, text=f"Imagem {image.id} obtida para processamento.")
        return image

    @staticmethod
    def _validateCount(n_images: int) -> int:
        if isinstance(n_images, bool) or not isinstance(n_images, int):
            raise TypeError("n_images deve ser um número inteiro.")
        if n_images < -1:
            raise ValueError("n_images deve ser -1, zero ou um inteiro positivo.")
        return n_images

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------
    def _processSingleImage(self, image: Image) -> Image:
        try:
            if image.is_valid is not True and not self._validateImage(image):
                image.metadata.setdefault("status", "invalid")
                return image

            image.error = None
            image = self._getRotules(image)
            if image.rotules:
                image = self._removeText(image)
                image = self._reconstructRegions(image)
                if self.imageEnhancer is not None or self.ollamaClient is not None:
                    image = self._enhanceImage(image)
            image = self._buildImage(image)
        except Exception as error:  # O item não é perdido se uma etapa falhar.
            image.is_processed = False
            image.error = f"Falha ao processar a imagem: {error}"
            image.metadata["status"] = "error"
            printError(verbose=self.verbose, text=image.error)
        finally:
            self._addProcessedImage(image)
        return image

    def _validateImage(self, image: Image) -> bool:
        if image is None or not isinstance(image, Image):
            printError(verbose=self.verbose, text="A imagem fornecida é nula ou inválida.")
            return False
        if not isinstance(image.id, str) or not image.id.strip():
            return self._invalidate(image, "A imagem fornecida não possui um id válido.")
        if not image.path or not isinstance(image.path, (str, Path)):
            return self._invalidate(image, "A imagem fornecida não possui caminho.")
        if image.is_processed:
            printError(verbose=self.verbose, text="A imagem fornecida já foi processada.")
            return False
        if image.rotules:
            return self._invalidate(image, "A imagem fornecida já possui rótulos processados.")

        path = Path(image.path)
        if not path.is_file():
            return self._invalidate(image, f"O arquivo de imagem não existe: {path}")

        try:
            encoded = np.fromfile(str(path), dtype=np.uint8)
            decoded = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
        except (OSError, ValueError, cv2.error) as error:
            return self._invalidate(image, f"Não foi possível ler a imagem: {error}")

        if decoded is None or decoded.size == 0:
            return self._invalidate(image, f"O arquivo não contém uma imagem decodificável: {path}")
        source_dtype = str(decoded.dtype)
        if decoded.dtype != np.uint8:
            if np.issubdtype(decoded.dtype, np.integer):
                type_info = np.iinfo(decoded.dtype)
                scale = 255.0 / max(1, type_info.max - type_info.min)
                decoded = np.clip(
                    (decoded.astype(np.float32) - type_info.min) * scale,
                    0,
                    255,
                ).astype(np.uint8)
            elif np.issubdtype(decoded.dtype, np.floating):
                decoded = np.nan_to_num(decoded, nan=0.0, posinf=255.0, neginf=0.0)
                if decoded.size and float(decoded.min()) >= 0.0 and float(decoded.max()) <= 1.0:
                    decoded = decoded * 255.0
                decoded = np.clip(decoded, 0, 255).astype(np.uint8)
            else:
                return self._invalidate(image, f"Profundidade de pixels não suportada: {decoded.dtype}")
        if decoded.ndim == 2:
            decoded = cv2.cvtColor(decoded, cv2.COLOR_GRAY2BGR)
        elif decoded.ndim == 3 and decoded.shape[2] == 4:
            decoded = cv2.cvtColor(decoded, cv2.COLOR_BGRA2BGR)
        elif decoded.ndim != 3 or decoded.shape[2] != 3:
            return self._invalidate(image, "O formato de canais da imagem não é suportado.")

        image.original_data = np.ascontiguousarray(decoded)
        image.data = image.original_data.copy()
        image.metadata["sourceDtype"] = source_dtype

        if self.validateAnatomy:
            try:
                accepted, score = self._isAnatomical(image.data)
                image.metadata["anatomyScore"] = score
                image.metadata["anatomyThreshold"] = self.anatomyThreshold
            except Exception as error:
                return self._validationError(
                    image,
                    f"Não foi possível validar o conteúdo anatômico: {error}",
                )
            if not accepted:
                return self._invalidate(
                    image,
                    f"A imagem não foi classificada como anatômica (confiança {score:.3f}).",
                )

        image.is_valid = True
        image.is_processed = False
        image.error = None
        image.metadata["status"] = "queued"
        printSuccess(verbose=self.verbose, text=f"A imagem {image.id} é válida.")
        return True

    def _invalidate(self, image: Image, message: str) -> bool:
        image.is_valid = False
        image.is_processed = False
        image.error = message
        image.metadata["status"] = "invalid"
        printError(verbose=self.verbose, text=message)
        return False

    def _validationError(self, image: Image, message: str) -> bool:
        """Registra falha de infraestrutura sem classificar o conteúdo inválido."""

        image.is_valid = None
        image.is_processed = False
        image.error = message
        image.metadata["status"] = "validation_error"
        printError(verbose=self.verbose, text=message)
        return False

    def _isAnatomical(self, pixels: np.ndarray) -> tuple[bool, float]:
        if self.anatomyValidator is not None:
            result = self.anatomyValidator(pixels.copy())
            if isinstance(result, tuple):
                accepted, score = bool(result[0]), float(result[1])
                return accepted, min(1.0, max(0.0, score))
            if isinstance(result, (bool, np.bool_)):
                return bool(result), 1.0 if result else 0.0
            score = min(1.0, max(0.0, float(result)))
        else:
            score = self._clipAnatomyScore(pixels)
        return score >= self.anatomyThreshold, score

    def _clipAnatomyScore(self, pixels: np.ndarray) -> float:
        """Classifica a imagem por similaridade zero-shot com OpenAI CLIP."""

        if self._clipModel is None:
            try:
                import clip
                import torch
            except ImportError as error:  # pragma: no cover - depende do ambiente
                raise RuntimeError(
                    "OpenAI CLIP não está instalado; instale o requirements.txt "
                    "ou forneça anatomy_validator/validate_anatomy=False."
                ) from error

            device = self.clipDevice or ("cuda" if torch.cuda.is_available() else "cpu")
            self._clipModel, self._clipPreprocess = clip.load(
                self.clipModelName,
                device=device,
                jit=False,
            )
            self._clipModel.eval()
            prompts = self._POSITIVE_ANATOMY_PROMPTS + self._NEGATIVE_ANATOMY_PROMPTS
            self._clipTokens = clip.tokenize(prompts).to(device)
            self._torch = torch
            self.clipDevice = device

        from PIL import Image as PillowImage

        rgb = cv2.cvtColor(pixels, cv2.COLOR_BGR2RGB)
        tensor = self._clipPreprocess(PillowImage.fromarray(rgb)).unsqueeze(0).to(self.clipDevice)
        with self._torch.inference_mode():
            logits, _ = self._clipModel(tensor, self._clipTokens)
            probabilities = logits.softmax(dim=-1)[0]
        positives = len(self._POSITIVE_ANATOMY_PROMPTS)
        return float(probabilities[:positives].sum().item())

    def _getOcrReader(self) -> Any:
        if self._ocrReader is None:
            try:
                import easyocr
            except ImportError as error:  # pragma: no cover - depende do ambiente
                raise RuntimeError("EasyOCR não está instalado; instale o requirements.txt.") from error
            self._ocrReader = easyocr.Reader(self.ocrLanguages, gpu=self.ocrGpu)
        return self._ocrReader

    def _getRotules(self, image: Image) -> Image:
        if image.data is None:
            raise ValueError("A imagem não foi carregada antes do OCR.")

        reader = self._getOcrReader()
        results = reader.readtext(
            image.data,
            detail=1,
            paragraph=False,
            canvas_size=2560,
            mag_ratio=2.0,
        )

        height, width = image.data.shape[:2]
        rotules: list[Rotule] = []
        for result in results:
            if len(result) < 3:
                continue
            box, text, confidence = result[0], result[1], float(result[2])
            normalized_text = " ".join(str(text).replace("\r", "\n").split())
            if confidence < self.ocrConfidence or not normalized_text:
                continue

            points = np.asarray(box, dtype=np.float32).reshape(-1, 2)
            if len(points) < 3:
                continue
            points[:, 0] = np.clip(points[:, 0], 0, width - 1)
            points[:, 1] = np.clip(points[:, 1], 0, height - 1)
            integer_points = np.rint(points).astype(np.int32)
            rotules.append(
                Rotule(
                    text=normalized_text,
                    x=float(points[:, 0].mean()),
                    y=float(points[:, 1].mean()),
                    confidence=confidence,
                    polygon=[tuple(point) for point in integer_points.tolist()],
                )
            )

        image.rotules = rotules
        image.metadata["ocr"] = {
            "engine": "easyocr",
            "languages": list(self.ocrLanguages),
            "minimumConfidence": self.ocrConfidence,
            "detectedCount": len(rotules),
        }
        printSuccess(verbose=self.verbose, text=f"{len(rotules)} rótulo(s) encontrado(s) em {image.id}.")
        return image

    def _removeText(self, image: Image) -> Image:
        """Cria a máscara com OpenCV e apaga os pixels na cópia de trabalho."""

        if image.data is None:
            raise ValueError("A imagem não possui pixels para remover.")

        mask = self._createTextMask(image.data, image.rotules)

        image.text_mask = mask
        removed = image.data.copy()
        removed[mask > 0] = 0
        image.data = removed
        image.metadata["maskedPixelCount"] = int(np.count_nonzero(mask))
        return image

    def _createTextMask(self, pixels: np.ndarray, rotules: Sequence[Rotule]) -> np.ndarray:
        """Isola os traços dos caracteres usando contraste local em CIELAB.

        Usar a caixa inteira retornada pelo OCR pode apagar anatomia que esteja
        atrás do texto. A mediana do entorno serve como estimativa do fundo e o
        limiar de Otsu seleciona somente pixels que destoam dele.
        """

        height, width = pixels.shape[:2]
        lab = cv2.cvtColor(pixels, cv2.COLOR_BGR2LAB).astype(np.float32)
        mask = np.zeros((height, width), dtype=np.uint8)
        for rotule in rotules:
            if len(rotule.polygon) < 3:
                continue
            polygon = np.asarray(rotule.polygon, dtype=np.int32)
            region = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(region, [polygon], 255)

            box = rotule.bounding_box
            text_height = max(1, box[3] - box[1] + 1) if box is not None else 3
            ring_radius = max(3, min(9, int(round(text_height * 0.35))))
            ring_kernel = cv2.getStructuringElement(
                cv2.MORPH_ELLIPSE,
                (ring_radius * 2 + 1, ring_radius * 2 + 1),
            )
            expanded = cv2.dilate(region, ring_kernel)
            ring = cv2.subtract(expanded, region)
            ring_pixels = lab[ring > 0]
            if ring_pixels.size == 0:
                cv2.fillPoly(mask, [polygon], 255)
                continue

            background = np.median(ring_pixels, axis=0)
            distance = np.linalg.norm(lab - background, axis=2)
            region_values = np.clip(distance[region > 0], 0, 255).astype(np.uint8)
            if region_values.size == 0:
                continue

            otsu_threshold, _ = cv2.threshold(
                region_values,
                0,
                255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU,
            )
            contrast_threshold = max(12.0, float(otsu_threshold) * 0.65)
            letters = ((distance >= contrast_threshold) & (region > 0)).astype(np.uint8) * 255
            letters = cv2.morphologyEx(letters, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
            mask = cv2.bitwise_or(mask, letters)

        if self.textMargin > 0 and np.any(mask):
            size = self.textMargin * 2 + 1
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
            mask = cv2.dilate(mask, kernel)
        return mask

    def _reconstructRegions(self, image: Image) -> Image:
        """Reconstrói as regiões mascaradas com o algoritmo Telea do OpenCV."""

        if image.data is None or image.text_mask is None:
            raise ValueError("A remoção dos textos deve ocorrer antes da reconstrução.")
        source = image.original_data if image.original_data is not None else image.data
        if np.any(image.text_mask):
            image.data = cv2.inpaint(
                source,
                image.text_mask,
                self.inpaintRadius,
                cv2.INPAINT_TELEA,
            )
        else:
            image.data = source.copy()
        image.metadata["reconstruction"] = {
            "engine": "opencv",
            "method": "telea",
            "radius": self.inpaintRadius,
        }
        return image

    # Compatibilidade com as duas grafias encontradas no esqueleto/README.
    def _reconstrucRegions(self, image: Image) -> Image:
        return self._reconstructRegions(image)

    def _reconstrucRegios(self, image: Image) -> Image:
        return self._reconstructRegions(image)

    def _enhanceImage(self, image: Image) -> Image:
        """Executa um adapter image-to-image ou usa Ollama para escolher ajustes.

        Ollama vision produz texto, não pixels editados. Por isso, quando um
        cliente oficial é fornecido, ele retorna parâmetros estruturados e os
        filtros correspondentes são executados pelo OpenCV.
        """

        if image.data is None:
            raise ValueError("A imagem não possui pixels para aprimoramento.")

        try:
            result: Any
            if self.imageEnhancer is not None:
                result = self.imageEnhancer(image.data.copy(), self.enhancementPrompt)
            elif callable(self.ollamaClient) and not hasattr(self.ollamaClient, "generate"):
                result = self.ollamaClient(image.data.copy(), self.enhancementPrompt)
            elif hasattr(self.ollamaClient, "enhance_image"):
                result = self.ollamaClient.enhance_image(
                    image.data.copy(),
                    self.enhancementPrompt,
                )
            elif hasattr(self.ollamaClient, "generate"):
                parameters = self._getOllamaEnhancementParameters(image.data)
                if parameters is None:
                    return image
                image.data = self._applyEnhancementParameters(image.data, parameters)
                image.metadata["enhancement"] = {
                    "engine": "ollama+opencv",
                    "model": self.ollamaModel,
                    "parameters": parameters,
                }
                return image
            else:
                printError(verbose=self.verbose, text="O cliente de aprimoramento não possui uma API suportada.")
                return image

            enhanced = self._decodeEnhancedImage(result)
            if enhanced is None:
                raise ValueError("O adapter não retornou uma imagem válida.")
            if enhanced.shape[:2] != image.data.shape[:2]:
                raise ValueError("O adapter alterou as dimensões da imagem.")
            image.data = enhanced
            image.metadata["enhancement"] = {"engine": "custom-adapter"}
        except Exception as error:
            # Aprimoramento é opcional: a reconstrução válida continua disponível.
            image.metadata["enhancement"] = {"status": "skipped", "error": str(error)}
            printError(verbose=self.verbose, text=f"Não foi possível aprimorar a imagem: {error}")
        return image

    def _getOllamaEnhancementParameters(self, pixels: np.ndarray) -> dict[str, float] | None:
        model = self.ollamaModel or getattr(self.ollamaClient, "model", None)
        if not model:
            raise ValueError("Informe ollama_model ao usar um cliente Ollama oficial.")

        success, encoded = cv2.imencode(".png", pixels)
        if not success:
            raise ValueError("Não foi possível codificar a imagem para o Ollama.")

        response = self.ollamaClient.generate(
            model=model,
            prompt=self.enhancementPrompt,
            images=[encoded.tobytes()],
            format="json",
            options={"temperature": 0},
        )
        raw = response.get("response") if isinstance(response, Mapping) else getattr(response, "response", None)
        if not raw:
            raise ValueError("O Ollama não retornou parâmetros de aprimoramento.")

        match = re.search(r"\{.*\}", str(raw), flags=re.DOTALL)
        if match is None:
            raise ValueError("A resposta do Ollama não contém um objeto JSON.")
        parsed = json.loads(match.group(0))
        if not isinstance(parsed, Mapping):
            raise ValueError("Os parâmetros retornados pelo Ollama são inválidos.")
        return self._sanitizeEnhancementParameters(parsed)

    @staticmethod
    def _sanitizeEnhancementParameters(parameters: Mapping[str, Any]) -> dict[str, float]:
        limits = {
            "contrast": (0.8, 1.3, 1.0),
            "brightness": (-20.0, 20.0, 0.0),
            "saturation": (0.8, 1.2, 1.0),
            "sharpness": (0.0, 1.0, 0.0),
            "denoise": (0.0, 10.0, 0.0),
        }
        sanitized: dict[str, float] = {}
        for name, (minimum, maximum, default) in limits.items():
            try:
                value = float(parameters.get(name, default))
            except (TypeError, ValueError):
                value = default
            sanitized[name] = min(maximum, max(minimum, value))
        return sanitized

    @classmethod
    def _applyEnhancementParameters(
        cls,
        pixels: np.ndarray,
        raw_parameters: Mapping[str, Any],
    ) -> np.ndarray:
        parameters = cls._sanitizeEnhancementParameters(raw_parameters)
        result = pixels.copy()

        if parameters["denoise"] > 0:
            strength = parameters["denoise"]
            result = cv2.fastNlMeansDenoisingColored(result, None, strength, strength, 7, 21)

        result = np.clip(
            result.astype(np.float32) * parameters["contrast"] + parameters["brightness"],
            0,
            255,
        ).astype(np.uint8)

        if parameters["saturation"] != 1.0:
            hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 1] *= parameters["saturation"]
            hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
            result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

        if parameters["sharpness"] > 0:
            amount = parameters["sharpness"]
            blurred = cv2.GaussianBlur(result, (0, 0), 1.0)
            result = cv2.addWeighted(result, 1.0 + amount, blurred, -amount, 0)
        return result

    @classmethod
    def _decodeEnhancedImage(cls, value: Any) -> np.ndarray | None:
        if isinstance(value, np.ndarray):
            decoded = value
        elif isinstance(value, Mapping):
            candidate = value.get("image", value.get("data", value.get("images")))
            if isinstance(candidate, Sequence) and not isinstance(candidate, (str, bytes, bytearray)):
                candidate = candidate[0] if candidate else None
            return cls._decodeEnhancedImage(candidate)
        elif isinstance(value, (bytes, bytearray)):
            decoded = cv2.imdecode(np.frombuffer(value, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
        elif isinstance(value, (str, Path)):
            string_value = str(value)
            possible_path = Path(string_value)
            try:
                is_file = len(string_value) < 1024 and possible_path.is_file()
            except OSError:
                is_file = False
            if is_file:
                encoded = np.fromfile(str(possible_path), dtype=np.uint8)
                decoded = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
            else:
                payload = string_value.split(",", 1)[-1] if string_value.startswith("data:") else string_value
                try:
                    raw = base64.b64decode(payload, validate=True)
                except (ValueError, TypeError):
                    return None
                decoded = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
        else:
            return None

        if decoded is None or decoded.size == 0:
            return None
        if decoded.ndim == 2:
            decoded = cv2.cvtColor(decoded, cv2.COLOR_GRAY2BGR)
        elif decoded.ndim == 3 and decoded.shape[2] == 4:
            decoded = cv2.cvtColor(decoded, cv2.COLOR_BGRA2BGR)
        elif decoded.ndim != 3 or decoded.shape[2] != 3:
            return None
        if decoded.dtype != np.uint8:
            if np.issubdtype(decoded.dtype, np.floating):
                decoded = np.nan_to_num(decoded, nan=0.0, posinf=255.0, neginf=0.0)
                if decoded.size and float(decoded.min()) >= 0.0 and float(decoded.max()) <= 1.0:
                    decoded = decoded * 255.0
                decoded = np.clip(decoded, 0, 255).astype(np.uint8)
            elif np.issubdtype(decoded.dtype, np.integer):
                type_info = np.iinfo(decoded.dtype)
                scale = 255.0 / max(1, type_info.max - type_info.min)
                decoded = np.clip(
                    (decoded.astype(np.float32) - type_info.min) * scale,
                    0,
                    255,
                ).astype(np.uint8)
            else:
                return None
        return np.ascontiguousarray(decoded)

    def _buildImage(self, image: Image) -> Image:
        if image.data is None:
            raise ValueError("O pipeline terminou sem uma imagem de resultado.")
        height, width = image.data.shape[:2]
        image.is_processed = True
        image.error = None
        image.metadata.update(
            {
                "status": "processed",
                "width": int(width),
                "height": int(height),
                "rotuleCount": len(image.rotules),
            }
        )
        printSuccess(verbose=self.verbose, text=f"Imagem {image.id} processada com sucesso.")
        return image

    def _addProcessedImage(self, image: Image) -> None:
        for index, current in enumerate(self.processedImages):
            if current.id == image.id:
                self.processedImages[index] = image
                return
        self.processedImages.append(image)


__all__ = ["ImageService"]
