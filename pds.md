# Plano de Desenvolvimento de Software (PDS)

## 1. Visão Geral do Sistema e Arquitetura Lógica

O **Anato360** é uma plataforma web para ensino e autoavaliação em anatomia veterinária de animais de companhia. O sistema permite a exploração de peças anatômicas reais por meio de sequências de fotos em rotação contínua (360°), sobreposição de marcadores/setas indicadoras, e avaliação gamificada baseada em resposta aberta antecedendo a escolha múltipla.

### Diagrama Arquitetural de Componentes

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               CAMADA CLIENTE (WEB)                                │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌────────────────────┐  │
│  │ Visualizador 360°     │   │ Motor de Quizzes       │   │ Painel de          │  │
│  │ (Canvas HTML5 / Sprite│   │ (Avaliação e Feedback) │   │ Desempenho (Charts)│  │
│  └───────────────────────┘   └────────────────────────┘   └────────────────────┘  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ Protocolo HTTPS / REST API (JSON)
┌─────────────────────────────────────────▼─────────────────────────────────────────┐
│                               CAMADA DE APLICAÇÃO (BACKEND API)                   │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌────────────────────┐  │
│  │ Serviço de Conteúdo e │   │ Serviço de Quizzes e   │   │ Serviço de Usuários│  │
│  │ Mapeamento de Setas   │   │ Regra de Pontuação     │   │ e Autenticação     │  │
│  └───────────────────────┘   └────────────────────────┘   └────────────────────┘  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ ORM / Mapeamento Objeto-Relacional
┌─────────────────────────────────────────▼─────────────────────────────────────────┐
│                               CAMADA DE DADOS E PERSISTÊNCIA                      │
│  ┌───────────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │ Banco de Dados Relacional             │   │ Servidor de Arquivos (CDN/S3)   │  │
│  │ (PostgreSQL - Cadastros/Pontuações)   │   │ (Frames de Imagens 360°)         │  │
│  └───────────────────────────────────────┘   └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘

```

---

## 2. Decomposição Funcional por Módulos

### Módulo 1: Renderização e Interatividade 360°

* **Componentes Principais:** `Image360Viewer`, `HotspotOverlay`, `FramePreloader`
* **Escopo Funcional:**
* Rotação fluida das imagens das peças anatômicas via comandos de clique e arraste (desktop) ou toque (mobile).


* Projeção de vetores/setas sob coordenadas `(x, y)` vinculadas a quadros específicos da rotação.


* Pré-carregamento progressivo de imagens para mitigação de latência de rede.


* **Tecnologias Recomendadas:** HTML5 Canvas, React/Vue.js, Panzoom API.

### Módulo 2: Motor de Avaliação e Gamificação

* **Componentes Principais:** `OpenAnswerInput`, `MultipleChoiceModal`, `ScoringEngine`
* **Escopo Funcional:**
* Entrada textual direta para verificação do conhecimento prévio (recuperação ativa).


* Mecanismo de correspondência textual flexível para validação de erros de digitação e acentuação.
* Disponibilização opcional de 4 alternativas de múltipla escolha sob solicitação do usuário.


* Aplicação da regra de negócio: bonificação com pontuação dobrada para respostas corretas fornecidas sem o auxílio de alternativas.




* **Tecnologias Recomendadas:** Algoritmo Fuzzy Matching (Fuse.js), REST API.

### Módulo 3: Catálogo e Taxonomia Anatômica

* **Componentes Principais:** `SystemCatalog`, `HotspotEditor`, `AnatomyTaxonomy`
* **Escopo Funcional:**
* Categorização de conteúdo por sistemas orgânicos (Esquelético, Muscular, Digestório, Circulatório, Respiratório).


* Ferramenta administrativa para mapeamento de marcadores anatômicos sobre as imagens.
* Suporte a nomes anatômicos em conformidade com a Nomenclatura Anatômica Veterinária Oficial.




* **Tecnologias Recomendadas:** PostgreSQL (JSONB), Node.js / Python.

### Módulo 4: Monitoramento de Desempenho e Relatórios

* **Componentes Principais:** `UserDashboard`, `TeacherAnalytics`, `HistoryTracker`
* **Escopo Funcional:**
* Registro de métricas do estudante: taxa de acerto, histórico de tentativas e evolução por sistema.


* Painel analítico para os docentes visualizarem áreas de maior dificuldade da turma.




* **Tecnologias Recomendadas:** Chart.js, Recharts.

---

## 3. Cronograma de Desenvolvimento (Roadmap Executivo)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ROADMAP EXECUTIVO DE DESENVOLVIMENTO — ANATO360                                                         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 1 — CONCEPÇÃO, REQUISITOS E ARQUITETURA                                     [Sprints 1 e 2]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ├── Validação dos requisitos pedagógicos junto à Universidad Santo Tomás (UST Chile)                   │
│  ├── Elaboração do modelo Entidade-Relacionamento (ER) e prototipagem UI/UX no Figma                   │
│  └── Desenvolvimento e validação de Prova de Conceito (PoC) para rotação 360° em HTML5 Canvas          │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 2 — NÚCLEO DO SISTEMA E VISUALIZADOR 360°                                   [Sprints 3 e 4]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ├── Estruturação da API REST e modelagem das entidades no banco de dados relacional                   │
│  ├── Desenvolvimento do componente de rotação 360° com suporte a marcadores vetoriais                  │
│  └── Implementação do módulo de cadastro e organização de sistemas e peças anatômicas                  │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 3 — MOTOR DE QUIZZES E REGRAS DE GAMIFICAÇÃO                                [Sprints 5 e 6]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ├── Implementação do algoritmo para tolerância textual em respostas abertas                           │
│  ├── Configuração da regra de negócio de pontuação dobrada e exibição de ajuda (múltipla escolha)      │
│  └── Implementação de suporte internacional à interface (Português / Espanhol)                         │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 4 — PAINÉIS DE DESEMPENHO E TESTES OPERACIONAIS                             [Sprints 7 e 8]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ├── Construção do dashboard analítico do estudante e visão agregada da turma para o docente           │
│  ├── Execução de testes de usabilidade e carga com a turma de anatomia da UST Chile                   │
│  └── Refatoração de código, tratamento de exceções e otimização de ativos                              │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 5 — HOMOLOGAÇÃO, IMPLANTAÇÃO E FECHAMENTO                                   [Sprint 9]            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ├── Implantação e hospedagem da aplicação em ambiente de produção (Nuvem / Docker)                    │
│  ├── Consolidação do repositório final no GitHub e elaboração da documentação técnica e de usuário     │
│  └── Apresentação e entrega final na disciplina de Projeto de Software II                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 4. Planejamento das Sprints, Entregáveis e Critérios de Aceite

| Fase | Período | Atividades Principais | Entregáveis Técnicos | Critério de Aceite (Definition of Done) |
| --- | --- | --- | --- | --- |
| **Fase 1: Concepção** | Sprints 1-2 | Detalhamento de Requisitos; Modelagem do Banco de Dados; Design UI/UX.

 | Documento de Visão; Protótipo Figma; DDL PostgreSQL; PoC 360°.

 | PoC do visualizador executando rotação de 36 quadros sem degradação de desempenho. |
| **Fase 2: Visualizador** | Sprints 3-4 | Construção do Backend; Implementação do componente de giro 360°; Camada de marcadores.

 | Endpoints REST de Conteúdo; Componente `Image360Viewer`. | Rotação completa da peça anatômica mantendo as setas alinhadas ao quadro correspondente. |
| **Fase 3: Gamificação** | Sprints 5-6 | Algoritmo de validação textual; Módulo de múltipla escolha; Sistema de pontuação.

 | Módulo de Quizzes; Middleware de Internacionalização (PT/ES).

 | Atribuição exata de 200 pontos para respostas diretas e 100 pontos para escolhas com ajuda.

 |
| **Fase 4: Analytics** | Sprints 7-8 | Construção dos painéis de métricas; Testes de carga; Testes de usabilidade.

 | Painel do Aluno; Painel do Professor; Relatório de Testes.

 | Exibição precisa de estatísticas e histórico de estudos agrupados por sistema orgânico.

 |
| **Fase 5: Produção** | Sprint 9 | Publicação em nuvem; Finalização da documentação no GitHub.

 | Aplicação em Produção; Repositório Finalizado. | Sistema operacional em nuvem e acessível para uso na disciplina ZOO-00171 da UST Chile.

 |

---

## 5. Estrutura Padrão do Repositório GitHub

```text
PSII-Anato360/
├── .github/
│   ├── ISSUE_TEMPLATE/           # Modelos para padronização de bugs e tarefas
│   └── workflows/                # Esteiras de Integração Contínua (CI/CD)
├── docs/                         # Documentação do projeto
│   ├── documento-de-visao.pdf    # Especificação do Documento de Visão
│   ├── arquitetura.md            # Documentação arquitetural e modelo ER
│   └── manual-usuario.md         # Manual operacional
├── backend/                      # Código fonte da API / Servidor
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Módulo de autenticação
│   │   │   ├── pieces/          # Módulo de peças e rotação 360°
│   │   │   ├── quizzes/         # Módulo de avaliação e pontuação
│   │   │   └── users/           # Módulo de usuários e histórico
│   │   ├── database/            # Migrações e esquemas de dados
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/                     # Código fonte da Aplicação Web
│   ├── src/
│   │   ├── components/
│   │   │   ├── viewer360/       # Componentes do visualizador 360°
│   │   │   ├── quiz/            # Componentes da interface de testes
│   │   │   └── dashboard/       # Componentes de gráficos e relatórios
│   │   ├── locales/             # Arquivos de dicionário para PT/ES
│   │   ├── pages/               # Páginas e rotas da aplicação
│   │   └── services/            # Camada de integração HTTP
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml            # Configuração de containers local
└── README.md                     # Instruções de instalação e execução

```

---

## 6. Matriz de Gestão de Riscos

| Risco Identificado | Nível | Estratégia de Mitigação | Plano de Contingência |
| --- | --- | --- | --- |
| **Latência no carregamento das sequências de fotos 360°** | Alto | Otimização para formato WebP, compressão de ativos e carregamento sob demanda (lazy loading). | Implementação de modo simplificado com menor quantidade de imagens por peça (ex.: 12 quadros). |
| **Inconsistências em nomenclaturas anatômicas entre idiomas** | Alto | Validação das nomenclaturas pela docente responsável na UST com base na Nomenclatura Anatômica Veterinária.

 | Inclusão de tabela de sinônimos aceitos no mecanismo de validação de respostas abertas. |
| **Barreira de comunicação técnica devido ao trabalho assíncrono internacional** | Médio | Agendamento de reuniões quinzenais de alinhamento e documentação das decisões no repositório. | Designação de líderes de integração em cada instituição para canal direto de comunicação. |
