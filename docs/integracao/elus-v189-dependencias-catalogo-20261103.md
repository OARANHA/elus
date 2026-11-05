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

## Complemento — referencias lexicais em funcoes (03/11/2026, 14h BRT)

O CI do HEAD anterior `1a04bf7eb4072c91b28c4b273c7efdf29767cbb4` foi consultado uma unica vez: workflow `ci` #41674255028, **10/10 jobs success** (incluindo invariantes PostgreSQL 15/17); `perf` #41674255051 e workflow GHCR #41674255124 tambem encerraram com `success`. Nenhuma publicacao de imagem foi inferida.

Uma consulta adicional **exclusivamente SELECT** no Supabase ELUS PostgreSQL 17.11 percorreu `pg_catalog.pg_proc.prosrc` e `pg_catalog.pg_namespace`, fora dos schemas de sistema, buscando referencias lexicais com delimitacao de identificador aos quatro alvos de DROP. **Resultado observado: 0 correspondencias para cada alvo.** Nenhum corpo de funcao, SQL privado, dado de tenant ou segredo foi retornado. A consulta reproduzivel esta em `docs/integracao/elus-v189-dependencias-dinamicas-readonly.sql`; seu contrato estatico esta em `tests/unit/elus-v189-dependencias-dinamicas-readonly-static.test.ts`.

O resultado **nao prova ausencia de chamadas**: referencias podem ser montadas dinamicamente, existir em TypeScript, estar em corpos SQL-standard fora de `prosrc`, depender de outro objeto ou ter sido removidas antes da fotografia. A consulta anterior a `pg_depend` tambem nao prova ausencia funcional. Nenhum DROP, replay ou upgrade foi autorizado. Os novos testes ainda nao foram executados por Vitest; o CI do HEAD resultante permanece para a proxima execucao. **NO-GO mantido** pelos gates de ledger 51/50, RPC 0765, guarda 0690/9037, restauracao/replay PG15/17, ACL/RLS/tenancy e aprovacao independente da 0759.
