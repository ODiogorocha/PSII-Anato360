# Anato360 - Sistema Interativo para o Estudo da Anatomia Veterinária

## Desenvolvedores

<p align="center">
  <a href="https://github.com/ODiogorocha">Diogo Rocha</a>
  &emsp;&emsp;&emsp;&emsp;
  <a href="https://github.com/GabrieldeQuadro">Gabriel Quadro</a>
  &emsp;&emsp;&emsp;&emsp;
  <a href="https://github.com/filipeKaizer">Filipe Kaizer</a>
  &emsp;&emsp;&emsp;&emsp;
  <a href="https://github.com/WeslleyHBM">Wesley Meneses</a>
</p>


### configurações de branch 

Este documento define a política de branches, o fluxo de trabalho (*workflow*) e as boas práticas de desenvolvimento e controle de versão do projeto.

---

## 1. Visão Geral da Estrutura

```
          [ main ] (Produção / Versão Estável)
             ▲
             │ Pull Request (PR) com Code Review & CI obrigatórios
             │
          [ dev ]  (Integração & Testes Gerais)
             ▲
             │ Pull Request (PR) / Merge de Features
             │
   ┌─────────┴─────────┐
[ dev/<nome> ]   [ feature/<tarefa> ]  (Trabalho Individual / Funcionalidade)

```

O repositório adota um fluxo de trabalho baseado no **Git Flow**, otimizado para colaboração, garantia de qualidade e integração contínua.

| Nome / Padrão da Branch | Papel & Propósito | Ambiente / Ação Destino |
| --- | --- | --- |
| `main` | Código final estável e testado, pronto para produção. | Releases / Produção |
| `dev` | Branch de integração onde novas funcionalidades são combinadas e testadas. | Ambiente de Testes / Staging |
| `dev/<nome>` , `feat/<tarefa>` ou `fix/<correção>`| Espaços de trabalho individuais para desenvolver tarefas, features ou correções. | Desenvolvimento Local |


## 2. Especificação das Branches e Convenção de Nomes

### 2.1 Branch Principal (`main`)

* **Propósito:** Contém o código verificado e em nível de produção.
* **Commits Diretos:** **Estritamente Proibidos.** Nenhum código pode ser enviado diretamente para a `main`.
* **Fonte de Implantação:** Serve como a única fonte da verdade para as compilações de produção.

### 2.2 Branch Geral de Integração (`dev`)

* **Propósito:** Ponto de união de todo o desenvolvimento em andamento. É onde ocorrem os testes de integração automatizados e os testes de regressão.
* **Commits Diretos:** **Proibidos.** Todas as alterações devem entrar na `dev` por meio de Pull Requests (PRs) aprovados.
* **Requisito de Teste:** O código presente na `dev` deve passar por validação antes de ser fundido na `main`.

### 2.3 Branches Individuais (`dev/<nome-do-desenvolvedor>` ou `feature/<tarefa>`)

* **Propósito:** Ambientes isolados onde cada desenvolvedor trabalha sem impactar o código principal.
* **Padrões de Nomenclatura:**
* Focado no desenvolvedor: `dev/diogo-rocha`, `dev/gabriel-quadro`
* Focado na funcionalidade: `feat/vizualizer`, `feat/home-page`
* Focado em correções: `fix/erro-api`

