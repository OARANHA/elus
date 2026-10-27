# Replay privado v1.85 em PostgreSQL 15 e 17 — preparação

**Estado:** Draft, não executado. Esta alteração não aplica SQL em banco real, não altera migrations e não certifica upgrade v1.89.

A etapa manual `.github/workflows/elus-v185-reconstrucao-privada.yml` mantém a guarda de branch da PR #51 e exporta uma única vez os sete lotes históricos v1.85 usando conta dedicada de leitura. Depois de validar fingerprints, reproduz o mesmo conjunto, na mesma ordem, em dois containers descartáveis independentes: `pgvector/pgvector:pg15` e `pgvector/pgvector:pg17`.

Cada falha encerra a execução com código não zero, identificando somente versão do PostgreSQL e identificador do lote. Saída e erro do `psql` são suprimidos para evitar exposição do SQL privado. A etapa `if: always()` remove os arquivos privados e ambos os containers, inclusive em falha. O workflow permanece **exclusivamente `workflow_dispatch`**, restrito à branch autorizada e ao environment protegido; não foi acionado nesta PR.

**Limite da evidência:** um eventual PASS comprovaria somente a reprodução dos sete lotes em PostgreSQL 15 e 17 efêmeros. Não comprova restauração, equivalência semântica com as onze versões do ledger, aplicação das quatro migrations próprias ELUS, upgrade v1.89, revisão de ACL/RLS ou segurança da exclusão `0759`. Esses gates continuam bloqueantes.

**Preservação:** nenhuma mudança em VendaERP (somente leitura), ISIS/DANFE, Chutes, login, governança de deploy, baseline ou SQL upstream. Nenhum E2E/Playwright, merge, publicação de imagem ou deploy.
