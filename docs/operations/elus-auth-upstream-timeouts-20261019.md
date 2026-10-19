# ELUS — Supabase Auth intermitente / Cloudflare 524 (19/10/2026)

## Evidências (consulta read-only, antes da correção)

- Repositório: `OARANHA/elus`, `main` `e73f247653e198f160b19caaefba9d8eace49d88`.
- Produção `/api/v1/health`: `healthy`, versão `e73f247`,
  Supabase/Redis/WAHA `ok` na medição (não prova saúde de todas as rotas).
- Console: 524 em `/api/v1/auth/interface`, `/api/v1/attendants/presence`,
  `/admin/dashboard` e navegação RSC; falhas QUIC também observadas.
- Supabase, projeto `tbwcgdmenrcnghogqkqi`, logs agregados `edge_logs`:
  `/auth/v1/user` teve 60/5593 requisições com tempo de origem superior
  a 60 segundos, máximo 224234 ms e p99 ~62911 ms.
- Concentração: 51 das 60 ocorrências >60 s na hora 21:00 UTC e 9 na hora
  20:00 UTC de 19/10/2026. No momento da verificação, o Postgres não tinha
  consulta ativa longa; a VPS não estava com carga global alta.
- `/auth/v1/health` sem credencial: HTTP 401 em 83 ms, indicando resposta
  rápida da borda naquele instante; não isola o caminho autenticado.
- **Não comprovado:** causa-raiz dos atrasos no serviço gerenciado, impacto
  específico do HTTP/3/QUIC, nem que os avisos de listeners do Node sejam a
  origem do problema.

## Decisão de mitigação

A autoridade segue sendo `supabase.auth.getUser()` e o role real do banco.
Sem credencial comprovada, nunca autorizar. `lib/supabase/fetch-do-servidor.ts`
expõe `fetchAuthComPrazo`, aplicado ao transporte SSR e ao proxy, com
`AbortSignal.timeout(10000)` e preservação do signal do chamador. Alcança
somente chamadas do GoTrue e consultas de identidade/RBAC do caminho crítico;
não limita chamadas de negócio/Storage nem consultas com efeito.

O proxy distingue falhas de transporte, 429 e 5xx (503 + Retry-After e
Cache-Control: no-store) de sessão ausente/inválida (401/login). Erro da RPC de
platform admin não pode significar `forbidden`. O `loadAuthUser` mantém
auditoria da falha transitória e não representa indisponibilidade como logout.

## Verificação/aceite pendente

1. Executar unit tests `tests/unit/supabase-auth-timeout-e-erro.test.ts`,
   `tests/unit/proxy-auth-timeout-524.test.ts` e
   `tests/unit/auth-getuser-erro-mudo.test.ts`.
2. Exigir CI verde e conferir o commit/release antes de publicar imagens.
3. Confirmar imagem app e health/version na stack existente com rollback.
4. Testar /app/settings, /app/inbox, /admin e presença autenticados;
   coletar tempos, códigos HTTP e IDs de requisição.
5. Durante uma nova instabilidade, verificar 503 em prazo limitado e
   ausência de 524/redirect indevido; investigar upstream separadamente.
6. Validar possíveis falhas HTTP/3/QUIC e o aviso MaxListeners de forma
   independente se persistirem.

Nenhuma configuração de produção deve ser alterada com base apenas nesta nota.
