# ELUS v1.85 → v1.89 — plano de corte produtivo e ledger

**Revisão:** 27/10/2026 • PR #43 • **PROPOSTO / BLOQUEADO PARA PRODUÇÃO**.

## Estado comprovado
- Histórico atual do projeto Supabase: 11 versões; sete operações de preparação/baseline v1.85 e quatro migrations ELUS. São entradas reais em `supabase_migrations.schema_migrations` com colunas `version`, `name`, `statements` e `rollback`.
- Laboratório em container sem rede, baseado em restauração de dump do banco real: 38 migrations importadas + `20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql` executadas; 208 tabelas em `public`, todas com RLS habilitada, nenhum índice inválido.
- Runner experimental com diário próprio `elus_upgrade_gate.executions`: 39 recibos; replay sem duplicidade; interrupção controlada após 7 seguida de rollback induzido na oitava e retomada até 39; bloqueio de execução concorrente local. Essa evidência **não** significa reconciliação automática do ledger Supabase.
- O runner `scripts/elus_v189_lab_runner.py` é **somente laboratório**. Usa `docker exec`, nome do container isolado, allowlist do banco, pré-condições de imagem/rede e bloqueio local `flock`. NÃO alterar os guardas para apontá-lo à produção.

## Identidades imutáveis e ordem
- Conservar os 11 registros históricos **com todos os campos originais** (`version`, `name`, `statements`, `rollback`); nunca substituí-los pelos timestamps de arquivos nem reexecutar baseline completa.
- O candidato contém 38 migrations upstream, com três renomes para evitar colisões, mais `0765`, em ordem crescente **por timestamp do arquivo**. Onze migrations importadas são anteriores/iguais ao último registro histórico; **não devem ser ignoradas por causa do timestamp**.
- Manifesto oficial de 38 pares nome/blob: `tests/unit/elus-v189-import-ledger-integrity.test.ts`. Verificar o blob da `0765` separadamente. As quatro migrations ELUS previamente executadas já estão representadas pelos registros históricos: não executar novamente.
- O número lógico (`0689` etc.) não define a ordem.

## Desenho do executor de produção — NÃO IMPLEMENTADO
1. Criar **artefato separado** do executor de laboratório, com revisão adversarial, aprovação administrativa específica e identidade do banco restrita por allowlist de projeto/host/role. Não aceitar URL ou banco arbitrário.
2. Modo de inspeção read-only antes de qualquer escrita: comprovar projeto, PostgreSQL, ledger exato (11 versões e seus metadados), inventário de schema e pré-condições; verificar disponibilidade do backup/restauração e digests da versão anterior.
3. Fixar manifesto de 39 SQLs por hash (SHA-256), versão e ordem; falhar se o candidato ou o catálogo diferir. Revisar comandos incompatíveis com transação, dependências, procedimentos `SECURITY DEFINER` e efeitos de `0759` antes de ativar execução.
4. Implementar exclusão concorrente **no banco** e não somente via `flock`. Ao adquirir lock, revalidar estado e recibos **dentro da seção crítica**.
5. Para cada migration transacional, executar SQL e persistir recibo canônico no mesmo `BEGIN…COMMIT`. Se falhar, fazer rollback e parar; nunca avançar ou forjar um recibo.
6. **Compatibilidade com Supabase:** decidir e validar em banco descartável como `supabase_migrations.schema_migrations` representa as novas 39 execuções (versões, nomes, `statements`, `rollback`), incluindo timestamps inferiores às versões históricas. Não usar `supabase migration repair` nem `supabase db push` para marcar migrações como executadas sem prova. Avaliar interação com deploy/CLI futuros antes de gravar nesse ledger.
7. `resume` deve recusar prefixo incompleto, hash divergente, SQL com efeitos sem recibo ou ledger externo inesperado. Um recibo do diário privado não basta para declarar sucesso no ledger oficial.
8. Após execução, comparar contagens e catálogo, RLS, policies, ACLs, funções, índices, dados agregados sensíveis a migração, vínculo com aplicação. Em especial testar duas organizações sintéticas e negar chamadas indevidas de `anon`/`authenticated` às RPCs privilegiadas.
9. A migration `0759` remove códigos MFA legados; medir cardinalidade imediatamente antes do corte e obter decisão administrativa explícita pelo impacto potencial. Não registrar hashes, dados pessoais ou SQL sensível nos logs.
10. Falha durante corte: suspender aplicação e orientar rollback com dump **validado** e digests pré-publicação. Rollback lógico do Postgres não restaura automaticamente objetos Storage, arquivos, estado Auth externo nem efeitos de outras integrações; verificar plano completo.

## Sequência release
- PRs empilhadas: #40 → #43 → #44 → #45. #24 tem base `main` e exige reconciliação explícita para evitar aplicação duplicada.
- GitHub CI GREEN e teste local de migrations não equivalem a READY. Exigir integração coerente, checks do HEAD incorporado, imagens app/worker publicadas verificadas por digest e plano de rollback.
- No Portainer/VPS: sem build pesado; deploy com `prune:false`; validar `elus-app`, `elus-worker`, dependências, `/api/v1/health` e `version` igual ao SHA esperado. Só depois canário funcional.
- **Proibido** aplicar SQL produtivo, alterar ledger atual, fundir PRs, publicar imagens ou implantar com base apenas neste documento.

## Critério de liberação
Só marcar `PRODUCTION_READY` quando houver executor produtivo revisado e ensaiado especificamente quanto ao ledger oficial; verificações negativas de segurança; pré-voo atual sem drift; aprovação explícita para operações administrativas protegidas; CI/merge/imagens/deploy alinhados. Até lá: `NO-GO`.
