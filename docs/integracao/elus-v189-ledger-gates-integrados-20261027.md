# ELUS v1.89 — consolidação dos gates históricos (27/10/2026)

**Estado: proposta de código, sem execução no banco real e sem autorização de replay.**

Esta branch parte do HEAD `0714c63e8c2883c6c429317184fa0f01c22a6bd0` da PR #43. Reúne os contratos das PRs #55 (identidade version/name) e #56 (fingerprint de statements/rollback) em uma revisão única, preservando as alterações recentes do pré-voo de produção, a matriz de replay e o manifesto das 39 migrations.

O pré-voo de produção compara as 11 identidades históricas por um helper testável. O pré-voo de metadados rejeita divergência entre versões da matriz e snapshot, e rejeita nomes históricos alterados antes de emitir fingerprint candidato. O modo `verify` continua exigindo SHA-256 aprovado por revisão independente.

**Gates pendentes:** fingerprint aprovado do ledger real; replay/restauração isolados; reconciliação do ledger oficial e colisões; impacto da migration destrutiva 0759; aprovação operacional. Esta PR não aprova nenhum desses itens.

**Escopo intocado:** VendaERP somente leitura, ISIS/DANFE, Chutes, login, governança, deploy, migrations SQL, baseline, workflows e E2E (apenas `workflow_dispatch`). Não executar E2E/Playwright, merge, publicação de imagem ou deploy.

## Reconciliação posterior — 27/10/2026

Reaplicado sobre a branch `sync/elus-deskcomm-v189-consolidation-20261025`, commit `5960ad56de6a03cda1d3a53cbc59ac710f004e77`, após integração da PR #43. A PR #57 permanece como origem histórica. Preservam-se as cercas posteriores do preflight de produção: role sem privilégios efetivos de escrita, tipos do ledger oficial e cutoff da matriz. Checks do novo HEAD não estão comprovados.

Nenhum fingerprint aprovado; nenhum replay, E2E/Playwright, SQL mutante, merge de PR, publicação de imagem ou deploy autorizado.
