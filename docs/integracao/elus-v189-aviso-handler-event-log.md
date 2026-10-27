# ELUS v1.89.0 — adapter do aviso de agendamento ao event_log

Origem imutável: `melgarafael/DeskcommCRM@6540929d5ef7a951531dda550db0bf54affa516a`.
Base: PR #44 (`OARANHA/elus@96111d163391e96ce22e7bb6424f6149561b2c66`), subordinada à PR #43 de migrations/RLS.

## Escopo

- Porta `lib/agenda/aviso-de-agendamento.handler.ts` sem modificação funcional (blob upstream `d6c490cb721eb1fed1c1024ddd0b1e20d28149c5`).
- Registra o consumidor único dos eventos `appointment.created`, `appointment.rescheduled` e `appointment.cancelled` em `lib/event-log/register-handlers.ts`, após os consumidores que só escrevem e antes dos consumidores externos.
- Acrescenta teste de contrato do adapter com dependências simuladas, cobrindo ausência de configuração (`skipped`), `retry_at`, erro inesperado, três eventos e `naOrgParada: pula`.

## Limites e gates

- **Não** adiciona cron do resumo diário, configuração de scheduler nem interface de ativação. **Não** executa WhatsApp em teste; não há prova de envio real.
- No runtime, o handler depende da migration `0753` e das tabelas/RPCs existentes na **PR #43**. **Não liberar imagem, merge ou deploy** até que o baseline real, os 11 registros do ledger Supabase e o plano de atualização tenham validação/rollback específicos.
- Mantenha o transporte canônico `criarTransporteDoAviso`, o pacing existente, o isolamento por `organization_id`, `origemDoDreno`, o teto de tentativas, as entregas idempotentes e a proteção de organizações paradas. **Não** use provider paralelo.
- Testes unitários isolados e gates do CI são necessários. Sem E2E/Playwright; sem banco de produção; sem alteração de migrations, grants/RLS, VendaERP READ-ONLY, ISIS/DANFE ou credenciais.
- Próximo gate: cron do resumo das 7h, agendamento e testes negativos de autorização/tenant/pacing, antes de qualquer aceite funcional.

**Estado comprovado em 25/10/2026:** implementação do adapter **TESTADA NO CI** no commit `4231abbce523be252013a213a8592d6e2691bed6`. Não significa publicada, ativa nem validada em produção. A atualização documental posterior a esse commit requer novo gate do CI da branch.

## Histórico auditável — CI e correções

| Gate / revisão | Evidência | Resultado |
| --- | --- | --- |
| PR #44, núcleo anterior | [CI `40223285730`](https://github.com/OARANHA/elus/actions/runs/40223285730), HEAD `96111d163391e96ce22e7bb6424f6149561b2c66` | **GREEN** após remover três chaves i18n duplicadas |
| PR #45, adapter inicial | [CI `40225923974`](https://github.com/OARANHA/elus/actions/runs/40225923974), HEAD `21bd6f2525742d52d87a34fe6254ef0b3124f834` | **RED**: TypeScript `TS2322` e teste de lista literal dos handlers |
| PR #45, correção | [CI `40232560440`](https://github.com/OARANHA/elus/actions/runs/40232560440), HEAD `4231abbce523be252013a213a8592d6e2691bed6` | **GREEN**: `verify`, quatro partes, testes e invariantes |
| PR #45, imagens | [workflow `40232560448`](https://github.com/OARANHA/elus/actions/runs/40232560448), mesmo HEAD | **GREEN** no build local AMD64/ARM64 e `imagens-ok`; `build-and-push`, manifest e promoção stable **skipped** |

### Incidentes, causa raiz e correção efetiva

1. **PR #44 — i18n e TS1117.** As chaves `Cliente`, `Quando` e `Origem` já existiam no objeto `lib/i18n/dicionario.ts`, em forma de identificador sem aspas, e foram acrescentadas novamente com aspas. A duplicidade passou despercebida na contagem literal, mas foi rejeitada pelo TypeScript e pelo build. Removidas apenas as três duplicatas no commit `96111d163391e96ce22e7bb6424f6149561b2c66`, mantendo as traduções necessárias. Regressão verificada por CI GREEN da PR #44.
2. **PR #45 — auditoria e TS2322.** O adapter em `lib/agenda/aviso-de-agendamento.handler.ts` emite `agenda.aviso_whatsapp_enviado` e `agenda.aviso_whatsapp_falhou`, mas faltavam no catálogo tipado `lib/audit/actions.ts`. Foram acrescidas **uma vez cada ao fim** de `AUDIT_ACTIONS`, segundo a doutrina, sem `as any`, casts de escape, mudança de schema ou supressão de auditoria. Commits `969c42e` e `4231abb`; compilação e build verificados no GREEN do HEAD `4231abb`.
3. **PR #45 — classificação literal de suspensão.** O registro em `lib/event-log/register-handlers.ts` trouxe um consumidor WhatsApp externo, que precisa respeitar `naOrgParada: "pula"`. `tests/unit/dispatcher-org-parada.test.ts` compara a lista literal com **todo** o registry e falhou corretamente ao detectar o novo handler ausente. Incluído no grupo `PULA`, sem alterar a comparação, e confirmado pelo CI GREEN. Commit `f7a8f73`.
4. **Docker não era incidente separado.** Na revisão RED, o build do app AMD64/ARM64 falhava por efeito cascata de `TS2322`. Corrigir o contrato de auditoria resolveu o bloqueio de compilação; builds locais passaram. Não interpretar workflow de imagens com status `success` como publicação se os passos de `push` e de manifesto estiverem `skipped`.

### Aprendizados e prevenção

- Antes de importar código upstream, comparar **contratos transversais**: `AuditAction`, registros explícitos de handlers, classificação de organizações paradas, dicionário de i18n e testes de cobertura estrutural. Portar um blob idêntico não garante compatibilidade com a árvore ELUS.
- Para i18n, identificar duplicatas **semanticamente** em chaves `foo:` e `"foo":`; inspeção textual apenas por aspas não basta. Preservar testes de tradução e o typecheck.
- Todo handler externo deve declarar `naOrgParada` e entrar na lista literal `RODA` ou `PULA` conforme efeito; avisos WhatsApp pertencem a `PULA`. Nunca enfraquecer o teste de igualdade do registry.
- Toda ação de auditoria nova deve entrar no fim de `lib/audit/actions.ts`. O tipo é derivado do array e alimenta o filtro administrativo. Não criar uma segunda lista ou contornar o compilador.
- Inspecionar **um resultado de CI por SHA**, o job falho e a causa, sem polling, e nunca equiparar `CI GREEN` a merge, pacote publicado, schema real aplicado ou aceite funcional do WhatsApp.

### Gaps de liberação

- As PRs continuam empilhadas: [#45](https://github.com/OARANHA/elus/pull/45) sobre [#44](https://github.com/OARANHA/elus/pull/44), sobre [#43](https://github.com/OARANHA/elus/pull/43), sobre [#40](https://github.com/OARANHA/elus/pull/40). A #43 avançou para `a5caafc25541506f4016ab8cd7dd4d3808c7b177` enquanto a base atualmente registrada pela #44 ainda é `4fd669d59bcc08b3ebf2ae723e1d8192303ac927`; **reconciliar dependências antes do merge**, sem assumir que o CI anterior cobre essa base alterada.
- Migration `0753`, baseline v1.89, correspondência com o ledger real (11 migrations), controle de RLS/`SECURITY DEFINER`, plano de replay e rollback continuam requisitos separados. Não aplicar SQL real como atalho.
- Cron do resumo das 7h, scheduler, controles de ativação, `before_send`, prova tenant/canal/pacing, teste real de envio e aceite pelo usuário seguem **não verificados** nesta fatia. Sem E2E/Playwright, merge ou deploy nesta alteração documental.
