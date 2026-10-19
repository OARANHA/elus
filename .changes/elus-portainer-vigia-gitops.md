---
impacto: exige_acao
secao: adicionado
titulo: Compose GitOps para instalação ELUS no Portainer Vigia
---

A instalação ELUS mantém a mesma stack já existente no Portainer Vigia e passa a ter um `compose.portainer.yml` versionado neste repositório. Para promover as novas imagens da aplicação, worker e scheduler, o operador deve validar o banco Supabase da instalação e configurar as três referências por digest em conjunto. A promoção não altera automaticamente a stack de produção nem seus segredos; não é necessário criar outra stack ou compilar imagens na VPS.

## Requer atenção

Esta alteração não executa deploy. Para instalar, preserve primeiro o GitConfig, as variáveis existentes e os digests atuais dos três serviços como rollback. No Portainer **Vigia**, atualize somente a stack existente `elus` (ID 5, endpoint 3), apontando a origem Git para `OARANHA/elus` e configurando `APP_IMAGE`, `WORKER_IMAGE` e `SCHEDULER_IMAGE` com os três digests imutáveis validados e da mesma revisão.

Antes da atualização, configure em canal protegido o conjunto completo das credenciais do projeto Supabase **novo**; não reutilize as do banco antigo nem coloque segredos no Git. Execute o procedimento com `prune:false`, preserve volumes e rede, e confirme saúde, versão e login. O passo a passo e o rollback estão em `docs/runbooks/elus-v185-portainer-vigia.md`.
