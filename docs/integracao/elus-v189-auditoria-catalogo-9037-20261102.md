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
