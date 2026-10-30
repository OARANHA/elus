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


## Telemetria SQL: evidência negativa limitada para a RPC 0765 — 29/10/2026

Consulta **somente SELECT** ao `extensions.pg_stat_statements` do Supabase ELUS (PostgreSQL 17.11), sem retornar texto integral de queries, SQL de clientes ou credenciais:

- `pg_stat_statements.track=top`, `track_utility=on`, `max=5000`; estatísticas reiniciadas em **18/10/2026 01:44:16 UTC**. No instante consultado havia **4.831 entradas** e **26 desalocações** (`dealloc`): a cobertura histórica **não é completa**.
- Havia **zero entradas** contendo o identificador `fn_elus_rotacionar_codigos_recuperacao` e **zero chamadas registradas** sob esse filtro; como controles de observabilidade, 20 entradas continham `fn_session_mfa_proven` e três continham `fn_guard_organizations_ai_autonomy`. Esses valores são correspondências textuais, não contagens de execuções de DDL.
- Das 12 entradas com padrão textual `DROP FUNCTION`, nenhuma continha o nome da RPC de rotação. Uma entrada com a versão `20261026010000` era **SELECT de auditoria** ao ledger, não INSERT/aplicação da migration; portanto **não** serve como recibo de execução.
- Consulta agregada aos `postgres_logs` encontrou 180 registros na janela 25/10 16:00–26/10 16:00 UTC e 478 registros em 28/10 16:20–29/10 16:20 UTC, sem correspondências textuais à RPC/DDL no campo de atributos pesquisado. Ausência em logs também **não** prova ausência de execução: política de logging e retenção não foram auditadas.

**Limite inferencial:** `pg_stat_statements` mantém estatísticas agregadas, pode desalocar entradas e está configurado para rastrear comandos de topo. A ausência do nome da função nessa amostra **não prova** que a migration 0765 nunca foi executada, nem que tenha ocorrido DROP posterior. Continua comprovada apenas a divergência **recibo 0765 presente / RPC ausente**. Não há autorização para reaplicar SQL, remover recibos ou liberar `apply`.

## Identidade exata do SQL 0765 no ledger — 29/10/2026

Consulta SQL exclusivamente de leitura à `supabase_migrations.schema_migrations`, sem retornar o texto do statement, encontrou para `version=20261026010000`, `name=0765_elus_rotacao_atomica_codigos_recuperacao`: **um statement**, **2.747 bytes**, MD5 `add7a7db36db87cd213fd7a7d0f81db7` e Git blob SHA-1 `a05333f5b12b78c334181887f089b39398d9aa50`. O Git blob foi calculado dos bytes do statement armazenado (prefixo Git `blob <bytes>\0`) e é **idêntico** ao blob do arquivo versionado `supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql` na `main`. O mesmo SELECT reconfirmou a identidade do recibo externo 9037 (34.985 bytes, blob `b4fd132fdd482c017a823f2baf013b20b2850c2d`).

Consulta separada a `pg_catalog.pg_proc`, incluindo todos os schemas não internos, retornou **nenhuma função** cujo nome contenha `rotacionar`, `recuperacao` ou `recovery`. Isso reduz a hipótese de simples assinatura/schema alternativo, mas **não identifica** se o DDL 0765 foi ignorado, revertido, ou se houve remoção posterior. Identidade do recibo **não comprova** a execução do SQL.

Na [PR #62](https://github.com/OARANHA/elus/pull/62), o diagnóstico `diagnose` passou a emitir `receipt0765Exact` separadamente de `receipt0765Present` e `rpc0765Present`, exigindo nome, cardinalidade, bytes e MD5 fixados, com teste unitário que confronta o fingerprint ao arquivo SQL. Commits `6a8ba736`, `b1403239`, `a07f44d3`; o CI desse novo HEAD **não foi consultado nesta execução**. `apply` continua bloqueado antes da conexão e o teto de 50 recibos do verificador v1.89 não foi ampliado.

**Decisão:** investigar a cadeia de execução da 0765 por evidência independente; não reaplicar, não editar ledger, não liberar upgrade nem produção sem os gates de restauração/replay, tenancy e aprovação específica da 0759.


## Dependências SQL da 0765 verificadas no catálogo — 29/10/2026

Consulta **exclusivamente SELECT**, no projeto ELUS (PostgreSQL 17.11), sem retornar dados de clientes ou SQL armazenado no ledger, confrontou as dependências declaradas no arquivo versionado `20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql`:

- `public.user_recovery_codes` existe; `user_id` é `uuid NOT NULL` e `code_hash` é `bytea NOT NULL`.
- `pg_catalog.hashtextextended(text,bigint)`, `pg_catalog.pg_advisory_xact_lock(bigint)` e `pg_catalog.decode(text,text)` existem.
- `pg_catalog.unnest` é polimórfica (`unnest(anyarray)`); por isso `to_regprocedure('pg_catalog.unnest(text[])')` retorna falso **sem indicar função ausente**. A chamada real `SELECT count(*) FROM pg_catalog.unnest(ARRAY['a','b']::text[])` retornou 2 linhas, confirmando resolução do overload para `text[]`.
- Seis event triggers habilitados foram observados no catálogo; sua existência, isoladamente, não demonstra interferência na migration 0765.
- A RPC `public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])` continua **ausente**, apesar do recibo 0765 com bytes idênticos ao SQL versionado.

**Alcance:** não se identificou falta dessas dependências básicas que explique a ausência da RPC. A checagem não compila nem executa o DDL, não comprova privilégios de criação no momento da migration, não reconstrói a sequência de eventos e não estabelece causa. Mantidos NO-GO, teto fail-closed de 50 recibos, bloqueio de `apply` e exigências independentes de restauração/replay PostgreSQL 15/17, isolamento multi-tenant e aprovação da 0759. Nenhuma alteração no banco foi realizada.


## Atestação adicional de isolamento da tabela MFA — 29/10/2026

Consulta exclusivamente `SELECT` ao catálogo do Supabase ELUS, sem ler registros de usuários: `public.user_recovery_codes` existe, possui RLS habilitado, uma policy (a policy de leitura com predicado `false`), dois constraints e nenhum trigger de usuário. Para os papéis `anon` e `authenticated`, `has_table_privilege` retornou `false` em todas as quatro operações DML (SELECT, INSERT, UPDATE, DELETE). O catálogo `pg_proc` contém **zero funções** com nome `fn_elus_rotacionar_codigos_recuperacao` em qualquer schema. Isso comprova uma proteção de acesso no catálogo observado, **não** valida isolamento funcional entre tenants, nem explica por que a RPC 0765 não existe apesar do recibo exato.

Na [PR #62](https://github.com/OARANHA/elus/pull/62), os commits [`f88db11b`](https://github.com/OARANHA/elus/commit/f88db11b185b31fc09145c99c63443c99a000dca) e [`ef0082d5`](https://github.com/OARANHA/elus/commit/ef0082d54b194d29742d7f32763f3c8cf2cd5320) ampliam o modo `diagnose` somente leitura com contagem de RPCs homônimas em qualquer schema, RLS da tabela MFA e presença da policy de leitura negada, com teste estático de regressão. O CI anterior (`a07f44d3`) estava GREEN; o CI desses commits novos não foi consultado nesta execução. A proteção `apply` permanece bloqueada, sem mudar manifesto, baseline ou limite de 50 recibos. **NO-GO** mantido.


## Reconciliação de identidade dos 39 recibos v1.89 — 30/10/2026

**Escopo:** consulta exclusivamente `SELECT` ao ledger `supabase_migrations.schema_migrations` do Supabase ELUS, confrontada com as **38 versões, nomes e Git blobs SHA-1 fixados** em `tests/unit/elus-v189-import-ledger-integrity.test.ts` da `main` (`a44e039390577c3adc279aa9168c18e99bb64a93`) e com a migration adicional 0765 (blob `a05333f5b12b78c334181887f089b39398d9aa50`). Não foram retornados textos de statements, dados de clientes ou credenciais.

- **Composição exata observada:** 51 recibos = **11 históricos** (as onze versões previstas no executor) + **39 candidatos v1.89** (38 importados + 0765) + **1 externo**, `20261029104815 / elus_9037_ai_autonomy_guarded`. Nenhuma das 39 versões esperadas estava ausente; não houve divergência de nomes.
- **Integridade dos SQLs registrados:** para cada um dos **39/39** recibos candidatos, o array contém **um statement**, e o Git blob SHA-1 calculado **dos bytes efetivamente armazenados** coincide com o blob fixado no repositório. **Zero divergências de identidade de bytes** entre esses 39 recibos e os SQLs versionados. O único registro fora do conjunto histórico + manifesto é a 9037, cujo blob calculado foi `b4fd132fdd482c017a823f2baf013b20b2850c2d`, já atribuído ao repositório separado ELUS360.
- **Método reproduzível, somente leitura:** calcular `encode(extensions.digest(convert_to('blob ' || octet_length(statements[1]), 'UTF8') || decode('00','hex') || convert_to(statements[1],'UTF8'), 'sha1'), 'hex')` sobre cada recibo; comparar a `version`, `name`, `cardinality(statements)=1` e o blob com o manifesto Git fixado. Os onze recibos históricos foram conferidos **por versão/presença nesta rodada**; a identidade dos seus statements privados **não** foi revalidada nesta comparação.

**Limite da prova:** a igualdade de bytes **atesta o conteúdo registrado no ledger, não a execução efetiva do DDL**. A RPC `public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])` continua ausente no catálogo apesar de o recibo 0765 estar entre os 39 exatos. Não se conhece a causa. A coexistência 0690/9037 continua exigindo plano de ordem/compatibilidade; nenhum recibo foi editado, excluído ou reaplicado.

**GitHub na verificação:** PR #43 merged; PR #62 aberta e mergeável no HEAD `0e38a2d88e3251aef22695f07b993d5294255cf2`. Os workflows desse HEAD concluíram `success`: [ci #41003215238](https://github.com/OARANHA/elus/actions/runs/41003215238), [perf #41003215280](https://github.com/OARANHA/elus/actions/runs/41003215280) e [GHCR #41003215314](https://github.com/OARANHA/elus/actions/runs/41003215314). Esses resultados não comprovam aceite funcional, publicação efetiva de imagem ou autorização de produção.

**NO-GO inalterado:** não ampliar o teto de 50 recibos nem incluir a 9037 no manifesto v1.89; `apply` permanece bloqueado antes da conexão. Faltam prova de restauração de backup, replay v1.85→v1.89 em PG15/17 descartável, isolamento multi-tenant, esclarecimento da RPC 0765 e aprovação independente da operação destrutiva 0759. Nenhum SQL mutante, E2E/Playwright, merge, publicação manual de imagem ou deploy nesta execução.

## Pesquisa de corpo de função e privilégios atuais — 30/10/2026

**Fonte:** consulta única exclusivamente `SELECT` ao `pg_catalog.pg_proc`, `pg_catalog.has_schema_privilege` e `supabase_migrations.schema_migrations` no projeto Supabase ELUS, PostgreSQL 17.11. Nenhum corpo SQL, dado de cliente ou credencial foi retornado.

- `fn_elus_rotacionar_codigos_recuperacao`: **zero** funções com esse nome em todos os schemas.
- Busca nos corpos `pg_proc.prosrc` por três marcadores distintivos da migration 0765 — `elus:recovery:`, `incomplete recovery rotation` e `invalid recovery hashes` — retornou **zero correspondências para cada marcador**. Não foi localizada uma cópia renomeada do corpo da RPC por esses critérios; isso não exclui implementações reescritas ou evidências fora do catálogo atual.
- Privilégio **atual** `CREATE` no schema `public`: papel `postgres` = **true**; papel `service_role` = **false**. Isso não informa qual papel executou a migration 0765, nem quais privilégios possuía no momento histórico da aplicação.
- Ledger: **51 recibos**; o recibo 0765 continua com cardinalidade 1, 2.747 bytes e MD5 `add7a7db36db87cd213fd7a7d0f81db7` (**uma correspondência exata**). O recibo não prova execução do DDL.

**Conclusão restrita:** a divergência **recibo 0765 exato / função ausente** permanece, sem evidência de cópia renomeada com o mesmo corpo e sem causa histórica determinada. Não inferir falha de permissão, `DROP` posterior ou não execução do DDL a partir dessas observações. Permanecem bloqueados `apply`, upgrade e deploy até restauração/replay PostgreSQL 15/17, reconciliação do ledger e da guarda 0690/9037, isolamento multi-tenant e autorização específica da 0759. Nenhum SQL mutante ou E2E foi executado.


## Auditoria de catálogo RLS multi-tenant — 30/10/2026

**Escopo:** consultas exclusivamente `SELECT` a `pg_catalog.pg_class`, `pg_namespace`, `pg_attribute`, `pg_policy`, `pg_roles` e `has_table_privilege` no projeto Supabase ELUS. Inventário de tabelas `public` ordinárias/particionadas com coluna `organization_id` não descartada; não foram consultados registros de clientes, tokens, hashes ou corpos SQL. A medição é um **snapshot**, não ensaio funcional de isolamento.

- **186 tabelas tenant-aware** identificadas pelo critério acima; **186/186 com RLS habilitado** (`relrowsecurity=true`). **Zero** tabelas com `organization_id` e RLS desabilitado no conjunto observado.
- **24 dessas tabelas** têm RLS habilitado e **zero policies explícitas**. Para as 24, `has_table_privilege` confirmou **zero concessões de SELECT, INSERT, UPDATE ou DELETE** aos papéis `anon` e `authenticated`. RLS sem policy, para esses papéis sem bypass, nega acesso por padrão; isso não equivale a defeito de isolamento nem a prova de funcionamento do aplicativo.
- Tabelas sem policy no snapshot: `ad_conversion_dispatches`, `ad_hierarchy_cache`, `ad_insights_connections`, `ad_platform_connections`, `ad_tracking_links`, `appointment_recovery_receipts`, `channel_connection_requests`, `channel_integrations`, `crm_proposal_counters`, `event_service_origins`, `extension_operations`, `google_ads_click_refs`, `google_ads_conversion_rules`, `google_ads_landing_pages`, `lgpd_marcas_de_apagamento`, `map_provider_credentials`, `meta_ads_click_refs`, `meta_ads_conversion_rules`, `meta_ads_landing_pages`, `meta_ctwa_click_dispatches`, `platform_support_sessions`, `prospecting_campaigns`, `prospecting_candidates`, `prospecting_settings`.
- Papéis atuais: `anon.rolbypassrls=false`, `authenticated.rolbypassrls=false`, **`service_role.rolbypassrls=true`**. Portanto, a checagem de catálogo **não valida** filtros de `organization_id` em handlers que usam service role, permissões efetivas por tenant, nem ausência de vazamento entre dois tenants reais.

**Método reproduzível:** selecionar `pg_class` (tipos `r`/`p`) no schema `public`, unir `pg_attribute` por `attname='organization_id'` e `NOT attisdropped`, agregar `pg_policy` por OID e conferir `relrowsecurity`; sobre o subconjunto com zero policies, agregar `has_table_privilege` para `anon`/`authenticated` e as quatro operações DML. Consultar `pg_roles.rolbypassrls` para distinguir RLS de bypass. Nenhuma consulta a dados de tenants é necessária para esse inventário.

**Gate parcial, NÃO aceite funcional:** o catálogo não revelou tabelas com `organization_id` e RLS desligado, mas o **teste de isolamento entre dois tenants e a revisão de handlers com `service_role` continuam pendentes**. Também permanecem sem solução a RPC 0765 ausente apesar do recibo exato, a ordem/compatibilidade 0690/9037, a restauração/replay isolado PostgreSQL 15/17 e a aprovação independente do DELETE 0759. A PR #43 já está integrada; a PR #62 foi observada aberta e mergeável no HEAD `5647b9dd5851b98ac387ddaf5f1b85806602542a`, com os workflows `ci` #41033446053, `perf` #41033445949 e GHCR #41033446084 concluídos com sucesso (consulta única, sem polling). **CI GREEN não substitui aceite funcional.** Nenhum SQL mutante, E2E/Playwright, merge, publicação manual de imagem ou deploy executado.


## Dependências diretas do DELETE 0759 — auditoria somente leitura (30/10/2026)

**Escopo verificado:** consultas exclusivamente `SELECT` aos catálogos `pg_trigger`, `pg_constraint`, `pg_index`, `pg_attribute`, `pg_depend`, `pg_rewrite` e `pg_proc` do Supabase ELUS. Não foram consultados registros de usuários, hashes, credenciais ou dados de tenants; nenhuma migration foi executada.

- `public.user_recovery_codes`: **zero triggers definidos pelo usuário**; **dois triggers internos de integridade referencial**, habilitados e vinculados a **INSERT** e **UPDATE**, não a DELETE.
- **Zero foreign keys de outras tabelas apontando para `user_recovery_codes`**. Existe **uma FK de saída**, `user_recovery_codes.user_id → auth.users.id ON DELETE CASCADE`: ela remove códigos quando o usuário referenciado é excluído, **não** remove o usuário quando um código é excluído.
- **Zero regras de reescrita dependentes** da tabela segundo `pg_depend`/`pg_rewrite`; **zero funções cujo `pg_proc.prosrc` contenha literalmente `user_recovery_codes`**. Busca textual não detecta SQL dinâmico, dependências externas ou referências indiretas.
- **Três índices**; coluna `code_hash` do tipo `bytea`, compatível com a contagem de formato usada no predicado `octet_length(code_hash) <> 32` da migration 0759.

**Conclusão restrita:** o catálogo atual não mostra triggers de DELETE definidos pelo usuário, FKs de entrada ou regras de reescrita dependentes que ampliem diretamente o efeito da exclusão 0759. É um snapshot do esquema atual, não um ensaio de replay, nem prova de ausência de efeitos indiretos na aplicação. A contagem anterior de zero registros legados e esta auditoria **não** autorizam o DELETE. Continuam exigidos backup restaurável, replay isolado PG15/17, isolamento multi-tenant, reconciliação 0765/0690/9037 e **aprovação independente da 0759**. Produção permanece **NO-GO**.


## Event triggers do Supabase e a RPC 0765 — inspeção 30/10/2026

Consulta **exclusivamente SELECT** a `pg_catalog.pg_event_trigger` e `pg_catalog.pg_proc` no projeto ELUS (PostgreSQL 17.11) encontrou seis event triggers habilitados (`evtenabled='O'`), todos com função de tratamento pertencente a `supabase_admin`: `issue_graphql_placeholder` e `pgrst_drop_watch` (`sql_drop`); `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access` e `pgrst_ddl_watch` (`ddl_command_end`). Nenhum desses handlers é `SECURITY DEFINER`.

Inspeção textual de `pg_get_functiondef(evtfoid)`, **sem retornar o código das funções nem dados de clientes**, encontrou zero referências literais a `fn_elus_rotacionar_codigos_recuperacao` e `user_recovery_codes` nos seis handlers. O handler `issue_pg_graphql_access` contém `DROP FUNCTION` genérico e `pgrst_ddl_watch` contém `CREATE FUNCTION` genérico; isso **não** demonstra atuação sobre a RPC 0765. A análise textual não elimina SQL dinâmico, dependências indiretas, mudanças históricas dos handlers ou DDL posterior. A causa da ausência da RPC 0765 permanece **indeterminada** apesar do recibo exato. Não executar reaplicação, correção de ledger, `apply`, E2E, merge ou deploy com base nesta inspeção. **NO-GO inalterado.**

## ACL efetiva da guarda 9037 e reconfirmação da RPC 0765 — 30/10/2026

**Fonte:** duas consultas exclusivamente `SELECT` ao ledger e ao `pg_catalog` do Supabase ELUS (PostgreSQL 17.11), sem acesso a dados de tenants, corpos de SQL armazenados, credenciais ou operações mutantes.

- O ledger contém **51 recibos**, incluindo um recibo `0765` e um `9037`. A função `public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])` permanece **ausente** (`to_regprocedure(...) IS NULL`). Isso não demonstra execução histórica da migration 0765.
- A função `public.fn_guard_organizations_ai_autonomy()` existe; o corpo atual contém textualmente a condição conjunta `current_user = 'service_role' AND auth.role() = 'service_role'` da guarda 9037. O trigger `trg_guard_organizations_ai_autonomy` em `public.organizations` está habilitado (`tgenabled='O'`) e aponta para a função esperada, com `tgtype=23`.
- O catálogo informa `prosecdef=false` (**SECURITY INVOKER**) para a função da guarda. `has_function_privilege(...,'EXECUTE')`: `service_role=true`, `anon=false`, `authenticated=false`. Essas ACLs observadas restringem a invocação direta pelos papéis clientes, mas não demonstram o comportamento de todos os caminhos de atualização via trigger, nem o isolamento funcional entre tenants.

**Limite e decisão:** a guarda 9037 está presente com wiring e ACL atuais coerentes com o diagnóstico, mas isso **não autoriza** replay da 0690 (que pode substituir o corpo mais restritivo), nem prova aceitação funcional. A ausência da RPC 0765 permanece sem causa demonstrada. Continuam exigidos restauração de backup, replay isolado PG15/17, reconciliação do ledger, teste funcional de tenancy e autorização independente do DELETE 0759. O `apply` permanece bloqueado e a produção **NO-GO**. Nenhum SQL mutante, E2E/Playwright, merge, imagem ou deploy executado.
