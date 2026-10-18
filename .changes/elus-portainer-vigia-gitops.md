---
impacto: exige_acao
secao: adicionado
titulo: Compose GitOps para instalação ELUS no Portainer Vigia
---

A instalação ELUS mantém a mesma stack já existente no Portainer Vigia e passa a ter um `compose.portainer.yml` versionado neste repositório. Para promover as novas imagens da aplicação, worker e scheduler, o operador deve validar o banco Supabase da instalação e configurar as três referências por digest em conjunto. A promoção não altera automaticamente a stack de produção nem seus segredos; não é necessário criar outra stack ou compilar imagens na VPS.
