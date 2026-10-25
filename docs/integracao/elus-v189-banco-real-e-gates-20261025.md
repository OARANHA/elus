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
