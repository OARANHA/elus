# ELUS — execução E2E exclusivamente manual

Estado: política de manutenção do projeto `OARANHA/elus`.

## Regra

- Nenhum evento de `push`, `pull_request`, `schedule` ou `workflow_run` pode iniciar `pnpm test:e2e`, `pnpm test:journeys`, `playwright test` ou a matriz E2E.
- `.github/workflows/e2e.yml` expõe somente `workflow_dispatch`. A execução só deve ocorrer após solicitação explícita do proprietário.
- Preservar os testes E2E existentes; não apagar specs para acelerar a integração do upstream.
- Não iniciar `pnpm e2e:build`, `pnpm e2e:env`, `pnpm test:e2e`, `pnpm test:journeys` ou Playwright durante o sync do DeskcommCRM.
- Estão permitidos testes unitários, lint, typecheck, validações de migrations/banco e builds que não acionem jornadas E2E.
- O teste estático `tests/unit/elus-e2e-somente-manual.test.ts` impede reintroduzir gatilhos automáticos ou comandos Playwright em outros workflows.
- Ao integrar mudanças futuras de `melgarafael/DeskcommCRM`, manter a política ELUS; não copiar a seção `on:` do workflow E2E do upstream.

## Atenção aos gates

Se algum check obrigatório do GitHub exigir `e2e`, não simular PASS nem mascarar skip. Revisar a regra de proteção e escolher validação não E2E até o proprietário autorizar a execução manual.

## Origem

Pedido expresso do proprietário em 24/10/2026. A alteração deve passar por PR e CI sem E2E antes de chegar a `main`.