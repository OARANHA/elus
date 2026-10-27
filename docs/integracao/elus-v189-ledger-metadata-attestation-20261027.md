# ELUS v1.89 — atestação read-only de metadados do ledger

**Estado em 27/10/2026: IMPLEMENTADO EM BRANCH, SEM ATESTAÇÃO REAL E SEM AUTORIZAÇÃO DE REPLAY.**

## Problema e escopo

O ledger histórico Supabase tem 11 registros de v1.85. Os campos `version` e `name` não bastam para demonstrar preservação dos campos oficiais `statements` e `rollback`. A PR #55 protege nomes/versões em uma branch empilhada; este gate é **independente**, complementar e não altera SQL, migrations, dados ou o preflight anterior.

O script `scripts/elus-v189-ledger-metadata-preflight.mjs` consulta somente `supabase_migrations.schema_migrations` em transação `BEGIN READ ONLY`, com TLS e CA explícita. A projeção do SELECT contém exclusivamente versão, nome, cardinalidades e SHA-256 dos arrays `statements`/`rollback` calculados **no servidor PostgreSQL**. O conteúdo bruto desses arrays não é enviado à aplicação nem impresso. `NULL` e array vazio são estados diferentes. O fingerprint composto usa SHA-256 e serialização JSON ordenada por versão, com prefixo de domínio `elus-v189-ledger-metadata-v1`.

## Dois modos — ambos sem escrita

- `inspect`: gera `LEDGER_METADATA_CANDIDATE_SHA256` e marca `UNAPPROVED`. É **somente uma observação**, não uma aprovação.
- `verify`: exige `ELUS_V189_LEDGER_APPROVED_SHA256` (64 hex) fixado após revisão independente de uma observação anterior; falha fechado se o digest divergir, houver drift de schema, faltar algum registro, ou o formato das contagens/hashes for inválido.

Ambos exigem `ELUS_V189_METADATA_ACK=inspect-only`, `ELUS_V189_METADATA_READONLY_URL` e `ELUS_V189_METADATA_CA_FILE`. A URL deve identificar um usuário com permissão **exclusivamente SELECT**. Não gravar esses valores em arquivos versionados ou logs. Exemplo de execução após autorização operacional, com ambiente já configurado: `node scripts/elus-v189-ledger-metadata-preflight.mjs inspect` ou `node scripts/elus-v189-ledger-metadata-preflight.mjs verify`.

## Limites obrigatórios

- Não existe fingerprint aprovado neste PR. **Não** copiar automaticamente o valor de `inspect` para `verify` como se isso constituísse evidência de integridade histórica.
- O digest prova apenas igualdade de metadados entre observações sob o mesmo método; não demonstra que os SQLs foram executados corretamente, que a base v1.89 está compatível ou que o snapshot inicial foi autorizado.
- A consulta de SHA-256 sobre arrays depende de PostgreSQL 15/17; não requer `pgcrypto`.
- A revisão de impacto da migration destrutiva `0759`, o replay/restauração isolados, o ledger oficial das 39 migrations novas, ACL/RLS, reconciliação de PRs e autorização administrativa permanecem gates independentes.
- Não executar E2E/Playwright, `db push`, `db reset`, migrations no banco ativo, merge, publicação de imagens ou deploy a partir deste trabalho.

## Verificações de código

`tests/unit/elus-v189-ledger-metadata.test.ts` cobre fingerprint determinístico, aprovação obrigatória, detecção de drift, diferenciação de NULL/array vazio, cardinalidade, ordem, hashes e rejeição de resultados incompletos. Os checks de lint, TypeScript e unitários do novo HEAD precisam ser confirmados antes de considerar o código GREEN.
