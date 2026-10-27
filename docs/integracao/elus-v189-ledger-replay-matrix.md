# ELUS v1.85 → v1.89 — matriz de reconciliação estática

**Estado: BLOQUEADO PARA REPLAY, MERGE E DEPLOY.** Esta matriz não executa SQL, não consulta banco, não produz plano aplicável por `db push` e não substitui autorização operacional.

A fonte versionada é `docs/integracao/elus-v189-ledger-replay-matrix.json`. Ela fixa as **38 migrations upstream importadas** por caminho e blob Git, as **quatro migrations ELUS preservadas**, as **11 versões do ledger observadas em 25/10/2026**, as três renomeações por colisão e sete dependências conhecidas. Cada migration recebe `REQUIRES_MANUAL_REVIEW`; nenhum item é marcado como aplicado por inferência cronológica.

A classificação pelo corte `20261021025613` produz **11 imports anteriores ou iguais** e **27 posteriores**. Essa distinção é exclusivamente temporal. Os seis lotes privados v1.85 e as quatro versões próprias registradas no Supabase não podem ser substituídos por versões nominais de arquivos. As dependências são um conjunto **mínimo conhecido**, não uma prova de completude.

O teste `tests/unit/elus-v189-ledger-replay-matrix.test.ts` confronta a matriz com a pinagem existente na PR #43, os bytes dos 42 arquivos, o plano de colisões, o corte histórico e a ordem das dependências. O marcador `destructive_delete` em `0759` exige revisão e aceite específicos, incluindo impacto, backup e restauração.

**Próximos gates (não executados):** revalidar ledger/catálogo somente leitura; mapear individualmente as 11 versões históricas e os 38 imports; revisar cada um dos 11 SQLs anteriores ao corte; decidir o impacto de `0759`; comprovar upgrade e restauração em ambiente isolado; obter autorização específica antes de qualquer mudança real. VendaERP continua exclusivamente leitura; preservar ISIS/DANFE, Chutes, login, governança e deploy.

**Fora de escopo:** E2E/Playwright, `db push`, `db reset`, alteração de ledger, banco ativo, merge, publicação de imagens e deploy.
