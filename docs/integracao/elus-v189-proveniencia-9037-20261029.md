# ELUS v1.89 — proveniência do recibo externo 9037 (29/10/2026)

> Evidência de reconciliação somente leitura. **NO-GO para upgrade em produção**. Este documento não autoriza SQL mutante, reaplicação de migrations, merge, publicação de imagem, deploy ou E2E/Playwright.

## Fonte exata e estado do GitHub

- A migration `20261028235959_9037_elus_ai_autonomy_guarded.sql` pertence ao **repositório separado** [OARANHA/elus360](https://github.com/OARANHA/elus360), e não ao manifesto fixado de 39 SQLs do upgrade DeskcommCRM v1.89 no `OARANHA/elus`.
- [PR #15 do OARANHA/elus360](https://github.com/OARANHA/elus360/pull/15) está **closed/merged**; merge commit `046900b48ff31be588934db903fa341bcc43f1d4`, registrado em 29/10/2026 10:05:11 UTC. A descrição da PR contém ressalvas históricas de não implantação; o estado atual deve ser medido no banco.
- [SQL versionado nesse merge](https://github.com/OARANHA/elus360/blob/046900b48ff31be588934db903fa341bcc43f1d4/supabase/migrations/20261028235959_9037_elus_ai_autonomy_guarded.sql): Git blob SHA-1 `b4fd132fdd482c017a823f2baf013b20b2850c2d`.

## Prova de identidade no Supabase conectado

Consultas `SELECT` ao projeto `elus`, PostgreSQL 17.11, em 29/10/2026:

- `supabase_migrations.schema_migrations` contém **51 recibos**. O adicional `version=20261029104815`, `name=elus_9037_ai_autonomy_guarded` possui **um statement de 34.985 bytes**, MD5 `10df3c797779f8cb4461631cb22676d2`.
- O Git blob SHA-1 calculado **diretamente dos bytes do statement registrado** usando `extensions.digest` e o cabeçalho Git `blob <bytes>\\0` é `b4fd132fdd482c017a823f2baf013b20b2850c2d`, **idêntico ao blob versionado** no merge da PR #15. Essa comparação atesta a identidade exata dos bytes do SQL armazenado no recibo, não a execução efetiva de todos os seus efeitos.
- O catálogo contém `organizations.ai_autonomy`, o trigger `trg_guard_organizations_ai_autonomy` habilitado e **oito funções** declaradas no SQL 9037. Todas as oito estão `SECURITY INVOKER`; `EXECUTE` foi observado para `service_role`, não para `anon` ou `authenticated`. Isso é atestação de catálogo/ACL, **não** teste funcional de RBAC, MFA, CAS, concorrência ou isolamento.
- A RPC de rotação MFA da migration ELUS `0765`, `public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])`, **continua ausente**, apesar do recibo 0765. O catálogo `public` mantém **208 tabelas**.

**Atenção à cronologia:** `20261029104815` é a versão gerada no ledger; não comprova por si só o horário de aplicação. Não substituir pelo timestamp do arquivo `20261028235959` nem tentar reaplicar a 9037.

## Efeito sobre o executor v1.89 e próximos gates

- A [PR #43](https://github.com/OARANHA/elus/pull/43) já está integrada. A [PR #62](https://github.com/OARANHA/elus/pull/62), HEAD observado `3b1ac7a2b7cf4c4859f890eca9e5d2def8aec3c5`, está aberta e mergeável; o [CI do HEAD](https://github.com/OARANHA/elus/actions/runs/40865137502) concluiu `success`.
- O executor da PR #62 exige **no máximo 50 recibos** (11 históricos + 39 v1.89), com lista de versões e hashes fixados. Com 51 recibos, a guarda `LEDGER_COUNT_DRIFT` deve reprovar a verificação. **Não aumentar o limite para 51, não inserir 9037 na allowlist v1.89 e não apagar/renomear recibos** para obter verde artificial. A 9037 deve ter trilha de compatibilidade separada, por pertencer ao fluxo ELUS360 de governança de IA.
- O modo `apply` permanece bloqueado **antes da conexão** pela guarda `PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL`.

**Bloqueios remanescentes:** esclarecer ausência da RPC 0765; comprovar origem/execução dos DDLs importados, restauração de backup e replay fiel v1.85→v1.89 em PostgreSQL 15/17 descartável; demonstrar isolamento entre dois tenants; obter autorização específica e independente para o `DELETE` da migration 0759. O recibo 9037 não resolve nenhum desses gates.

**Escopo desta auditoria:** somente GitHub, memória de contexto e SQL de metadados/ACL em leitura. Nenhum SQL mutante, E2E/Playwright, merge, publicação manual de imagem ou deploy foi executado.

## Revalidação independente e exclusão de causa direta — 29/10/2026

**Fontes verificadas nesta rodada:** SQL versionado da 9037 em `OARANHA/elus360`, blob `b4fd132fdd482c017a823f2baf013b20b2850c2d` no merge `046900b48ff31be588934db903fa341bcc43f1d4`; catálogo/ledger do projeto Supabase ELUS por **um SELECT somente de metadados**, sem ler dados de clientes. O arquivo versionado possui 34.985 bytes no recibo SQL do banco (não equiparar comprimento de string JavaScript a bytes UTF-8).

- O ledger continua com **51 recibos**; a 9037 (`20261029104815`) tem **um statement de 34.985 bytes**; a 0765 (`20261026010000`) possui recibo. O catálogo mantém **208 tabelas** em `public` e RLS habilitado em `public.user_recovery_codes`.
- A busca de `pg_catalog.pg_proc` por `proname='fn_elus_rotacionar_codigos_recuperacao'` retornou **zero funções em todos os schemas**. Portanto a divergência 0765 continua material, independentemente da identidade dos bytes do recibo.
- A inspeção **estática** do SQL 9037 não encontrou menções a `fn_elus_rotacionar_codigos_recuperacao` nem a `user_recovery_codes`, nem `DROP FUNCTION`, `ALTER FUNCTION` ou `CREATE EVENT TRIGGER`. Seu único `DROP` de objeto encontrado é `DROP TRIGGER IF EXISTS trg_guard_organizations_ai_autonomy ON public.organizations`. Não foi identificado mecanismo direto no texto 9037 que explique a ausência da RPC 0765. **Isso não demonstra a causa da ausência nem exclui efeitos indiretos ou ações externas.**
- A [PR #62](https://github.com/OARANHA/elus/pull/62) permanece aberta, mergeável, HEAD `3b1ac7a2b7cf4c4859f890eca9e5d2def8aec3c5`; o [CI #40865137502](https://github.com/OARANHA/elus/actions/runs/40865137502) desse HEAD concluiu `success`. A [PR #43](https://github.com/OARANHA/elus/pull/43) permanece integrada; `main=a44e039390577c3adc279aa9168c18e99bb64a93`.

**Decisão operacional preservada:** 9037 não pertence ao manifesto fixado v1.89; não elevar limite de 50 recibos nem autorizar `apply` para acomodá-la. A investigação da RPC 0765 deve continuar por evidências de execução/DDL e catálogo, sem inferir causa a partir da ordem dos recibos. Mantêm-se os gates de restauração/replay PG15/17, isolamento multi-tenant e autorização independente para a 0759. Nenhum SQL mutante, E2E, merge, imagem ou deploy nesta rodada.

## Sobreposição comprovada entre ELUS 0690 e ELUS360 9037 — 29/10/2026

**Comparação estática dos SQLs versionados:** a migration própria ELUS `20261020120000_0690_org_ai_autonomy_protected.sql` (blob `4ad880adf0a8e294e20a1b50dae1fb9dbed1db65`) e a migration externa 9037 (blob `b4fd132fdd482c017a823f2baf013b20b2850c2d`) declaram **a mesma função** `public.fn_guard_organizations_ai_autonomy()` com `CREATE OR REPLACE FUNCTION` e recriam o mesmo trigger `trg_guard_organizations_ai_autonomy` em `public.organizations`.

A guarda da **0690** aceita `auth.role() = 'service_role'` (além do caso controlado `postgres`); a versão da **9037** exige, no primeiro ramo, **`current_user = 'service_role' AND auth.role() = 'service_role'`**. Logo, as versões não são semanticamente idênticas: a 9037 acrescenta uma condição ao ramo de serviço. Não inferir daí eficácia funcional ou cobertura de todas as rotas.

**Catálogo vivo, somente SELECT:** `to_regprocedure('public.fn_guard_organizations_ai_autonomy()')` existe; `pg_get_functiondef` contém a condição conjunta de `current_user` e `auth.role()`; o trigger correspondente está habilitado. A função não contém referência à RPC de rotação MFA 0765. A consulta de metadados da mesma rodada confirmou 51 recibos, 0765 com um statement de 2.747 bytes, 9037 com um statement de 34.985 bytes e **nenhuma função** de rotação de códigos de recuperação identificada por nome.

**Implicação de compatibilidade:** reaplicar o SQL da 0690 **depois** da 9037, em qualquer replay ou instalação/atualização que execute novamente esse bloco, poderia substituir a versão mais restritiva do guard por uma versão anterior. Isso é um **risco condicional de regressão**, não evidência de que tal reaplicação ocorreu. Antes de qualquer plano de upgrade, reconciliar a ordem e a semântica da guarda 0690/9037 em uma trilha de compatibilidade separada, sem incorporar a 9037 às 39 migrations v1.89 e sem alterar o limite fail-closed de 50 recibos do executor.

**Gates inalterados:** a ausência da RPC 0765 segue sem causa demonstrada; restauração/replay PG15/17, isolamento multi-tenant e autorização específica da operação destrutiva 0759 continuam pendentes. Nenhum SQL mutante, E2E, merge, imagem ou deploy nesta investigação.


## Atestação do campo rollback no ledger (29/10/2026)

**Consulta exclusivamente SELECT, sem ler conteúdo de `statements` ou `rollback`, sem dados de clientes:** em `supabase_migrations.schema_migrations`, a coluna `rollback` está **SQL NULL em todos os 51 recibos observados**: 11 registros históricos v1.85/ELUS, 39 registros do manifesto v1.89 (38 upstream + 0765) e o recibo externo 9037. Nos 39 candidatos v1.89, foram observados **39 NULL, zero arrays vazios e zero arrays não vazios**. A 0765 e a 9037 possuem cada uma um `statement` registrado, mas `rollback IS NULL`.

**Interpretação limitada:** não existem instruções de rollback armazenadas **nessa coluna do ledger** para os 51 registros consultados. Isso **não prova** que não haja backups, scripts de restauração externos ou outros mecanismos operacionais; tampouco prova execução dos SQLs ou autorização para desfazê-los. Não preencher `rollback` retroativamente nem improvisar reversões de DDL. O caminho de recuperação precisa ser demonstrado por **backup existente + restauração verificada em ambiente descartável**, além dos gates independentes de replay PG15/17, RLS/ACL/tenancy e aprovação específica da operação destrutiva 0759.

**Revalidação simultânea:** ledger total 51, 208 tabelas em `public`, 9037 com um statement de 34.985 bytes, função `fn_guard_organizations_ai_autonomy()` presente com a condição conjunta `current_user='service_role'` e `auth.role()='service_role'`, trigger habilitado; RPC 0765 continua ausente. Essa fotografia não comprova causa da divergência 0765.

**NO-GO inalterado:** não ampliar o manifesto/allowlist de 50 recibos, não executar `apply`, SQL mutante, E2E/Playwright, merge, publicação de imagens ou deploy. O CI do HEAD `3b1ac7a2` da PR #62 foi verificado uma única vez nesta rodada: [run #40865137502](https://github.com/OARANHA/elus/actions/runs/40865137502) `completed/success`; não é aceite funcional.
