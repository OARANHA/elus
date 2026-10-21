# Sincronização Chutes — plano de implementação

> Execução nesta sessão com `superpowers:executing-plans`, conforme pedido do proprietário. TDD por etapa; revisão final independente.

**Goal:** Atualizar modelos de conversa Chutes a partir do catálogo público, preservando curadoria manual e abortando lotes inválidos.
**Architecture:** Tradução pura e transporte limitado em `lib/ai/catalogo/`; reutilizar `planejarSincronizacao` e o cron `sync-model-catalog`. Persistir o lote por uma função transacional, restrita a service_role, que revalida ownership e sanidade sob lock.
**Tech Stack:** Node >=22, pnpm 9.15.9, TypeScript, Zod, Vitest, PostgreSQL.
**Spec:** `docs/superpowers/specs/2026-10-20-chutes-catalog-sync-design.md`.

## Restrições globais

- Branch existente e base inicial `b80fa063fff4fb4062a18696bc277a9318b8878c`; não criar branch, tarefa ou PR.
- Não tocar `app/api/v1/ai/providers/route.ts`, embeddings, produção, defaults, bindings, credenciais ou histórico.
- Não aplicar migrations reais, iniciar serviços, fazer build pesado, merge, deploy ou polling de Actions.
- Fixtures offline; nenhum teste usa inferência ou acesso externo.
- `synced_at` já é a coluna canônica. Sem coluna, tabela ou scheduler novos.

## Review Focus

- Colisão com modelo manual, inclusive entre leitura e escrita: jamais tomar posse.
- Número JSON perto do limite de arredondamento: preservar o decimal original no transporte.
- Resposta curta com IDs novos: piso 50% deve impedir depreciação em massa.
- Falha depois de atualizar modelos: transação precisa desfazer o lote inteiro.
- Falha de uma fonte no cron compartilhado: não ocultar o erro nem impedir a tentativa da outra.

### Task 1: Contrato real, parser e transporte

**Files:** `lib/ai/catalogo/chutes.ts`, `lib/ai/catalogo/chutes.test.ts`, `tests/fixtures/chutes-models-2026-10-20.json`, `docs/research/chutes-catalog-response-2026-10-20.md`.
**Interfaces:** `traduzirCatalogoChutes(unknown): LinhaDeCatalogo[]`, `precoChutesParaCentavos(string | number): number`, `buscarCatalogoChutes(fetchImpl?): Promise<LinhaDeCatalogo[]>`.

- [x] Escrever testes para os 14 modelos capturados, ausência de metadados, preço decimal exato, zero, tarifa desconhecida/negativa/fora da faixa, duplicados e envelope inválido.
- [x] Rodar Vitest e confirmar RED antes da implementação.
- [x] Implementar Zod, conversão inteira com BigInt para escala 4 e GET fixo, sem autenticação, sem redirect, timeout de 20s e limite de 1MiB durante streaming.
- [x] Testar timeout/cancelamento, HTTP, JSON inválido, corpo excessivo e decimal original; confirmar GREEN.

### Task 2: Serviço e persistência com ownership

**Files:** `lib/ai/catalogo/sincronizar-chutes.ts`, teste irmão, migration forward-only `20261020230000_0692_chutes_catalog_sync.sql`, apêndice idêntico no `supabase/baseline.sql`.
**Interfaces:** `sincronizarCatalogoChutes(admin, buscar?)` usa Task 1 e `planejarSincronizacao`; RPC `fn_sincronizar_catalogo_chutes(p_modelos jsonb)` devolve contagens.

- [x] Escrever testes RED para validação antes da leitura, erro de leitura, piso de sanidade, filtros provider/source e falha da persistência.
- [x] Acrescentar RPC atômica: validar payload, lock, piso novamente, INSERT sem sobrescrever conflitos manuais, UPDATE/ressurreição/depreciação apenas Chutes gerenciado.
- [x] Transferir somente os dois seeds 0691 com todos os campos esperados; estado inesperado deve abortar. Reexecução idempotente.
- [x] Testar contrato SQL offline e comportamento do serviço; não executar migration real. Registrar a limitação de não provar a transação em Postgres nesta etapa.

### Task 3: Cron existente, observabilidade e validação final

**Files:** cron existente `app/api/v1/cron/sync-model-catalog/route.ts`, teste focado de integração do cron, mapa `docs/architecture/chutes-catalog.architecture.json`, fragmento `.changes/chutes-catalog-sync.md`.

- [x] Teste RED: autenticação continua necessária e cron tenta as duas fontes, reportando sucesso/falha de cada uma sem criar scheduler paralelo.
- [x] Integrar Chutes com logs por fonte e erro observável; preservar contrato OpenRouter.
- [x] Documentar entrada scheduler → parser → ai_models → seletor/gates existentes, e recusa → próxima rodada.
- [x] Rodar unitários focados, typecheck, ESLint dos arquivos tocados, formatação, mapa e diff-check. Sem suíte completa/build/serviços.
- [x] Revisão independente, corrigir achados relevantes por TDD; registrar comandos e limitações.
- [ ] Atualizar somente fatos comprovados em OARANHA/wmemory após verificar privacidade e confirmar leitura de volta. Sem modificar o estado Draft da PR #18.

## Decisões de execução

- O pedido explícito de implementar nesta tarefa autoriza executar este plano na mesma sessão sem novo ciclo de aprovação.
- A resposta JSON declara USD em `price.*.usd`, mas não declara denominador. USD/1M é evidência documental da especificação aprovada, não conclusão do envelope. Preços de cache/TAO não alimentam o catálogo.
- Validação SQL offline não substitui teste de integração transacional nem comprova RLS de um banco real.

## Registro de execução

- Tarefas 1 e 2 concluídas: parser/transporte/serviço; persistência testada com PostgreSQL em memória, 10/10. Proteção dos metadados manuais sabotada: 1 falha esperada, exit 1, depois restauração verde.
- Tarefa 3: integração e revisão concluídas; 411/411 unitários focados, tipos focados e ESLint verdes. Auditoria usa registro canônico `lib/audit/actions.ts`; config de tipos reproduzível em `tests/tsconfig.chutes.json`; bancada em `tests/sql/chutes-catalog.check.mjs`.
- Decisão: preservar o HEAD inicial e deixar alterações do produto sem commit/push; o pedido exige manter a mesma branch e PR Draft. Custo: alterações ainda dependem do workspace até serem commitadas em etapa posterior.
- Decisão: limitar o typecheck após OOM global de 4 GB; validar arquivos afetados e dependências transitivas. Custo: não há prova de tipos global nesta sessão.
- Memória remota pendente: leitura Git funciona, API de privacidade retorna Forbidden; confirmação atual de privacidade foi solicitada, sem ampliar rede ou adicionar credenciais.
- Comandos e limitações: `docs/research/chutes-catalog-response-2026-10-20.md`.

## Continuação autorizada para concluir a PR #18

O pedido posterior do proprietário autorizou resolver a autorização granular do PUT e criar commits/push normal na mesma branch. As restrições anteriores de manter o HEAD sem commits e de não editar essa rota são históricas desta primeira etapa; não descrevem a autorização atual. Nenhuma rejeição de ferramenta ocorreu na edição posterior, e não houve contorno de política. O handoff atual em `docs/handoffs/HANDOFF-ELUS-PR18-REDEPLOY.md` registra os resultados e os gates ainda necessários antes do redeploy.

A revisão posterior também corrigiu o caminho de upgrade: o seed 0691 no baseline não sobrescreve mais modelos/preços existentes, e a migration 0692 entra antes da varredura final de privilégios. A migration histórica 0691 não foi reescrita. A bancada SQL foi ampliada para 13 casos e passou; os 10 casos originais permanecem cobertos.
