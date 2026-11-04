# Integrador executável ELUS × DeskcommCRM

Ferramenta: `scripts/elus-upstream-integrator.mjs`.

## O que faz

- Compara duas revisões **pinadas por SHA de 40 caracteres**, já disponíveis no Git local.
- Identifica arquivos de código com alterações upstream que podem ser aplicadas sem sobrescrever alterações ELUS.
- Coloca SQL, workflows e demais caminhos não autorizados em `protected`.
- Marca arquivos alterados pelo ELUS em `conflict_requires_review`; não os sobrescreve.
- `prepare` cria **outra worktree destacada** em um diretório absoluto novo, aplica somente patches seguros, salva `.elus-integrator/report.json` e **não** cria commit, branch, PR ou push.
- `plan` não grava arquivos e produz relatório JSON.

## Utilização

Primeiro, confira no Git local os commits oficiais e baixe-os separadamente; não use tags móveis como prova. Para o checkpoint v1.89.0, as referências upstream documentadas são:

- DeskcommCRM v1.85.0: `83aeac8f78aa076f3adfaf3e773c8616229e5cd9`
- DeskcommCRM v1.89.0: `6540929d5ef7a951531dda550db0bf54affa516a`

Com ambos os objetos Git já disponíveis localmente:

```bash
node scripts/elus-upstream-integrator.mjs plan \
  --base 83aeac8f78aa076f3adfaf3e773c8616229e5cd9 \
  --target 6540929d5ef7a951531dda550db0bf54affa516a

node scripts/elus-upstream-integrator.mjs prepare \
  --base 83aeac8f78aa076f3adfaf3e773c8616229e5cd9 \
  --target 6540929d5ef7a951531dda550db0bf54affa516a \
  --out /tmp/elus-integration-v189
```

**Importante:** `prepare` cria um checkout separado, sem commit; revise o relatório e o diff antes de criar qualquer PR. Migrations e baseline precisam seguir os validadores, auditorias de histórico e gates próprios do ELUS. Nenhum SQL é executado, nem E2E/Playwright, deploy ou publicação. Nada aqui autoriza atualizar o banco produtivo.

Este comando resolve **preparação segura de mudanças de código**; não promete port completo automático nem aceite funcional. Validação unitária offline: `pnpm exec vitest run tests/unit/elus-upstream-integrator.test.ts`.

A aplicação fica intencionalmente restrita a `app/`, `lib/`, `components/`, `workers/` e `tests/unit/`, e somente para arquivos cujo conteúdo local coincide exatamente com o upstream base.

## Runner temporário no GitHub Actions

Workflow: `.github/workflows/elus-upstream-integrator.yml`.

- Em pull requests que alterem o integrador, o job `verify` roda testes unitários e sintaxe, sem credenciais persistentes ou permissão de escrita.
- Após o workflow ser revisado e integrado à **main**, ele fica disponível em **Actions → ELUS upstream integrator - isolated GitHub runner → Run workflow**. Selecione a branch `main` e o modo `plan` (somente análise) ou `publish` (cria branch de revisão).
- O runner baixa exclusivamente as tags oficiais v1.85.0 e v1.89.0 e confere seus SHA fixados. Depois gera o plano. O modo `publish` cria uma worktree temporária, prepara apenas alterações compatíveis e publica a branch `integrator/v189-<run_id>-<tentativa>`, **sem PR, merge ou deploy**.
- O workflow só faz commit dos caminhos `app/`, `lib/`, `components/`, `workers/` e `tests/unit/`. Código com customizações ELUS permanece intocado; SQL, migrations, baseline, workflows e arquivos não permitidos ficam fora.
- O plano é armazenado como artefato por 7 dias, sem acesso a banco. Se não houver código seguro, o modo `publish` não cria branch.

**Limite operacional:** o workflow de `workflow_dispatch` não fica acionável na interface padrão antes de existir na branch default; a PR precisa ser revisada, validada e integrada à `main` por autorização específica. Nenhum run manual foi disparado por esta alteração de código.
