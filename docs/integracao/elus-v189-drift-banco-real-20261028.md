# ELUS v1.89 — divergência do banco real após reconstrução (28/10/2026)

**Escopo:** registro somente leitura; **não** autoriza aplicação de SQL, replay, migração, merge, imagens ou deploy. Snapshot coletado em 28/10/2026, aproximadamente 05h30 (America/Sao_Paulo), no projeto Supabase **`elus`**, ref `tbwcgdmenrcnghogqkqi`.

## Evidência observada

Consultas SQL somente de leitura no projeto identificado acima, sem acesso a conteúdo de usuários:

| Sinal | Pré-condição fixada em `scripts/elus-v189-production-preflight.mjs` | Observado |
| --- | ---: | ---: |
| Tabelas em `public` | 191 | **208** |
| Entradas em `supabase_migrations.schema_migrations` | 11 versões históricas, com nomes exatos | **50** |
| Usuários em `auth.users` | Não é gate do preflight | **0** |

O ledger atual contém as 11 entradas históricas do ELUS v1.85, as 38 versões importadas do upstream v1.89 e a versão ELUS adicional `20261026010000` (total 50). A entrada `20261023180557`, nome `0759_codigos_de_recuperacao_antigos_saem`, está **registrada**.

**Limite da evidência:** a presença de uma versão no ledger não comprova que seu SQL foi executado, nem comprova restauração, idempotência, integridade dos dados ou autorização da exclusão de códigos de recuperação. A contagem de 208 tabelas não comprova compatibilidade com o código do repositório. A inspeção não leu dados pessoais nem alterou o banco.

## Consequência operacional

A matriz de replay em `docs/integracao/elus-v189-ledger-replay-matrix.json` e o preflight de produção foram preparados para o **snapshot anterior de 11 entradas e 191 tabelas**. Não são autorização para executar o plano antigo contra o banco atual. O preflight deve rejeitar a divergência por `HISTORICAL_LEDGER_MISMATCH` ou `SCHEMA_PRECONDITION_CHANGED`, sem mutação.

Não executar `supabase db push`, `db reset`, replay de 39 migrations, edição do ledger, `0759` ou `scripts/elus-v189-production-upgrade.mjs apply` para tentar corrigir a diferença. A PR #62 mantém `apply` fail-closed enquanto não houver evidências e autorização separadas.

## Gates antes de qualquer plano novo

1. Determinar e documentar a origem das 39 entradas adicionais e a relação com o baseline atualmente instalado; não presumir execução efetiva só pela presença no ledger.
2. Reconstruir **um novo** inventário somente leitura de tabelas, funções, triggers, grants, RLS e dependências para a versão efetivamente instalada, sem expor segredos ou PII.
3. Preservar as customizações ELUS: VendaERP exclusivamente leitura, ISIS/DANFE, catálogo Chutes, login, governança e configuração de deploy. Não sobrescrever objetos por replay antigo.
4. Revalidar a semântica da migration `0759` e exigir aprovação independente caso qualquer operação destrutiva futura seja proposta; o registro atual no ledger não substitui essa aprovação.
5. Exigir backup/restauração comprovados, ensaio descartável PostgreSQL 15/17, revisão de segurança e autorização específica antes de qualquer mudança produtiva.

**Resultado:** produção **NO-GO** para o procedimento v1.89 desenhado sobre o snapshot anterior. Esta documentação não altera código de aplicação, SQL, migrations ou workflows. O E2E permanece exclusivamente manual (`workflow_dispatch`).

## Reconciliação incremental do catálogo MFA (28/10/2026, ~07h30 BRT)

O projeto Supabase `elus` foi reconfirmado como `ACTIVE_HEALTHY` em PostgreSQL 17.11. Consulta **SELECT apenas de metadados** (`pg_catalog` e ledger; sem ler hashes, códigos, usuários ou dados de clientes) retornou:

| Evidência do catálogo | Resultado |
| --- | --- |
| Ledger total / tabelas públicas | 50 / 208 (sem alteração no snapshot anterior) |
| Versão `20261023180557` (0759) registrada | 1 |
| Versão `20261026010000` (0765) registrada | 1 |
| Função `public.fn_elus_rotacionar_codigos_recuperacao` | **0** |
| Função com nome contendo `rotac` e `recuperacao`, em qualquer schema | **0** |
| Tabela `public.user_recovery_codes` | Existe; `relrowsecurity=true`, `relforcerowsecurity=false` |
| Policies de `user_recovery_codes` | Uma policy chamada `user_recovery_codes_ninguem_le`, comando `SELECT` (`polcmd='r'`) |

Consulta reproduzível para o **achado principal**, sem acesso a linhas de usuário:

```sql
SELECT
  (SELECT count(*) FROM supabase_migrations.schema_migrations
   WHERE version = '20261026010000') AS migration_0765_registrada,
  to_regprocedure(
    'public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])'
  ) IS NOT NULL AS funcao_0765_presente,
  (SELECT c.relrowsecurity
   FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'user_recovery_codes'
   LIMIT 1) AS recovery_rls_habilitada;
```

**Interpretação restrita:** a migration `0765` declara `CREATE OR REPLACE FUNCTION public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])`, com `SECURITY DEFINER` e execução restrita a `service_role`, mas o objeto **não existe atualmente**. O teste de invariantes `tests/invariants/elus-mfa-0765-rotacao-atomica.test.ts` aplica essa migration explicitamente num PostgreSQL efêmero; seu GREEN não comprova que o objeto existe no Supabase real. A policy observada e o RLS habilitado também **não** provam, isoladamente, segurança de todas as operações, grants, roles ou dependências. Causa da ausência não determinada.

**Próximo gate técnico:** inventário independente dos objetos e permissões exigidos pelo conjunto de migrations registradas, com comparação ao baseline efetivamente implantado. A PR #65 acrescenta um diagnóstico `LEDGER_0765_FUNCTION_ABSENT` ao preflight, mas não corrige o objeto nem autoriza replay. Com o HEAD da PR #65, esse diagnóstico pode ocorrer **antes** do bloqueio de ledger 11/191; ambos são razões válidas de NO-GO.

A consulta de metadados foi feita via conector Supabase; **não** foi uma execução autenticada como role estritamente read-only. O texto SQL foi apenas `SELECT`. Não houve transação de escrita, alteração de schema, execução de migration, E2E, merge, imagem ou deploy.
