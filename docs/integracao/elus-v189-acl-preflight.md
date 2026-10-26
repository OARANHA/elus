# ELUS v1.89 — pré-voo de ACL/RLS (somente leitura)

**Escopo:** inspecionar metadados de funções `SECURITY DEFINER`, privilégios efetivos de `anon`, `authenticated` e `service_role`, RLS de `channel_sessions` e `user_recovery_codes` e nomes/comandos de policies. Complementa o catálogo da PR #49, sem modificar SQL histórico ou baseline. **Não é gate de autorização.**

O script `scripts/elus-v189-acl-preflight.mjs` usa exclusivamente `pg_catalog` e `pg_policies`, dentro de `REPEATABLE READ, READ ONLY`, com `ROLLBACK` mesmo em falha. Não executa funções de negócio, não lê dados de clientes, não altera grants, não aplica migrations e não consulta o conteúdo de policies nem o corpo SQL das funções. Exige conexão privada explícita via variáveis `PGHOST`, `PGUSER` e `PGDATABASE`; não imprimir credenciais em logs.

O relatório sinaliza ausência da RPC de rotação MFA, grants efetivos de clientes sobre códigos de recuperação, RLS desligada, policy antiga de escrita de `channel_sessions`, ausência das três policies específicas, divergência de assinatura da RPC de aviso de caso e exposição efetiva de funções `SECURITY DEFINER`. **Exposição não equivale a vulnerabilidade comprovada:** `fn_log_event` e `emit_event` exigem revisão de corpo, call sites e testes negativos em ambiente autorizado. Privilégios efetivos podem resultar de herança ou `PUBLIC`, não necessariamente de grant direto.

O resultado sempre contém `PRECHECK_ONLY`, `autoriza_replay=false`, `autoriza_alteracao_acl=false` e `autoriza_merge_deploy=false`, inclusive quando não há alertas. A ausência de alertas não prova isolamento multi-tenant, semântica de policy, paridade com baseline, replay dos 11 registros, rollback ou segurança da migration destrutiva `0759`.

**Gates pendentes:** reconciliar os sete statements históricos privados e quatro migrations ELUS; comparar catálogo/ACL com baseline v1.89; revisar `0759`, LGPD, MFA e privilégios de funções; ensaiar upgrade e restauração em PostgreSQL descartável com autorização separada. Manter as PRs Draft e o E2E exclusivamente manual. Sem merge, SQL real, imagem ou deploy.
