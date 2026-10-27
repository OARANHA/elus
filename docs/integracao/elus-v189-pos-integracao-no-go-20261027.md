# ELUS v1.89 — reconciliação pós-merge e NO-GO operacional (27/10/2026)

> Registro de evidências de repositório e CI; não é autorização de aplicação de SQL, release, deploy ou aceite funcional. Esta fotografia deve ser revalidada antes de qualquer decisão posterior.

## Estado comprovado no GitHub

- [PR #43](https://github.com/OARANHA/elus/pull/43): `closed/merged`, merge commit `5960ad56de6a03cda1d3a53cbc59ac710f004e77`, integrado à branch da PR #40 em 27/10/2026 às 21:25:38 UTC.
- [PR #40](https://github.com/OARANHA/elus/pull/40): `closed/merged`, merge commit `32f4ec9f2df02f1db1d0b8ce2e6c00b702b6e6cf`, integrado à `main` em 27/10/2026 às 22:59:15 UTC. `main` foi relida em `32f4ec9f2df02f1db1d0b8ce2e6c00b702b6e6cf`. A descrição original da PR #40 é histórica e ainda descreve uma consolidação parcial antes da importação das 38 migrations.
- [CI do merge na main](https://github.com/OARANHA/elus/actions/runs/40598882730): `completed/success`; checks `verify`, `invariants` e matrizes PostgreSQL 15/17 passaram. [Perf](https://github.com/OARANHA/elus/actions/runs/40598882756) também passou. Isso não equivale a ensaio de upgrade do banco ativo.
- [Publicação GHCR](https://github.com/OARANHA/elus/actions/runs/40598882877): `completed/success` em `push` da `main`; os jobs `build-and-push` e `juntar-manifestos` executaram com sucesso. `promover-stable` foi `skipped`. **A publicação automática de imagens foi efetivamente disparada pelo merge na main; não foi solicitada nem executada manualmente nesta reconciliação.** Não inferir deploy de VPS a partir da publicação.
- [Workflow release](https://github.com/OARANHA/elus/actions/runs/40598882904): `completed/success`, mas os passos de criar tag e publicar release foram `skipped`. Não declarar release versionada.
- [E2E](https://github.com/OARANHA/elus/blob/32f4ec9f2df02f1db1d0b8ce2e6c00b702b6e6cf/.github/workflows/e2e.yml): apenas `workflow_dispatch`; nenhum E2E foi disparado nesta verificação.

## NO-GO: evidência ainda necessária antes de qualquer operação no banco ou deploy

1. **Ledger real:** snapshot de 25–26/10/2026 aponta 11 versões efetivamente aplicadas (preparação + seis lotes v1.85 + quatro migrations ELUS). Reconferir em leitura estrita, com role sem escrita, imediatamente antes do plano de execução. Não equiparar versões do ledger a timestamps dos arquivos.
2. **Replay v1.85→v1.89:** a matriz `elus-v189-ledger-replay-matrix.json` permanece `BLOCKED_FOR_REPLAY`: 38 migrations upstream, 11 no/antes do cutoff e 27 depois. A fonte privada dos seis lotes v1.85 existe no campo `statements` do ledger, mas não há evidência de exportação privada validada, reconstrução fiel e ensaio de upgrade em PostgreSQL 15 e 17. A baseline candidata e a instalação limpa não substituem esse ensaio.
3. **Integridade:** manter quatro migrations próprias ELUS, os renomes nominais `0689→0762`, `0691→0763`, `0692→0764` e a colisão de timestamp resolvida; conferir hashes e dependências reais, sem editar SQL histórico. A migration adicional `0765` requer avaliação de compatibilidade e permissões.
4. **Operação destrutiva:** `0759` contém `DELETE FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32`. Não autorizar replay/aplicação sem decisão explícita sobre impacto, backup e restauração comprovada em ambiente descartável.
5. **Segurança e integrações:** comprovar RLS/tenancy, ACL e `SECURITY DEFINER`, RBAC/login/MFA, VendaERP somente leitura, ISIS/DANFE, Chutes e governança; nenhuma CI verde substitui aceite funcional.
6. **PRs empilhadas:** [#51](https://github.com/OARANHA/elus/pull/51), [#52](https://github.com/OARANHA/elus/pull/52) e [#58](https://github.com/OARANHA/elus/pull/58) estavam abertas/Draft na leitura. Reconciliar conteúdo contra a `main` já atualizada; não mesclar automaticamente branches antigas nem tratar o estado das PRs como aceite.

## Limites operacionais

Este documento não aplica SQL/migrations, não consulta dados de clientes, não aciona E2E, não faz merge, não publica imagens e não realiza deploy. A publicação GHCR descrita acima ocorreu automaticamente no workflow da `main` **antes** desta documentação. A atualização do código-fonte na `main` é comprovada; a atualização do banco ou da aplicação em produção **não** foi comprovada.

Referências: [gate do banco real](elus-v189-banco-real-e-gates-20261025.md), [protocolo de ensaio isolado](elus-v189-ensaio-upgrade-isolado-20261026.md), [plano das migrations](elus-upstream-v1.89.0-migrations.md), [matriz de replay](elus-v189-ledger-replay-matrix.json).
