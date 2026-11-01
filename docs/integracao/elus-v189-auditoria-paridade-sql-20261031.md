# ELUS v1.89 — auditoria estática de paridade das migrations (31/10/2026)

**Estado: auditoria de arquivos concluída; upgrade e produção NÃO APROVADOS.**
Esta evidência não executa SQL, não altera banco, baseline ou migrations e não autoriza merge/deploy.

## Fontes fixadas

- Upstream: `melgarafael/DeskcommCRM@6540929d5ef7a951531dda550db0bf54affa516a` (v1.89.0).
- Fork auditado: `OARANHA/elus@abe90785501c092fff3c76d8bc5afea2abe79cf4` (HEAD da PR #62 antes desta auditoria).
- Árvores Git de `supabase/migrations/`: upstream `c298bf3ce821613d4a247af9fcde8fd53196921c`; fork `d3a21e493cc2a6d9de5a53d93de6f29e95ef32aa`.
- Comparação independente por nomes e SHA dos blobs Git, seguida da leitura integral de **todos os 19 pares de conteúdo divergente**. Não foram consultados dados de clientes.

## Resultado do inventário completo

| Medida | Resultado |
| --- | ---: |
| Arquivos SQL upstream | 555 |
| Arquivos SQL fork | 560 |
| Correspondências byte-idênticas após mapear renomes | 536 |
| Correspondências com SHA distinto | 19 |
| Correspondências upstream sem arquivo no fork | 0 |
| Renomes de colisão com blob preservado | 3 |
| Arquivos exclusivos do fork | 5 |

As **19 diferenças de conteúdo** foram comparadas integralmente: **18** decorrem exclusivamente da inserção de `upstream:` em comentários SQL; **uma** (`20261021173000_0717_desambigua_calendar_service_professionals.sql`) é a ausência de um espaço ao fim da linha `ALTER TABLE`. Não foram identificadas outras diferenças textuais nesses 19 pares. A normalização é restrita às anotações e a esse espaço; não altera instruções SQL. O teste `tests/unit/elus-v189-upstream-sql-parity.test.ts` fixa os 19 SHAs oficiais e os três blobs dos renomes, sem rede ou banco.

Entre as **38 migrations importadas** na PR #43, 28 são byte-idênticas ao upstream e dez integram as 19 diferenças cosméticas. As outras nove diferenças cosméticas pertencem a arquivos já presentes no fork. O teste preexistente `elus-v189-import-ledger-integrity.test.ts` mantém os 38 imports e as quatro migrations próprias fixados por blob.

As três colisões foram resolvidas com preservação exata do conteúdo oficial: `0689→0762`, `0691→0763` (também deslocamento de timestamp), `0692→0764`. Os cinco arquivos adicionais são as quatro migrations próprias ELUS (`0689–0692`) e a `0765` de rotação atômica.

## Fronteira do resultado

**Paridade de arquivos não é paridade de banco.** O blob da baseline candidata `0269eee11299e0492f489ab6d690eb88b91e30b1` tem 63.854 linhas; a baseline oficial v1.89 tem 63.245. O teste de integridade protege o blob candidato contra truncagem, mas não prova equivalência de schema, ACL, RLS, dados ou aplicação.

A observação anterior do Supabase real registra **51 recibos**, contra o corte histórico de **11** e o teto fail-closed de **50** do executor. O recibo 0765 estava íntegro, porém sua RPC não foi encontrada no catálogo. A causa não está demonstrada. Permanecem obrigatórios a restauração dos sete statements históricos (preparação + seis lotes) e das quatro migrations ELUS em banco descartável, replay PG15/PG17, reconciliação 0690/9037, isolamento entre tenants, ACL/RLS e aprovação independente do `DELETE` da 0759.

**Proibições preservadas:** sem E2E/Playwright, SQL/migrations no banco real, alteração de ledger, merge, publicação de imagens ou deploy. O executor `apply` permanece bloqueado pela PR #62. CI GREEN não constitui aceite funcional.
