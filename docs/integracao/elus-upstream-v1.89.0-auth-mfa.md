# ELUS × DeskcommCRM v1.89.0 — MFA da plataforma

**Base de trabalho:** PR #27 (`54187d7d861a1cadfe97c34deb62619ac88fdbfe`).
**Upstream analisado:** tag `v1.89.0` (`6540929d5ef7a951531dda550db0bf54affa516a`).

## Divergência preservada intencionalmente

O upstream introduz duas réguas: `mfaEmDivida()` pode aceitar um dispositivo confiável para a área da organização, enquanto `mfaEmDividaEstrita()` exige AAL2 nas operações de plataforma.

**O ELUS já exige AAL2 na sua `mfaEmDivida(usuarioValidado?)` atual**, inclusive para TOTP cadastrado voluntariamente. Não substituir essa implementação pela régua mais permissiva do upstream. A função própria também reaproveita `AuthUser.mfa_enrolled`, obtido do `getUser()` remoto, sem repetir a leitura de fatores quando essa prova existe.

A compatibilidade adicionada é `mfaEmDividaEstrita(usuarioValidado?)`: a função tem a semântica explícita de AAL2 e preserva o comportamento fail-closed. **Esta etapa não muda o fluxo de autorização em produção** e não introduz confiança em dispositivo. As chamadas do upstream que exigirem esse nome podem ser portadas em PRs posteriores, com seus testes de RBAC e autorização.

## Não importar cegamente o conflito de `lib/auth/server.ts`

A versão ELUS já contém tratamento próprio de falhas do GoTrue, log de latência, `totpVerificadoNoUsuario`, reutilização de `mfa_enrolled` e consultas paralelas de permissões. A otimização `sessaoDaRequisicao` do upstream só deve ser integrada após verificar que essas garantias continuam válidas e atualizar os testes que hoje usam `listFactors`.

Também não importar `require-role.ts` inteiro: o ELUS mantém proteção de organização ativa, `X-Org-Da-Aba`, suspensão e autorização com `mfaEmDivida(user)`.

## Gates

Testes unitários de AAL1, AAL2, TOTP não verificado e falha fechada em `tests/unit/auth-falha-alto.test.ts`; lint e typecheck pelo CI. **Nenhum E2E/Playwright**, nenhum merge, migration, imagem publicada ou deploy nesta etapa.
