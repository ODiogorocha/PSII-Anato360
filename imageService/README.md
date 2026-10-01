# Serviço de processamento de imagens

O presente serviço foi elaborado com o propósito de centralizar as funcionalidades de tratamento das imagens enviadas pelo usuário ou obtidas de um documento PDF.

O serviço deverá ser capaz de:
- Carregar imagens em uma lista de processamento;
- Verificar, antes de adicionar à lista, se a imagem enviada contem estruturas anatômicas;
- Identificar os textos, rótulos presentes na imagens;
- Registrar os textos identificados, com suas respectivas posições (X, Y) na imagem;
- Remover os elementos textuais;
- Reconstruir as àreas afetadas pela remoção textual;
- Disponibizar a imagem processada e os metadados extraídos;
- Utilizar, opcionalmente, o cliente Ollama para o ajuste das imagens reconstruídas;

O serviço constitui um componente de processamento do sistema e, portanto, não realiza acesso direto a bases de dados. A persistência dos resultados deverá ser responsabilidade de outro serviço ou camada da aplicação.

## Estrutura

O serviço poderá disponibilizar um conjunto reduzido de funções públicas, mantendo as etapas internas de processamento encapsuladas:

#### Públicas
- `addImage`: adiciona uma nova imagem na fila de processamento;
- `processImage`: executa o pipeline de processamento de uma imagem;
- `processBarch`: processa um conjunto de imagen presentes na fila (*n* valores, *lista* de ids ou todas por padrão);
- `getResult`: retorna o resultado de processamento das imagens (*n* valores, *lista* de ids ou todas por padrão).

#### Etapas internas de processamento
1. `_getNextImage`: obtém a próxima imagem da lista, removendo-a da mesma;
2. `_validateImage`: verifica se a imagem é valida e se contém uma estrutura anatômica;
3. `_getRotules`: identifica os textos presentes na imagem e suas respectivas coordenadas;
4. `_removeText`: remove os textos e rótulos identificados;
5. `_reconstrucRegions`: recontroí as regiões afetadas pela removação textual;
6. `_enhanceImage`: se houver um modelo de IA informado no construtor, realiza os ajustes adicionais na imagem usando um prompt;
7. `_buildImage`: organiza a imagem processada e os metadados extraídos para retornar à fila;
8. `_addProcessedImage`: adiciona numa fila de imagens processadas a imagem.

## Fluxograma
```mermaid
flowchart LR
 A["Adicionar imagem (addImage)"] --> B["Inserir na fila de processamento"]

    B --> C["Iniciar processamento (processImage)"]

    C --> D{"Imagem contém estrutura anatômica?"}

    D -- Não --> E["Marcar imagem como inválida"]
    E --> F["Retornar erro ao solicitante"]
    F --> Z["Fim"]

    D -- Sim --> G["Detectar textos e coordenadas (_getTextPoints)"]

    G --> H{"Foram encontrados textos?"}

    H -- Não --> M["Preparar resultado"]

    H -- Sim --> I["Remover textos (_removeText)"]

    I --> J["Reconstruir regiões (_reconstructRegions)"]

    J --> K{"Utilizar processamento adicional?"}

    K -- Sim --> L["Ajustar imagem com Ollama (_enhanceImage)"]
    K -- Não --> M

    L --> M["Preparar resultado (_buildResult)"]

    M --> N["Retornar imagem e metadados"]

    N --> Z

```

## Modelos

`Rotule`: Contém a informação de um rótulo, como o texto e coordenadas.

`Image`: Contém as informações gerais da imagem a ser usada, como seu caminho, flags de processamento, textos e coordenadas.

```mermaid
classDiagram

class Rotule {
    - text: str
    - x: float
    - y: float
    - confidence: float
    - polygon: List~Tuple~

    + init(text, x, y, confidence, polygon)
}

class Image {
    - id: str
    - path: str
    - rotules: List~Rotule~
    - data: ndarray
    - original_data: ndarray
    - text_mask: ndarray
    - is_valid: bool
    - is_processed: bool
    - error: str
    - metadata: dict

    + save(output_path): Path
    + to_dict(include_data): dict
}

class ImageService {
    - unprocessedImages: List~Image~
    - processedImages: List~Image~
    - ollamaClient: OllamaClient

    + init(ollamaClient)
    + addImage(image): bool
    + processImage(imageId, imageIds, n_images)
    + processBatch(imageIds, n_images): List~Image~
    + getResult(imageId, imageIds, n_images): List~Image~

    - _getNextImage(): Image
    - _validateImage(image): bool
    - _getRotules(image): Image
    - _removeText(image): Image
    - _reconstrucRegions(image): Image
    - _enhanceImage(image): Image
    - _buildImage(image): Image
    - _addProcessedImage(image)
}

Image "1" --> "*" Rotule
ImageService "1" --> "*" Image
```

## Instalação e uso

As dependências ficam isoladas neste módulo:

```bash
pip install -r imageService/requirements.txt
```

O código requer Python 3.10 ou mais recente. A suíte rápida pode ser executada
na raiz do repositório com:

```bash
python -m unittest discover -s imageService/tests -v
```

O CLIP e o EasyOCR são carregados apenas quando necessários. Na primeira
execução, as bibliotecas podem baixar os pesos dos modelos. O resultado fica em
memória no atributo `data` do modelo e pode ser persistido explicitamente com
`Image.save(...)`; o arquivo original nunca é sobrescrito.

```python
from imageService import Image, ImageService

service = ImageService(verbose=1, ocr_gpu=False)
image = Image(id="figura-1", path="imagens/anatomia.png")

if service.addImage(image):
    result = service.processImage()
    result.save("resultados/figura-1.png")
    metadata = result.to_dict()
```

Por padrão, `processImage()` consome somente o próximo item da fila e
`processBatch()` consome todos. Ambos aceitam seleção por IDs/quantidade;
`getResult()` retorna todos os resultados quando nenhum filtro é informado.

Para testes ou ambientes sem o CLIP, pode-se fornecer
`anatomy_validator=lambda pixels: True` ou usar `validate_anatomy=False` (neste
último caso ocorre apenas a validação estrutural do arquivo). O OCR também pode
ser substituído por meio de `ocr_reader`.

O parâmetro opcional `image_enhancer` recebe uma função com a assinatura
`(ndarray, prompt) -> ndarray`. Quando são usados `ollamaClient` e
`ollama_model`, o modelo visual escolhe parâmetros conservadores em JSON e o
OpenCV aplica os filtros, pois a API de visão do Ollama não edita pixels
diretamente.

As coordenadas `x`/`y` de cada `Rotule` representam o centro do texto em
pixels. A serialização também fornece `normalizedPosition` no intervalo 0–1;
ela não representa o ponto anatômico indicado por uma eventual linha-guia.



## API HTTP e Docker

O serviço interno `image-processor` escuta na porta 8001 da rede Docker. O backend/worker
envia `POST /process` com multipart `file`, `image_id` e, opcionalmente,
`use_ollama=true|false`. O frontend consulta somente o backend via proxy na porta 80.
A persistência de arquivos e metadados fica no backend, que salva também os rótulos
na base MySQL.

O processamento mantém a sequência existente: validação anatômica pelo CLIP, OCR pelo
EasyOCR, máscara de caracteres, reconstrução Telea/OpenCV e aprimoramento opcional.
O aprimoramento ocorre após a reconstrução de texto. Quando nenhum texto é detectado,
a imagem original é preservada e `metadata.enhancement.reason` informa `no_text_detected`.
O mesmo servidor Ollama usado pelo chat recebe uma prévia da imagem reconstruída e
retorna parâmetros JSON de contraste, brilho, saturação, nitidez e redução de ruído.
Os parâmetros são limitados pelo serviço e aplicados na imagem completa pelo OpenCV.
O Ollama não gera pixels nem reconstitui estruturas anatômicas por si só.

A resposta contém `id`, `isValid`, `isProcessed`, `width`, `height`, `rotules`,
`metadata` e `processed_image_base64` (PNG). `metadata.enhancement.status` pode ser
`applied`, `disabled` ou `skipped`. Se o aprimoramento falhar, o resultado dos scripts
continua disponível e `metadata.enhancement.error` registra o motivo.

| Variável | Padrão | Uso |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | No Docker: `http://ollama:11434` |
| `OLLAMA_VISION_MODEL` | `llama3.2-vision:11b` | Modelo com entrada de imagem |
| `OLLAMA_REQUEST_TIMEOUT` | `180` | Limite da resposta do Ollama em segundos |
| `IMAGE_USE_OLLAMA` | `false` | Padrão quando o formulário não envia `use_ollama`; melhoria visual opcional |
| `IMAGE_VALIDATE_ANATOMY` | `true` | Classificação CLIP; desativar mantém a validação estrutural |
| `IMAGE_OCR_GPU` | `false` | O container padrão instala PyTorch CPU |
| `IMAGE_MAX_BYTES` | `20971520` | Limite de arquivo: 20 MiB |
| `IMAGE_MAX_PIXELS` | `16000000` | Limite de resolução antes de decodificar no OpenCV |
| `IMAGE_LOCK_TIMEOUT` | `5` | Espera pela instância de processamento, em segundos |

A API retorna 413 para arquivos/resoluções excessivas, 415 para formatos não aceitos,
422 para imagens inválidas ou não anatômicas e 503 para falhas temporárias ou ocupação.
O worker pode repetir erros 503. A execução HTTP usa uma instância com exclusão mútua;
as filas e arquivos temporários são limpos ao término de cada requisição.
`GET /health` informa a disponibilidade da API, sem forçar o carregamento dos modelos.

O Dockerfile instala PyTorch/torchvision CPU para funcionar sem GPU. CLIP e EasyOCR
baixam pesos na primeira execução; os volumes do Compose conservam os caches em
`/root/.cache` e `/root/.EasyOCR`. O modelo visual do Ollama é preparado separadamente
por `ollama-models` e requer memória compatível com o modelo escolhido.

Para executar também os testes HTTP, instale `fastapi`, `python-multipart` e `httpx`
no ambiente de testes. As suítes usam OCR/validação/HTTP controlados, sem baixar pesos:

```bash
python -m unittest discover -s imageService/tests -v
python -m unittest discover -s IA_module/tests -v
```
