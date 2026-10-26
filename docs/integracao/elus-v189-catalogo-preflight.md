# ELUS v1.89 — diagnóstico de catálogo sem alteração do banco

**Estado: proposta de gate somente leitura; NÃO executado no Supabase ELUS.** Este diagnóstico complementa as PRs #43, #47 e #48. Não substitui a reconstrução dos sete lotes históricos v1.85, o ensaio em PostgreSQL descartável, a revisão da migration `0759`, a autorização específica ou a restauração testada.

O script `scripts/elus-v189-catalog-preflight.mjs` lê exclusivamente metadados: as 11 versões observadas no snapshot de 25/10/2026, presença das 16 tabelas exigidas, nomes de policies selecionadas e nomes/quantidades de argumentos de funções críticas. Não lê SQL de migrations, corpo de funções, códigos de recuperação, dados de clientes ou credenciais. Não altera o ledger e não executa DDL/DML. Usa `BEGIN ... READ ONLY` e encerra com `ROLLBACK`.

Em ambiente autorizado, um operador pode executar `node scripts/elus-v189-catalog-preflight.mjs` com conexão libpq privada previamente configurada (`PGHOST`, `PGUSER`, `PGDATABASE`, demais parâmetros conforme política operacional). Não passar segredos na linha de comando, não executar em CI e não colar logs privados no repositório. Erros são genéricos, sem caminhos ou credenciais. Esta PR não executa o script contra nenhum banco.

A saída é um JSON de **pré-voo**, sempre com `autoriza_replay=false` e `autoriza_merge_deploy=false`, mesmo quando não há objetos ausentes. Divergência de ledger, policy antiga ou ausência de tabela são sinais de revisão, **não** instruções de aplicação. A presença de tabelas ou funções não prova colunas, assinaturas completas, CHECKs, triggers, RLS efetiva, grants, isolamento entre tenants, idempotência ou recuperação.

**Limites/gates seguintes:** comparar o catálogo semântico e ACLs em clone isolado, conciliar os sete statements históricos exportados privadamente com as 11 versões registradas, revisar o impacto de `0759` e validar replay/rollback em PostgreSQL descartável antes de qualquer decisão sobre o banco real. Preservar VendaERP somente leitura, ISIS/DANFE, Chutes, login, governança e deploy. E2E/Playwright permanece exclusivamente manual.
