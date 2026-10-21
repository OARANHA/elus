# PR #18 — revisão técnica e gate de redeploy

Registro em 20/10/2026 (Brasília). Este handoff complementa a especificação do catálogo Chutes e registra a autorização posterior do proprietário para corrigir o PUT, criar commits e fazer push normal na branch existente. Não autoriza merge, migration em produção ou deploy.

## Reconciliação

Workspace `/workspace/elus`, branch `feat/elus-platform-ai-governance-chutes-native`, HEAD inicial `b80fa063fff4fb4062a18696bc277a9318b8878c`. A referência remota da branch e `refs/pull/18/head` apontavam para esse mesmo SHA. `origin/main` foi buscada e tem zero commits à frente da branch. Os 16 arquivos locais alterados/novos foram preservados em `/tmp/elus-pr18-local-before-put.tar` antes da edição; a implementação existente não foi refeita.

A consulta de metadados da PR via GitHub API retorna `Forbidden` neste cloud. A referência Git confirma a cabeça da PR, mas não comprova estado aberta/Draft, checks, aprovações ou mergeabilidade. Nenhuma alteração de estado da PR nem polling de Actions é parte desta entrega.

## PUT: política e falha segura

A rota `app/api/v1/ai/providers/route.ts` consulta o binding com o cliente da sessão por `organization_id` autenticado e `purpose`, valida forma e identidade e recusa leitura inconclusiva com 503. A edição foi permitida pela ferramenta nesta sessão; nenhuma via alternativa foi usada para contornar o bloqueio histórico.

O comparador canônico de `lib/ai/governanca-da-ia.ts` exige:

| Campo efetivamente alterado | Grant         |
| --------------------------- | ------------- |
| `provider`                  | `provider`    |
| `model_id`                  | `model`       |
| `credential_id`             | `credentials` |
| `base_url`                  | `provider`    |
| `is_enabled`                | `provider`    |

O PUT substitui os opcionais omitidos por `credential_id=null`, `base_url=null` e `is_enabled=true`. Esses valores são comparados antes de autorizar: omissão não contorna permissão para limpar credencial, trocar destino ou reativar o ponto. Criação sem binding exige grants para a configuração nova; nenhuma concessão é obtida do body ou de outro tenant. Grants são relidos pelo mecanismo canônico, sem cache de autorização.

A escrita existente usa UPDATE condicional ao snapshot completo ou INSERT sem overwrite, nunca upsert cego. Se outro administrador alterou a configuração entre leitura e escrita, a resposta é 409 e não há mutação nem auditoria de sucesso. Reenvio idêntico passa pelas validações de catálogo, preço Chutes e credencial, mas não escreve nem repete audit. Suporte somente leitura, papel admin, compatibilidade e isolamento de credencial permanecem obrigatórios.

## Catálogo e migration 0692

Foram reutilizados parser, transporte limitado e planejador localmente implementados. A origem permanece fixa em `https://llm.chutes.ai/v1/models`, sem chave, com validação integral e preços decimais exatos. Não há ativação automática de bindings nem alteração de embeddings. Ownership manual é preservado pela RPC e pelo caminho de atualização do baseline.

A revisão encontrou dois problemas antes do push, ambos reproduzidos e corrigidos com testes:

1. O upsert do PUT podia restaurar provider/credencial alterados concorrentemente apesar de grant apenas de modelo. Resolvido por comparação condicional e INSERT sem overwrite; conflito retorna 409.
2. O seed 0691 no baseline sobrescrevia curadoria antes de a 0692 verificar ownership. O baseline agora só insere seeds ausentes em `ai_models` e `ai_pricing`; a migration histórica 0691 permanece intacta. Estado manual inesperado chega intacto à 0692 e falha fechado para revisão. O bloco 0692 foi colocado antes da varredura final de privilégios `anon`, conforme a regra do repositório.

A bancada PostgreSQL em memória exercita seed + ownership, upgrade com curadoria modificada, preços existentes, instalação nova, rollback do lote, depreciação/ressurreição e permissão de execução. Não usa produção nem substitui a matriz Supabase/Postgres do CI.

## TypeScript e ambiente de validação

O ambiente cloud dispõe de 32 GiB; o heap padrão de Node é cerca de 4 GiB. O primeiro typecheck global com `--max-old-space-size=12288` passou, usando cerca de 6 GB e 49 segundos. Uma execução posterior também passou com o código de autorização, usando cerca de 5 GB. A investigação confirma limite do heap como causa do OOM anterior, sem necessidade de build ou mudança de código para mascarar tipos.

O workflow de CI já declara `NODE_OPTIONS=--max-old-space-size=6144` no job de typecheck. A reprodução local desse limite também passou: 11.643 arquivos, 5.243.034 KiB de memória reportada pelo TypeScript e 98,75 segundos no compilador (99,55 segundos de parede). Nenhum recurso da VPS foi usado.

Três fixtures unitárias preexistentes foram isoladas de rede/Docker após falharem no cloud: o teste de dispatch de validadores usa HTTP 401 sintético, o teste de transporte Zernio usa resolução DNS pública sintética e o teste do gerador de env fornece psql sintético. As verificações e os guards de produção continuam executados; não houve relaxamento de assertion ou de política de rede.

## Gate antes de liberar redeploy

1. Revalidar no GitHub a PR #18, seus commits, Draft e aprovações, inclusive o diff do PUT. A API deste cloud não permite essa inspeção de metadados.
2. Aguardar o proprietário informar GREEN/RED do CI do novo HEAD: `verify`, `invariants` (instalação e atualização nas majors suportadas), `build-and-size`, E2E e `imagens-ok`, conforme os workflows da branch. Não tomar teste focado nem referência Git como substituto desses checks.
3. Confirmar ausência de colisão da 0692 com outros PRs abertos. A checagem local cobre a base e o diff, mas a enumeração de PRs está bloqueada pela API.
4. Em uma operação posterior autorizada, fazer backup e validar a aplicação do baseline/migration no alvo correto. Um seed manual modificado deve interromper a transferência de ownership, nunca ser apropriado automaticamente. Se ocorrer esse caso, resolver a curadoria explicitamente antes do redeploy.
5. Aplicar a atualização de schema no ciclo normal de release antes de depender da RPC nova; depois usar as imagens publicadas pelo CI e o compose documentado para o proxy existente. Sem build pesado na VPS.
6. No pós-deploy autorizado, comprovar `/` 200, `/app` 307, login, gravação permitida e recusas de grants parciais, e observar a rodada do catálogo por fonte/synced_at/auditoria. Não fazer inferência paga ou alterar embeddings como parte desse smoke.

A memória `OARANHA/wmemory` permanece opcional nesta entrega: a leitura Git funciona, mas a privacidade atual não pôde ser conferida pela API. Sem essa verificação, o resumo é preparado fora do checkout e não publicado na memória remota.

## Comandos e resultados locais

Executados em `/workspace/elus`, com `/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm` (9.15.9):

```sh
# Typecheck GLOBAL com o mesmo orçamento de heap declarado pelo CI:
node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --incremental false --extendedDiagnostics -p tsconfig.typecheck.json
# exit 0; 11.643 arquivos; memória 5.243.034 KiB; 98,75s no compilador.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec eslint .
# exit 0; 0 erros, 558 avisos. Não foi usado --fix global.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec tsx scripts/lint-channels.ts
/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec tsx scripts/lint-role-rank.ts
# ambos exit 0; nenhuma dívida nova de canal ou ROLE_RANK fora do lugar.

node tests/sql/chutes-catalog.check.mjs /workspace/.cloud-tools/sql-test/node_modules/@electric-sql/pglite/dist/index.js
# exit 0; 13 testes SQL em memória. Não aplicou migration em produção.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec vitest run app/api/v1/ai/providers/put-governanca.test.ts
# exit 0; 26 testes, incluindo snapshot concorrente e criação concorrente.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec tsx scripts/cortar-release.ts
# exit 0, somente conferência dos 9 fragmentos, nenhum corte/escrita de release.

git diff --check
git diff --cached --check
# exit 0. Prettier --check também passou em todos os arquivos alterados compatíveis.
```

Uma rodada focalizada de 24 arquivos passou com 538 testes; os gates posteriores de mapa/handoff passaram com 250 testes (há sobreposição, não somar como casos únicos). A primeira execução completa, iniciada antes das correções finais, teve 25.124 aprovações e sete falhas em cinco arquivos. Todas foram reproduzidas, corrigidas na causa e reexecutadas em verde: duas corridas no PUT, ordem da varredura anon, dois casos do gerador de env, DNS do transporte e timeout do teste de dispatch. A rodada completa final usa `pnpm exec vitest run --maxWorkers=8`, sem edição concorrente do código sob teste.

### Resultado completo final

`/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec vitest run --maxWorkers=8` terminou com **exit 0**, 2.377 arquivos aprovados e um ignorado; **25.137 testes aprovados, uma falha esperada e um ignorado** (25.139 casos contabilizados). Nenhuma falha inesperada. O log integral local está em `/tmp/elus-pr18-unit-final.log`. Esta é a rodada com as correções finais; o resultado substitui o vermelho diagnóstico da primeira execução, sem apagar seu histórico acima.

A implementação fica tecnicamente preparada para a revisão da PR; liberação de redeploy ainda depende dos gates de CI e operacionais listados acima. A suíte unitária completa não comprova build, E2E, RLS completo do Supabase nem migração em produção.

## Commits da implementação

- `7e2d451`: catálogo Chutes, preço exato, ownership/transação, baseline protegido e provas SQL.
- `c316ccc`: grants por campo, isolamento e gravação condicional do PUT, com testes de concorrência.
- `3f84a3e`: fixtures unitárias sem dependência de rede/Docker.
- A documentação deste handoff é consolidada em um commit próprio posterior aos três acima.

A checagem de colisão foi repetida depois de a 0692 entrar no histórico local. A base `origin/main` foi reconciliada e não tem commits à frente desta branch; a enumeração de PRs abertos continua indisponível pela API. O hook também avisou que a main do produto upstream DeskcommCRM não foi consultada: nenhum remoto upstream foi criado ou alterado para silenciar esse aviso. Isso deve ser considerado se houver integração futura com upstream; o alvo desta entrega é `OARANHA/elus`.
