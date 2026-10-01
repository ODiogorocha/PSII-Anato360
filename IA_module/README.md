# IA_module — chat e estudo com Ollama

O módulo conecta o chatbot do Anato360 ao Ollama compartilhado com o `imageService`.
A conversa funciona sem PDF e aceita histórico e contexto textual da imagem em estudo.
O backend é responsável por autenticar o usuário, isolar conversas e persistir mensagens.

```python
from IA_module import StudyAssistant, OllamaConfig

assistant = StudyAssistant(OllamaConfig(host="http://ollama:11434"))
answer = assistant.chat(
    "Qual a função desse órgão?",
    history=[
        {"role": "user", "content": "Estou estudando o fígado."},
        {"role": "assistant", "content": "Vamos revisar sua anatomia."},
    ],
    context="Título: Fígado; rótulos extraídos: lobo esquerdo, veia porta",
)
```

O contexto acima contém título e rótulos, não os pixels da imagem. O histórico enviado
à API conserva até 20 mensagens de usuário/assistente e até 24 mil caracteres.
Papéis `system` fornecidos no histórico não são aceitos.

## Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | No Compose: `http://ollama:11434` |
| `OLLAMA_CHAT_MODEL` | `llama3.1:8b` | Modelo de conversa; aceita `OLLAMA_LLM_MODEL` como alias legado |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embeddings, necessários apenas ao usar PDFs/RAG |
| `OLLAMA_REQUEST_TIMEOUT` | `180` | Limite de leitura da resposta em segundos; Compose usa 300 |

`chat(..., language="es")` responde em espanhol; o padrão é português.
`assistant.ollama.chat_status()` consulta `/api/tags` e retorna `ready`,
`model_missing` ou `unavailable`, sem carregar o modelo nem executar inferência.

Os modelos precisam estar instalados no servidor Ollama. O Compose prepara os modelos
configurados no serviço `ollama-models`. Uma falha de conexão, timeout, modelo ausente ou
resposta inválida gera `OllamaClientError`, sem respostas simuladas.

## PDFs opcionais (RAG)

```python
doc_id = assistant.load_pdf("material.pdf")
answer = assistant.ask("Quais são as estruturas descritas?", doc_id=doc_id)
tips = assistant.generate_study_tips(doc_id, focus="anatomia do coração")
assistant.unload_document(doc_id)
```

`ask` consulta trechos do documento indicado. Sem `doc_id`, consulta todos os PDFs da
instância; sem PDFs, faz uma conversa geral. Um `doc_id` inexistente é rejeitado.
O índice é em memória: crie instâncias isoladas por usuário ao integrar PDFs e reindexe
após reinícios. O chat do site usa `chat`, sem depender desse índice.

O cliente usa os endpoints oficiais do Ollama para [chat](https://docs.ollama.com/api/chat),
[embeddings em lote](https://docs.ollama.com/api/embed) e
[visão com imagens em base64](https://docs.ollama.com/api/generate).
`OllamaClient.generate` é utilizado pelo `imageService` para selecionar parâmetros de
filtros; o modelo visual retorna texto estruturado e o OpenCV aplica os filtros aos pixels.

## Dependências e testes

Para o backend, instale o `requirements.txt` da raiz. O módulo usa `requests`, `numpy`
e `pypdf`. O cliente HTTP pode ser importado sem carregar as dependências de PDFs.

```bash
python -m unittest discover -s IA_module/tests -v
```

Os testes verificam os contratos HTTP com respostas controladas, histórico, contexto,
RAG, modelos ausentes e falhas de comunicação. Não executam inferência real nem baixam modelos.
