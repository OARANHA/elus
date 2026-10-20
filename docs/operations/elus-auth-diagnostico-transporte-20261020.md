# ELUS — Diagnóstico direcionado do transporte de autenticação (20/10/2026)

## Estado comprovado antes desta instrumentação

- Produção informava `/api/v1/health` healthy e versão `321074a`, mas falhas `AuthRetryableFetchError` de status 0 continuavam no proxy e no `loadAuthUser` com deadline de 10 segundos.
- Em 04:01–04:02 UTC o gateway do Supabase registrou 113 respostas 200 de `/auth/v1/user`, todas com latência de origem inferior a 320 ms, enquanto a aplicação registrava timeouts. Esses sucessos não provam que *todas* as requisições saíram da aplicação ou chegaram ao gateway.
- Sondas manuais `fetch` e `https.get` indicaram sucesso rápido na maioria das tentativas e um timeout isolado. Conexões TCP e recursos do contêiner não mostraram saturação no momento das leituras. Nenhuma hipótese de causa-raiz foi demonstrada.

## O que esta alteração mede (não corrige a rede)

- `fetchAuthComPrazo` mede o tempo **até os cabeçalhos HTTP** somente nas rotas allowlisted de identidade/autorização já sujeitas ao deadline.
- Loga exclusivamente respostas com tempo >=2 segundos, status 429/5xx, ou exceção de transporte.
- Campos: `origem` (proxy, ssr, admin), `endpoint` fixo (sem query string), `metodo`, `fase=cabecalhos`, `duracao_ms`, `http_status` se houver, `motivo` de aborto (prazo/chamador/transporte), `tipo_erro` allowlisted, `concorrentes_inicio`/`concorrentes_fim` no **processo local**.
- No `proxy`, `request_id` conecta o evento de transporte ao aviso `AuthRetryableFetchError` da mesma requisição. Só UUID estritamente formatado é aceito; outros valores, possivelmente dados pessoais, são descartados. SSR/admin não inventam correlação inexistente.
- `proxy.ts` e `loadAuthUser()` medem separadamente o tempo da operação inteira `getUser()` (SDK, incluindo possíveis requisições adicionais). Se a duração do SDK for maior que a duração do fetch, a etapa seguinte merece inspeção; isso não prova automaticamente problema no SDK.
- Não registrar usuário, token, cookie, URL completa, cabeçalhos, payload nem mensagem de erro arbitrária. Os contadores não somam processos, não agregam Edge com Node e não equivalem ao número total de sessões.
- O comportamento do SDK e da autenticação é preservado: o erro/AbortSignal original é propagado; nunca usar `getSession()` nem liberar acesso durante indisponibilidade.

## Aceite operacional após os gates normais

1. CI: typecheck e testes unitários de transporte, MFA e proxy; E2E não precisa de execução **manual adicional**. Os checks obrigatórios da PR seguem soberanos.
2. Depois de merge, imagens publicadas e deploy seguro, confirmar imagem e `health.version` no SHA esperado, app e worker healthy.
3. Observar logs de uma ocorrência *natural* de falha, sem produzir requisições reais extras; comparar horário, `origem`, `fase`, duração e concorrência com `edge_logs` e `auth_logs` do mesmo intervalo.
4. Não assumir que um 200 rápido do gateway corresponde à requisição que expirou no cliente sem ID de correlação ponta a ponta.
5. Após diagnóstico, decidir correção específica baseada em evidência; não aumentar timeout, não relaxar autorização e não atribuir culpa ao módulo ERP sem prova.
