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

**Status inicial:** IMPLEMENTADO na branch; testes não executados localmente. Status do CI desta PR a ser verificado posteriormente por HEAD, sem polling.
