# ELUS v1.89 — proveniência independente das migrations upstream (03/11/2026)

**Escopo:** auditoria Git somente leitura; PR #62. **Decisão:** NO-GO para replay, aplicação de SQL, merge e deploy. Esta verificação não substitui reconstrução de baseline nem validação funcional em PostgreSQL 15/17.

## Fontes fixadas

- DeskcommCRM v1.85.0: `83aeac8f78aa076f3adfaf3e773c8616229e5cd9`.
- DeskcommCRM v1.89.0: `6540929d5ef7a951531dda550db0bf54affa516a`.
- ELUS antes da importação: `de8f86add650d13e6237275a2bf009e91dd0d785`.
- ELUS auditado: `81899656da5e5566922ba19e33ecd37b33b5850a` (PR #62).
- Quatro árvores Git foram obtidas por `git/trees/<sha>?recursive=1`, todas com `truncated=false`. Comparações por caminho, blob SHA-1 e conteúdo textual de cada exceção; nenhuma migration foi executada.

## Resultado da comparação independente

| Verificação | Evidência |
| --- | --- |
| Histórico upstream v1.85 | 515 migrations com caminho `timestamp_NNNN_slug.sql`; 506 blobs idênticos ao ELUS auditado, 9 com apenas o prefixo `upstream:` adicionado em uma linha de comentário `--` |
| Novidades upstream v1.85→v1.89 | Exatamente 38 migrations; 28 blobs idênticos no ELUS, 9 com apenas `upstream:` em comentário `--` e 1 (`0717`) com a remoção de um único espaço ao fim da linha `alter table public.calendar_service_professionals` |
| Colisões no ELUS antes da importação | 3 números lógicos: `0689`, `0691`, `0692`; 1 timestamp: `20261020120000` |
| Resolução versionada | `0689→0762`, `0691→0763` com timestamp `20261020120002`, `0692→0764`; os três SQLs renomeados preservam o blob upstream exato |
| Migrations próprias ELUS | 4/4 blobs idênticos entre a árvore anterior à importação e o HEAD auditado: VendaERP 0689, guarda 0690 e Chutes 0691/0692 |
| Duplicidade de número ou timestamp na árvore atual | Nenhuma detectada entre as 558 migrations que seguem o padrão analisado |

As 19 exceções foram confrontadas individualmente com os arquivos do upstream fixado. Nas 18 variações de comentário, remover **somente** a sequência `upstream:` restaura o conteúdo upstream integralmente. Cada ocorrência está numa linha iniciada por `--`. Na `0717`, repor o espaço final conhecido restaura o blob upstream. **Não houve reescrita de instruções SQL identificada nessas 19 diferenças.**

O teste offline `tests/unit/elus-v189-upstream-sql-provenance.test.ts` fixa os 19 blobs upstream, verifica a posição dos prefixos nos comentários e rejeita outras alterações. Complementa `tests/unit/elus-v189-import-ledger-integrity.test.ts`, que fixa os 38 blobs importados no ELUS e as quatro migrations próprias. O novo teste **não consulta rede ou banco e não executa SQL**.

## Baseline: construção e validação permanecem gates distintos

- `supabase/baseline.sql` no HEAD auditado: blob Git `0269eee11299e0492f489ab6d690eb88b91e30b1`, **3.393.613 bytes** (metadados de árvore, sem truncagem).
- Baseline upstream v1.89.0: blob `07af36ef379f341559318ca5cd2cadc7a5740797`, **3.364.899 bytes**. A diferença de tamanho **não** demonstra completude nem equivalência de schema.
- A baseline ELUS inclui a guarda 0690 menos restritiva que a 9037 observada no catálogo: `auth.role() = 'service_role'` sem a conjunção com `current_user = 'service_role'`. Reconstrução independente da baseline e validação independente de paridade continuam pendentes. Não corrigir isso alterando a migration histórica 0690.
- A prova da proveniência dos SQLs não resolve o ledger produtivo com 51 recibos (11 históricos + 39 do lote + 9037), a RPC 0765 ausente, a ordenação 0690/9037, a restauração e replay v1.85→v1.89 em clones PG15/17, ACL/RLS multi-tenant nem a autorização separada do DELETE 0759.

**CI de referência:** o HEAD anterior `81899656` teve os workflows `ci`, `perf` e GHCR concluídos com sucesso (run CI [41635504656](https://github.com/OARANHA/elus/actions/runs/41635504656)). Isso não é aceite funcional. O teste novo ainda não teve seu CI verificado nesta execução. Não houve lint, typecheck completo nem Vitest local, pois não havia checkout com dependências no ambiente de execução.

**Restrições mantidas:** nenhuma migration, SQL mutante, E2E/Playwright, merge, publicação de imagem ou deploy foi executado. Workflow E2E exclusivamente manual.
