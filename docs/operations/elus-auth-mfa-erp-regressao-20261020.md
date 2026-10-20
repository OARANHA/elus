# Incidente ELUS — autenticação e MFA após instalação ERP (20/10/2026)

## Evidência de produção (somente leitura)

- `main` em `eaf386c7552d0e74d544744ab68b81fb494e7c79`, health `healthy` mesmo durante erros de renderização. Isso não comprova saúde do login.
- `modulos_instalados`: `integracoes_erp` está `ativo` desde **19/10/2026 20:58:47 UTC**. Não desinstalado ou suspenso.
- `pg_stat_statements` para SELECT de `modulos_instalados`: **162 execuções, média 1,6 ms, máximo 52,9 ms**; a consulta do módulo NÃO explica, sozinha, os atrasos de dezenas de segundos.
- Na mesma instância, `fn_support_context()`: 1.412 execuções, média 11,1 ms, máximo 1.303,8 ms no Postgres; `user_organizations`: 1.340 chamadas, média 4,3 ms.
- Logs edge Supabase (01:30–02:00 UTC): `/rest/v1/organizations` registrou respostas com tempo de origem de até **118.971 ms**, apesar de medições SQL muito menores. A causa exata do atraso entre client/API e banco permanece não comprovada.
- Logs `elus-app`: `AuthRetryableFetchError` por timeout de 10 s, `auth_temporarily_unavailable`, `Não foi possível confirmar o acompanhamento administrativo` e `_listFactors` / MFA com segundo `getUser()`.
- O SDK `@supabase/auth-js` implementa `mfa.listFactors()` com `getUser()` seguido de filtragem de `user.factors`. O ELUS já havia obtido `user` da validação remota no `loadAuthUser`, mas o layout e alguns guards refaziam essa chamada.

## Alteração proposta

1. Reaproveitar **somente os fatores presentes no objeto `user` recém-validado por `supabase.auth.getUser()`** para renderização do layout e checks de MFA do `requireRole`. Só TOTP com `status=verified` conta. Sessão `aal1` que já tem TOTP continua bloqueada até provar `aal2`; sem `mfa_enrolled` confiável a rota antiga `listFactors()` continua obrigatória.
2. Consultar `fn_support_context` em paralelo com as outras duas leituras de identidade, eliminando o round-trip serial sem dispensar validação ou ocultar falha.
3. Reutilizar o deadline já existente para GET de identidade/organização feitos também pelo client administrativo. O deadline **não** cobre mutações, dados de negócio, DANFE ou chamadas externas de ERP e não autoriza usuário offline.

## Limites de conclusão

- O fato de a lentidão ter aumentado depois da instalação do ERP é uma correlação temporal, NÃO prova de sobrecarga causada pelo provider. Nenhum canário real foi repetido.
- Esta correção reduz requisições redundantes e evita a espera de 119 s em algumas consultas de layout; **não comprova** a causa-raiz das respostas lentas da plataforma Supabase.
- Não altera migrations, dados, credenciais, variáveis nem o estado do módulo instalado.

## Gates

CI da PR green por confirmação do usuário → reconciliar `main`/PR uma vez → merge → build publicado com revisão OCI exata → promover **app/worker/scheduler juntos** na stack existente do Portainer Vigia com rollback de digests e `prune:false` → conferir `/api/v1/health`, versão, login MFA, `/app/settings`, `/app/inbox`, `/admin`, latências reais e erros.
