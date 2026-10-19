# Módulo opcional `integracoes_erp` — VendaERP

## Estado e evidência de origem

Port do estado funcional em `OARANHA/crm-wandora` para ELUS 1.85.0. A referência
usada foi a revisão `8fae9647123c1ce5e68b5893a05dd323bd1cfd65` do `main` antigo;
o ELUS de destino iniciou em `a2c70adedc0e5e04be1518bec99076c94ab690ed`.

O histórico do repositório antigo registra a integração oficial (#7), o envio
canônico de PDF (#36), o renderer Chromium (#37), a seleção local de notas
fiscais (#52/#53), o endurecimento de egress/tempo/tamanho (#110) e o ajuste do
renderer (#111). O proprietário confirmou recebimento de DANFEs pelo WhatsApp.
O registro recente comprova uma entrega em 2026-10-13; não comprova a entrega de
múltiplas notas na mesma conversa. Esta implementação usa o estado atual desses
serviços e não reintroduz mudanças históricas sem necessidade observada.

## Instalação e arquitetura

`integracoes_erp` é um módulo de dados opcional oficial do ELUS (ADR-0002),
selecionável pelo instalador e gerenciado em `/admin/modulos`. A migration
`20261019120000_0689_integracoes_erp_vendaerp.sql` registra a declaração LGPD e
uma provisionadora idempotente; as tabelas de ERP são criadas somente quando o
módulo é instalado. A seção correspondente também está em `supabase/baseline.sql`
para instalação nova. O módulo usa catálogo, navegação e catálogo MCP existentes;
não cria uma plataforma de conectores paralela.

`erp_connections`, `erp_admin_whatsapp_bindings` e
`erp_customer_identity_links` têm RLS habilitada e acesso direto revogado para
`anon` e `authenticated`. Rotas e tools usam service role com filtro explícito de
organização. Credenciais são cifradas no servidor; valores em claro não voltam à
UI nem à auditoria. A conexão é sempre criada com `access_mode = read`, e as
tools registradas são apenas de leitura.

O vínculo de cliente usa a identidade externa estável (`external_id`) e o
`contact_id` ELUS, com unicidade por organização/provedor e validação de contato.
Nome e rótulo são pistas de descoberta, não autoridade de identidade.

## Autorização

A configuração e o teste de conexão exigem usuário autenticado e papel
administrativo na organização ativa. A tela e as rotas respeitam o estado de
instalação do módulo. No turno ISIS, as consultas administrativas de produtos e
estoque passam pelo catálogo MCP e pelo vínculo explícito entre telefone E.164,
usuário `admin` ativo e organização. Vínculo ausente, cruzamento de organização,
membership revogada ou papel insuficiente falham fechados. Consultas são
registradas na auditoria sem credenciais, URLs privadas, telefone ou conteúdo de
nota.

O ERP permanece READ-ONLY: não há ferramentas de escrita remota, alteração de
pedido, faturamento ou estoque.

## Consultas de notas e PDFs

A busca de notas recentes continua compatível com o provider VendaERP atual:
consulta pedidos sem enviar filtro remoto `possuiNotaFiscal=true`, seleciona
localmente apenas pedidos com `numeroNFe`, e ordena pelo campo de data fiscal
comprovado no provider antes de limitar o resultado. Erro técnico ou resposta
parcial não é tratado como ausência histórica. Identidade e paginação são
preservadas entre chamadas de continuação.

Para DANFE administrativa, o runtime exige autoridade WhatsApp, turno de
produção, conversa e consulta de nota permitida. O preparo busca o documento pelo
serviço existente, valida o PDF e armazena os bytes em bucket privado. O modelo
recebe somente os dados públicos da nota; `storage_path`, URL do provider e URL
pré-assinada permanecem internos.

O runtime anexa o PDF à próxima `send_message` como documento. O envio segue o
`runBeforeSend`, validação de mídia, ledger e sender do canal do ELUS; não existe
sender ERP ou WAHA alternativo. Falha no preparo não envia arquivo nem afirma
sucesso. A auditoria usa categorias sanitizadas de resultado e não registra
conteúdo fiscal.

## Limites e validação

Esta etapa não chama a API real do VendaERP, não altera produção e não valida uma
entrega real em conversa ISIS. A validação funcional final depende do proprietário
configurar uma organização de teste, confirmar autorização e verificar uma
consulta e uma DANFE recebida. A CI da PR e essa validação do proprietário são
gates distintos.
