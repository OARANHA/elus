# ELUS v1.89.0 — reconciliação do ledger e catálogo (somente leitura)

**Data da evidência:** 25/10/2026. **Estado:** diagnóstico de pré-voo, **NÃO autorizado para replay**, merge ou deploy. Este documento complementa [o inventário de riscos](elus-v189-ledger-replay-risk-review-20261025.md), [os gates do banco](elus-v189-banco-real-e-gates-20261025.md) e o teste `tests/unit/elus-v189-import-ledger-integrity.test.ts`. Não é roteiro executável.

## Fontes e limites da inspeção

- Repositório `OARANHA/elus`, PR #43 (branch `feat/elus-v189-migrations-20261025`) sobre a PR #40, HEAD consultado `cf456b5883d493c87422a52c3b252f563ec9538d`; `main` `de8f86add650d13e6237275a2bf009e91dd0d785`. PR #43 aberta, Draft, mergeable, não mesclada.
- [CI do HEAD](https://github.com/OARANHA/elus/actions/runs/40221543065) concluído com sucesso: `verify`, quatro `verify-parte`, `invariants` e PostgreSQL 15/17 GREEN. Isso valida os checks da branch, **não** o upgrade do banco ativo.
- Conector Supabase do projeto **elus**, estado `ACTIVE_HEALTHY`, PostgreSQL **17.11**: `list_migrations` e duas consultas de catálogo **SELECT** realizadas em 25/10/2026. Nenhum dado pessoal, valor de código de recuperação, segredo ou conteúdo de linha foi lido.
- Comparação upstream fixada no projeto: DeskcommCRM v1.85.0 `83aeac8f78aa076f3adfaf3e773c8616229e5cd9` → v1.89.0 `6540929d5ef7a951531dda550db0bf54affa516a`. Os **38 SQL importados** e **quatro SQL próprios ELUS** estão protegidos por hashes de blob no teste de integridade; não alterar arquivos históricos para adequar o ledger.

## Ledger real observado novamente

`list_migrations` retornou exatamente **11 versões**:

| Versão registrada | Nome no histórico |
| --- | --- |
| 20261018200431 | elus_v185_preparar_extensoes_92d37f6 |
| 20261018204508 | elus_v185_baseline_92d37f6_p01_of_06 |
| 20261018204837 | elus_v185_baseline_92d37f6_p02_of_06 |
| 20261018204851 | elus_v185_baseline_92d37f6_p03_of_06 |
| 20261018204924 | elus_v185_baseline_92d37f6_p04_of_06 |
| 20261018204939 | elus_v185_baseline_92d37f6_p05_of_06 |
| 20261018204955 | elus_v185_baseline_92d37f6_p06_of_06 |
| 20261019204449 | integracoes_erp_vendaerp_0689 |
| 20261021025530 | elus_0690_org_ai_autonomy_protected |
| 20261021025551 | elus_0691_chutes_chat_catalog |
| 20261021025613 | elus_0692_chutes_catalog_sync |

O ledger registra uma **baseline v1.85.0 aplicada em seis lotes**, não as 516 migrations históricas individualmente. Os quatro nomes de migrations ELUS não correspondem aos timestamps de seus arquivos no Git. Não há registro das 38 migrations v1.89 importadas como aplicações individuais. Isso não demonstra, por si só, ausência de toda mudança no catálogo: o catálogo foi consultado separadamente.

**Classificação temporal estática:** 11/38 migrations importadas têm timestamp `<= 20261021025613`, 27/38 são posteriores. Não converter essa classificação em lista de `db push` pendente.

## Catálogo real: pré-condições objetivas

A consulta de metadados `pg_catalog`/`to_regclass` confirmou:

- **16/16 tabelas de isolamento exigidas pela PR #43 ainda ausentes** no schema `public`: `calendar_resources`, `calendar_service_schedule`, `calendar_service_professionals`, `calendar_service_resources`, `calendar_service_calendar_sources`, `calendar_service_occurrences`, `calendar_service_occurrence_resources`, `calendar_service_blocks`, `lgpd_marcas_de_apagamento`, `importacoes_de_historico`, `crm_lead_attachments`, `config_aviso_de_agendamento`, `entregas_de_aviso_de_agendamento`, `automation_rodizio_atribuicoes`, `agent_turn_traces` e `crm_metas`.
- Tabelas pré-existentes `contacts`, `platform_smtp_settings`, `agent_inbox_items`, `external_db_connections`, `user_recovery_codes`, `channel_sessions` e `passagens_de_atendimento` estão presentes. A presença não prova paridade de colunas, constraints, triggers, dados ou grants.
- `fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)` **existe**, com `SECURITY DEFINER` e `EXECUTE` efetivo para `authenticated` e `service_role`, mas não `anon`. A assinatura **de sete argumentos** exigida pelo candidato v1.89.0 não foi encontrada. Revisar chamadas, guardas e grants antes de qualquer substituição.
- `fn_definir_aviso_de_agendamento`, `fn_automation_rodizio_atribuir` e `fn_titular_apagado_a_pedido` não foram encontradas no schema `public`.
- Em `channel_sessions`, a policy `channel_sessions_tenant_write` ainda existe como `ALL` para `public`; também existem `channel_sessions_tenant_select` e `support_write_insert/update/delete`. A migration `0752` modifica o contrato de escrita: revisar policies efetivas e testes negativos, não conceder acesso por conveniência.
- A constraint `agent_inbox_items_kind_check` e a `passagens_de_atendimento_motivo_codigo_check` existem; **não** se inspecionou aqui o texto dos CHECKs. O candidato adiciona vocabulário e a paridade deve ser validada no gate de ensaio.
- **Códigos de recuperação:** `user_recovery_codes` contém **zero linhas** na observação; portanto `octet_length(code_hash) <> 32` seleciona zero linhas **neste instante**. A migration `0759` continua destrutiva por construção (`DELETE`) e exige decisão separada: a contagem pode mudar e não equivale a autorização.

Nenhum `INSERT`, `UPDATE`, `DELETE`, DDL, `db push`, `db reset`, `psql` de aplicação ou edição do ledger foi executado. Consultas de catálogo não demonstram idempotência nem segurança de replay.

## Plano de upgrade SEPARADO — etapas ainda bloqueadas

**Gate A — reconciliação estática (permitido agora).** Fixar SHA de upstream, candidato de baseline e hashes dos 42 SQL; construir inventário determinístico por timestamp, não pelo número lógico; mapear as três colisões de número `0689→0762`, `0691→0763`, `0692→0764` e o timestamp substituto de `0763`; revisar as 11 migrations anteriores ao corte e as 27 posteriores sem reescrever as quatro ELUS. Preservar testes de isolamento, privilégios e invariantes.

**Gate B — catálogo e compatibilidade (somente leitura no banco ativo).** Registrar de forma revisável definições de colunas, CHECKs, FKs, índices, triggers, views, funções com assinaturas, RLS/policies e grants relevantes. Confrontar com os contratos de `0593`, `0657`, `0669`, `0655`, `0684`, `0687`, `0762`, `0763`, `0764`, `0716`, `0693` e seus sucessores. **Não** concluir que uma migration é reexecutável apenas porque usa `CREATE OR REPLACE` ou `IF NOT EXISTS`.

**Gate C — plano técnico revisado e ambiente de ensaio autorizado (futuro).** Definir explicitamente mecanismo de transição entre o ledger de lotes e as migrations fixadas, com precondições, ordenação, checkpoints, critérios de falha, snapshot de dados e restauração testada. Testar em clone isolado, nunca no banco real, apenas após autorização separada. Não registrar versões retroativamente sem prova de aplicação real; não aplicar `db push` sobre o ledger atual por inferência.

**Gate D — revisão adversarial obrigatória.** Tratar `0657/0750` (LGPD), `0687/0753` (RPC de avisos), `0747/0757` (MFA/RBAC), `0752` (policies), `0755/0759` (códigos de recuperação) e `0734` (autorização) como pontos de decisão. Ordem dependente a provar: `0716→0717→0753`, `0763→0706`, `0684→0760`, `0747→0757`. Revisar explicitamente `0759` mesmo com zero linhas observadas.

**Gate E — decisão operacional futura.** Exigir aceite técnico e autorização específica para qualquer SQL, replay, merge, imagem ou deploy; somente depois comparar o catálogo pós-upgrade com a baseline e executar testes funcionais permitidos. CI GREEN, integridade de blobs e existência de funções **não** substituem validação de upgrade. E2E/Playwright permanece exclusivamente manual, sem disparo nesta missão.

## Estado e próximo bloqueio

**Concluído nesta inspeção:** revalidação do ledger de 11 versões, PostgreSQL 17.11, inventário de existência das 16 tabelas, quatro funções relevantes, policy antiga de `channel_sessions`, grants da RPC de caso e contagem agregada para o `DELETE` de `0759`. **Não concluído:** prova de replay/upgrade, catálogo semântico completo, rollback restaurável, testes em clone, aceite funcional e autorização para alterar banco. PR #43 permanece Draft.

## Revalidação do ledger e ACL de eventos — 25/10/2026 (somente leitura)

**Evidência nova e delimitada:** PR #43 em `5d9107145f42c2e1e15bbe0d1106af2c0ffd506d`, aberta, Draft, mergeável e não mesclada. O CI desse SHA, [run 40235568919](https://github.com/OARANHA/elus/actions/runs/40235568919), terminou `success` nos jobs `verify`, `verify-parte`, `invariants`, `invariants-alcance` e matrizes PostgreSQL 15/17. O [workflow de imagens 40235568893](https://github.com/OARANHA/elus/actions/runs/40235568893) terminou `success`, porém `build-and-push`, `juntar-manifestos` e `promover-stable` ficaram `skipped`. Esses resultados não são aceite funcional nem evidência de aplicação ao banco real.

O conector Supabase `list_migrations` foi consultado novamente: **11 registros**, idênticos à tabela deste documento; último `20261021025613`. As quatro versões próprias ELUS continuam registradas como `20261019204449`, `20261021025530`, `20261021025551`, `20261021025613`. A classificação estática de **11 imports antes/iguais ao corte e 27 depois** permanece, sem prova de que `db push` faria o replay correto.

### Funções privilegiadas — evidência de catálogo e limite de segurança

Foram realizadas exclusivamente consultas `SELECT` sobre `pg_catalog.pg_proc`, `pg_catalog.pg_trigger` e `pg_get_functiondef`, sem invocar funções de negócio nem ler linhas de clientes:

| Função existente no banco | `SECURITY DEFINER` | `EXECUTE` efetivo `authenticated` | `EXECUTE` efetivo `anon` |
| --- | --- | --- | --- |
| `fn_log_event(uuid,text,jsonb)` | Sim | Sim | Não |
| `emit_event(text,text,uuid,jsonb,jsonb,uuid)` | Sim | Sim | Não |
| `fn_lgpd_cascade_redact_contact(uuid,uuid,uuid)` | Sim | Não | Não |
| `fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)` | Sim | Sim | Não |

O corpo **atual do banco** de `fn_log_event` recebe `organization_id`, tipo e payload e encaminha a `emit_event`; **não faz sua própria checagem de pertencimento**. O corpo de `emit_event`, entretanto, contém barreiras explícitas: quando `auth.uid()` não é nulo, recusa eventos reservados e campos de origem privilegiada; exige `fn_role_at_least(v_org_id, 'viewer')` para a organização indicada; e aplica `fn_support_write_allowed`. Assim, o grant direto a `authenticated` **não comprova, isoladamente, bypass entre tenants**. A consulta a `pg_trigger` não encontrou triggers cujo `tgfoid` aponte diretamente para `fn_log_event`; isso **não exclui** chamadas a ela feitas por outras funções ou pelo aplicativo.

**Gate de segurança ainda aberto:** comparar o corpo das funções com as migrations upstream fixadas e seus call sites, determinar se `EXECUTE` direto para `authenticated` é contratualmente necessário e provar em ambiente isolado, com testes negativos, isolamento entre organizações, eventos reservados, sessão ausente e papel insuficiente. Não revogar nem conceder privilégios no banco ativo com base apenas nesta inspeção. A assinatura de **sete** argumentos esperada para `fn_definir_aviso_de_caso` continua não comprovada no banco ativo.

**Limites desta execução:** nenhuma migration/DDL/DML aplicada, nenhum E2E/Playwright, merge, publicação de imagem ou deploy. Não houve execução local de lint, TypeScript ou unitários; o CI verde citado pertence estritamente ao SHA indicado. O plano de upgrade das 11 versões e a validação em banco descartável seguem bloqueios separados antes de qualquer ação no banco real.

## Gate incremental de credenciais — 25/10/2026

- **CI do HEAD anterior** `21ec86a5783b2402a4076e362c207cc0d7c7dc24`: [run 40240393646](https://github.com/OARANHA/elus/actions/runs/40240393646) `completed/success`, com os nove jobs verdes, incluindo PostgreSQL 15/17. [Run de imagens 40240393557](https://github.com/OARANHA/elus/actions/runs/40240393557) terminou `success`, mas `build-and-push`, `juntar-manifestos` e `promover-stable` ficaram `skipped`: **nenhuma publicação comprovada**.
- O conector Supabase `list_migrations` confirmou novamente **as mesmas 11 versões** listadas acima, até `20261021025613`. Nenhuma alteração no ledger foi efetuada. As 38 importadas seguem classificadas em 11 anteriores/iguais e 27 posteriores ao corte; classificação cronológica **não** é plano de aplicação.
- **Contrato `0755 → 0759` revisado nos arquivos SQL:** `0755` revoga privilégios de `anon` e `authenticated` na tabela `user_recovery_codes`, substitui `recovery_codes_self` pela policy `user_recovery_codes_ninguem_le` com `using (false)`; `0759` executa `DELETE` de hashes com comprimento diferente de 32 bytes. A ordem dos timestamps é correta no lote importado. A existência da policy e dos revokes **no banco pós-upgrade** ainda não foi comprovada.
- **Guarda estática nova:** commit [`134b346d`](https://github.com/OARANHA/elus/commit/134b346d86e5a530b5e46e5d18e1be7eb7084b07) reforça `tests/unit/elus-v189-replay-contracts.test.ts` para exigir a ordem `0755 → 0759`, o `REVOKE`, a remoção da policy antiga, a policy de negação e ausência de `GRANT` direto aos clientes na migration `0755`. As expressões foram conferidas estaticamente contra o SQL; **Vitest, TypeScript, lint e CI deste novo commit não foram executados/consultados nesta execução**.
- **Lacuna preservada:** os testes de invariantes citados nos manifests upstream `codigos-de-recuperacao-so-o-servidor-grava.test.ts` e `codigos-de-recuperacao-antigos-saem.test.ts` **não existem nesta branch** (leitura GitHub retornou 404). A nova guarda é estática, não substitui testes negativos de `anon`, `authenticated`, isolamento ou verificação de dados legados em clone isolado. **Não aplicar `0759` nem qualquer migration ao banco ativo** antes dos gates e autorização separados.

**Resultado deste gate:** reforço de prevenção de regressão na PR #43; replay, restauração, aceite funcional e atualização produtiva **continuam bloqueados**. Nenhum E2E/Playwright, SQL de aplicação, merge, publicação de imagem ou deploy.

## Gate de identidade do corte histórico — 25/10/2026

- **CI do HEAD anterior** `050568cefb038357d158c1f3c4598b98247bd85d`: [run 40244943085](https://github.com/OARANHA/elus/actions/runs/40244943085) `completed/success`, com nove jobs GREEN, incluindo PostgreSQL 15/17. [Workflow de imagens 40244943204](https://github.com/OARANHA/elus/actions/runs/40244943204) `completed/success`, mas `build-and-push`, `juntar-manifestos` e `promover-stable` foram `skipped`; não há prova de publicação.
- **Novo teste de regressão:** commit `3d372c7993455439e444a14a9c6cdf594c9f1093` fixa por identidade as 11 migrations importadas anteriores/iguais ao corte observado, além da contagem 11/27; também verifica que os timestamps dos quatro arquivos ELUS não coincidem com as versões efetivas do ledger do snapshot. Isso detecta substituições de arquivos que manteriam a mesma contagem e impede inferência nominal de aplicação.
- **Limite de prova:** é uma guarda estática contra mudanças no lote, não um teste de replay, migração ou catálogo. O novo HEAD ainda não foi validado por lint, TypeScript, unitários ou CI nesta execução. Sem execução de SQL no banco, E2E/Playwright, merge, imagem ou deploy.
- **Bloqueio mantido:** conciliar as 11 versões realmente registradas com os 38 SQL importados e comprovar precondições, privilégios e recuperação em clone isolado autorizado antes de qualquer upgrade real. A PR #43 segue Draft e não integrada.


## Candidato ELUS 0765 — rotação MFA atômica (26/10/2026)

**Estado: IMPLEMENTADO NO CÓDIGO DA PR, NÃO TESTADO EM POSTGRES ISOLADO NEM APROVADO PARA O BANCO REAL.** Complemento local ELUS após o lote histórico de **38 imports upstream e quatro SQL próprios preservados por hash** (não reescrever nenhum dos 42 SQL históricos). A nova migration é `supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql`; a action `app/actions/settings/regenerateRecoveryCodes.ts` e seu teste unitário evoluíram em commits subsequentes à PR #43.

- `fn_elus_rotacionar_codigos_recuperacao(uuid, text[])`: exige exatamente dez hashes SHA256 hexadecimais de 32 bytes, distintos; recebe user_id de `getUser()` validado pela Server Action, exige TOTP verificado e sessão `aal2`. Não transmite códigos em texto claro ao banco.
- A RPC, invocada exclusivamente pelo cliente `service_role`, obtém `pg_advisory_xact_lock` derivado do usuário, executa `DELETE` + `INSERT` na mesma transação PostgreSQL e só retorna sucesso com dez linhas. Erro reverte o conjunto. Sem fallback à escrita por sessão, sem múltiplas chamadas REST para simular transação.
- `SECURITY DEFINER SET search_path=''`; `REVOKE` de `PUBLIC, anon, authenticated`; `GRANT EXECUTE` apenas para `service_role`. O RPC aceita um `user_id` arbitrário **do chamador de serviço**: não expor esse cliente/segredo à UI; autorização ocorre na ação após identidade validada.
- Em duas requisições concorrentes, o desenho serializa a rotação por usuário. O último conjunto que completar prevalece; a interface não deve prometer que conjuntos emitidos em requisições anteriores permanecerão ativos. Este é **argumento de arquitetura**, não teste concorrente já executado.
- Até aplicar a migration em um ambiente que a contenha, a action retorna `rotation_failed` sem apagar códigos antigos. **Não fazer deploy da action antes de validar a compatibilidade com a RPC e a ordem do upgrade.** Baseline v1.89 ainda não reconstruída; ledger real registra onze versões v1.85/ELUS, e `0759` continua com `DELETE` destrutivo independente.

**Próximo gate:** executar `pnpm typecheck`, lint e testes unitários no SHA exato; ensaio em PostgreSQL 15 e 17 isolados com dois clientes e duas transações concorrentes, falha de inserção com rollback, isolamento entre usuários, privilégios `anon/authenticated` negados e `service_role` permitido; inventariar a RPC em baseline/upgrade e atualizar o plano de rollback. **Sem `db push`, alteração no Supabase ativo, E2E, merge ou deploy nesta etapa.**
