# ELUS v1.89 — classificação offline do ledger (somente recibos)

**Estado: NO-GO para replay, merge, imagem e deploy.** Esta ferramenta não consulta banco, não abre rede, não executa SQL e não altera migrations. Ela compara uma lista **sanitizada** de versões observadas com as 11 versões históricas e as 39 versões candidatas fixadas na matriz do repositório. O snapshot de 25/10/2026 da matriz é uma referência histórica, não a situação atual do banco.

## Entrada e execução

Com Node.js 22+, a partir da raiz do repositório, forneça via stdin um JSON que contenha **somente** `versions` (lista de strings de 14 dígitos) e, opcionalmente, `publicTables` (contagem inteira). Exemplo ilustrativo, **não é evidência produtiva**:

```sh
printf '%s\n' '{"versions":["20261018200431"],"publicTables":191}' \
  | node scripts/elus-v189-ledger-drift-offline.mjs inspect
```

Não forneça credenciais, SQL de migrations, `statements`, `rollback`, códigos MFA, hashes, dados de usuários ou conteúdo de tabelas. A coleta da lista de versões, se necessária, exige autorização e credencial **somente leitura**, separadamente desta ferramenta.

## Interpretação

- `EXPECTED_SET_RECORDED_UNVERIFIED` significa apenas que as **50 versões esperadas constam** na entrada, sem duplicatas nem desconhecidas. **Não** significa que os 39 SQLs foram executados, que a migration `0759` foi autorizada ou que a função MFA da `0765` existe.
- `NONPREFIX_IMPORT_RECEIPTS` significa que as versões importadas registradas não formam um prefixo na ordem de timestamps da matriz; requer reconciliação manual, não replay automático.
- `PARTIAL_OR_UNKNOWN_RECEIPTS` significa que faltam ou sobram versões, ou há duplicatas; os detalhes ficam em `differences`.
- `publicTablesReported` é um número declarado pela entrada e **não** comprova schema, ACL, RLS, integridade ou paridade do baseline.

A decisão é **sempre `NO_GO`**, inclusive com 50 recibos e 208 tabelas. Permanecem necessários atestado read-only dos objetos (especialmente a função `fn_elus_rotacionar_codigos_recuperacao` da `0765`), revisão de permissões, restauração e replay isolados em PostgreSQL 15/17 e autorização específica para o impacto destrutivo da `0759`. VendaERP permanece somente leitura; não modificar ISIS/DANFE, Chutes, login, governança ou deploy.

## Validação permitida

`node --check scripts/elus-v189-ledger-drift-offline.mjs` e `pnpm vitest run tests/unit/elus-v189-ledger-drift-offline.test.ts` (além dos gates estáticos/lint/types do projeto). **Não executar E2E/Playwright**. O workflow E2E continua exclusivamente manual.
