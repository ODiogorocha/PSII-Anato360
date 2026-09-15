from ImageService import ImageService
from models.image import Image

class ImageServiceController:
    def __init__(self):
        self.imageService = ImageService(
            verbose=2,
            ollamaClient=None,
            ocr_gpu=False
        )

    def addImage(self, image):
        if self.imageService.addImage(image=image):
            result = self.imageService.processImage()
            result.save("figura1.png")
            metadata = result.to_dict()
    # Implementar abaixo o processamento automático


if __name__ == "__main__":
    imageController = ImageServiceController()

    image = Image(id="Figura-1", path="imageService/figures/dog_heart.png")

    imageController.addImage(image=image)


