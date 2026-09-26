# Executando o Anato360 com Docker

O `compose.yaml` inicia três componentes:

- a aplicação, com o frontend React servido pelo Nginx e a API Django pelo Gunicorn;
- o Ollama;
- uma tarefa de inicialização que baixa os modelos configurados.

## Início rápido

```bash
docker compose up --build
```

No primeiro início, o download de `nomic-embed-text` e `llama3.1` pode demorar.
Quando a aplicação estiver pronta, acesse <http://localhost:8080>.

Para executar em segundo plano:

```bash
docker compose up --build -d
```

Para acompanhar os logs:

```bash
docker compose logs -f app ollama
```

## Configuração opcional

As variáveis podem ser definidas em um arquivo `.env` na raiz:

```dotenv
APP_PORT=8080
DJANGO_SECRET_KEY=troque-esta-chave
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_DEBUG=false
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3.1
```

O banco SQLite, os arquivos enviados e os modelos do Ollama ficam em volumes
Docker e sobrevivem à recriação dos containers.

## Comandos úteis

Criar um usuário administrador:

```bash
docker compose exec app python manage.py createsuperuser
```

Parar os serviços sem apagar os dados:

```bash
docker compose down
```
