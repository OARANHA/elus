# Integração incremental — núcleo de avisos de agendamento v1.89.0

**Origem fixa:** `melgarafael/DeskcommCRM@6540929d5ef7a951531dda550db0bf54affa516a`.
**Base desta fatia:** `OARANHA/elus@4fd669d59bcc08b3ebf2ae723e1d8192303ac927` (PR #43; migrations e RLS da v1.89.0 em preparação).

## Implementado nesta branch

Portados diretamente do upstream, sem alterações funcionais, os módulos `lib/agenda/vocabulario-do-aviso-de-agendamento.ts`, `texto-do-aviso-de-agendamento.ts`, `aviso-de-agendamento.ts` e os dois testes unitários correspondentes. A migration `0753`, a RPC e a rota administrativa existentes na PR #43 **não** são modificadas nesta etapa.

Os testes do upstream são fixtures sem banco nem rede e cobrem, entre outros casos, madrugada e resumo das 7h, avisos repetidos, mudança e cancelamento, pacing/anti-ban, destino e informação limitada no texto. **O conteúdo dos testes foi incorporado; sua execução na branch nova aguarda CI.**

## Não implementado nem comprovado

- Não há conexão nova do núcleo ao dispatcher do `event_log`, worker, cron ou sender. A existência dos módulos **não significa** que o WhatsApp do dono recebe avisos.
- Não foram importados adapters de persistência nem fluxos de ativação UI do upstream.
- Ainda não se confirmou a compatibilidade completa de APIs/dependências com a customização ELUS, nem qualquer fluxo em produção.
- Não houve E2E/Playwright, execução de SQL em banco real, merge, publicação de imagens ou deploy.

## Gate seguinte (PR independente)

Reconciliar adapters e wiring oficial no `event_log`/worker, conferir o `before_send`, as regras de pacing e a idempotência de `entregas_de_aviso_de_agendamento`; verificar com testes negativos e positivos e CI antes de habilitar o comportamento. Manter a PR #43 como base de migrations; não aplicar as migrations no Supabase sem plano de ledger e rollback.

## Segurança preservada

Esta fatia adiciona apenas código sem call site de execução produtiva. Mantém inalteradas as permissões da migration 0753, os testes negativos de acesso do `authenticated`, a matriz RLS, os grants `SECURITY DEFINER`, as migrations ELUS, VendaERP READ-ONLY, ISIS/DANFE, Chutes e o workflow E2E exclusivamente manual.
