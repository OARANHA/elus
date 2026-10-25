# ELUS × DeskcommCRM v1.89.0 — reconciliação de migrations

**Base:** `v1.85.0` (`83aeac8f78aa076f3adfaf3e773c8616229e5cd9`).
**Alvo:** `v1.89.0` (`6540929d5ef7a951531dda550db0bf54affa516a`).
**ELUS antes do sync:** `de8f86add650d13e6237275a2bf009e91dd0d785`.
**Pré-requisito:** PR #24, que torna E2E exclusivamente manual.

## Fatos observados (comparação de árvores, 24/10/2026)

O upstream acrescentou **38 migrations** desde v1.85.0. O ELUS tem migrations próprias que devem permanecer com seus nomes/timestamps originais, pois podem ter sido aplicadas em bancos reais. Há **três colisões do número lógico `NNNN` e uma quarta colisão de timestamp**:

| ELUS — preservar | Upstream — renomear no sync | Número reservado proposto |
| --- | --- | --- |
| `20261019120000_0689_integracoes_erp_vendaerp.sql` | `20261020000006_0689_aviso_da_central_com_destinatario.sql` | `0762` |
| `20261020120001_0691_chutes_chat_catalog.sql` | `20261020120000_0691_banco_externo_db_type_e_aviso.sql` | `0763` |
| `20261020230000_0692_chutes_catalog_sync.sql` | `20261020130000_0692_rodizio_na_acao_atribuir.sql` | `0764` |

**Colisão adicional de timestamp:** o arquivo próprio `20261020120000_0690_org_ai_autonomy_protected.sql` e o upstream `20261020120000_0691_banco_externo_db_type_e_aviso.sql` têm exatamente o mesmo timestamp `20261020120000`. Portanto, renomear somente `0691` para `0763` **não basta**. O timestamp alternativo `20261020120002` é apenas candidato, sujeito à verificação de dependências e da ordem efetiva de aplicação no banco.

A proposta preserva os **timestamps** das demais migrations novas do upstream e altera apenas o número lógico em seus nomes. O arquivo upstream `0691` precisará de revisão **tanto do número lógico quanto do timestamp**. Os números `0762`–`0764` estão livres no conjunto de árvores examinado; devem ser revalidados contra a versão de upstream realmente integrada e outros PRs antes de uso.

**Não renomear migrations ELUS já aplicadas. Não editar SQL histórico silenciosamente.** Conferir antes o histórico `supabase_migrations.schema_migrations` do ambiente de destino (somente leitura) e dependências de cada migration. A presença do arquivo não comprova sua aplicação. **O auditor local detectou quatro colisões (3 números + 1 timestamp) em execução real, exit 1.** Não executar `db push`, `db reset`, `baseline.sql` ou qualquer deploy nesta etapa.

## Auditoria reproduzível e sem efeitos colaterais

Com as refs upstream já disponíveis no clone:

```bash
pnpm exec tsx scripts/auditar-migrations-upstream.ts HEAD upstream-base-v185 upstream-target-v189
```

O script só lê árvores Git e imprime JSON. Exit 0 = sem colisão, 1 = colisão detectada, 2 = não medido. **Ele não renomeia nem aplica migrations**. Testes unitários: `tests/unit/auditar-migrations-upstream.test.ts`.

## Dependências e gates seguintes

1. Integrar os 38 arquivos novos com renomeação controlada dos três conflitos, após revisar dependências SQL e comparar o estado real do banco; os IDs propostos não constituem autorização de aplicação.
2. Resolver individualmente os 11 conflitos de código identificados no merge de três vias (runtime de IA, auth/MFA, dicionário, dependências, baseline e teste).
3. Preservar VendaERP/ISIS/DANFE, Chutes, login, governança, integrações e deploy Portainer próprios do ELUS.
4. Validar lint, typecheck, testes unitários, invariantes e compatibilidade de schema **sem executar E2E ou Playwright**.
5. Não mesclar nem publicar imagem/deploy até os gates exigidos.

**Escopo deste documento:** reconciliação e preparação verificáveis; não declara que v1.89.0 já foi integrada.


## Pré-voo do plano candidato (etapa seguinte, sem importar SQL)

O arquivo `docs/integracao/elus-upstream-v1.89.0-plano.json` registra **apenas candidatos** para os destinos dos três arquivos upstream que colidem com migrations ELUS. Para o upstream `0691`, combina o número `0763` com o timestamp candidato `20261020120002`; os outros dois preservam seus timestamps e usam `0762`/`0764`. **Nenhum SQL foi copiado, alterado ou aplicado por esta etapa.**

O validador `scripts/validar-plano-migrations-upstream.ts` confere o plano contra três árvores Git, sem rede e sem escrita:

```bash
pnpm exec tsx scripts/validar-plano-migrations-upstream.ts \
  HEAD upstream-base-v185 upstream-target-v189 \
  docs/integracao/elus-upstream-v1.89.0-plano.json
```

Ele exige que cada origem pertença ao lote novo do upstream, que o slug da migration não seja alterado, que não haja colisões de **caminho, timestamp/version do Supabase ou número lógico** com o histórico local ou entre os arquivos importados, e que a ordem cronológica das migrations novas seja preservada. Retorna `valid: true` apenas para esses critérios **estáticos**; `requiresDatabaseHistoryReview: true` permanece sempre verdadeiro. Exit 0 = plano nominalmente válido, 1 = conflito detectado, 2 = não medido.

O plano **não** valida a execução das 38 migrations, dependências SQL, idempotência, integridade do `baseline.sql`, conteúdo de objetos já provisionados, nem o histórico `supabase_migrations.schema_migrations` dos ambientes reais. Antes de importar ou executar SQL, confirmar o histórico real **somente leitura**, revisar as dependências de cada migration e os conflitos de código, inclusive VendaERP, Chutes e governança. Não executar `db push`, `db reset`, E2E/Playwright, merge, imagem ou deploy neste gate. Testes unitários: `tests/unit/validar-plano-migrations-upstream.test.ts`.

## Gate adicional — imutabilidade do SQL histórico (25/10/2026)

O pré-voo da PR #38 verificava apenas os **nomes** das 38 migrations novas e
as quatro migrations próprias. Isso não demonstra que os **bytes** de uma
migration antiga foram preservados: duas árvores poderiam conter o mesmo
caminho com SQL diferente e passar no teste nominal.

O mesmo `scripts/validar-plano-migrations-upstream.ts` agora compara os
**object IDs dos blobs Git** de cada migration que existia no upstream
`v1.85.0` com ambas as árvores (ELUS e upstream `v1.89.0`). Falha fechado
(`exit 1`) se uma migration antiga sumiu ou mudou em qualquer lado; o JSON
retorna `history.checked`, `history.issues` e `history.valid`. O comando de
pré-voo permanece **somente leitura** e usa apenas `git ls-tree`.

Na inspeção independente e somente leitura do checkout de reconciliação em
25/10/2026, `git diff --name-status --diff-filter=MD` confirmou **nenhuma**
migration histórica alterada ou removida entre os refs fixados
`v1.85.0` → `v1.89.0` e `v1.85.0` → ELUS do checkout.
As 38 migrations adicionadas pelo upstream foram contadas via
`git diff --name-status --diff-filter=A`. O veredito do teste novo só
passa a integrar a CI após publicação desta mudança; não extrapolar a
inspeção de árvores para o banco real.

**Limite que continua obrigatório:** hashes Git idênticos não provam
aplicação, idempotência, dependências SQL nem compatibilidade do
`baseline.sql`; a leitura de `supabase_migrations.schema_migrations`
e revisão do schema real são gates separados antes de portar/aplicar
as migrations. Não executar SQL, E2E, merge, imagem ou deploy a partir
deste teste isolado.
