# ELUS v1.89 — auditoria lexical independente da baseline (01/11/2026)

**Resultado: paridade lexical ordenada no conjunto de instruções analisado; upgrade/produção NÃO APROVADOS.** Esta etapa é distinta da auditoria das 38 migrations importadas (PR #67) e não altera `supabase/baseline.sql`, migrations ou banco.

## Artefatos imutáveis consultados

- Upstream: `melgarafael/DeskcommCRM@6540929d5ef7a951531dda550db0bf54affa516a`, blob `supabase/baseline.sql@07af36ef379f341559318ca5cd2cadc7a5740797`.
- Fork: `OARANHA/elus@a44e039390577c3adc279aa9168c18e99bb64a93`, blob `supabase/baseline.sql@0269eee11299e0492f489ab6d690eb88b91e30b1`.
- As cinco migrations locais foram lidas do fork, com os blobs já fixados por `tests/unit/elus-v189-import-ledger-integrity.test.ts` e `baseline-integrity.test.ts`.

## Método e resultado

Leitura independente dos dois blobs completos e das cinco migrations locais. Separação lexical por ponto e vírgula **fora** de strings simples, identificadores entre aspas, blocos `$tag$...$tag$` e comentários; comentários removidos e espaços externos a literais colapsados. A análise não executou SQL, não acessou banco, credenciais ou dados de clientes.

| Medida | Upstream v1.89 | Baseline ELUS |
| --- | ---: | ---: |
| Linhas no blob consultado | 63.245 | 63.854 |
| Instruções lexicais normalizadas | 5.478 | 5.505 |
| Estado final do separador lexical | `code` | `code` |

**Verificação de ordem:** as 5.478 instruções do upstream foram encontradas na baseline ELUS como subsequência **integral, idêntica e na mesma ordem**. A baseline possui exatamente **27 instruções adicionais**, em **um bloco contíguo após a instrução upstream nº 5.036**; seguem-se 442 instruções upstream sem interrupção.

**Verificação da origem das 27 instruções:** a sequência adicional corresponde exatamente, em conteúdo normalizado **e ordem**, à concatenação das cinco migrations locais:

| Migration local | Instruções |
| --- | ---: |
| `0689` — VendaERP | 11 |
| `0690` — autonomia IA | 6 |
| `0691` — Chutes catálogo | 3 |
| `0692` — Chutes sincronização | 4 |
| `0765` — rotação de códigos MFA | 3 |
| **Total** | **27** |

A comparação de multiconjuntos também encontrou **zero instruções upstream ausentes**, **zero instruções locais inesperadas** e **zero instruções locais faltantes**. A contagem e o bloco adicional ficam cobertos pelo teste offline `tests/unit/elus-v189-baseline-lexical-contract.test.ts`; a integridade byte a byte da baseline candidata continua protegida pelo teste preexistente `tests/unit/baseline-integrity.test.ts`.

## Limites explícitos

A separação lexical **não é um parser SQL PostgreSQL**, não executa DDL e não prova equivalência semântica em todos os casos. A normalização ignora comentários e comprime espaços fora de literais; não avalia dependências, efeitos de `search_path`, ACL, RLS, triggers, permissões ou dados. A comparação ordenada prova a relação entre **os blobs fixados examinados**, não que a baseline seja aplicável sobre uma instalação histórica.

O teste novo não armazena a baseline upstream no repositório e, isoladamente, não reexecuta a comparação remota das 5.478 instruções. Ele verifica apenas a posição e a identidade lexical das 27 instruções locais e o tamanho do inventário. A auditoria independente desta página documenta a comparação integral realizada nesta execução.

**NO-GO permanece:** faltam reconstrução privada dos sete statements históricos v1.85 e quatro migrations ELUS, replay fiel v1.85→v1.89 em PostgreSQL 15/17 descartável, reconciliação dos 51 recibos observados, investigação da RPC 0765 ausente apesar do recibo, reconciliação 0690/9037, isolamento entre tenants, ACL/RLS e aprovação separada do DELETE 0759 com restauração demonstrada. Nenhuma dessas condições é liberada por CI GREEN ou por paridade lexical.

**Ações proibidas nesta etapa:** SQL/migrations no banco real, E2E/Playwright, merge, publicação de imagens e deploy. O workflow E2E permanece somente manual.
