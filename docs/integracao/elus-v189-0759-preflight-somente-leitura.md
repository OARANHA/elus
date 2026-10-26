# ELUS v1.89 — pré-voo de impacto da migration 0759

**Estado:** ferramenta de diagnóstico, sem execução contra o Supabase real e sem aprovação de upgrade. PR empilhada sobre #43; não modifica nenhum dos 38 SQL upstream, os quatro SQL ELUS, a baseline ou a pilha #44/#45.

A migration upstream `20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql` contém `DELETE FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32`. Códigos com 32 bytes permanecem; valores `NULL` também **não** satisfazem o predicado SQL. O risco é perda de códigos legados e impacto no acesso de usuários. `0755` deve preceder `0759` e a RPC ELUS `0765` exige revisão independente.

## Execução futura somente com acesso autorizado de leitura

Com `PGHOST`, `PGUSER`, `PGDATABASE` e demais variáveis libpq já configuradas em ambiente privado, executar `node scripts/elus-v189-0759-preflight.mjs`. Não colocar senhas ou URLs em argumentos, logs, PRs ou artefatos. A ferramenta não aceita argumentos, consulta o tipo `bytea` de `code_hash` e calcula somente contagens agregadas em transação PostgreSQL `REPEATABLE READ READ ONLY`, finalizada com `ROLLBACK`. Não retorna hashes, linhas, identificadores ou SQL histórico. Erros geram mensagem genérica e código de saída não zero.

O resultado `PRECHECK_ONLY` inclui total, candidatos ao DELETE (`<> 32`), valores de 32 bytes e valores `NULL`. `autoriza_execucao` é **sempre false**, inclusive com zero candidatos. Uma consulta pontual não impede novas linhas nem comprova backup, rollback, RLS, MFA, preservação dos códigos ou segurança do replay.

## Gates que continuam obrigatórios

Reconciliar os onze registros históricos do ledger v1.85 com os 38 SQL upstream e quatro ELUS, exportar os seis lotes somente por canal privado, comprovar replay e restauração em PG15/17 descartáveis, revisar a decisão destrutiva `0759` com aprovação explícita, validar grants e isolamento, sincronizar as PRs #44/#45 e passar os checks no HEAD final. Sem E2E/Playwright, `db push`, alteração de banco, merge, imagem ou deploy nesta etapa.
