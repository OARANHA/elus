# ELUS v1.89 — reconstrução e validação independentes da baseline (03/11/2026)

**Escopo:** PR #62, auditoria offline, sem executar SQL ou alterar a baseline. **Decisão:** NO-GO para replay, aplicação produtiva, merge e deploy. CI verde não é aceite funcional.

## Fontes fixadas e leitura integral

- Upstream DeskcommCRM v1.89.0: commit `6540929d5ef7a951531dda550db0bf54affa516a`; blob `supabase/baseline.sql` = `07af36ef379f341559318ca5cd2cadc7a5740797`, **3.364.899 bytes**.
- ELUS PR #62: baseline candidata blob `0269eee11299e0492f489ab6d690eb88b91e30b1`, **3.393.613 bytes**, **63.854 linhas**.
- Os dois blobs foram lidos integralmente por GitHub Git Blobs (não pelo endpoint de Contents, que devolveu conteúdo vazio para arquivos grandes). O SHA é de blob Git, não digest de um texto parcial.
- O candidato difere do upstream por **uma única inserção contígua**, de **28.559 caracteres / 28.714 bytes**. Remover exatamente essa inserção recupera o texto upstream completo, sem qualquer outra diferença.

## Reconstrução (prova 1)

`tests/unit/elus-v189-baseline-rebuild-offline.test.ts` recompõe o bloco inserido usando os cinco arquivos locais versionados, na ordem: VendaERP 0689, guarda de autonomia 0690, Chutes 0691 e 0692 e RPC MFA 0765. Preserva os marcadores `-- ELUS exclusivo:` e o cabeçalho `-- ---- ELUS 0765:` exatamente como no candidato.

A prova remove somente esse bloco do candidato e exige o **SHA Git exato do upstream v1.89.0** e seus 3.364.899 bytes. Em seguida reinsere o mesmo bloco antes de `-- ---- VARREDURA anon:` e exige **igualdade byte a byte com a baseline ELUS**, blob `0269eee...` e 3.393.613 bytes. O teste é offline e não modifica arquivos.

## Validação separada (prova 2)

`tests/unit/elus-v189-baseline-independent-validation.test.ts` verifica, independentemente da rotina de reconstrução, que:

- Os cinco SQLs locais ocorrem integralmente **uma única vez cada**, na ordem esperada e antes da varredura final de privilégios `anon`.
- O candidato preserva o tamanho integral e mais de 58 mil linhas.
- Após a varredura final não há declaração ativa `CREATE FUNCTION` detectada pela guarda lexical estática; isso **não substitui parser SQL nem validação efetiva de ACL**.
- A migration histórica 0690 está integralmente preservada e continua com predicado de serviço baseado em `auth.role()`, sem a conjunção adicional com `current_user` observada no recibo externo 9037. **Paridade funcional não aprovada.**

A inspeção direta via conectores confirmou **inserção única, remontagem textual exata, cinco SQLs únicos e ordenados, e nenhuma declaração ativa CREATE FUNCTION após o hardening**. Essas verificações não são uma execução local do Vitest.

## Limites e gates ainda abertos

A reconstrução textual demonstra a proveniência integral da baseline e preservação dos cinco SQLs locais; **não demonstra execução idempotente, ordem segura em banco já populado, nem equivalência de schema**. Permanecem a divergência 0690/9037, RPC 0765 ausente no catálogo real, 51 recibos versus limite de 50 do executor, restauração do histórico de 11 versões, replay em clones PostgreSQL 15/17, ACL/RLS multi-tenant e autorização específica do `DELETE` da migration 0759.

A auditoria de proveniência das 38 migrations importadas, das três colisões numéricas e da colisão de timestamp está registrada separadamente em `docs/integracao/elus-v189-proveniencia-sql-20261103.md`. As quatro migrations ELUS permanecem intocadas. VendaERP READ-ONLY, ISIS/DANFE, Chutes, login, RBAC, governança, workflow E2E manual e deploy não foram alterados.

**CI de entrada:** `bc84f8abf84e39b84cfa52399a00dc7040a12708`, workflows `ci`, `perf` e GHCR `completed/success` (CI run `41644486124`). O CI do HEAD que inclui os novos testes ainda **não foi consultado**. Lint, TypeScript completo e Vitest locais não foram executados nesta rodada; ausência de `@next/eslint-plugin-next` não foi revalidada no ambiente local. Nenhum E2E/Playwright, SQL mutante, migration, merge, publicação de imagem ou deploy foi executado.
