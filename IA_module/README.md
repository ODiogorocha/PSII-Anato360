# IA_module — chat e estudo com Ollama ou OpenRouter

O módulo conecta o chatbot do Anato360 ao provedor selecionado no código principal.
A conversa funciona sem PDF e aceita histórico e contexto textual da imagem em estudo.
O backend é responsável por autenticar o usuário, isolar conversas e persistir mensagens.

```python
from IA_module import StudyAssistant

assistant = StudyAssistant()
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

Em [`study_assistant.py`](study_assistant.py), escolha o provedor antes de construir
a imagem Docker da API:

```python
AI_PROVIDER = "ollama"  # padrão; altere para "openrouter" para usar a API externa
```

Essa constante é usada por `StudyAssistant()` na inicialização do backend. Não é
uma variável do `.env`. Fora do serviço, testes e integrações podem sobrescrevê-la
explicitamente: `StudyAssistant(provider="openrouter")`. A chave nunca fica no código.

### OpenRouter

Preencha os dois campos obrigatórios no `.env` da máquina que executa a **API**:

```dotenv
OPENROUTER_MODEL=provedor/id-do-modelo
OPENROUTER_API_KEY=sua-chave-openrouter
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
OPENROUTER_REQUEST_TIMEOUT=300
```

`OPENROUTER_MODEL` é o ID completo copiado do [catálogo do OpenRouter](https://openrouter.ai/models).
Crie a chave em [API Keys](https://openrouter.ai/settings/keys). Os dois últimos
campos são opcionais: embeddings são usados apenas pelos métodos de PDFs/RAG;
o timeout é em segundos. Modelos de conversa e embeddings têm funções diferentes.
Credenciais/modelo ausentes ou timeout inválido impedem a inicialização quando
OpenRouter está selecionado. Com Ollama, os campos OpenRouter podem ficar vazios.

O Compose repassa essas variáveis ao backend, inclusive em `compose.server.yaml`.
Executar Python fora do Docker exige exportá-las no ambiente: o módulo não carrega
o arquivo `.env` automaticamente. O cliente usa as APIs oficiais de
[chat](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion) e
[embeddings](https://openrouter.ai/docs/api/api-reference/embeddings/submit-an-embedding-request).
Chat, contexto textual, histórico e trechos de PDFs são enviados ao OpenRouter;
esse modo não precisa de Ollama para conversar ou indexar documentos e não alterna
automaticamente entre os dois provedores em caso de falha.

### Ollama

| Variável | Padrão | Uso |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | No Compose: `http://ollama:11434` |
| `OLLAMA_CHAT_MODEL` | `llama3.1:8b` | Modelo de conversa; aceita `OLLAMA_LLM_MODEL` como alias legado |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embeddings, necessários apenas ao usar PDFs/RAG |
| `OLLAMA_REQUEST_TIMEOUT` | `180` | Limite de leitura da resposta em segundos; Compose usa 300 |
| `OLLAMA_FALLBACK_HOST` | vazio | Ollama alternativo em caso de falha do preferencial |
| `OLLAMA_PRIMARY_TIMEOUT` | `60` | Espera inicial quando existe fallback; reserva parte do orçamento total para o alternativo |

No [modo servidor + Windows](../TAILSCALE.md), a API permanece no servidor,
`OLLAMA_HOST` aponta ao gateway Windows e `OLLAMA_FALLBACK_HOST` ao Ollama local.
Cada solicitação volta a tentar o preferencial; erros de conexão, timeout, HTTP 5xx,
modelo ausente e respostas inválidas do chat permitem fallback. As tentativas
compartilham o orçamento de leitura de `OLLAMA_REQUEST_TIMEOUT`.

`chat(..., language="es")` responde em espanhol; o padrão é português.
`assistant.chat_status()` retorna `ready`, `model_missing` ou `unavailable`.
Com Ollama, consulta `/api/tags`. Com OpenRouter, verifica a chave em `/api/v1/key`
e o modelo em `/api/v1/models`, sem inferência. Isso verifica autenticação e catálogo;
saldo, limites e disponibilidade no momento da geração ainda podem impedir a resposta.

Os modelos precisam estar instalados no servidor Ollama. O Compose prepara os modelos
configurados no serviço `ollama-models`. Uma falha de conexão, timeout, modelo ausente ou
resposta inválida gera `OllamaClientError`. No OpenRouter, falhas geram
`OpenRouterClientError`; ambos derivam de `AIClientError`, sem respostas simuladas.
A API retorna HTTP 503 e não salva mensagens quando a geração falha.

### Atualizar somente o container que executa o módulo

O módulo roda **dentro do serviço `api`**, sem container separado. Depois de
preencher o ambiente e alterar `AI_PROVIDER`, execute na raiz do projeto:

```bash
docker compose up -d --build --no-deps api
```

Para a implantação servidor + Windows, execute **no servidor**:

```bash
docker compose --env-file .env --env-file .env.server -f compose.server.yaml up -d --build --no-deps api
```

Mantenha o nome de projeto (`-p NOME`, se já utilizado). Esses comandos atualizam
a API e preservam os volumes, sem recriar os outros serviços. O `compose.windows.yaml`
não executa esse módulo; ele hospeda os serviços de cálculo de imagens e Ollama.
`docker compose restart` não incorpora código novo nem variáveis de ambiente alteradas.

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
Essa etapa visual permanece com Ollama, independentemente do provedor do chat.

## Dependências e testes

Para o backend, instale o `requirements.txt` da raiz. O módulo usa `requests`, `numpy`
e `pypdf`. O cliente HTTP pode ser importado sem carregar as dependências de PDFs.

```bash
python -m unittest discover -s IA_module/tests -v
```

Os testes verificam os contratos HTTP com respostas controladas, histórico, contexto,
RAG nos dois provedores, modelos ausentes, credenciais e falhas de comunicação.
Não executam inferência real nem baixam modelos.
