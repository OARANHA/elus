# ELUS v1.89 — inventário de dependências de catálogo (03/11/2026)

**Escopo:** PR #62, somente leitura no Supabase ELUS PostgreSQL 17.11 e ajuste estático do inventário SQL. **Decisão: NO-GO.** Nenhum replay, migration, SQL mutante, E2E, merge ou deploy foi autorizado.

## Evidência observada

A consulta versionada `docs/integracao/elus-v189-dependencias-catalogo-readonly.sql` foi executada como `SELECT` com CTE sobre `pg_catalog.pg_depend`, `pg_class`, `pg_proc`, `pg_rewrite` e `pg_type`. Resultado: cinco linhas para quatro alvos de DROP versionados.

| Migration | Alvo | Estado | Dependências registradas |
| --- | --- | --- | --- |
| 0687 | função `fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)` | ABSENT | nenhuma no alvo ausente |
| 0754 | função `fn_attendant_metrics(uuid,timestamptz,timestamptz,uuid)` | ABSENT | nenhuma no alvo ausente |
| 0764 | função `fn_automation_rodizio_atribuir(uuid,uuid,uuid)` | ABSENT | nenhuma no alvo ausente |
| 0763/0706 | view `external_db_connections_safe` | PRESENT | regra interna `_RETURN` e tipo composto próprio |

A regra `_RETURN` tinha sido classificada como `OWN_VIEW_RULE_INTERNAL`; o tipo composto da própria view aparecia como `REVIEW_DEPENDENCY`. Consulta independente confirmou que a dependência do `pg_type` possui `deptype='i'`, aponta para a própria view por `typrelid`, e possui subidentificadores zero. Não foi detectada dependência externa entre as cinco linhas retornadas. Isso **não** exclui referências dinâmicas, dependências não catalogadas ou impacto funcional de DROP.

## Correção do inventário, sem DDL

O inventário agora classifica `OWN_VIEW_ROWTYPE_INTERNAL` **somente** quando `t.kind='view'`, `d.classid='pg_catalog.pg_type'`, `d.deptype='i'`, `d.objsubid=0`, `d.refobjsubid=0` e `pg_type.typrelid` identifica a própria view. Qualquer outro tipo/dependência continua `REVIEW_DEPENDENCY`. O caso `_RETURN` também exige explicitamente `t.kind='view'`.

O teste `tests/unit/elus-v189-dependencias-catalogo-readonly-static.test.ts` passou a proteger essa classificação restrita. A mudança não altera migrations, baseline, executor de aplicação nem catálogo real.

## Gates não liberados

CI do HEAD de entrada `545342ed89a848172513316ba47dec63146479a4`: workflow `ci` #41664787235, **10/10 jobs success**, sem aceite funcional. O teste modificado depende de nova validação do HEAD resultante.

Persistem 51 recibos (11 históricos, 39 do manifesto e 1 externo 9037), RPC 0765 ausente apesar de recibo íntegro, divergência 0690/9037, restauração e replay PG15/17, isolamento ACL/RLS e aprovação independente da exclusão 0759. A ausência de dependências externas registradas **não autoriza DROP nem upgrade**. E2E permanece exclusivamente `workflow_dispatch`.
