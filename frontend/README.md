# Frontend Anato360

Interface React/TypeScript baseada no código exportado em `Website with User Features.zip`.
O ponto de entrada é `src/App.tsx`; `frontend_anato360/` conserva o protótipo anterior.

## Executar

Na raiz do repositório, configure `.env` conforme `.env.example` e execute
`docker compose up -d --build`. Abra <http://localhost> na porta 80.

Para desenvolvimento, com a API Docker ativa:

```bash
cd frontend
npm ci
npm run dev
```

O proxy Vite usa `http://127.0.0.1:8000`; `API_PROXY_TARGET` permite alterá-lo.
Em produção o Nginx encaminha `/api/` para o container Django.

## Fluxos conectados

- Cadastro/login e permissões recebidas do backend; nenhum e-mail concede acesso administrativo.
- Upload privado ou compartilhado, processamento assíncrono, revisão de rótulos e notificações.
- Quiz de rótulos confirmados, pontuação calculada na API e progresso persistido no MySQL.
- Chat com histórico por usuário, português/espanhol, contexto de imagem e estado real do assistente.
- Tema e idioma persistidos no navegador. As imagens são baixadas com autenticação.

O visualizador de imagens mantém a perspectiva do protótipo e alinha os marcadores
à imagem completa. Um upload 2D não contém vistas adicionais para reconstruir uma peça 3D.

## Verificar

```bash
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

O Playwright usa o site Docker real na porta 80. `E2E_BASE_URL` altera o endereço.
Ative `E2E_PROCESS_IMAGES=1` para testar upload/OCR/quiz e `E2E_CHAT=1` para
testar uma resposta real do Ollama. Os testes longos exigem os modelos instalados;
o teste de imagens aceita até 20 minutos para o primeiro download de pesos.
As contas de teste usam endereços `e2e-…@example.test`; as imagens criadas são removidas
ao finalizar o teste. Capturas e traces ficam em `test-results/` (ignorado pelo Git).

---

## Referência do template Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
