# ELUS v1.89 — atestação somente leitura do catálogo externo 9037

**Observação:** 02/11/2026, ~23h BRT. **Escopo:** Supabase `elus` (PostgreSQL 17.11), PR #62. **Decisão:** NO-GO. Esta atestação não aprova replay, aplicação de SQL, merge ou deploy.

## Origem e método

- A migration externa `20261029104815 / elus_9037_ai_autonomy_guarded` tem um recibo com **1 statement**, **34.985 bytes**, MD5 `10df3c797779f8cb4461631cb22676d2`. O SQL do recibo contém **8 declarações `CREATE OR REPLACE FUNCTION`**, **1 `DROP TRIGGER`** e **1 `CREATE TRIGGER`** (contagem textual; não prova execução).
- Consulta exclusivamente `SELECT` sobre `supabase_migrations.schema_migrations`, `pg_catalog.pg_proc` e `pg_catalog.pg_trigger`. Foram extraídos apenas nomes/assinaturas, hashes de definições, flags de ACL e metadados; nenhum `statements[]`, segredo ou dado de tenant foi exportado.
- A migration ELUS versionada `supabase/migrations/20261020120000_0690_org_ai_autonomy_protected.sql` tem blob Git `4ad880adf0a8e294e20a1b50dae1fb9dbed1db65`.

## Objetos atualmente presentes

As oito assinaturas extraídas do recibo externo foram encontradas **8/8** no catálogo, cada uma com exatamente uma correspondência. Para todas: `SECURITY INVOKER`, `search_path=pg_catalog, public, pg_temp`, `EXECUTE` efetivo para `service_role` e ausência de `EXECUTE` para `anon` e `authenticated` e de concessão explícita a `PUBLIC`.

| Função (schema public) | MD5 de `pg_get_functiondef` |
| --- | --- |
| `fn_elus_ai_agent_create_guarded(uuid,jsonb,jsonb,boolean)` | `a0424b4d585c5027de87f903e231cde9` |
| `fn_elus_ai_credential_write_guarded(uuid,text,uuid,jsonb,boolean)` | `c72d496fa7d210389ff02e0ae9ae2c41` |
| `fn_elus_ai_default_write_guarded(uuid,text,text,jsonb,boolean)` | `001cbf53de34e47b39fe6f723e9f8127` |
| `fn_elus_ai_draft_save_guarded(uuid,uuid,text,uuid,jsonb,jsonb,jsonb,boolean)` | `2dd75626f1ac9dfcb405f8076e827ff4` |
| `fn_elus_ai_purpose_binding_write_guarded(uuid,text,jsonb,jsonb,boolean)` | `be95863e387c572c41ef3b49181cb113` |
| `fn_elus_ai_version_create_guarded(uuid,uuid,jsonb,boolean)` | `03a2613bb5695a3f6c8aca9d7c61d9f5` |
| `fn_elus_ai_version_patch_guarded(uuid,uuid,uuid,jsonb,jsonb,boolean)` | `4dcb50c9fa0a2bbeb24cadf594dd1e23` |
| `fn_guard_organizations_ai_autonomy()` | `1378848e0d9fce3513bba0e660b283fd` |

O trigger `trg_guard_organizations_ai_autonomy` em `public.organizations` está habilitado (`tgenabled=O`), `tgtype=23` (BEFORE INSERT OR UPDATE, FOR EACH ROW) e aponta para a função de guarda acima. A definição instalada contém a conjunção `current_user = 'service_role' AND auth.role() = 'service_role'`, além da exceção administrativa `current_user = 'postgres' AND auth.uid() IS NULL AND auth.role() IS NULL`.

## Divergência com a 0690 e limites

A 0690 versionada permite `auth.role() = 'service_role'` **sem exigir também** `current_user = 'service_role'`, preservando a mesma exceção administrativa. Portanto, o predicado de serviço instalado é mais restritivo que o texto versionado 0690. Um replay que substitua a guarda instalada pela 0690 **pode reduzir a restrição**. O risco de downgrade permanece bloqueante até plano de ordenação e equivalência revisado.

A identidade do recibo 9037 e a presença de oito objetos com ACL esperada **não provam** identidade byte a byte entre o SQL externo e as definições atuais, nem a equivalência semântica dos corpos, isolamento multi-tenant, execução histórica completa ou autorização funcional. Os hashes acima são fotografias do catálogo atual, não uma nova baseline nem um manifesto de replay.

## Código de diagnóstico adicionado à PR #62

`scripts/elus-v189-production-upgrade.mjs` passou a relatar `guarded9037FunctionsExpected`, `guarded9037FunctionsPresent`, `guarded9037FunctionsLeastPrivilege` e `guarded9037FunctionsAllSafe` em modo `diagnose`, por `SELECT` somente leitura. O teste simulado `tests/unit/elus-v189-diagnose-0765-simulated.test.ts` cobre os casos 8/8, objeto ausente (7/8) e desvio de ACL (7/8). A consulta exata extraída do código foi executada **somente como SELECT**, retornando `expected=8, present=8, least_privilege=8`; três cenários simulados passaram no avaliador JavaScript. **Lint, TypeScript e suíte Vitest não foram executados localmente**; o CI do novo HEAD ainda não foi verificado.

**Gates ainda pendentes:** causa da ausência da RPC 0765 (recibo íntegro, objeto ausente), 51 recibos contra teto de 50, plano de coexistência 0690/9037, reconstrução e replay histórico com restauração em PostgreSQL 15/17 descartável, ACL/RLS/tenancy funcional, autorização independente do DELETE 0759. `apply` permanece bloqueado antes de conectar. E2E/Playwright exclusivamente manual; nenhum SQL mutante, migration, merge, publicação de imagem ou deploy.

## Diagnóstico de deriva das definições (03/11/2026)

Consulta exclusivamente `SELECT` confirmou que os oito MD5 de `pg_get_functiondef` acima continuam correspondendo ao catálogo atual (**8/8**, PostgreSQL 17.11). O modo `diagnose` passa a comparar essas oito assinaturas com a fotografia observada e expor `guarded9037DefinitionsObservedMatches` e `guarded9037DefinitionsNoDrift`. O teste simulado diferencia ausência de função, ACL incorreta e alteração de corpo com ACL intacta. **Esta comparação detecta deriva em relação ao catálogo observado, não valida semanticamente o SQL externo, não substitui a comparação 0690/9037 e não é gate de autorização.** `apply` permanece bloqueado; nenhum SQL mutante foi executado.


## Confronto direto do corpo da guarda com o recibo externo (03/11/2026)

A consulta **exclusivamente `SELECT`** ao Supabase `elus` comparou o corpo PL/pgSQL da função `public.fn_guard_organizations_ai_autonomy()` extraído do único `statements[1]` do recibo externo `20261029104815 / elus_9037_ai_autonomy_guarded` com `pg_catalog.pg_proc.prosrc`. O extrator usa `regexp_match` delimitado pela assinatura da função e por `AS $$ ... $$`, sem exportar o SQL do recibo nem dados de tenant.

**Evidência obtida:** 1 recibo, 1 função instalada, **603 caracteres em ambos os corpos e igualdade textual exata** (`raw_body_equal=true`), além de igualdade após normalização de espaços. Isso avança a comparação para além dos hashes da fotografia do catálogo: o corpo atualmente instalado dessa **única função** coincide com o corpo registrado no recibo 9037. Não prova que a migration foi executada integralmente, não atesta os outros sete corpos, nem comprova semântica de autorização, RLS, trigger ou ordem histórica.

O modo `diagnose` agora expõe `guard9037ReceiptBodyExact` com uma terceira consulta `SELECT` que retorna somente booleano. Se o recibo, a função ou o corpo não corresponder, retorna `false` (ou falha fechada em caso de ambiguidade). O teste simulado cobre correspondência e deriva mantendo `gate=DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL`; **nenhum caminho de `apply` foi desbloqueado**.

A execução `ci` [41572312535](https://github.com/OARANHA/elus/actions/runs/41572312535) passou **10/10 jobs** no HEAD anterior `30adbe89`, incluindo matrizes PostgreSQL 15/17; workflows `perf` e GHCR também concluíram com sucesso, sem publicação ou promoção solicitada nesta investigação. Os novos commits desta seção **ainda não tiveram CI reconsultado nesta execução**. Simulação JavaScript do `diagnoseLedger` com três consultas exclusivamente `SELECT`: 2/2 cenários (corpo igual/divergente) aprovados. Lint, TypeScript e Vitest locais não foram executados.

**NO-GO inalterado:** 0765 sem RPC, 51 recibos diante do limite 50, reconciliação e ordenação 0690/9037, replay e restauração PostgreSQL 15/17 descartável, ACL/RLS multi-tenant e autorização específica do DELETE 0759. Nenhum SQL mutante, migration, E2E/Playwright, merge, publicação de imagem ou deploy.

## Confronto integral dos oito corpos 9037 (03/11/2026, 04h BRT)

Consulta **exclusivamente SELECT** ao Supabase `elus` (PostgreSQL 17.11), condicionada à identidade do recibo externo `20261029104815` (nome, statement único, 34.985 bytes e MD5). A consulta divide o SQL do recibo por `CREATE OR REPLACE FUNCTION`, identifica cada delimitador `AS $tag$` ou `AS $$` e compara o corpo extraído **sem normalização** com `pg_proc.prosrc` da função correspondente em `public`. Nenhum SQL do recibo, corpo de função ou dado de tenant foi retornado.

**Resultado comprovado:** oito funções reconhecidas, oito nomes distintos e **8/8 corpos textualmente idênticos** ao recibo externo. Comprimentos de cada par (recibo/catálogo): agent_create 5524/5524, credential_write 4256/4256, default_write 2124/2124, draft_save 2191/2191, purpose_binding 3983/3983, version_create 4473/4473, version_patch 4700/4700 e guarda organizations 603/603 caracteres. A consulta copiada **diretamente do código versionado** retornou `guarded_9037_receipt_bodies_exact=true`.

A PR #62 acrescenta `guarded9037ReceiptBodiesExact` ao modo `diagnose`, sem modificar `apply`, que continua bloqueado antes da conexão. A inspeção estática confirmou quatro consultas literais começando por `SELECT`; simulação JavaScript da função real passou em **2/2 cenários** (igualdade integral e divergência) com `gate=DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL`. CI do HEAD anterior `e5d01166`: [run 41589533299](https://github.com/OARANHA/elus/actions/runs/41589533299), concluído com sucesso; CI dos commits novos **não foi consultado** nesta execução. Lint, TypeScript e Vitest locais não foram executados.

**Limite:** igualdade de `prosrc` não prova que a 9037 foi aplicada historicamente por inteiro, nem equivale a teste funcional de permissões, transações, RLS, trigger, ordenação 0690/9037 ou compatibilidade de replay. Os bloqueios 0765, ledger 51/50, restauração/replay PostgreSQL 15/17, multi-tenancy e autorização independente do DELETE 0759 permanecem. Nenhuma migration, SQL mutante, E2E/Playwright, merge, publicação de imagem ou deploy foi executado.
