---
impacto: nada_mudou
secao: corrigido
titulo: Redução de chamadas redundantes de autenticação no ELUS
---

O ELUS passa a reutilizar os fatores TOTP da resposta `getUser()` já validada pelo Supabase ao montar o layout e consultar permissões. Evita chamadas redundantes `mfa.listFactors()` (que repetiam `getUser()`), consulta o contexto de acompanhamento em paralelo e limita o tempo das leituras administrativas críticas de organização. A autenticação continua fail-closed, sem alterar o módulo VendaERP ou migrações. Requer publicar novas imagens e promover digests conforme runbook.
