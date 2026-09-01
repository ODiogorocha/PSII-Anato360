# pln_study_module

Módulo Python de PLN para estudo baseado em PDF, usando **Ollama** como decoder
(embeddings + LLM). Feito para ser importado como componente de um sistema maior
(ex: um backend, um bot, uma API).

## O que ele faz

1. Recebe um PDF → extrai o texto (`pypdf`)
2. Divide o texto em chunks com sobreposição (`chunker.py`)
3. Gera embeddings de cada chunk usando o Ollama (`/api/embeddings`)
4. Guarda tudo em um índice vetorial em memória (`vector_store.py`, numpy + cosseno)
5. Ao receber uma pergunta: gera o embedding da pergunta, busca os chunks mais
   relevantes, monta um prompt de contexto e chama o LLM do Ollama (`/api/chat`)
   para responder — só com base no que está no PDF (RAG simples)
6. Também consegue gerar **dicas de estudo** a partir do documento, com ou sem foco

## Estrutura

```
pln_study_module/
├── pln_study_module/
│   ├── __init__.py          # API pública (StudyAssistant, configs)
│   ├── config.py            # dataclasses de configuração
│   ├── pdf_loader.py        # extração de texto do PDF
│   ├── chunker.py           # divisão em chunks
│   ├── vector_store.py      # índice vetorial em memória + busca por similaridade
│   ├── ollama_client.py     # chamadas HTTP ao Ollama (embeddings + chat)
│   └── study_assistant.py   # classe principal (interface do módulo)
├── example_usage.py
├── requirements.txt
└── README.md
```

## Instalação

```bash
pip install -r requirements.txt
```

No Ollama, puxe os modelos que for usar:

```bash
ollama pull nomic-embed-text   # embeddings
ollama pull llama3.1           # decoder/LLM (pode trocar por outro)
```

## Uso básico

```python
from pln_study_module import StudyAssistant, OllamaConfig

assistant = StudyAssistant(
    ollama_config=OllamaConfig(host="http://localhost:11434", llm_model="llama3.1")
)

doc_id = assistant.load_pdf("material.pdf")

resposta = assistant.ask("O que é overfitting?", doc_id=doc_id)
dicas = assistant.generate_study_tips(doc_id=doc_id)
dicas_foco = assistant.generate_study_tips(doc_id=doc_id, focus="prova sobre CNNs")
```

## Integrando em um sistema maior

- A classe `StudyAssistant` é o único ponto de entrada que o sistema maior
  precisa conhecer — os outros arquivos são detalhes internos.
- Um `StudyAssistant` pode manter **vários PDFs indexados ao mesmo tempo**
  (cada `load_pdf` retorna um `doc_id` diferente); guarde esse `doc_id` em
  quem estiver orquestrando (ex: sessão de usuário, tabela de documentos).
- `ask(question, doc_id=None)` sem `doc_id` busca em todos os documentos
  indexados naquela instância — útil se o "maior sistema" quiser um assistente
  que responda com base em vários materiais ao mesmo tempo.
- Todas as exceções relevantes derivam de erros claros
  (`FileNotFoundError`, `ValueError`, `RuntimeError`, `OllamaClientError`),
  fáceis de capturar na camada que chama o módulo.
- O índice vetorial é **em memória** (não persiste em disco). Se o sistema
  maior precisar persistir entre reinícios, dá para serializar
  `VectorStore._chunks` (texto + embedding) — ponto de extensão natural.

## Extensões possíveis

- Trocar o vector store em memória por um backend persistente (ex: Chroma, pgvector)
  mantendo a mesma interface (`add_document`, `search`, `get_all_text`)
- Adicionar streaming das respostas do Ollama (`"stream": True` no `chat`)
- Suporte a múltiplos PDFs por "matéria"/"disciplina" com metadados extras