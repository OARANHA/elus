# Preparação de implantação ELUS 1.85.0 — Portainer Vigia

**Estado:** preparado, **não executar** antes dos gates. Autoridade de produção: stack **existente** `elus` (Portainer `https://ops-vigia.wandora.com.br`, stack ID 5, endpoint 3); **não criar** `elus360` nem substituir o Compose pela variante com Caddy.

## 1. Imagens exatas de destino

O commit de código da `main` validado no GHCR é `92d37f6ec0036162470a3f1beab013440310071b`. Consulta direta anônima de manifestos `main` e `latest`, com a mesma identidade, provou índices `linux/amd64` e `linux/arm64`; o rótulo OCI `org.opencontainers.image.revision` de **cada arquitetura** é o SHA completo acima, e `APP_VERSION` interno é `92d37f6`.

Configure **simultaneamente**, no ambiente da stack existente, as referências imutáveis:

```text
APP_IMAGE=ghcr.io/oaranha/deskcommcrm@sha256:866b59f19626822afac48c28a3aa6bd2bb2f3a0737ab8a1aa57311e63d8cec4e
WORKER_IMAGE=ghcr.io/oaranha/deskcomm-worker@sha256:514aa4eb754a7b7d74c6a0f50235d83e9a75f8b4da994bbcc4a78623d5a18773
SCHEDULER_IMAGE=ghcr.io/oaranha/deskcomm-scheduler@sha256:7328b6aef18831bc972eb0eb1e50760bc588d4550804a86d2b3e50a359540235
```

**Imagem opcional, não instalada na stack existente:** `ghcr.io/oaranha/deskcomm-voice-agent@sha256:176287cf744004199a379a7055bf278ee4fe498885fe6ef4f4e882cc5918f137`. Não criar serviço novo para ela neste deploy.

**Não** trocar as imagens individualmente nem usar as tags móveis `:main`/`:latest` em produção. Este Compose deliberadamente exige as três variáveis `APP_IMAGE`, `WORKER_IMAGE`, `SCHEDULER_IMAGE`; a stack existente configurava pelo menos as duas primeiras com imagens antigas. Ausência da terceira deve bloquear a transição, em vez de misturar versões silenciosamente.

## 2. Snapshot do rollback antes da troca

Consultado em leitura na stack existente:

- `elus-app` healthy: `ghcr.io/oaranha/elus-app@sha256:322a124b763111d24a9b08c8bae301e3807a6d9b8f00189efcb87168957386e5`
- `elus-worker` healthy: `ghcr.io/oaranha/elus-worker@sha256:6bf3430434f7291ec9acbe609f479caa6dbe71c5d3185e84ec023a499e3e5af1`
- `elus-scheduler` histórico: `ghcr.io/melgarafael/deskcomm-scheduler:1.69.0` — **reconfirmar digest concreto do container antes de avançar**.
- Restante da infraestrutura: preservar `elus-waha` e volumes de sessão/mídia, `elus-redis`, `elus-srh`, rede `vigia-edge`, serviços, URLs, certificados e proxy existente.

Registrar também cópia segura das opções atuais da stack (GitConfig, automação GitOps, Compose e **nomes** das variáveis) sem exportar credenciais em logs/PR. Valor das 37 variáveis deve permanecer no Portainer/secret store, nunca neste repositório.

## 3. Gates operacionais obrigatórios

1. `OARANHA/elus/main` deve continuar no commit candidato ou gerar **novos digests** com revisão interna exata, sem presumir tags móveis.
2. Projeto Supabase novo `tbwcgdmenrcnghogqkqi`: aplicar somente o baseline oficial do mesmo commit (`supabase/baseline.sql`) pela capability adequada, com `ON_ERROR_STOP`, verificando tabelas públicas, RLS/policies, extensões necessárias, funções e tabelas de controle; **não** usar o banco antigo por acidente. Nesta preparação foi observado `public.tables=[]` e `migrations=[]`, logo está **PENDENTE**. Nunca executar DDL sem preflight do SQL, backup/recuperação aplicáveis e checagem de compatibilidade.
3. Confirmar sem expor valores que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` configurados no Portainer passam a se referir corretamente ao novo Supabase. Validar demais variáveis exigidas pelo app/worker da versão 1.85.0.
4. Verificar digests de rollback dos **três** serviços; preservar o estado/configuração atual da stack. Confirmar que a conexão Git do Portainer ID 5 pode trocar de `OARANHA/crm-wandora` (`refs/heads/main`, `compose.portainer.yml`) para **o mesmo arquivo** no novo `OARANHA/elus`. **A opção auto-update/webhook ainda NÃO foi comprovada** — inspecionar e preservar; vínculo Git por si só não prova redeploy automático.
5. Validar este Compose e os três pins como conjunto, `prune:false`, sem build na VPS e sem mudar rede `vigia-edge`, certificados, nomes de containers ou volumes.
6. Somente com gates anteriores comprovados: atualizar **a mesma stack ID 5** pelo Portainer Vigia, sem criar outra stack; verificar `elus-app`, `elus-worker`, `elus-scheduler` healthy, dependências necessárias em execução, `/api/v1/health` e a versão efetiva (rótulo OCI com SHA completo; binários incluem `APP_VERSION=92d37f6`). Verificar login, senha, MFA, onboarding e funções críticas no canário. Caso qualquer gate falhe, restaurar conjunto anterior sem apagar volumes.
7. **GitOps futuro:** a ligação à branch permite editar o Compose via GitHub. As imagens são fixadas por digest no ambiente da stack e, portanto, editar código e publicar uma imagem nova **não a implanta automaticamente** até promover juntos os novos pins; automatizar essa promoção será uma tarefa própria, com controle de CI/rollback, não uma pressuposição.

## 4. Por que esta branch existe

O `OARANHA/elus@main` ainda não possui `compose.portainer.yml`. Este arquivo foi recuperado da stack GitOps anterior (`OARANHA/crm-wandora`) e adaptado **somente** no cabeçalho e nos três requisitos de imagem, preservando os seis serviços, os dois volumes de WAHA, redes e variáveis por referência. Não dar merge desta preparação na `main` nem alterar GitConfig da stack até o novo banco estar qualificado.

**Este runbook não contém credenciais nem representa autorização para executar o deploy.**
