# ELUS v1.89 — pré-voo somente leitura da migration 0759

**Escopo:** contagem agregada das linhas que o `DELETE FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32` afetaria **no instante da leitura**. Não executa a migration nem consulta códigos/hashes individuais. O SQL upstream 0759 e o complemento ELUS 0765 permanecem intactos.

## Execução autorizada somente para diagnóstico

Com `PGHOST`, `PGUSER`, `PGDATABASE` e parâmetros TLS/credenciais libpq configurados privadamente por um operador autorizado, executar `node scripts/elus-v189-0759-preflight.mjs` no ambiente com dependência `pg` instalada. Não passar senhas por argumento ou commitá-las. O script não imprime credenciais, SQL, hashes ou linhas individuais.

A transação é `REPEATABLE READ, READ ONLY`, com timeouts, uma consulta `SELECT` agregada e `ROLLBACK` obrigatório. O relatório contém `total`, `elegiveis_delete_0759`, `hashes_32_bytes`, `hashes_nulos`, `rls_filtro_ativo` e alertas. As contagens são strings decimais para evitar perda de precisão de `bigint`.

**Interpretação bloqueante:** `rls_filtro_ativo=true` significa que o papel pode estar enxergando somente parte das linhas; `elegiveis_delete_0759>0` indica exclusão potencial; `hashes_nulos>0` indica linhas que o predicado SQL não alcança. Qualquer caso produz `BLOQUEADO_REVISAO`. Mesmo com zero elegíveis e `PRECHECK_ONLY`, o resultado é temporal e **não autoriza** `DELETE`, replay, merge, imagem ou deploy. Um novo código legado pode ser inserido depois do snapshot.

Este pré-voo **não substitui** reconciliação das 11 versões do ledger com os 38 SQL upstream e quatro SQL ELUS, prova de restauração, revisão de privilégios/RLS, aprovação específica da operação destrutiva ou ensaio isolado PostgreSQL 15/17. E2E/Playwright permanece exclusivamente manual e não faz parte deste gate.
