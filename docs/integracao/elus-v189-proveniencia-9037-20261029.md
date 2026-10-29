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
