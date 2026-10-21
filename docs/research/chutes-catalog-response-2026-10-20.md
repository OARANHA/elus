# Catálogo público Chutes — captura de 20/10/2026

GET sem autenticação em `https://llm.chutes.ai/v1/models`: HTTP 200, `application/json`, envelope `{ "object": "list", "data": [...] }`, 14 modelos. Fixture pública completa: `tests/fixtures/chutes-models-2026-10-20.json`. Nenhuma inferência foi executada.

## Campos e unidade

`pricing.prompt` e `pricing.completion` são números JSON em todos os 14 modelos; seus valores coincidem com `price.input.usd` e `price.output.usd`. `price` também publica TAO; cache aparece em `pricing.input_cache_read` e `price.input_cache_read`. Não usamos TAO nem cache.

**Limite da evidência:** o corpo identifica a moeda por `usd`, mas não traz um campo de unidade temporal ou de quantidade de tokens. USD por milhão de tokens vem do Agent Hub documentado na especificação aprovada (`https://chutes.ai/agents`), não é inferido do envelope OpenAI-compatible. Nenhuma nova leitura desse outro domínio foi necessária ou autorizada na configuração cloud.

Não há `name` nem `description`; rótulo = `id`, descrição = null. `supported_features` e `input_modalities` só derivam tools/vision quando presentes; nos dois modelos sem esses campos, false. `context_window` usa apenas `context_length`, nunca `max_model_len` (os dois campos divergem, por exemplo no Gemma).

| ID                                       | Entrada USD/1M | Saída USD/1M | context_length | tools         | image         |
| ---------------------------------------- | -------------: | -----------: | -------------: | ------------- | ------------- |
| `google/gemma-4-31B-turbo-TEE`           |           0.12 |         0.37 |         131072 | sim           | sim           |
| `Qwen/Qwen3.8-27B-TEE`                   |          0.039 |         1.25 |         262144 | sim           | sim           |
| `deepseek-ai/DeepSeek-V3.2-TEE`          |            1.0 |          1.0 |         131072 | sim           | não declarado |
| `moonshotai/Kimi-K2.6-TEE`               |           0.45 |         1.95 |         262144 | sim           | sim           |
| `Qwen/Qwen3.6-27B-TEE`                   |           0.25 |          2.0 |         262144 | sim           | sim           |
| `deepseek-ai/DeepSeek-V4-Flash-0731-TEE` |           0.44 |         1.32 |        1048576 | sim           | não declarado |
| `zai-org/GLM-5.1-TEE`                    |           0.98 |         3.08 |         202752 | sim           | não declarado |
| `Qwen/Qwen3.5-397B-A17B-TEE`             |           0.45 |          3.0 |         262144 | sim           | sim           |
| `zai-org/GLM-5.2-TEE`                    |           1.25 |         3.95 |        1048576 | sim           | não declarado |
| `moonshotai/Kimi-K3-TEE`                 |           1.85 |          9.5 |        1048576 | sim           | sim           |
| `Qwen/Qwen3-32B-TEE`                     |          0.104 |        0.416 |          40960 | sim           | não declarado |
| `unsloth/Mistral-Nemo-Instruct-2407-TEE` |         0.0245 |       0.0978 |        ausente | não declarado | não declarado |
| `Nemotron-3-Nano-Omni-30B-TEE`           |         0.0245 |       0.0978 |        ausente | não declarado | não declarado |
| `Qwen/Qwen3-235B-A22B-Thinking-2507-TEE` |         0.2989 |       1.1957 |         262144 | sim           | não declarado |

Campos reais (união dos 14 objetos): `chute_id`, `confidential_compute`, `context_length`, `created`, `id`, `input_modalities`, `max_model_len`, `max_output_length`, `object`, `output_modalities`, `owned_by`, `parent`, `permission`, `price`, `pricing`, `quantization`, `root`, `supported_features`, `supported_sampling_parameters`.

A captura não contém null nos preços; `parent` é null e `permission` só aparece em parte dos modelos. Preços de entrada/saída observados têm até quatro casas decimais. O transporte preserva o lexema decimal original e arredonda centavos/1M para cima na escala 4 de `numeric(10,4)` (máximo 999999.9999).

SHA-256 da fixture formatada: `3bae19277c0ffb334389abd375d4d01aba7acd3141665c5addb1b4483dbf0878`.

## Validação local sem banco real

Bancada opcional PGlite 0.3.14 instalada em `/workspace/.cloud-tools/sql-test`, fora do checkout e das dependências do produto. A bancada cria em memória somente a tabela canônica de modelos e tabelas sentinelas; testa o SQL da migration, ownership, depreciação, ressurreição, rollback e permissão de execução. Não prova a configuração completa de Supabase/RLS nem concorrência entre sessões.

```sh
node tests/sql/chutes-catalog.check.mjs /workspace/.cloud-tools/sql-test/node_modules/@electric-sql/pglite/dist/index.js
```

O cron diário existente tenta OpenRouter e Chutes independentemente; erro técnico retorna HTTP 500 e log por fonte. Recusa do planejador mantém catálogo anterior e é reportada. `synced_at` permite verificar a última atualização. A RPC requer migration 0692 no ciclo normal de release; nenhum SQL foi aplicado a um banco real nesta tarefa.

## Verificação final desta sessão

Os comandos abaixo foram executados de `/workspace/elus`, com pnpm 9.15.9. Todos os checks focados terminaram com exit 0.

```sh
/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec vitest run \
  lib/ai/catalogo/chutes.test.ts \
  lib/ai/catalogo/sincronizar-chutes.test.ts \
  app/api/v1/cron/sync-model-catalog/route.test.ts \
  tests/unit/catalogo-openrouter.test.ts \
  tests/unit/catalogo-sincronizar.test.ts \
  tests/unit/chutes-chat-native.test.ts \
  tests/unit/chutes-preco-por-provedor.test.ts \
  tests/unit/chutes-qwen3-embedding.test.ts \
  tests/unit/cron-aceita-os-dois-segredos.test.ts \
  tests/unit/cron-audita-so-quando-ha-efeito.test.ts \
  tests/unit/mapas-de-arquitetura.test.ts \
  tests/unit/audit-lista-do-painel-e-derivada.test.tsx
# 12 arquivos, 411 testes passaram.

node tests/sql/chutes-catalog.check.mjs /workspace/.cloud-tools/sql-test/node_modules/@electric-sql/pglite/dist/index.js
# 10 testes passaram. Controle negativo removendo a proteção de metadata:
# 1 teste falhou, exit 1; restauração: 10 passaram, exit 0.

node --max-old-space-size=3072 node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.chutes.json
# exit 0: arquivos afetados e dependências transitivas.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec eslint \
  lib/ai/catalogo/chutes.ts lib/ai/catalogo/chutes.test.ts \
  lib/ai/catalogo/sincronizar-chutes.ts lib/ai/catalogo/sincronizar-chutes.test.ts \
  lib/audit/actions.ts \
  app/api/v1/cron/sync-model-catalog/route.ts \
  app/api/v1/cron/sync-model-catalog/route.test.ts
# exit 0, sem diagnósticos.

/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec tsx scripts/cortar-release.ts
# exit 0, modo conferência; nenhum arquivo escrito.

git diff --check
# exit 0.
```

TDD: cron inicial com 3 falhas/1 aprovação; implementação verde. Fortalecimento do transporte com 2 falhas (preço divergente e timeout), depois 50/50 verde. Revisão independente encontrou perda de diagnóstico e falta de auditoria condicional: testes negativos e positivos foram adicionados antes das correções; registro canônico de auditoria também foi exercitado em RED→GREEN.

**Limites:** o typecheck global (`pnpm exec tsc --noEmit --incremental false -p tsconfig.typecheck.json`) foi tentado e esgotou o heap padrão de 4 GB (SIGABRT); isso não equivale a um typecheck global verde. Vitest emite avisos preexistentes sobre futura mudança do carregador de configuração Vite. Não foram executados build, suíte completa, banco Supabase real, RLS completo ou teste de concorrência entre sessões. Não houve migration real, inferência paga, VPS, merge, deploy ou consulta de Actions.

Revisão final independente: dois achados importantes corrigidos (diagnóstico sanitizado e auditoria de rodadas mutantes); nenhum achado menor foi adiado. O mapa documenta scheduler → catálogo → seletor/gates e recusa → próxima rodada. Resultados Chutes também ficam na auditoria global `ai.catalog_sync`, somente quando houve escrita.

Gates adicionais de schema/documentação (exit 0, 4 arquivos, 248 testes; há sobreposição com o mapa já testado acima):

```sh
/workspace/.cloud-tools/pnpm/node_modules/.bin/pnpm exec vitest run tests/unit/manifest-x-migrations.test.ts tests/unit/apendice-do-baseline-espelha-a-migration.test.ts tests/unit/main-sem-migration-duplicada.test.ts tests/unit/mapas-de-arquitetura.test.ts
```

Prettier `--check` nos arquivos TS/JSON/Markdown/MJS alterados terminou com exit 0. A consulta de privacidade atual de `OARANHA/wmemory` pela API GitHub retornou `Forbidden`; leitura Git funciona, mas nenhuma memória foi publicada enquanto a confirmação de privacidade permanece pendente. O resumo pronto para gravação está fora do checkout, em `/workspace/elus-wmemory-pending.md`.

## Continuação autorizada para concluir a PR #18

O pedido posterior do proprietário autorizou resolver a autorização granular do PUT e criar commits/push normal na mesma branch. As restrições anteriores de manter o HEAD sem commits e de não editar essa rota são históricas desta primeira etapa; não descrevem a autorização atual. Nenhuma rejeição de ferramenta ocorreu na edição posterior, e não houve contorno de política. O handoff atual em `docs/handoffs/HANDOFF-ELUS-PR18-REDEPLOY.md` registra os resultados e os gates ainda necessários antes do redeploy.

A revisão posterior também corrigiu o caminho de upgrade: o seed 0691 no baseline não sobrescreve mais modelos/preços existentes, e a migration 0692 entra antes da varredura final de privilégios. A migration histórica 0691 não foi reescrita. A bancada SQL foi ampliada para 13 casos e passou; os 10 casos originais permanecem cobertos.
