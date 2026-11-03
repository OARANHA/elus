# ELUS — gate do banco real antes da importação v1.89.0

**Observação somente leitura: 25/10/2026.** Fonte: projeto Supabase conectado de nome `elus`, consulta estruturada `list_migrations` (histórico de migrations do banco). Nenhum SQL foi executado nesta verificação e nenhum dado de cliente foi consultado.

## Estado comprovado

O banco ativo reporta **11 registros de migrations**, e NÃO um registro por cada um dos **516 arquivos SQL** do upstream 1.85.0. O histórico real representa um baseline consolidado em lotes mais as 4 migrations exclusivas ELUS:

| Versão gravada no Supabase | Nome                                   |
| -------------------------- | -------------------------------------- |
| `20261018200431`           | `elus_v185_preparar_extensoes_92d37f6` |
| `20261018204508`           | `elus_v185_baseline_92d37f6_p01_of_06` |
| `20261018204837`           | `elus_v185_baseline_92d37f6_p02_of_06` |
| `20261018204851`           | `elus_v185_baseline_92d37f6_p03_of_06` |
| `20261018204924`           | `elus_v185_baseline_92d37f6_p04_of_06` |
| `20261018204939`           | `elus_v185_baseline_92d37f6_p05_of_06` |
| `20261018204955`           | `elus_v185_baseline_92d37f6_p06_of_06` |
| `20261019204449`           | `integracoes_erp_vendaerp_0689`        |
| `20261021025530`           | `elus_0690_org_ai_autonomy_protected`  |
| `20261021025551`           | `elus_0691_chutes_chat_catalog`        |
| `20261021025613`           | `elus_0692_chutes_catalog_sync`        |

**Consequência:** comparar apenas timestamps dos nomes de arquivos no repositório não prova compatibilidade com o histórico real. As quatro migrations ELUS já constam na lista do banco com **versões de aplicação distintas dos timestamps escritos no nome dos arquivos SQL**. As 516 migrations históricas estão representadas pelo baseline em lotes, e não por 516 lançamentos individuais no histórico.

O manifesto `elus-upstream-v1.89.0-plano.json` e seu pré-voo só resolvem **colisões nominais no repositório** (três colisões de número lógico e uma de timestamp). Nem isso nem o novo hash de blob Git da PR #39 autorizam aplicar SQL. O upstream acrescenta 38 migrations, cujo conteúdo/dependências/baseline precisam ser reconciliados com o banco efetivo.

## Gates para continuação — nenhum executa SQL

1. **Somente leitura:** confrontar cada uma das 38 migrations upstream com os objetos reais presentes no schema e dependências de migrations anteriores; registrar as que exigem prerequisitos ausentes. Não assumir que o baseline em lotes corresponde a aplicar as 516 migrations antigas uma a uma.
2. **Plano de execução separado:** identificar versões Supabase realmente registradas, eventual replay de arquivos históricos e ordenação segura das 38 migrations novas. Não regravar, renomear ou apagar entradas do histórico de produção.
3. **Código:** integrar mudanças upstream em branch de integração, resolver conflitos, preservar VendaERP READ-ONLY, ISIS/DANFE, Chutes, login, RBAC e governança.
4. **Verificação permitida:** lint, types, testes unitários e invariantes; E2E/Playwright **não executar**. O workflow `.github/workflows/e2e.yml` permanece exclusivamente `workflow_dispatch`.
5. **Antes de qualquer merge/deploy:** CI, revisão adversarial e plano de rollback. Deploy somente após publicação de imagens, digests preservados e gates de produção.

**Esta observação não comprova versão executando em produção, não aplica migrations e não autoriza deploy.** Se o histórico mudar, repetir a inspeção estruturada antes de decidir.

## Atualização somente leitura — preparo da importação (25/10/2026)

As 38 migrations foram incorporadas à branch derivada da PR #40, com três renomes de colisão previstos no plano. A baseline v1.89.0 **ainda precisa ser reconstruída e validada separadamente**. A baseline presente foi restaurada integralmente da PR #40 após o CI detectar a versão truncada. A leitura de catálogo confirmou que os objetos ausentes são introduzidos pelo lote; 40 colunas de destino ainda não existem no banco. **Nenhuma migration foi aplicada.**

A documentação de reconciliação detalhada e o mapa de importação estão em [`elus-upstream-v1.89.0-migrations.md`](elus-upstream-v1.89.0-migrations.md) e [`elus-upstream-v1.89.0-plano.json`](elus-upstream-v1.89.0-plano.json). O replay exige plano separado para o ledger real; `db push` continua proibido nesta etapa.

## Candidato estático da baseline (25/10/2026)

Após o segundo CI RED da PR #43, `supabase/baseline.sql` passou a ser um candidato v1.89.0 composto do baseline upstream fixado e das quatro migrations ELUS. A paridade entre a cadeia e o apêndice foi verificada apenas por testes estáticos. O candidato não foi aplicado ou validado em Postgres, e o plano de replay das migrations anteriores ao último registro do ledger continua pendente.

## CI RED do candidato v1.89.0 — reconciliação parcial (25/10/2026)

A execução `ci` [40186184111](https://github.com/OARANHA/elus/actions/runs/40186184111), no HEAD `6259b3d40b1ec5885adc88e9745305343667ee51`, reprovou **2 testes unitários** de preço do catálogo e **18 invariantes em cada matriz PostgreSQL 15/17**. Os logs foram inspecionados uma única vez nesta rodada, sem polling.

**Correção pontual de preço do Gemini 4 Argon (migration 0703):** o catálogo declara 400/2000 centavos por milhão para a tarifa Standard a partir de 01/12/2026 UTC, mas o motor não tinha entrada para o id. O contrato SQL também declara a promoção anterior (200/1000) e cache de leitura 10/20 centavos por milhão. A branch agora contém a tabela e a virada temporal em `pricing.ts`, a aplicação do mesmo corte em `computeCost` e testes unitários de fronteira, cache e paridade. **Código publicado na PR; resultado de CI do novo HEAD ainda não observado.** Não extrapolar para GREEN.

**Permanecem bloqueantes:** invariantes de RLS em novas tabelas, grants SECURITY DEFINER, política de platform admin, função `fn_definir_aviso_de_caso` ausente, divergências de vocabulário banco/TypeScript, LGPD (rótulo opaco), métricas e reserva de tipos de eventos. Não reduzir a cobertura ou declarar exceções para forçar aprovação. O candidato de baseline ainda não foi validado como plano de upgrade do ledger real de 11 versões. Não aplicar SQL, não executar E2E, não fazer merge ou deploy.


## CI do candidato após correção 0743 — reconciliação incremental (25/10/2026)

O HEAD `8c99246e00bec4400d4904e24934bef5b8a77a1a` da PR #43 foi verificado **uma única vez** na execução [40197863859](https://github.com/OARANHA/elus/actions/runs/40197863859). `verify` e as quatro partições `verify-parte` passaram, mas `invariants-majors` falhou em PostgreSQL 15 e 17: **17 testes em 11 arquivos** por versão. Os problemas não autorizam aplicação no Supabase real.

A comparação das migrations fixadas com o código local revelou três descompassos de contrato diretamente comprovados:
- A migration upstream `0655` acrescentou `task_due` e `task_overdue` ao CHECK de `agent_inbox_items.kind`; o tipo `InboxKind` local não os declarava. O tipo foi sincronizado com a definição upstream.
- A migration `0693` acrescentou `verificacao_manual` ao CHECK de `passagens_de_atendimento.motivo_codigo`; `MOTIVOS_DA_PASSAGEM` e `FRASE_DO_MOTIVO` foram sincronizados com a definição upstream.
- A migration `0754` acrescentou `median_first_response_seconds` à resposta da RPC de atendentes. O teste de paridade da migration `0596` comparava o objeto completo com a versão anterior, portanto rejeitava esse campo novo. A régua agora exige igualdade exata dos campos legados e presença/tipo válido da mediana, sem relaxar a paridade antiga.

**Status destas três correções: IMPLEMENTADO na branch, NÃO TESTADO em CI no novo HEAD.** Nenhuma consulta adicional de Actions foi realizada nesta rodada.

Outros bloqueios observados nos logs do mesmo CI: rótulos opacos LGPD divergindo de expectativas antigas, `fn_definir_aviso_de_caso` ausente, policy `channel_sessions_tenant_write` substituída na migration `0752`, falta de provas comportamentais RLS para tabelas novas, exceções/grants SECURITY DEFINER e expectativas de platform-admin. Cada caso requer confronto com contrato upstream e teste funcional; não adicionar exceções ou reescrever expectativas apenas para tornar o CI verde.

**Sem E2E/Playwright, sem SQL/migrations no Supabase real, sem merge, sem deploy.** O plano de upgrade do ledger de 11 registros permanece gate obrigatório e separado.

## CI do HEAD daab70be — falha de tradução e execução ainda incompleta (25/10/2026)

A consulta única ao CI do HEAD `daab70be9025b8d0672461874214ddc2ae7b9c80` identificou a execução [40205976348](https://github.com/OARANHA/elus/actions/runs/40205976348) ainda em andamento, mas já com falha confirmada no job `verify-parte (3)`: `lib/ai/inbox-destino.test.ts` exigiu a tradução espanhola de **"Abrir tarefa"** (1 falha, 7.766 testes aprovados nesta partição). No instante da leitura, os jobs de invariantes PostgreSQL 15/17 ainda estavam em execução; não inferir seu resultado.

A revisão estática de `lib/ai/inbox-destino.ts` contra `lib/i18n/dicionario.ts` encontrou três chaves de aviso de tarefas introduzidas pela migration 0655 sem espanhol: o rótulo "Abrir tarefa" e as orientações de `task_due` e `task_overdue`. As três traduções foram adicionadas exclusivamente ao dicionário, sem mudar autorização, URL, SQL ou comportamento do resolvedor. Commit `e523faf9d9855bcff66c359c9cd4abeba618c499`; leitura posterior do blob confirmou que todas as chaves literais de `rotulo`/`orientacao` e os rótulos dinâmicos do resolvedor possuem entrada no dicionário. **Validação estática apenas; o novo HEAD ainda não foi validado pelo CI nesta execução.**

Continuam pendentes a conclusão dos invariantes PostgreSQL, a revisão de segurança e o plano separado de upgrade das 11 versões reais do ledger Supabase. Nenhuma migration aplicada, nenhum E2E/Playwright, merge ou deploy executado.


## Gate estático de replay e imutabilidade do lote (25/10/2026)

A leitura única do CI do HEAD `d85ce1ef3a1c74fae5c77e5708a56b7db3d06dbc` da PR #43 retornou **GREEN** em `verify`, `invariants` e nas matrizes PostgreSQL 15/17 ([run 40214470636](https://github.com/OARANHA/elus/actions/runs/40214470636)). Esse GREEN comprova os checks daquela revisão, **não** valida upgrade do banco ativo nem aceite funcional.

A comparação Git `PR #40 (610474d53) ... PR #43 (d85ce1ef)` distingue **38 migrations SQL adicionadas** de **9 migrations já existentes com ajustes documentais**. O inventário das 38 importadas, mais as **quatro migrations próprias ELUS**, agora tem hashes de blob Git fixados em `tests/unit/elus-v189-import-ledger-integrity.test.ts`. O teste exige bytes idênticos nos 42 arquivos, números/timestamps únicos dentro desse lote e os três renomes do plano nominal. A baseline candidata continua protegida por `tests/unit/baseline-integrity.test.ts`. Uma mudança legítima de SQL exige revisão e atualização explícita do teste; não se deve editar migrations históricas silenciosamente.

**Risco de replay detectado sem consultar ou alterar o banco:** comparando os timestamps das 38 migrations importadas com o **último registro do snapshot de 11 versões** (`20261021025613`, observado em 25/10/2026), **11 arquivos têm timestamp anterior ou igual** e **27 são posteriores**. Portanto, **não se pode presumir** que um `supabase db push` comum aplicaria o lote inteiro na instalação existente. A classificação depende de um snapshot datado; ela **não substitui** nova leitura somente de histórico, análise da semântica do Supabase CLI, dependências SQL, ordem de aplicação e teste de upgrade em ambiente autorizado. Nenhuma versão do ledger foi alterada.

**Estado do gate:** o teste estático foi publicado após o HEAD GREEN acima, mas seu próprio CI ainda não foi consultado nesta execução. Nenhum SQL, migration, E2E/Playwright, merge, publicação de imagem ou deploy foi executado. A PR continua Draft até validação independente do plano de upgrade e dos demais critérios de aceite.


## Triagem adicional de replay e risco de DML (25/10/2026)

A revisão estática do lote de 38 migrations importadas, com inventário das **11 anteriores ou iguais** e das **27 posteriores** ao corte do ledger observado, foi publicada em [`elus-v189-ledger-replay-risk-review-20261025.md`](elus-v189-ledger-replay-risk-review-20261025.md). A inspeção identificou explicitamente a migration `0759`, que contém `DELETE` de códigos de recuperação em formato legado; isso exige avaliação de impacto, recuperação e autorização próprias antes de qualquer aplicação no ELUS. O documento registra também dependências de ordem e as três renomeações de colisão, sem afirmar prova de replay.

No HEAD `4fd669d59bcc08b3ebf2ae723e1d8192303ac927`, a execução [40216526578](https://github.com/OARANHA/elus/actions/runs/40216526578) concluiu `ci` com sucesso (`verify` e invariantes PostgreSQL 15/17 GREEN). **Esse GREEN antecede esta documentação**, não valida a instalação existente e não autoriza SQL, merge, imagens ou deploy. Nenhum teste adicional ou consulta ao banco foi executado nesta triagem.

## CI da PR #43 — correção pontual de TypeScript (25/10/2026)

No HEAD `a5caafc25541506f4016ab8cd7dd4d3808c7b177`, a consulta única à execução [40230662550](https://github.com/OARANHA/elus/actions/runs/40230662550) confirmou **RED** no job `verify-parte (1)` (ID `121281475720`), passo `Typecheck`: `TS18048` em `tests/unit/elus-v189-replay-contracts.test.ts:102` (`projecaoFinal` possivelmente `undefined`). As outras três partições `verify-parte` e as matrizes de invariantes PostgreSQL 15/17 concluíram com sucesso. O agregador `verify` falhou como consequência.

A correção focal, commit [23ebc493](https://github.com/OARANHA/elus/commit/23ebc4930601ee17cf5d978356e3e39f79e15427), substituiu o acesso não protegido ao grupo de captura da expressão regular por `?.[1] ?? ""`. A asserção `toMatch` continua exigindo a projeção esperada: ausência do grupo permanece falha de teste, mas sem erro de tipagem. O blob alterado foi relido e confirmado.

**Validação do novo HEAD ainda pendente:** não houve segunda consulta ao CI, execução local de TypeScript, lint ou unitários nesta rodada. A correção não altera SQL, migrations, runtime, E2E ou deploy. Permanecem os gates independentes de replay sobre o histórico Supabase de 11 versões, segurança das migrations e aceite funcional.

## Reconciliação adicional do catálogo ativo — 02/11/2026 (somente leitura)

Fonte: projeto Supabase conectado `elus` (`ACTIVE_HEALTHY`, PostgreSQL 17), por consultas **SELECT** agregadas em `supabase_migrations.schema_migrations`, `pg_proc`, `pg_trigger`, `pg_namespace` e `pg_class`. Não foram consultados dados de tenants nem o conteúdo de `statements[]`; somente nomes, versões, contagens, comprimentos e MD5 de SQLs registrados.

| Sinal | Evidência observada |
| --- | --- |
| Ledger ativo | **51 recibos**, enquanto `scripts/elus-v189-production-upgrade.mjs` exige no máximo 50; `preflight` continua bloqueado. |
| ELUS 0690 | `20261021025530`, nome `elus_0690_org_ai_autonomy_protected`, 1 statement, 2.344 bytes, MD5 `89178273952e0c2af1174916ab1bf0e4`. |
| RPC 0765, recibo | `20261026010000`, nome `0765_elus_rotacao_atomica_codigos_recuperacao`, 1 statement, 2.747 bytes, MD5 `add7a7db36db87cd213fd7a7d0f81db7` (identidade esperada no diagnóstico versionado). |
| RPC 0765, catálogo | `to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])')` retornou **NULL**; busca por nomes de funções de recuperação/rotação não encontrou a função em outros schemas. **Recibo não comprova objeto presente.** |
| Guarda externa 9037, recibo | `20261029104815`, nome `elus_9037_ai_autonomy_guarded`, 1 statement, 34.985 bytes, MD5 `10df3c797779f8cb4461631cb22676d2`. Este recibo **não** integra o manifesto oficial de 39 migrations. |
| Guarda externa 9037, catálogo | `public.fn_guard_organizations_ai_autonomy()` existe; trigger `trg_guard_organizations_ai_autonomy` está habilitado em `public.organizations`. A função não é `SECURITY DEFINER`; `search_path=pg_catalog, public, pg_temp`; `anon` e `authenticated` sem EXECUTE, `service_role` com EXECUTE. Isso **não** equivale a teste comportamental da guarda. |

**Implicação:** o banco não está no estado de apenas 11 recibos descrito no snapshot histórico de 25/10. O recibo 0765 registrado, mas sem a RPC correspondente no catálogo, é divergência funcional a investigar antes de qualquer replay. O recibo externo 9037 exige decisão de reconciliação independente, sem excluir histórico nem elevar silenciosamente o limite de 50. A existência da guarda 9037 não resolve a ausência da RPC 0765.

**Gates mantidos:** restauração comprovada e replay histórico separado em PG15/17 descartável; inventário completo de dependências e efeitos das 38 migrations; ACL/RLS e isolamento multi-tenant; reconciliação 0690/9037 e 0765; autorização específica do DELETE 0759. `apply` produtivo permanece fail-closed. Nenhum DDL/DML, migration, E2E/Playwright, merge, publicação ou deploy foi executado.

**CI observado no HEAD anterior `c86bf2bc3d124fd23e1ff5a0249f302022b98a84`:** [run 41481932638](https://github.com/OARANHA/elus/actions/runs/41481932638), 10/10 jobs SUCCESS, incluindo invariantes PostgreSQL 15/17; workflow de imagens [41481932736](https://github.com/OARANHA/elus/actions/runs/41481932736) SUCCESS, mas `build-and-push`, `juntar-manifestos` e `promover-stable` SKIPPED. Isso não aprova upgrade funcional, nem valida este novo registro documental.

## ACL dos códigos de recuperação e impacto da ausência da RPC — 02/11/2026

Inspeção adicional **somente SELECT** no projeto Supabase conectado `elus` (PostgreSQL 17.11). Foram consultados exclusivamente `pg_catalog`, `supabase_migrations.schema_migrations` e metadados de permissões; nenhuma linha de usuário, hash de código ou conteúdo de `statements[]` foi lido.

| Verificação | Resultado observado |
| --- | --- |
| Histórico ativo | 51 recibos; 0765 presente, 1 statement de 2.747 bytes, MD5 `add7a7db36db87cd213fd7a7d0f81db7`. |
| Função `public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])` | **Ausente** por `to_regprocedure`; `pg_proc` não contém o nome em nenhum schema. |
| `public.user_recovery_codes` | Tabela presente; RLS habilitada. |
| Política `user_recovery_codes_ninguem_le` | Uma policy SELECT com expressão `false` encontrada. |
| Privilégios diretos de `anon` e `authenticated` | Ambos sem SELECT, INSERT, UPDATE ou DELETE na tabela, segundo `has_table_privilege`. |

**Conclusão limitada:** o estado observado preserva as barreiras RLS/ACL inspecionadas da tabela, mas a RPC atômica 0765 continua ausente apesar do recibo. Em `app/actions/settings/regenerateRecoveryCodes.ts`, o código versionado chama exclusivamente `admin.rpc('fn_elus_rotacionar_codigos_recuperacao', ...)` e retorna `rotation_failed` se a chamada falhar, sem DELETE/INSERT alternativos no cliente; há teste simulado de `PGRST202`. Isso é **inferência do código versionado**, não comprovação de qual build está executando nem teste de rotação em produção. O motivo da ausência (registro sem efeito, DROP posterior ou outro desvio) **não foi determinado**. Não reconstruir a função diretamente no banco real nem manipular recibos como atalho.

**CI do HEAD anterior a esta nota:** `09bda847d5a2224f5c9a14173a4ba7bbf83e7dc4`, [run 41490515332](https://github.com/OARANHA/elus/actions/runs/41490515332), **10/10 jobs SUCCESS** (incluindo PostgreSQL 15/17); workflows perf e GHCR também `success`, sem inferência de publicação. Os checks não provam restauração, replay nem funcionalidade da RPC ausente. Novo commit documental ainda exige validação de seu próprio HEAD.

**Próximo gate:** rastrear a origem da discrepância 0765 por evidências auditáveis, verificar replay/restauração PG15/17 descartável e reconciliação independente do recibo externo 9037 e limite de 50. Manter `apply` bloqueado, 0759 sem autorização e E2E somente manual. Nenhum SQL mutante, E2E, merge, imagem ou deploy nesta inspeção.


## Auditoria cruzada 0690/9037 e limites de pg_stat_statements — 02/11/2026, 21h BRT

**Escopo e método:** consultas exclusivamente `SELECT` no projeto Supabase conectado `elus` (PostgreSQL 17.11) e leitura da migration versionada `20261020120000_0690_org_ai_autonomy_protected.sql`. Foram retornados apenas metadados, fingerprints e marcadores booleanos; não foram exportados os 34.985 bytes da migration externa 9037, conteúdo de tenants nem dados pessoais.

- **Ledger 0690:** recibo `20261021025530`, `elus_0690_org_ai_autonomy_protected`, um statement de 2.344 bytes, MD5 `89178273952e0c2af1174916ab1bf0e4`.
- **Ledger externo 9037:** recibo `20261029104815`, `elus_9037_ai_autonomy_guarded`, um statement de 34.985 bytes, MD5 `10df3c797779f8cb4461631cb22676d2`.
- **Sobreposição textual demonstrada:** os statements registrados de **ambas** as migrations mencionam literalmente `fn_guard_organizations_ai_autonomy`, `trg_guard_organizations_ai_autonomy`, `ai_autonomy`, `DROP TRIGGER` e `CREATE TRIGGER`. Portanto, a 9037 **não é independente da superfície protegida pela 0690**. A presença desses padrões não prova equivalência de DDL nem determina a ordem/resultado de cada operação.
- **Catálogo atual:** `public.fn_guard_organizations_ai_autonomy()` existe, com `SECURITY DEFINER=false` (invoker), MD5 de `pg_get_functiondef` igual a `1378848e0d9fce3513bba0e660b283fd`; `trg_guard_organizations_ai_autonomy` existe em `public.organizations` e está habilitado (`tgenabled='O'`). Os três textos inspecionados (0690, 9037 e definição atual) contêm os marcadores `service_role`, `current_user`, `auth.uid() is null`, `elus_ai_autonomy_restricted` e `IS DISTINCT FROM`. Esses marcadores **não** demonstram identidade semântica, segurança ou resultado de testes negativos.
- **Limite forense da RPC 0765:** `pg_stat_statements_info.dealloc=27` desde `stats_reset=2026-10-18 01:44:16.109973+00`; `pg_stat_statements.max=5000`, com 4.877 entradas observadas nesta consulta. Houve desalocação de entradas das estatísticas; a ausência do identificador literal da RPC no conjunto atual **não permite concluir que o DDL nunca foi executado**. `pg_proc` continua sem `fn_elus_rotacionar_codigos_recuperacao` em qualquer schema.

**Gate novo e explícito:** antes de qualquer replay/merge/deploy, comparar estruturalmente as definições e efeitos da 0690 e da 9037 em ambiente isolado, inclusive a precedência da guarda, triggers, ACL/RLS e testes negativos de tenant. A 9037 continua externa ao manifesto oficial e exige tratamento individual no ledger de 51 recibos (limite do executor: 50); não elevar o teto, apagar recibos ou reexecutar DDL em produção. A RPC 0765 permanece ausente no catálogo e sua causa não foi determinada. O DELETE 0759 continua sem autorização específica.

**CI consultado uma vez nesta execução:** HEAD `b3a6e1e015db62fe837c208e17a8d9a9cdc37e01`, workflow `ci` [41546240208](https://github.com/OARANHA/elus/actions/runs/41546240208) concluído `success` com **10/10 jobs**; workflows `perf` e GHCR também `success`, sem prova de publicação de imagens. O workflow `.github/workflows/e2e.yml` permanece exclusivamente `workflow_dispatch`. CI GREEN **não** constitui aceite funcional nem validação de replay.

**Operações proibidas não realizadas:** nenhum SQL mutante, migration, E2E/Playwright, merge, publicação de imagem ou deploy. Lint, TypeScript e unitários locais não foram executados nesta inspeção documental; o CI anterior inclui suas partições, mas o novo HEAD documental não foi consultado.
