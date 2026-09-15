# Classe de tratamento de imagens

`Filipe S. Kaizer`

**Propósito:** encapsular o sistema de tratamento de imagens.
# Processamento de imagens anatômicas

O script detecta os rótulos com EasyOCR, remove somente os traços dos caracteres,
localiza linhas-guia sem confundi-las com o texto e salva o ponto indicado por cada
linha. A imagem processada recebe um marcador vermelho exatamente nas coordenadas
gravadas no JSON.

## Instalação

```bash
python -m pip install -r processingImages/requirements.txt
```

## Execução

Na raiz do projeto:

```bash
python processingImages/processingImages.py
```

Por padrão, as imagens em `processingImages/images` são processadas e os resultados
são gravados em:

- `processingImages/images/processedImages`: imagens sem os textos;
- `processingImages/anotations`: textos, caixas e pontos detectados em JSON.

Também é possível escolher as pastas e usar GPU:

```bash
python processingImages/processingImages.py --input minhas-imagens --output saida --annotations pontos --gpu
```

Os pontos absolutos ficam em `targetPoint` e os normalizados, no intervalo de 0 a
1, em `normalizedTargetPoint`. Quando um rótulo externo não possui uma linha
confiável, ambos são `null`, `detectionType` recebe `arrow_not_found` e
`requiresValidation` recebe `true`; assim o algoritmo não inventa um ponto no
centro do texto.
