Warning: truncated output (original token count: 294955)
... 131243 bytes omitted ...

# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

Se você roda o DeskcommCRM numa VPS, **leia a seção da versão para a qual está atualizando antes de rodar `bash update.sh`**. Mudanças que exigem ação manual aparecem sob **⚠️ Requer atenção**.

## [Não lançado]

## [1.86.0] — 2026-10-19

### ⚠️ Requer atenção

- **Compose GitOps para instalação ELUS no Portainer Vigia** Esta alteração não executa deploy. Para instalar, preserve primeiro o GitConfig, as variáveis existentes e os digests atuais dos três serviços como rollback. No Portainer **Vigia**, atualize somente a stack existente `elus` (ID 5, endpoint 3), apontando a origem Git para `OARANHA/elus` e configurando `APP_IMAGE`, `WORKER_IMAGE` e `SCHEDULER_IMAGE` com os três digests imutáveis validados e da mesma revisão.

  Antes da atualização, configure em canal protegido o conjunto completo das credenciais do projeto Supabase **novo**; não reutilize as do banco antigo nem coloque segredos no Git. Execute o procedimento com `prune:false`, preserve volumes e rede, e confirme saúde, versão e login. O passo a passo e o rollback estão em `docs/runbooks/elus-v185-portainer-vigia.md`.

### Adicionado

- **Embeddings Qwen3 gerenciados pela plataforma para novas bases** A instalacao pode oferecer o embedding Chutes Qwen3 de 1536 dimensoes,
  com chave guardada no servidor e ativacao opcional apenas para bases novas.
  Bases ja preparadas continuam usando a mesma familia e o mesmo modelo.
  O atendimento conversacional do Chutes ainda sera uma entrega separada.

- **Compose GitOps para instalação ELUS no Portainer Vigia** A instalação ELUS mantém a mesma stack já existente no Portainer Vigia e passa a ter um `compose.portainer.yml` versionado neste repositório. Para promover as novas imagens da aplicação, worker e scheduler, o operador deve validar o banco Supabase da instalação e configurar as três referências por digest em conjunto. A promoção não altera automaticamente a stack de produção nem seus segredos; não é necessário criar outra stack ou compilar imagens na VPS.

- **Módulo opcional VendaERP somente leitura e DANFE administrativa** A instalação pode ativar o módulo oficial `integracoes_erp`, configurar uma
  conexão VendaERP por organização autorizada, consultar dados administrativos em
  modo somente leitura e preservar o vínculo de identidade externa de clientes.
  Na conversa administrativa da ISIS, DANFEs preparadas entram no sender canônico
  do ELUS como documentos privados, sujeitos à validação de mídia, `before_send`
  e auditoria. A validação real em conversa permanece pendente do proprietário.

### Alterado

- **Leitores de tela recebem os rótulos completos dos controles do cabeçalho** Os nomes acessíveis do seletor de idioma e do menu do usuário agora incluem o
  texto visível nos respectivos botões. Não é necessária nenhuma ação do operador.

## [1.85.0] — 2026-10-17

### ⚠️ Requer atenção

- **O custo das chamadas do provedor personalizado passa a ser calculado pelo preço do catálogo** Se você usa o provedor personalizado e tem teto de gasto de IA em modo de bloqueio, confira o teto antes de atualizar: as chamadas desse provedor passam a ser contadas pelo preço real, e o gasto do mês pode cruzar o limite e pausar a IA nas conversas.

### Adicionado

- **A listagem de instalações do admin ganha atalhos de acompanhar, editar e suspender em cada linha** Cada linha da listagem de tenants em `/admin/tenants` deixa de ter só o link "Ver" e passa a ter três atalhos com rótulo que diz o nome do tenant: Acompanhar (abre a página de saúde), Editar (abre a ficha) e Suspender. Suspender acontece na própria lista, com o mesmo diálogo de confirmação da ficha, agora com o nome do tenant no título, e sem perder a posição na lista. Um tenant suspenso por decisão administrativa mostra Reativar no lugar de Suspender. Um tenant suspenso por falta de pagamento não oferece Reativar, porque essa suspensão só se desfaz pelo card Cobrança da ficha (dar prazo ou tornar isenta), e o atalho leva para lá. Um tenant anonimizado não recebe atalho nenhum, só o link para a ficha. Nenhuma mudança de banco.

  Contribuição de @webtecnica (#2779).

- **A tela de Contatos passa a exportar o que ela mesma importa, em CSV e vCard** A tela de Contatos tinha "Importar CSV" (PR #313) e nenhuma porta de volta: o CRM aceitava dados mas não os devolvia, e o caminho único era SSH + psql — o terminal que o produto existe para eliminar. Agora o header ao lado de "Importar CSV" tem "Exportar", com dois formatos. O CSV espelha exatamente as colunas que o importer reconhece (`name`, `display_name`, `email`, `phone_number`, `cpf`, `tags`), com aspas RFC 4180 e BOM para o Excel em português ler acento: exportar e reimportar devolve as mesmas pessoas com as mesmas etiquetas, porque o arquivo é lido pelo próprio parser da tela. O vCard (`.vcf`) é o que o celular importa, Android e iOS, com `FN`, `TEL` e `EMAIL` em um arquivo só para a lista inteira — o produto já sabia ler cartão (#2712, #2742), faltava escrever.

  `GET /api/v1/contacts/export?formato=csv|vcf` segue o fluxo do export de auditoria que já existia: papel antes de ler, `Content-Type` próprio e `Content-Disposition: attachment` com `contatos-YYYY-MM-DD`, paginação em blocos até 10.000 registros com o corte declarado no cabeçalho. Exporta o que a tela está mostrando — os mesmos filtros de busca, etiqueta (E/OU), origem e pessoais viajam para o mesmo handler da lista, então não existe segunda resposta para a mesma pergunta. O CPF sai em claro só para quem tem papel de gerente, decifrado pela mesma RPC que o get do contato já usa (ela audita cada chamada); sem cifra disponível a coluna sai vazia em vez de derrubar o arquivo. `audit()` registra `contacts.exported` com quem, quando, quantos registros e que filtros valiam — nunca o texto da busca, que é dado de quem foi buscado.

  Nenhuma mudança de banco.

  Contribuição de @webtecnica (refs #2759).

- **Os botões da barra da conversa agora dizem o que acontece antes do clique** Na barra de ações do cabeçalho da conversa, seis botões só diziam o gesto: "Liberar", "Transferir", "Fechar", "Reabrir", "Arquivar" e "Ver contato". Quem está começando na equipe tinha de clicar — ou perguntar para o dono da conta — para descobrir o efeito, e "o que acontece se eu clicar aqui?" era a pergunta mais comum de atendente novo.

  Agora cada um deles mostra uma guia curta ao passar o mouse, com a consequência escrita: "Liberar" diz para onde a conversa vai — de volta ao atendimento automático, ou para a fila esperando um atendente quando o automático não pode retomá-la (depois de uma escalação, com o contato travado ou sem automático no ar); "Transferir" diz que a conversa passa para outro atendente e que, havendo outro número conectado, dá para continuar o atendimento por ele; "Fechar" avisa que dá para reabrir depois; "Arquivar" avisa que a conversa vai para a aba Arquivadas e que, se ainda estiver aberta, o atendimento é encerrado junto. A guia vai em `title`, então o nome do botão na tela não muda — quem usa leitor de tela continua ouvindo o mesmo rótulo.

  Nenhum rótulo, ícone, ação ou permissão mudou, e nenhuma ação saiu da barra.

  Você não precisa fazer nada.

  Contribuição de @webtecnica, a partir da issue #3003.

- **O Jev pode responder pela OpenRouter, com a mesma chave da conversa** Quem já usa a OpenRouter para a conversa pode ligar o Jev por ela, sem abrir
  conta na TypeSafe nem cadastrar uma segunda chave. No cartão do Jev, em
  "De onde o Jev responde", escolha OpenRouter: a troca só é aceita quando a
  credencial OpenRouter da empresa já foi conferida, e fica registrada na
  auditoria. A empresa que já tinha aceitado o envio pela TypeSafe confirma o
  aceite de novo ao trocar, porque o texto aceito antes não nomeava a OpenRouter.
  Quem continua na TypeSafe direto não percebe mudança nenhuma.
  Numa instalação com `OPENROUTER_BASE_URL` própria, o Jev via OpenRouter usa
  esse mesmo endereço.

  Contribuição de @webtecnica (#2964), a partir da issue #2947 de @ZvisionAutomations.

- **Automações e follow-ups enviam imagem ou PDF com legenda** A ação "Enviar mensagem de WhatsApp" das automações e o passo de mensagem fixa dos follow-ups ganharam o campo opcional "Imagem ou PDF (opcional)". Com uma URL de imagem (jpg, png, webp, gif) ou de PDF, o texto do passo vira a legenda do arquivo. O envio é o mesmo do Inbox e das campanhas. O link precisa terminar na extensão do arquivo (.jpg, .png, .webp, .gif ou .pdf). Link sem extensão, como os do Google Drive, e outros tipos de arquivo são recusados com o motivo: na aba Atividade, nas automações, e no registro do passo, nos follow-ups. Em número oficial, fora da janela de 24 horas, a mídia não sai e o texto também não sai sozinho; o passo diz o motivo. Sem o campo preenchido, tudo funciona como antes. O envio do arquivo pela própria tela vem numa próxima versão.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2856), a partir da issue #2734 de @aerosuiteapp.

- **Marcar o negócio como perdido pelo painel da conversa** No painel lateral da conversa, o seletor "Etapa do funil" agora mostra também a etapa de perda. Ao escolhê-la, abre a mesma janela de motivo do quadro, com os motivos cadastrados no funil, e o negócio é marcado como perdido sem você sair do Inbox. Antes, a etapa de perda ficava escondida e era preciso abrir o quadro e arrastar o cartão.

  Você não precisa fazer nada.

  Contribuição de @valterhjr, a partir da issue #2871.

- **Publicar outro serviço no mesmo VPS sem editar o Caddyfile** Quem roda o CRM neste servidor e quer publicar mais um site — uma wiki, uma landing page, um n8n — precisava acrescentar um bloco no `Caddyfile`. Como o `Caddyfile` é versionado e entra no contêiner por bind mount, essa edição fazia a atualização parar em "parece haver mudanças locais que divergem", e quem atualizava pela tela nem descobria o motivo.

  Agora existe um ponto de extensão, nas DUAS variantes (normal e single-server): os dois `Caddyfile` terminam com um `import /etc/caddy/sites/*.caddy`, e os dois composes montam a pasta local `./caddy-sites/` em `/etc/caddy/sites`, somente-leitura. Basta soltar um arquivo `.caddy` na pasta, ligar o serviço extra à rede `caddy-sites` (uma rede só entre o proxy e os serviços extras) e conferir e recarregar o proxy com `caddy validate` e `caddy reload`, sem reiniciá-lo. Passo a passo em `caddy-sites/README.caddy` e no README do kit.

  A pasta está no `.gitignore`, menos o placeholder comentado: seus arquivos nunca entram em `git diff` nem atrapalham o `update.sh`, e a pasta existe no clone novo. O que já estava publicado não muda — o adaptador do Caddy devolve a MESMA configuração de antes enquanto a pasta estiver vazia (medido contra o `origin/main`).

  A atualização confere a configuração do proxy antes de recriá-lo. Se um arquivo seu em `caddy-sites/` estiver errado, o proxy antigo continua no ar, o CRM segue respondendo e a saída da atualização mostra o motivo.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2783, refs #2724).

- **Recolher o painel do contato e abrir o negócio no quadro do funil, sem sair do Inbox** O painel do contato do Inbox ganhou o botão de recolher, no alto: recolhido, ele vira um trilho estreito com o botão de expandir e a conversa recebe a largura que era da ficha, como já acontecia com o menu da esquerda. A preferência fica lembrada por navegador. Ao lado da etapa do funil, o atalho "Abrir no funil" leva ao quadro já com o negócio aberto, na etapa em que ele está, em vez de exigir sair do Inbox e procurar o card na mão.

  Contribuição de @webtecnica (#3043, refs #3004).

- **Cada número de WhatsApp pode ter o seu jeito de distribuir as conversas** Em Configurações › Atendimento, cada número ganha:
  - "Como este número distribui": cada um pega, rodízio ou por carga;
  - "Atendente de destino padrão", que recebe direto todo cliente novo daquele número (recebe mesmo fora da jornada; só espera quando estiver indisponível ou sem folga de capacidade).

  Número sem regra própria segue o que vale para a organização: nada muda para quem já usa. Se a pessoa de destino sair da equipe, o número deixa de apontar para ela e volta a distribuir pelo modo escolhido entre os responsáveis daquele número. Sem responsáveis marcados, as conversas ficam na fila. A atualização aplica a mudança de banco sozinha.

  Contribuição de @webtecnica (#2837).

- **O painel do admin avisa, em todas as telas, quando a falta de SMTP impede e-mail de sair** Numa instalação sem servidor de e-mail configurado, quem administra só descobria isso lendo o log do update — e o log é a última tela que alguém abre. Agora o painel do admin mostra, no topo de todas as telas, a tarja "Sem SMTP configurado": ela diz que convites, recuperação de senha e avisos por e-mail não saem por SMTP e leva direto à tela onde se configura, /admin/email. O aviso fica visível na rolagem, e quem já configurou o SMTP (host e remetente, na tela ou no .env) não vê nada. Sem SMTP, a tarja aparece quando falta SMTP no servidor único (ali nem a Resend supre a recuperação de senha) e, em qualquer instalação, quando não há nem SMTP nem Resend; some fora do servidor único quando a Resend entrega. A leitura acontece no layout de /admin, ao lado da leitura dos módulos ligados que já existia; nenhuma tabela, coluna ou migração foi criada. Um banco que não respondeu não vira "sem SMTP": um soluço dele não acende o aviso.

  Contribuição de @webtecnica (refs #2755).

### Alterado

- **A condição "contém" das automações ignora acento e trata pontuação como espaço** A condição `contém` das automações comparava sem diferenciar maiúsculas, mas não ignorava acento nem pontuação: uma regra escrita com "anúncio" não disparava para um lead que escreveu "anuncio", e a regra feita com o trecho da mensagem pronta do anúncio deixava de disparar quando o lead apagava uma vírgula ou um ponto de exclamação. A regra simplesmente não rodava, sem erro e sem aviso. Agora os dois lados da comparação passam pela mesma forma: minúsculas, sem acento, e a pontuação conta como espaço. "Olá", "Ola" e "olá!" são a mesma frase para a regra, e "pré-venda" casa "pre venda"; números e endereços não se juntam ("10,00" não casa "1.000"), e uma regra feita só de pontuação, como "?", continua comparando como antes. A comparação exata (`é igual a`) continua exata, e a pertinência em lista de tags continua exigindo a tag inteira.

  Atenção ao atualizar: regras com 'contém' passam a disparar também quando a mensagem ou a etiqueta difere só por acento ou pontuação ('anúncio' casa 'anuncio'; 'Olá! Vi o anúncio' casa 'ola vi o anuncio'); se você tem regra que manda WhatsApp com 'contém', confira o texto dela.

  Contribuição de @webtecnica (Refs #2973).

- **Etiquetas do negócio no funil — o mesmo editor do Inbox** No funil, os formulários do negócio ("Editar lead" e o dossiê) trocavam as etiquetas por um campo de texto livre ("vip, recompra"): cada pessoa digitava a sua variação da mesma etiqueta, o vocabulário que o Inbox tinha organizado voltava a se espalhar, e as regras de automação que leem a etiqueta deixavam de casar — disparando para quem não devia ou deixando de disparar. Agora os dois formulários usam o mesmo editor do Inbox: sugestões do vocabulário da empresa, criação da etiqueta com escolha de cor e a mesma normalização. A etiqueta gravada é a do NEGÓCIO (a que a automação lê), nunca a do contato — as duas convivem na mesma tela e são caixas diferentes. Nenhuma mudança de banco: o campo da etiqueta do negócio já existia.

  Você não precisa fazer nada.

  Contribuição de @webtecnica, a partir da issue #2979.

### Corrigido

- **O agente deixa de mandar a mesma mensagem duas vezes seguidas** Uma pergunta do cliente chegou a receber quatro respostas quase iguais do agente. Agora, antes de enviar, o agente compara a mensagem com o que já saiu na conversa depois da última fala do cliente. Se for quase a mesma, ela não sai, e a linha do tempo do negócio mostra que o agente deixou de repetir a mensagem. Mudança de número (preço, data, horário, pedido) ou de negação ("sim" virando "não") conta como informação nova e sai normalmente. Textos que você escreveu no passo do fluxo e mensagens digitadas pela equipe não passam por essa trava.

  Contribuição de @guptasp82-jpg (#2996).

- **A lista de Agentes de IA diz "agente" no título e nas mensagens de lista vazia** O título, o subtítulo e as mensagens de lista vazia da tela de Agentes de IA
  diziam "agent" em vez de "agente". Agora dizem "agente", e o botão que abre o
  cadastro passa a dizer "Criar novo". O menu de cada agente e a janela de
  renomear ainda dizem "agent".

- **No detalhe de uma captação de webhook, o rótulo longo quebra dentro da própria coluna** Em Webhooks › Entrada, ao abrir uma linha do histórico de uma fonte, cada campo aparece como rótulo e valor lado a lado. Quando o formulário de origem mandava uma chave longa e sem espaço como rótulo, ou um identificador de pergunta, o rótulo vazava da coluna e ficava por cima do valor. Agora o rótulo quebra dentro da própria coluna e continua legível inteiro.

  Contribuição de @webtecnica (refs #3014).

- **O custo das chamadas do provedor personalizado passa a ser calculado pelo preço do catálogo** O provedor personalizado serve qualquer modelo — o endereço é de quem instalou —, e o motor de custo só olhava a tabela de preços embutida no código. Um modelo que não estivesse lá, como o `openai/gpt-oss-120b` apontado para o Groq, gravava `llm_calls.cost_cents` nulo em toda chamada: a tela de Uso e orçamento somava `coalesce(cost_cents, 0)`, então essas chamadas pagas apareciam como gasto zero e não consumiam teto nenhum. Medido numa instalação: 180 chamadas de `openai/gpt-oss-120b` e 256 de `openai/gpt-oss-20b`, todas nulas, enquanto o Haiku 5.5 do mesmo turno tinha custo.

  Agora, quando a tabela embutida não conhece o id, o preço sai do catálogo da própria instalação — as tabelas `ai_models` e `ai_pricing`, as mesmas que a tela de Provedores mostra e que a tela de orçamento já usava nos outros caminhos de custo. É de lá que sai o preço do modelo que você cadastrou, sem nenhum número inventado no código: modelo que não está em nenhuma das duas continua sem custo, e agora isso deixa aviso no log uma vez por provedor e modelo, em vez de passar calado.

  O que muda no número que você vê: essas chamadas passam a entrar na tela de Uso de IA e no teto mensal de gasto. Se a sua organização tem teto configurado e usa o provedor personalizado, o gasto que aparece sobe para o real. Se a leitura do catálogo falhar (banco indisponível naquele instante), a chamada segue normalmente, o custo daquela chamada fica sem valor e o log diz que foi a leitura que falhou.

  Quem só usa os modelos de fábrica não vê mudança nenhuma: a tabela embutida continua sendo consultada primeiro, e para eles nada mais é lido do banco.

  Contribuição de @webtecnica (#3034, refs #3013).

- **Desmarcar uma conversa como exemplo para a IA tira o que o agente já tinha aprendido dela** Quando uma conversa deixava de ser exemplo para a IA, o sistema parava de usá-la nos próximos aprendizados, mas os trechos que o agente já tinha guardado dela continuavam disponíveis para ele consultar. Agora, ao desmarcar, esses trechos são apagados na hora. Os de outras conversas não mudam. Se a conversa for marcada de novo, ela volta a ser aprendida no próximo lote.

  Refs #3006.

- **Configurações › Funis mostra a chance de fechamento que você salvou, e apagá-la passa a gravar** A chance de fechamento de cada etapa era gravada, mas a leitura que a tela de Configurações › Funis usa não a devolvia. Por isso o campo aparecia vazio ao recarregar, e reabrir o funil fazia parecer que a calibração tinha se perdido. Pelo mesmo motivo, apagar uma chance já gravada não chegava a gravar nada: a tela achava que o campo já estava vazio. Agora a leitura devolve o valor, e apagar volta a etapa para "sem calibração". A leitura de etapas da API (`GET /api/v1/pipelines/{id}/stages`) também passa a trazer a chance de fechamento e o aviso na Central.

  Contribuição de @webtecnica (refs #2999).

- **As ações em lote da caixa de entrada ficam legíveis e o aviso concorda em número** Na caixa de entrada, a caixa de seleção desmarcada (a de cada conversa e a de selecionar todas) tinha uma borda quase invisível, abaixo do contraste mínimo para controles, nos temas claro e escuro. Agora ela usa a mesma borda da tela de Contatos. A contagem da barra de ações em lote também ganhou contraste no tema escuro. E o aviso que aparece depois de uma ação em lote deixou de escrever "1 conversas fechadas" ou "1 fechadas, 1 recusadas": com uma conversa ele usa o singular ("1 conversa fechada.", "1 fechada, 1 recusada."), em português e em espanhol. Nenhuma mudança de fluxo ou de banco.

  Contribuição de @webtecnica (refs #2990).

- **A ferramenta de integração que abre conversa e envia confere a mensagem antes de abrir** A ferramenta `crm_start_conversation_and_send` (MCP) abria a conversa e só depois conferia a mensagem. Uma chamada com a mensagem incompleta, como texto sem corpo, era recusada, mas deixava para trás uma conversa aberta e vazia no CRM. Agora a mensagem é conferida primeiro: a chamada inválida é recusada sem abrir conversa e sem passar pelo freio de envio do número. Chamadas válidas seguem iguais.

  Refs #2812 (achado na triagem do #2851, de @webtecnica).

- **As respostas prontas do integrador preenchem {{nome}} com o nome do perfil do WhatsApp** Quem chega pelo WhatsApp entra no CRM sem nome cadastrado, só com o nome do perfil. As respostas prontas usadas pelo integrador liam o contato sem esse nome do perfil. Por isso `{{nome}}` saía vazio e o pedido era recusado por falta do nome, mesmo com o nome aparecendo na tela. Agora o nome do perfil é lido, com a mesma régua do resto do produto: o nome cadastrado vem primeiro e o do perfil entra quando não há cadastro.

  Contribuição de @webtecnica (refs #3000).

- **Painel de revisão diz qual trava barrou a sugestão de resposta** Quando a sugestão de resposta não saía, o painel da Inbox mostrava sempre a mesma frase genérica — quem atende não sabia se a janela de 24 horas tinha fechado ou se a resposta prometia algo fora da tabela. Agora o painel nomeia a causa, com a ação certa para cada uma, traduzido. Código desconhecido continua com a frase genérica de antes.

  Contribuição de @Tong-bit-art (#2991), a partir da issue #2975.

- **O fluxo com "Repetir" que o motor não conseguiria terminar não é mais publicado** Um fluxo de follow-up com a caixa "Repetir" podia ser publicado e morrer no meio da cadência: a inscrição fechava com o motivo `max_steps` sem gravar as últimas caixas nem chegar ao fim. A publicação contava cada ciclo uma vez só — o "Repetir" dá até 20 voltas — e não somava nada do que só se alcança depois do ciclo, então uma cadência longa pendurada na saída do repetir passava batido.

  Agora a publicação multiplica as voltas que o "Repetir" permite pelo custo do trecho repetido (mais a passada em que ele decide seguir em frente) e continua somando a cadência que vem depois do ciclo. Se o total passa do teto de 80 passos do motor, ela recusa e diz o motivo e, quando são as voltas do repetir que pesam, nomeia a caixa, quantos passos custa cada volta e até quantas voltas ela permite — em vez de publicar e parar no meio.

  Poucas voltas continuam publicando: 15 voltas de uma mensagem mais uma espera cabem no orçamento; 16 não. Fluxos já publicados não mudam. Ao publicar de novo um fluxo assim, a publicação passa a recusar e dizer o porquê.

  Contribuição de @webtecnica (refs #2977).

- **Teste grátis vencido sem pagamento não espera mais a tolerância de 5 a 30 dias** A tolerância de D-5 (piso 5, teto 30, padrão 7 dias) continua valendo para quem tem pagamento em jogo: dívida de assinatura com pagamento confirmado no passado segue esperando a compensação do boleto ou do Pix antes de suspender.

  O teste grátis que acabou sem nenhuma cobrança em aberto passa a receber o aviso final no próprio fim do teste e a ser suspenso 48 horas depois, com a data na mensagem — quem nunca pagou nada não tem boleto pendente de compensação. A mensagem desses avisos agora fala em assinar, e não em esperar um pagamento.

  Quem assinou durante o teste e ainda tem a primeira cobrança em aberto no provedor (no Asaas, o primeiro boleto vence no próprio fim do teste) continua com a tolerância: ali há pagamento em compensação. A empresa que aguarda a entrada paga de um plano sem dias de teste também não recebe a frase de teste grátis. O aviso final continua tendo que ser dado, e as 48 horas depois dele seguem valendo para os dois casos.

  Na atualização, a empresa cujo teste já acabou sem cobrança nenhuma e que ainda estava dentro da tolerância recebe o aviso final na primeira rodada da régua e é suspensa 48 horas depois.

  Contribuição de @webtecnica (#2774, refs #2753).

- **A visibilidade de cada conversa vale também na atribuição e no registro de eventos** Assumir ou transferir uma conversa que o atendente não enxerga agora responde como uma conversa que não existe. No registro interno de eventos, o evento ligado a uma conversa passa a seguir a mesma regra de quem pode ver a conversa (o modo de visibilidade em Configurações › Atendimento); a conversa do evento é resolvida pelo entity_id (conversation/conversation_note), por payload.conversation_id, ou pelo ref_id do aviso da Central. Quem só lê (viewer), gestores, administradores e o administrador da plataforma continuam vendo todos. Para o atendente, um valor sem forma de identificador de conversa não restringe nada (o evento segue o pertencimento à organização, como antes), e um identificador que não aponta para uma conversa da organização fica oculto. A atualização aplica a mudança de banco sozinha; nada a fazer.

## [1.84.0] — 2026-10-16

### ⚠️ Requer atenção

- **Com a cobrança ligada e planos oferecidos, defina um plano padrão — sem ele o cadastro pelo Google some e o cadastro sem plano é recusado** Vale para quem tem a cobrança ligada, oferece planos aos clientes e não tem nenhum marcado como **Plano do cadastro** (o padrão). Depois da atualização, nessa situação:

  - o "Entrar com Google" some da tela de cadastro;
  - o cadastro sem plano escolhido é recusado. Quem entra pela primeira vez com o Google pela tela de login, ou se cadastrou antes da atualização, escolhe o plano na tela seguinte ("Configure sua organização");
  - a integração que cria empresas por `POST /api/v1/tenants/provision` recebe `409 plano_obrigatorio`.

  Com um padrão de 0 dias de teste grátis, a empresa criada pela integração também nasce suspensa até o primeiro pagamento.

  Para evitar, escolha o plano padrão em Painel › Cobrança › Planos, no botão **Usar no cadastro** (o plano marcado passa a mostrar "Plano do cadastro"); a aba Planos avisa enquanto falta. Com o padrão definido, o Google volta, a integração volta a criar empresas e a empresa que entra sem escolher nasce no padrão.

  Contribuição de @omayklourenco (#2846).

### Adicionado

- **A tela de Contatos aceita seleção múltipla e executa ações em lote por uma rota só** Adicionar ou remover etiqueta, mudar o responsável (carteira) e preencher um campo personalizado eram gestos de um contato por vez. Agora a tabela de contatos tem caixa de seleção em cada linha e uma barra de ações que só aparece quando há algo marcado. As três ações saem por UMA rota, `POST /api/v1/contacts/bulk`, que recebe `ids[]` e a ação escolhida. O lote não tem permissão própria, organização própria nem auditoria própria: cada id é encaminhado ao MESMO caminho do contato individual — etiqueta e campo pelo PATCH da ficha, responsável pela porta única da carteira (`fn_definir_carteira_do_cliente`) —, mesma organização lida da sessão (nunca do corpo da requisição) e uma entrada de auditoria por contato. Aceita até 100 contatos por chamada (`bulk_too_large`, 422, com o teto na mensagem); acima disso a chamada recusa inteira antes de qualquer escrita. A resposta traz o resultado de cada item — feito, recusado e o porquê —, e uma recusa não derruba as demais: contato de outra organização ou inexistente é recusado NO ITEM, com o `not_found` do próprio caminho individual, e as outras seguem. Quem só lê não vê a barra. "Mover cards de etapa" e "marcar sempre humano" ficaram fora desta fatia por medição: a primeira é endereçada por negócio (`/leads/[id]/move`), não por contato, e a segunda só é gravada pelo motor de atendimento — não existe porta individual. Nenhuma mudança de banco.

  Contribuição de @webtecnica (refs #2484).

- **A lista de instalações do admin pode ser baixada em CSV, sem levar o que a anonimização apagou** Quem opera a plataforma não tinha como tirar o inventário das instalações que administra — faturamento, atendimento, revenda, e o pedido do titular que pergunta "quais instâncias minhas existem e desde quando". A lista já existia na tela; não saía daqui. Agora `GET /api/v1/admin/tenants/export` devolve as mesmas 11 colunas da listagem em CSV, com o mesmo guard `requirePlatformAdmin`, o mesmo `querySchema` e o MESMO leitor de dados (`app/api/v1/admin/tenants/_lista.ts`, de onde a rota de listagem também passou a ler): `?q=` e `?status=` viajam inteiros, e o arquivo devolve exatamente os `id`s que a tela devolveria com a mesma query. Envelope igual ao export de auditoria — BOM UTF-8, escape RFC 4180 e `Content-Disposition` datado.

  O centro da issue é o corte: um tenant `status=redacted` sai sem `display_name`, `legal_name` nem `cnpj` originais. O worker de LGPD que anonimiza uma organização só vira o `status` — a tabela guarda os valores de antes —, então a regra mora em `_csv.ts` e vem de `lib/lgpd/cascata.ts`: o texto de identidade sai como `NOTA_REDIGIDA`, o que a anonimização já redigiu passa intacto (a regra é idempotente, como a cascata) e `cnpj` sai vazio, porque documento não tem forma redigida. `id` e `slug` ficam: sem eles o arquivo não é inventário nenhum.

  Sai até 10.000 linhas (o teto do export de auditoria); passou disso, o corte acontece e o header `X-Export-Truncado: true` diz. Grava `platform.tenants_exported` na auditoria com total, se cortou e quais filtros valiam — nunca o texto da busca. `?formato` desconhecido é 422. Nenhuma mudança de banco.

  Contribuição de @webtecnica (#2777).

- **O agente de IA passa a saber de qual anúncio o contato veio** Quem clica num anúncio de "Click-to-WhatsApp" costuma mandar só o texto-padrão do botão ("Quais são as datas de saída disponíveis?"), e o agente respondia como a um cliente qualquer, perguntando o que o anúncio já dizia. Agora, no primeiro atendimento, o agente recebe o título e o texto do anúncio que o contato clicou (quando a atribuição foi gravada no contato, nos últimos 14 dias) e responde já nesse contexto. O anúncio serve só para identificar a campanha: datas, horários e preços continuam vindo da memória da empresa, e o agente é instruído a não resumi-los por conta própria. Contato que não veio de anúncio não muda nada, e não gasta token. Você não precisa fazer nada.

  Contribuição de @wellpelomundo.

- **O Inbox ganha o filtro por atendente, para gerentes e administradores** Quem gerencia a equipe agora escolhe, ao lado do filtro de etiquetas no Inbox, o atendente cujas conversas quer ver; as demais abas mostram a contagem só dele (Minhas segue contando as suas). O seletor aparece apenas para gerente ou acima e some na aba Minhas, que já é só do próprio usuário. O atendente comum continua vendo apenas o que a visibilidade da organização permite. Você não precisa fazer nada.

  Contribuição de @wellpelomundo.

- **Levar o negócio para outro funil sem sair da conversa** No painel lateral da conversa, o negócio ativo de "Leads recentes" ganha a ação "Levar para outro funil", ao lado de "Etapa do funil". Antes, mudar de funil exigia sair da conversa, abrir o quadro, achar o card e usar a ação lá. Agora o operador escolhe o funil de destino ali mesmo, no diálogo que já existe no quadro, e a lista traz só funis de destino válidos — o funil atual fica de fora. A ação respeita a mesma permissão de mover cartão: quem não pode mover não vê a ação. Ao confirmar, o sistema cria o negócio no funil de destino na primeira etapa aberta e encerra o de origem com o motivo canônico; o painel recarrega, passa a mostrar o negócio NOVO como o ativo e a origem aparece encerrada. O erro da transferência sai como aviso, com o mesmo texto do quadro.

  Contribuição de @webtecnica (refs #2874).

- **APIs de roteadores de IA agora aceitam tokens de integração** As APIs de roteadores de IA agora aceitam, além da sessão da tela, tokens `dsk_`.
  Listar, ler, criar, alterar, apagar, trocar os membros e testar um roteador por
  token exige um token NOVO, criado em Configurações › API Tokens com a permissão
  de ler (`config:read`) ou de configurar (`config:write`) a IA e com "Tratar o
  token como administrador" — a mesma regra que já vale para configurar o agente
  de IA. Os tokens que já existem não mudam e não ganham acesso aos roteadores.
  Pela tela, os papéis exigidos continuam os mesmos.

  Contribuição de @vanksestevao (#2824).

- **Responder no WhatsApp (conexão por QR) marca a conversa como lida — o cliente vê o visto azul** Quando uma resposta sai pela conexão por QR (agente, atendente, campanha, follow-up ou aviso de escalação), o CRM agora marca a conversa como lida logo depois do envio, e a mensagem que o cliente mandou ganha o visto azul no celular dele. Antes, a resposta chegava e a mensagem do cliente ficava só como entregue, o que soava como "me respondeu sem ler". Se marcar como lida falhar, a resposta já saiu e não é afetada; a falha fica registrada no log. Ainda não há opção para desligar o visto por conexão (vem numa próxima versão), e a conexão pela API oficial da Meta não muda. Nada a fazer na atualização.

  Contribuição de @webtecnica (#2987), a partir da issue #2981 de @ZvisionAutomations.

- **Fonte de webhook pode atualizar o card quando a integração reenvia o mesmo cadastro com dado novo** Em Webhooks, cada fonte ganhou a opção "Atualizar o card quando o envio repete o mesmo cadastro". Com ela ligada, um envio com o mesmo `external_id` de um card já criado por essa fonte atualiza o card em vez de ser ignorado: os campos novos entram, o nome do card acompanha o nome enviado (no Respondi, só os campos), e o campo reservado `stage` move o card para a etapa pedida. Em "Leads recebidos", esse envio aparece como "Card atualizado". A opção nasce desligada e só liga em fonte com segredo de assinatura configurado. Ela não alcança card criado por outra fonte, card sem origem registrada nem card de contato anonimizado. Com a opção desligada, nada muda: o envio repetido continua sendo reenvio. Nada a fazer na atualização.

  Contribuição de @webtecnica (#2811), a partir da issue #2316 de @aleflores35.

### Alterado

- **Com a cobrança ligada e planos oferecidos, defina um plano padrão — sem ele o cadastro pelo Google some e o cadastro sem plano é recusado** Com a cobrança dos seus clientes ligada, toda empresa nova passa a nascer com plano. Na tela de cadastro, quem cria a conta escolhe um dos planos oferecidos (a lista já vem marcada no plano padrão); quem entra sem escolher — pelo Google ou pela integração — fica no plano padrão. Um plano com 0 dias de teste grátis cobra a entrada: a empresa nasce suspensa e o acesso abre quando o provedor confirma o primeiro pagamento (minutos no Pix e no cartão, até um dia útil no boleto). O prazo de tolerância da renovação não abre esse primeiro acesso.

  Se você não tem plano nenhum oferecido aos clientes nem marcado como plano do cadastro, nada muda: a empresa nova nasce isenta e o "Entrar com Google" continua no cadastro.

  Mudou também a troca de plano. A empresa que sobe de plano no meio do período pago recebe a cobrança da diferença proporcional aos dias que faltam. O plano novo e os limites dele só valem depois desse pagamento, e a data da renovação continua a mesma. Essa cobrança vale até o fim do período: não paga até lá, ela é cancelada; diferença abaixo de R$ 5,00 não é cobrada, e a troca fica para a renovação. Escolher outro plano enquanto a diferença espera pagamento cancela a cobrança; assinar de novo depois de cancelar a assinatura também a cancela, antes de abrir o pagamento do plano. Quem desce de plano continua no plano atual até a renovação, e a próxima fatura já sai com o preço novo, sem crédito proporcional. A troca que você faz pelo painel da empresa continua agendada para a renovação, sem cobrar diferença. A tela de cobrança compara preço, pessoas, números conectados e uso de IA antes da troca.

  O e-mail que fica gravado no provedor de pagamento quando a empresa clica em Assinar passa a ser o do administrador dela, como já era no link que você gera pelo painel — nunca o seu, mesmo quando você entra como administrador provisório da empresa que criou.

### Corrigido

- **Sincronização da agenda do Google conclui páginas grandes sem lotar o cache** A sincronização da agenda do Google agora retoma páginas pendentes a cada minuto,
  aplica cada página em lote e mantém no cache somente eventos dentro da janela de
  cobertura. Isso evita que séries recorrentes com ocorrências distantes atrasem a
  leitura dos próximos dias e permite que esses eventos bloqueiem horários no CRM.
  O aviso de cobertura considera apenas os horários futuros do período visível,
  sem alertar por dias passados que a sincronização não precisa cobrir.

- **Um agente pausado não cala mais o número quando há outro agente no ar nele** Com mais de um agente publicado no mesmo número, o atendimento escolhia o de maior prioridade sem olhar se ele estava pausado. Se o escolhido estivesse pausado, a mensagem do cliente ficava sem resposta, mesmo havendo outro agente ativo publicado no mesmo número. O contorno era mexer na prioridade à mão.

  Agora quem está no ar vem sempre antes de qualquer agente pausado, e a prioridade só desempata entre agentes no mesmo estado. Quando todos os agentes do número estão pausados, o número continua sem resposta automática, como antes. Nada muda na configuração.

- **Em Portugal, o alarme de prazo ao encarregado avisa quando o mês legal venceu** O alarme de SLA enviado ao encarregado de uma organização de Portugal passa a ser marcado com o idioma do país (`pt-PT`). O texto do e-mail continua o mesmo. Passado um mês de calendário desde o pedido (art. 12.º, n.º 3 do RGPD), o rodapé deixa de dizer que o prazo interno é mais curto que o legal e passa a afirmar que o prazo venceu. Ao trocar o país em Configurações › Organização, a tela sugere o fuso horário do país (Portugal: Lisboa), e ele pode ser trocado. A sugestão só acontece na troca: uma organização que já estava em Portugal fica com o fuso gravado. Se ele ainda for o de São Paulo, troque em "Fuso horário", na mesma tela. No Brasil, o alarme continua igual.

  Contribuição de @webtecnica (#2836).

- **Mensagem de automação com {{nome}} passa a usar o nome do perfil do WhatsApp quando o contato não tem nome cadastrado** Quem escreve pelo WhatsApp entra no CRM com o nome do perfil (o que aparece na tela do contato) e sem nome cadastrado. As automações só liam o nome cadastrado, então uma regra como "Olá {{nome}}, ..." disparada por **Novo lead** saía "Olá , ..." justamente no primeiro contato — o caso mais comum.

  Agora `{{nome}}` e `{{primeiro_nome}}` seguem a mesma regra de nome da tela do contato: primeiro o nome cadastrado, depois o do perfil do WhatsApp, nunca um identificador técnico. Contato sem nome nenhum continua saindo com a variável vazia, como antes. Nada muda na configuração.

- **Conversa arquivada não vira pendência no Radar depois da atualização** A atualização deixa de criar uma demanda aberta a partir de conversa arquivada que nunca teve demanda. Antes, essa conversa aparecia na lista de pendências do Radar depois de atualizar, embora arquivar seja operação normal do atendimento. Conversas, mensagens e demandas que já existiam ficam como estão, e uma mensagem nova numa conversa arquivada continua reabrindo o atendimento normalmente. Pendências desse tipo criadas por atualizações anteriores não são removidas por esta versão.

  Contribuição de @webtecnica (#2825), a partir do relato de @vagnerrm122 (#2822).

- **Os CSVs de auditoria e de empresas abrem como texto em qualquer planilha** O CSV de empresas (Administração) já punha uma aspa simples na frente da célula que começa com `=`, `+`, `-`, `@`, TAB ou CR. É isso que faz a planilha mostrar o conteúdo como texto, e não como fórmula. A regra agora vale também para cada trecho que começa depois de `;`, `,` ou de uma quebra de linha, porque é por esses caracteres que planilhas como o Excel em português dividem as colunas. O CSV de auditoria, que não tinha regra nenhuma, passa a usar a mesma. Número puro continua sem aspa, como o telefone com `+55` e os números dentro do JSON da coluna `metadata`. Nada muda na tela nem no banco.

- **Mensagem que chega junto da passagem para humano não derruba mais a trava do contato** Quando uma mensagem chegava no mesmo instante em que o contato era passado para humano (ou pedia para sair da lista), o banco podia derrubar uma das duas operações por travamento mútuo — e, se a derrubada fosse a passagem para humano, a trava não era gravada e o agente podia seguir respondendo. Agora as duas seguem a mesma ordem: uma espera a outra e as duas terminam. A atualização aplica a mudança de banco sozinha.

  Contribuição de @webtecnica (#2969), a partir da issue #2884.

- **A aba Atividade mostra o motivo da falha de uma ação de automação em vez de "[object Object]"** Quando uma ação de automação falhava com um erro do banco, a aba Atividade mostrava "[object Object]" em vez do motivo: o erro do banco não chega como `Error`, e a ação gravava a conversão literal do objeto. Agora a ação grava a mensagem e o código do erro, nas ações de enviar WhatsApp, enviar mensagem por IA, decidir por IA, criar ou mover lead e chamar webhook. A mensagem sai inteira; a ação não corta mais as instruções dos erros de configuração da IA. Um erro sem mensagem mostra só os nomes dos seus campos, nunca os valores.

  Contribuição de @webtecnica (closes #2980).

- **A lista do inbox carrega numa busca só — a Fila não pedia a mesma lista duas vezes** Ao abrir o inbox, a aba Fila pedia a mesma lista duas vezes e jogava a primeira resposta fora. Quando a resposta sobre o atendimento automático chegava depois da lista, a Fila aparecia primeiro sem as conversas que esperavam o robô, e elas só entravam cerca de um segundo depois. Agora a Fila só consulta depois de saber esse fato — sai UMA requisição, com o filtro definitivo — e as outras abas continuam consultando na hora, como antes. A espera aparece como esqueleto de carregamento, nunca como caixa de entrada vazia.

  Você não precisa fazer nada.

  Contribuição de @webtecnica, a partir do PR #2365 de @melgarafael.

- **Negócio em que o vendedor responde não aparece mais como frio no radar de risco** Responder o cliente pelo Inbox ou pelo celular conectado não contava como atividade do negócio. Por isso, um negócio trabalhado todo dia aparecia como parado no radar de risco. Agora a mensagem do vendedor atualiza a última atividade do negócio aberto mais recente do contato. Mensagens da IA, de automação, reações, avisos do sistema e as mensagens do próprio cliente continuam fora da conta. Quando o contato tem dois negócios abertos empatados, nenhum é atualizado, para não escolher o card errado. A atualização aplica a mudança de banco sozinha.

  Contribuição de @webtecnica (#2958), a partir da issue #2953 de @hudson-souza-mkt.

- **A conversa selecionada fica legível no tema escuro** No tema escuro, a conversa selecionada na lista do Inbox ficava com o fundo
  quase branco, e o nome do contato, em letra clara, sumia. O destaque da
  selecionada agora acompanha o tema, e a prévia da última mensagem também
  fica legível nela, inclusive quando a conversa está marcada para ação em
  lote. Crédito: @jmpo.

- **Sem SMTP, o painel de atualização avisa quem administra, em vez de deixar a descoberta para quem reclama** Numa instalação de servidor único sem SMTP configurado, o único lugar que dizia isso era o log do `update.sh`: o painel de atualização (Configurações → Atualização do sistema) exibia o log e mais nada, e quem administrava a VPS só descobria o problema quando alguém reclamava de não receber a recuperação de senha. O painel passa a mostrar o aviso "Sem SMTP configurado" no topo, em todos os estados da tela — o que não sai e onde se configura (em /admin/email). O aviso lê o SMTP pelo caminho de leitura que já existe (o mesmo que a tela /admin/email usa) e com a régua do "esqueci a senha": host E remetente, banco que respondeu, e só no servidor único. Fora dele o login tem e-mail próprio, e a tela fica calada; com SMTP configurado nada muda e nenhum aviso aparece.

  A tela final do instalador (`install-single-server.sh`) para de mandar rodar o `update.sh` sem motivo: passa a dizer que é ele que leva o SMTP do CRM ao serviço de login — a mesma correção que a saída do `update.sh` recebeu.

  Contribuição de @webtecnica, a partir da issue #2755.

- **Clicar numa etiqueta sugerida abre a escolha de cor antes de gravar** No Inbox, nos editores de etiquetas do contato e da conversa, clicar numa sugestão gravava a etiqueta na hora e sem cor, sem mostrar a paleta. Agora, para quem pode pintar etiquetas (gerente ou acima), o clique abre uma caixa com a prévia e os oito tons, e o tom que a sugestão já tem no vocabulário vem marcado. A etiqueta só é gravada em "Adicionar tag", e "Cancelar" não grava nada. Para o atendente o clique continua gravando direto, como antes, porque a rota que define a cor recusaria o pedido dele. Nenhuma mudança de banco.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2798), a partir da issue #2789.

- **O limite de passos do follow-up conta só o que o cliente sente, e a publicação recusa a cadência linear que o motor não conseguiria terminar** O limite de 30 passos de um fluxo de follow-up contava toda caixa do desenho. Por isso uma cadência de 7 toques com uma tag em cada toque era recusada na publicação, embora o cliente recebesse só 7 mensagens. Agora o limite conta o que chega ao cliente: mensagem, pergunta, skill, espera e as esperas por resposta (classificar e casar resposta). Gatilho, condição, repetir, tag, mover, tarefa interna e fim deixam de contar. A cadência de 7 toques com tag por toque passa a publicar.

  O motor tem um limite próprio: ele desiste da inscrição depois de 80 passos. Para o limite novo não deixar publicar um fluxo que morreria no meio, a publicação passa a somar quanto custa no motor a cadência linear a partir do gatilho. Se passa de 80, ela recusa e diz o motivo, em vez de publicar e parar no meio da cadência. O trecho que fica dentro de um ciclo, ou depois dele, ainda não entra nessa soma. Fluxos já publicados não mudam.

  Se a sua integração lê `details.errors[].code` no 422 de `POST /api/v1/ai/followup-flows/{id}/publish`, ela vai passar a ver também `max_engine_steps_exceeded`.

  Contribuição de @webtecnica (closes #2896).

- **Um atendente não assume nem transfere conversa que não pode ver** Assumir ou transferir uma conversa passa a respeitar o mesmo escopo que define quem a enxerga (o modo de visibilidade em Configurações › Atendimento). Um atendente só assume ou repassa conversa que já aparece para ele. Gestores e administradores seguem com visão de toda a operação, e o modo "todos veem tudo" continua valendo onde estiver ligado. Na transferência, a tela mostra uma recusa clara em vez de erro interno. A atualização aplica a mudança de banco sozinha.

  Contribuição de @andersontomazi-ctrl (#2865).

## [1.83.0] — 2026-10-16

### ⚠️ Requer atenção

- **A agenda e as tarefas respeitam a visibilidade da empresa junto com a opção da agenda dos colegas** Confira Configurações › Agenda antes de avisar a equipe. Numa empresa com a opção "Atendentes podem mexer na agenda dos colegas" DESLIGADA, o atendente deixa de ver, marcar, alterar e cancelar compromisso na agenda de um colega, e deixa de ver, editar e excluir a tarefa que o colega escreveu e atribuiu a si. Se a sua operação depende de um atendente trabalhar a agenda de um colega, ligue essa opção de volta (ela é o padrão de fábrica) ou passe a visibilidade da empresa para "Todos veem tudo". Numa empresa com a opção LIGADA nada mudou: a agenda e as tarefas seguem da equipe para o atendente, como sempre.

### Adicionado

- **A Inbox aceita seleção múltipla e executa ações em lote por uma rota só** Fechar, arquivar, transferir, marcar como lida e pausar ou devolver o automático eram ações de uma conversa por vez — e o relato da issue #2484 é o custo disso: fechar e abrir toda hora estava complicando. Agora a lista de conversas tem caixa de seleção em cada linha e uma barra de ações que só aparece quando há algo marcado. Todas as ações saem por UMA rota, `POST /api/v1/conversations/bulk`, que recebe `ids[]` e a ação escolhida. O lote não tem permissão própria, organização própria nem auditoria própria: cada id é encaminhado ao MESMO handler da conversa individual — mesma função de permissão, mesma organização lida da sessão (nunca do corpo da requisição) e a mesma auditoria que cada ação já faz individualmente (marcar como lida não audita, nem antes nem agora), com o `request_id` de cada item no relatório. Aceita até 100 conversas por chamada (`bulk_too_large`, 422, com o teto na mensagem); acima disso a chamada recusa inteira antes de qualquer escrita. A resposta traz o resultado de cada item — feito, recusado e o porquê —, e uma recusa não derruba as demais: conversa de outra organização ou inexistente é recusada NO ITEM, com o `not_found` do próprio handler, e as outras seguem. Um `viewer` recebe 403 pela chamada, sem subchamada nenhuma. A barra não aparece para quem só lê, e a caixa de marcar não abre a conversa — marcar e abrir são gestos separados. Nenhuma mudança de banco.

  Contribuição de @webtecnica (refs #2484).

- **A automação Iniciar fluxo de mensagem também inicia fluxo de atendimento** A ação "Iniciar fluxo de mensagem" das automações ganhou o campo "Tipo de fluxo". Em "Follow-up", que é o padrão, as regras já salvas continuam inscrevendo no mesmo fluxo; a única diferença é que contato que pediu para não receber mensagens deixa de ser inscrito. Em "Atendimento", ela começa um roteiro de atendimento publicado pela mesma entrada da palavra-gatilho e do roteador. Nenhuma mensagem sai na hora: a primeira pergunta do roteiro vai no próximo turno do contato, com as mesmas guardas do atendimento normal. A opção só aparece quando o módulo Fluxos de atendimento está ligado na instalação; com ele desligado, a regra pula e a aba Atividade diz o motivo. Contato que pediu para não receber mensagens não é inscrito em fluxo nenhum, de follow-up ou de atendimento, e a aba Atividade diz o motivo.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2710), a partir da issue #2647.

- **A ficha do contato mostra o vendedor dono do cliente, e o chat avisa quando o cliente é de outro vendedor** A ficha do contato ganhou o cartão Carteira, na aba Visão geral: ele diz quem é o vendedor dono daquele cliente, e quando esse vínculo deixou de contar (a pessoa saiu da equipe ou só tem acesso de leitura) o cartão avisa. Gerente e administrador trocam o dono ali mesmo; atendente vê o dono sem poder mudar. No chat, quando o dono do cliente não é quem está cuidando da conversa, uma faixa em cima da conversa avisa de quem é a carteira. Nenhuma configuração nova e nenhum passo manual: depois de atualizar, o cartão e a faixa já aparecem.

  Contribuição de @webtecnica (#2849), a partir da issue #2591.

- **O agente de IA pode usar o servidor de ferramentas externo também durante o atendimento, com a identidade do cliente enviada pelo sistema** Na tela do agente, quem é admin encontra a opção "Usar o servidor de ferramentas externo durante o atendimento". Ligada, o servidor MCP externo registrado pela organização (um ERP, por exemplo) passa a valer também nas conversas com clientes, e cada pedido a ele leva três cabeçalhos montados pelo sistema a partir do cadastro: `X-Deskcomm-Contato-Id`, `X-Deskcomm-Contato-Telefone` e `X-Deskcomm-Canal`. O servidor externo deve filtrar os dados por esses cabeçalhos e ignorar qualquer identificador que venha da conversa. Cada chamada feita em atendimento fica registrada com o contato da conversa.

  A opção vem desligada em todo agente: sem ligá-la, nada muda. Detalhes em `docs/features/servidor-mcp-externo.md`.

  Issue #2147, a partir da proposta de @brunno-soaress.

- **Resposta rápida pode levar a imagem que o próprio operador carrega** Quem atende no manual às vezes precisa explicar alguma coisa e mostrar uma imagem junto: a foto de um produto, um comparativo, uma tabela de condições comerciais, um folheto. Materiais assim nem sempre são produtos cadastrados no catálogo, e o processo era sempre o mesmo — inserir a resposta rápida, procurar a imagem em outro lugar, anexar e mandar outra mensagem. Duas mensagens no lugar de uma, com o risco de esquecer o anexo e de separar o texto da imagem na conversa.

  Agora a Resposta rápida aceita de zero a cinco imagens carregadas por quem cria ou edita o template, com prévia e a possibilidade de remover antes de salvar. As imagens ficam no mesmo armazenamento privado das mensagens, ligadas ao template, e não dependem do catálogo de produtos.

  Ao escolher a resposta rápida na conversa, o texto e as imagens entram juntos no compositor: o texto vira a legenda da primeira imagem, o operador vê e edita tudo antes de enviar, e o envio continua passando pelo mesmo caminho de mídia de sempre — canal, janela de 24 horas, opt-out, limite e retry continuam valendo como estavam. Resposta rápida só com texto continua funcionando sem nenhuma mudança de comportamento, e excluir o template também apaga as imagens dele.

  Você não precisa fazer nada. Modelos já cadastrados continuam como estão; a coluna nova nasce vazia, e a imagem é uma escolha opcional em cada Resposta rápida.

  Contribuição de @webtecnica (#2704).

- **A tela de cadastro do servidor MCP externo, no painel da empresa** O endereço e a chave do servidor MCP externo já podiam ser gravados pelo sistema, mas não havia tela nenhuma para isso: quem administrava só conseguia registrar o servidor por fora da interface do produto. Agora existe, em Configurações › Servidor MCP externo, a tela do dono da instalação para cadastrar o endereço e a chave do sistema de fora que a IA da empresa consulta, testar a conexão para ver o que o servidor oferece, e remover o registro quando ele deixa de ser usado. O cadastro passa pelo mesmo guard anti-SSRF dos webhooks: endereço de rede interna, localhost e endereço com segredo colado são recusados na hora de salvar, com o motivo escrito na tela. A chave é gravada cifrada e aparece uma única vez, logo após salvar, e só os quatro últimos caracteres. Crédito: @webtecnica (#2966).

### Alterado

- **A agenda e as tarefas respeitam a visibilidade da empresa junto com a opção da agenda dos colegas** Numa empresa configurada para o atendente ver só o que é dele, a agenda e as tarefas eram as duas telas que escapavam. O atendente via os compromissos e as tarefas de toda a equipe, inclusive as do administrador, e conseguia editar e excluir o que não era dele. As conversas e os negócios do funil já respeitavam essa escolha desde as versões anteriores; agora a agenda e as tarefas respeitam a MESMA escolha, na leitura e na escrita, e nas quatro portas: a grade da agenda, o quadro de tarefas e as rotas que escrevem nas duas.

  Quem decide quando o recorte entra é a opção "Atendentes podem mexer na agenda dos colegas", que já existe em Configurações › Agenda e nasce LIGADA. Com ela ligada — ou numa empresa que nunca mexeu nela — nada muda: o atendente continua vendo e mexendo na agenda e nas tarefas da equipe, que é o que a opção promete; o banco passa a fazer exatamente o que a rota da agenda já fazia, porque ela sempre leu essa opção antes de recusar o compromisso do colega. Com ela DESLIGADA, a escolha "Só os seus" ou "Os seus, mais os que ainda não têm dono" aperta de verdade, e a tela de Configurações › Atendimento, chamada "O que cada atendente enxerga", deixa de ter exceção: o atendente vê e mexe apenas na própria agenda e nas próprias tarefas, mais o que ele mesmo criou. O que ainda não tem dono continua à vista de todos os atendentes no modo "Os seus, mais os que ainda não têm dono", que é o padrão. Numa empresa em "Todos veem tudo", nada muda em nenhuma das duas posições da opção.

  Gerente e administrador continuam vendo e editando a operação inteira, e o perfil de leitura continua lendo as duas telas. As automações, o motor de follow-up e as rotinas internas gravam pelo servidor e não mudam de comportamento. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica, a partir da issue #2902.

### Corrigido

- **Preparar extensão e parear conexão não consultam mais o servidor com a aba escondida** Enquanto uma extensão está em preparo, a tela de Extensões relia a lista inteira a cada 3 segundos. Enquanto uma conexão está sendo pareada, o diálogo de pareamento consultava o status da sessão no mesmo ritmo. As duas consultas seguiam com a aba do navegador escondida, quando ninguém está olhando. Agora as duas pulam o ciclo de 3 segundos enquanto a aba está oculta e voltam a consultar no ciclo seguinte, em até 3 segundos, quando a aba fica visível de novo. Com a aba visível, nada muda. A renovação da imagem do QR Code, a cada 15 segundos, não ganhou essa pausa.

  Contribuição de @webtecnica (#2906), continuando o #2821 de @Tong-bit-art.

- **Entregue e lido das campanhas pela API oficial voltam a chegar ao destinatário** Campanha enviada por um número da API oficial ficava com os destinatários em
  "enviada" para sempre: as taxas de entrega e de leitura seguiam zeradas mesmo
  depois de a mensagem ser entregue e lida no celular do contato, porque o banco
  só levava o ack da mensagem ao destinatário quando o status da mensagem mudava —
  e na API oficial ele não muda (a entrega e a leitura vão para os carimbos).
  Agora o entregue e o lido da API oficial alcançam o destinatário e as taxas da
  campanha acompanham, igual ao canal não oficial. A atualização aplica a mudança
  de banco sozinha.

  Contribuição de @webtecnica (#2946), a partir da issue #2937.

- **A etiqueta somada por uma automação não é mais apagada pela regra que rodou ao mesmo tempo** A ação "adicionar etiqueta" gravava a lista de etiquetas que o aplicativo tinha montado a partir de uma leitura anterior. Quando dois eventos diferentes do mesmo negócio (ou do mesmo contato) eram processados ao mesmo tempo — um pelo laço do agente, outro pelo dreno de eventos —, as duas execuções liam a mesma lista e cada uma gravava a sua versão inteira; a última apagava a etiqueta que a outra tinha acabado de acrescentar, sem erro e sem registro. Era o caso que sobrava depois da correção anterior, que resolveu apenas as duas regras do mesmo evento. Crédito: @webtecnica (#2967).

  Agora quem soma as etiquetas é o próprio banco: numa única instrução, a lista gravada recebe as etiquetas que faltavam e devolve o resultado, e a segunda execução recalcula sobre o que a primeira gravou em vez de sobrescrever com a foto antiga. A automação passa a anunciar exatamente o que ficou gravado — e só anuncia quando alguma etiqueta entrou de verdade. Nenhuma configuração nova, nenhum passo manual: instalações existentes recebem a correção na atualização.

- **Agente criado pelo corpo legado nasce com o modelo do provedor da instalação** Ao criar um agente sem informar o modelo, o DeskcommCRM gravava `anthropic/claude-sonnet-5` — o padrão histórico do produto — mesmo numa instalação configurada em OpenAI, OpenRouter ou Google. O agente nascia com um modelo que o provedor configurado não executa, e o desencontro só aparecia no primeiro atendimento. A escolha agora sai de um ponto único de resolução, na ordem: o modelo informado, o padrão da instalação quando ele se sustenta, a compatibilidade histórica da própria Anthropic e, por fim, o catálogo do provedor efetivo; sem um par válido, a criação é recusada com um erro claro em vez de gravar um modelo que aquele provedor não executa. O provedor, o modelo, a finalidade e a origem da configuração passam a ficar registrados no log estruturado, sem chave nem conteúdo de conversa. Contribuição de @webtecnica (#2955).

- **Resposta cortada ou vazia da IA vira caso para o time, e silêncio deliberado não abre caso à toa** Quando a resposta do agente terminava cortada no limite de tamanho — ou o turno terminava sem mensagem nenhuma para o cliente — o cliente ficava sem resposta e o time nem ficava sabendo. Agora essas falhas viram um caso humano para o time retomar a conversa, mas só quando há sinal de falha: a resposta que veio cortada, ou a correção automática que o motor faz no turno mudo e que também veio cortada. Silêncio deliberado (a IA escolheu não responder, como o pedido de correção autoriza) continua sendo resposta, não defeito, e não abre caso. O caso abre somente nas organizações com casos humanos ligados na versão do agente, com o tipo "problema" e a explicação em português simples para o time ver o que travou e o que o cliente precisa. Crédito: @guptasp82-jpg (#2938).

- **A conferência de afirmações de fato passa a rodar no modo assistido** Com o agente em modo assistido, a tarefa do Jev "Conferir afirmações de fato" nunca rodava. Medido numa instalação: 533 rascunhos e nenhuma observação. Agora o rascunho do "Sugerir resposta" é conferido com as evidências consultadas naquele turno, e a observação é gravada. Quando a resposta é aprovada e sai, o par se fecha, e o cartão do Jev passa a contar o modo assistido na concordância. Com a tarefa em "só observa", nada é impedido. Em "decidindo", uma afirmação que contradiz a base ou não está nela é barrada como os outros vetos: o agente recebe o erro e reescreve a partir do material, e a reescrita do mesmo turno não é conferida de novo. No Testar, o mesmo veredito aparece como aviso e a resposta continua na tela. A resposta aprovada não é conferida de novo. Com a tarefa desligada, nada muda. Nenhuma mudança de banco.

  Contribuição de @webtecnica (#2959), a partir da issue #2923.

- **Mensagem que o contato editou ou apagou para todos passa a aparecer assim na conversa** Quando o contato editava ou apagava para todos uma mensagem que tinha mandado, o CRM seguia mostrando o texto antigo, sem aviso nenhum: o evento chegava e era marcado como processado, mas não encontrava a mensagem, porque a recebida é guardada com o identificador completo e o aviso de edição traz só a parte final dele. Agora a edição atualiza o texto e o apagar marca a mensagem como apagada também nas mensagens recebidas; as enviadas pelo atendente seguem como antes. Nada a fazer na atualização.

  Contribuição de @webtecnica (#2956), a partir da issue #2939 de @el-barreto.

- **A espera da revelação do e2e diz quando o boundary terminou em erro de servidor** Quando um boundary do streaming SSR termina em erro de servidor, o servidor não revela a caixa escondida — ele manda o cliente renderizar aquele boundary do zero. A trava da suíte de navegador reprovava esse caso com "caixa órfã de verdade", mandando procurar caixa órfã onde havia erro de servidor. É o caso medido no PR #2351: a consulta do catálogo estourava o `statement_timeout` da leitura, `app/app/products/page.tsx:95` lançava e a caixa `S:0` ficava escondida com a página já no "Algo deu errado".

  A trava continua reprovando exatamente como antes — o que muda é o diagnóstico. A mensagem passa a dizer que o boundary terminou em ERRO DE SERVIDOR e a citar o `digest` do erro (mais a mensagem do servidor, quando ela vem no `data-msg` do marcador): o digest sai do `data-dgst` que o próprio `$RX` escreve no marcador do boundary, e do script `$RX("B:N","<digest>")` do stream como reserva. Quando o boundary apenas não revelou, a mensagem é palavra por palavra a de sempre.

  Você não precisa fazer nada: nada muda para quem opera, nem para o tempo de espera nem para o critério de reprovação da suíte.

  Contribuição de @webtecnica (#2351).

- **O "hoje" do Faturamento, da proposta nova e do filtro de atrasados é o dia de quem usa a tela** À noite, no horário de Brasília das 21h à meia-noite, quatro telas tratavam como "hoje" o dia em UTC, que já era amanhã. O lançamento novo do Faturamento nascia com a data de amanhã. O período padrão do relatório ia até amanhã, e no último dia do mês começava no dia 1º do mês seguinte. O filtro "Apenas atrasados" do funil mostrava como atrasado o negócio que fecha hoje. A validade padrão da proposta nova saía com 16 dias em vez de 15. Agora as quatro usam o dia de quem está na tela. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2943), a partir da issue #2935.

- **A prévia dos outros tipos de mensagem na lista do Inbox sai em português** A lista do Inbox mostrava o literal em inglês — `[image]`, `[audio]`, `[video]`, `[document]`, `[sticker]`, `[location]`, `[reaction]` — toda vez que a última mensagem não tinha texto: a foto sem legenda, o áudio, o documento. Agora a linha mostra a mesma palavra que o balão da conversa já usa para aquele tipo: Imagem, Áudio, Vídeo, Documento, Figurinha, Localização compartilhada, Reação. Vale para a conversa individual e para a de grupo, que escrevem a mesma coluna. Nenhuma mudança de banco: texto, legenda de mídia e o nome do contato compartilhado continuam saindo como saíam. Vale também para a mídia que o atendente envia pelo CRM, e ocultar ou apagar essa mensagem continua trocando a prévia da lista.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2850), a partir da issue #2742.

- **Perguntar sobre cancelar a assinatura deixa de bloquear o contato** Quem escrevia "posso cancelar a assinatura e voltar depois?" ou "cancelar la
  suscripción" tinha o contato bloqueado na hora, e a IA parava de responder,
  embora na maioria das vezes a pessoa estivesse falando do plano dela, e não
  das mensagens. Uma academia, uma revista ou um serviço por assinatura perdia o
  cliente que só queria saber como pausar. Agora a frase sem objeto chama uma
  pessoa da equipe, que decide. Até alguém decidir, as campanhas seguem para esse
  contato.

  As frases que nomeiam as mensagens continuam bloqueando na hora: "cancelar a
  assinatura das mensagens", "das notificações", "dos avisos", "das promoções",
  "da newsletter", "sair da lista" e "parar de me mandar".

  Contribuição de @webtecnica (#2971), a partir da issue #2886.

- **O passo manual dos e-mails de acesso deixa de mandar quem tem o Supabase na VPS ao painel da nuvem** Quando o `marca-emails.sh` não consegue gravar sozinho os modelos dos e-mails de acesso, ele ensina o passo manual. Esse texto mandava todo mundo ao painel do Supabase na nuvem, onde o projeto de quem tem o Supabase na própria VPS não existe. Agora o texto segue a topologia, pela mesma régua do aviso do Site URL do `update.sh`: no Supabase do kit, aponta o `update.sh` e o `.env` do Supabase desta VPS (`.runtime/supabase/.env`), com o comando que recria o auth de dentro dessa pasta; num Supabase próprio, aponta o `.env` dele; na nuvem, o texto segue igual. Só muda o que é impresso; nenhum comando novo roda.

  Contribuição de @webtecnica (#2880).

- **A prévia da lista do canal oficial passa a usar a mesma régua dos outros canais** A lista da Inbox mostra a última mensagem de cada conversa. O canal oficial do
  WhatsApp gravava essa prévia com um vocabulário próprio: emoji mais o nome do
  tipo ("📷 Imagem"), ignorando a legenda, e texto cortado em 120 caracteres. Por
  isso, ao ocultar ou apagar a última mensagem de uma conversa do canal oficial, a
  mensagem saía, mas a prévia da lista continuava mostrando o conteúdo antigo.
  Agora a ingestão oficial usa a mesma régua dos outros canais: a legenda quando
  existe, o texto até 280 caracteres, "Contato: <nome>" no cartão e o nome do tipo
  em português (Imagem, Áudio, Documento…) para mídia sem legenda. Ocultar e apagar
  passam a atualizar a prévia das mensagens que chegarem a partir desta versão.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2968).

- **Com casos ligados, o agente deixa de combinar um retorno que não agendou** O agente às vezes confirmava ao cliente um retorno combinado sem deixar nada agendado: o cliente pedia "pode ser daqui a duas horas", o agente respondia "Combinado, retomamos daqui a duas horas." e nenhuma ferramenta era chamada naquele turno. O cliente ficava esperando uma mensagem que não vinha. Medido pelo autor da issue, no mesmo cenário, em 3 de 11 execuções.

  O gate que existe para isso — o mesmo que barra a promessa de envolver um humano sem abrir o caso — já libera a promessa de retorno do próprio assistente quando o agendamento do follow-up foi feito de verdade no turno. O problema era o único sinal que marcava essa promessa: ele vinha do classificador semântico, que é um modelo e não reconhecia "retomamos daqui a duas horas" de forma confiável. A frase não nomeia ninguém da equipe, então nem o léxico de promessa-de-humano nem a pergunta semântica a apanhavam.

  Agora o gate lê também um detector léxico determinístico, sem chamada de modelo: a frase em que o próprio assistente se compromete a retomar a conversa mais adiante ("retomamos daqui a duas horas", "volto a falar com você", "te chamo mais tarde"). "Retomo", "retomamos" e "vou retomar" só contam como promessa quando o quando vem colado ao verbo ("retomamos daqui a duas horas", "vou retomar o contato na segunda", "amanhã retomamos"). Retomar a conversa agora, no próprio turno, não conta quando o dia ou a hora são o assunto e não vêm colados ao verbo ("Vamos retomar o agendamento: prefere segunda ou terça?"). Sem o retorno agendado no turno, a mensagem é vetada e o modelo é instruído a agendar antes de confirmar — ou a reformular sem prometer. O vocabulário é mínimo de propósito e foi medido contra as falas legítimas do repertório e contra retomadas imediatas com dia e hora no assunto: nenhuma das medidas é vetada por ele. A promessa de retorno de conteúdo ("te retorno com a proposta") continua sendo do classificador semântico, como era.

  Vale para os agentes com casos ligados, porque é o gate de casos que faz a verificação. Com casos desligados, que é o padrão de um agente novo, a frase ainda sai sem essa verificação; isso segue aberto na issue #2916.

  Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2928), a partir da issue #2916.

- **As opções de segurança da conexão do banco externo aparecem em espanhol** No formulário de conexão de banco externo, as cinco opções de "Segurança da conexão (TLS)" apareciam em português para quem usa o sistema em espanhol. Agora elas aparecem traduzidas.

- **Na linha do tempo do contato, o que aconteceu hoje aparece sob "Hoje"** Na aba Timeline da ficha do contato, o cabeçalho de cada dia saía um dia atrasado para quem está a oeste de UTC, como em todo o Brasil: o que aconteceu hoje aparecia sob "Ontem", e o de ontem saía com a data de anteontem. O agrupamento dos itens por dia já estava certo. O erro era só na hora de montar a data do cabeçalho, lida como meia-noite UTC. Agora o cabeçalho segue o fuso de quem está olhando. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2944), a partir da issue #2934.

- **Parar ou atualizar o worker não o mata mais à força aos 5 segundos** Quando a VPS parava o worker (atualização, reinício ou `docker stop`), o processo era morto à força uns 5 segundos depois, mesmo sem nada para fazer. Se havia uma mensagem saindo nesse momento, ela podia chegar ao WhatsApp sem que o worker anotasse o envio: o sistema a mostrava como presa e depois como falha, embora tivesse saído. Agora o worker recebe o aviso de parada, para de começar trabalho novo e usa o tempo de parada para terminar o que estava em andamento. Nenhuma configuração nova, nenhum passo manual: a atualização leva a correção.

  Contribuição de @webtecnica (#2826), a partir da issue #2823.

## [1.82.0] — 2026-10-15

### Adicionado

- **Você escolhe quais tabelas do banco conectado o assistente pode ler** Cada conexão de banco de dados externo passa a ter uma lista de fontes liberadas: o assistente e a grade só enxergam as tabelas e views que um administrador marcar, com a descrição que ele escrever, e só as colunas que ele liberar. Conexões que já existem continuam como estão: o assistente segue lendo tudo que o usuário do banco enxerga, até alguém marcar. Conexões novas começam com nada liberado, e o assistente avisa "nenhuma tabela foi liberada" até um administrador escolher; quem cria conexão por API marca as fontes em seguida, com `PUT /api/v1/external-db/connections/:id/sources`. Crédito: @paulolimajr77.

- **Na conexão de banco externo, o administrador escolhe o que o assistente pode ver** Em Dados externos, cada conexão ganha o painel "O que o assistente pode ver": o administrador marca as tabelas e views (e as colunas) que o assistente e a grade podem ler, escreve uma descrição curta para cada uma e vê quantas estão liberadas. Quem não é administrador só consulta a lista. Conexões novas passam direto a esse painel, porque nascem sem nada liberado. Crédito: @paulolimajr77.

- **Claude Haiku 5.5, Sonnet 5.5 e Opus 5.5 entram na lista de modelos** Em Provedores de IA e no seletor do agente passam a aparecer o Claude Haiku 5.5, o Claude Sonnet 5.5 e o Claude Opus 5.5, com o custo contado em Uso e orçamento. Também deixa de falhar, com o Claude Opus 5, o que manda ajuste de temperatura, que esse modelo recusa: o medidor de clima da conversa (que falhava calado) e as organizações que configuraram temperatura. O modelo padrão não muda. Quem usa a Anthropic e não escolheu modelo para "Identificar a etapa do lead" e "Barrar tentativa de manipulação" passa a usar, nesses dois, o Claude Haiku 5.5 no lugar do Haiku 4.5, porque o sistema escolhe sozinho o modelo mais barato do provedor: custa menos, mas pode deixar a resposta ao cliente um pouco mais lenta (medido pelo @jmpo em 60 turnos reais de atendimento, a verificação que identifica a etapa do lead passou de 0,6 s para 0,9 s, na mediana); para manter o de antes, escolha o Haiku 4.5 nesses dois pontos em Provedores de IA. Crédito: @rafaelcesardev.

- **O dono gera o link de pagamento da empresa e manda pelo WhatsApp** Com a cobrança ligada, o card **Cobrança** da empresa (painel › Tenants › empresa) ganhou o botão **Gerar link de pagamento**. É para o cliente que não vai entrar no sistema para assinar: você gera o link por ele e manda pelo WhatsApp com **Copiar link de pagamento**.

  No Asaas, digite antes o **CPF ou CNPJ de quem paga** (o campo já vem com o CNPJ do cadastro quando ele confere). O documento vai direto ao Asaas e não fica guardado no sistema. O cliente no provedor é criado com o e-mail do administrador mais antigo da empresa, nunca com o seu. Por isso, na primeira vez, a empresa precisa ter um administrador que não seja você: na que você acabou de criar para outra pessoa, gere o link depois que ela aceitar o convite; na que tem só você como administrador, convide um administrador da empresa antes. Depois que o cliente existe no provedor, isso não é mais pedido.

  Clicar de novo devolve o mesmo link enquanto ele vale. No Asaas, depois do aviso do provedor, a empresa vê o mesmo link em Configurações › Plano e cobrança › **Pagar agora**; na Stripe, o **Assinar** dela abre a mesma sessão. Na Stripe, o link vale 24 horas, e quem paga volta para a tela de login do sistema: o pagamento é confirmado pelo aviso do provedor, não por essa volta.

  Você não precisa fazer nada.

- **Pré-voo das imagens antes de instalar ou atualizar em ARM64** Numa VPS ARM64, o kit confere antes da instalação ou atualização se as imagens
  do CRM, a WAHA escolhida e, no modo single-server, o Supabase fixado têm variante
  ARM64. Isso evita começar uma atualização que não poderá subir. Há também uma
  sonda somente-leitura para a primeira transição de kit antigo. Em AMD64 nada muda.
  Uma instalação existente continua exigindo atualização deliberada e backup, e
  quem pede construção local (`DESKCOMM_BUILD_LOCAL=1`) não passa por esta conferência.

  Crédito: @Tanderakkkj.

- **A pausa agendada avisa na Central quando falha, e a janela marcada pode ter o horário corrigido** Quando o agendador das janelas de manutenção não consegue pausar ou retomar uma conexão no horário marcado, a Central passa a mostrar um aviso, um só por organização e não um por conexão. A próxima batida que funcionar fecha esse aviso sozinha. O detalhe técnico da falha fica no log do agendador. Uma janela que ainda não começou pode ter os dois horários corrigidos pela API, sem cancelar e criar de novo; a janela em andamento ou encerrada não muda, e a edição fica registrada na auditoria. As telas da janela de manutenção ganham a tradução em chinês. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2845), a partir da issue #2388.

### Alterado

- **O roteador abre um segundo card quando o cliente passa a falar de outro produto** Vale para quem já configurou funil de destino nas intenções do roteador, sem precisar fazer nada: na primeira atualização, o roteador deixa de transferir o card entre dois funis de produto e passa a abrir um segundo card. Antes, o cliente com negócio aberto em Consórcio que passava a falar de Investimentos tinha o card de Consórcio copiado e encerrado. Agora ele ganha um **segundo card** em Investimentos, e o de Consórcio continua como está: nada é encerrado e nada conta como perda. Funil de produto é o funil de destino de alguma intenção do mesmo roteador.

  O cliente que já fechou um produto e fala de outro também ganha o card do novo. Quem já passou pelo funil de destino (ganhou ou perdeu lá) não ganha outro card ali, e o contato bloqueado (que pediu para parar) ou anonimizado não ganha card novo nenhum.

  O card na Recepção, ou em qualquer funil que não é destino do roteador, continua sendo transferido para o funil do produto, como antes. O card novo leva só o título, o contato e a origem; etiquetas, campos, valor e responsável do outro produto não são copiados. Intenção sem funil de destino se comporta exatamente como antes.

  Contribuição de @webtecnica (#2799), a partir do desenho e do patch de @InvestidorDiversificado na issue #2480.

### Corrigido

- **A aba vizinha recarrega uma vez só ao sair do acompanhamento** Ao encerrar um acompanhamento de suporte, a aba vizinha recarregava duas vezes: a recarga disparada pelo aviso entre abas abria um documento que, sem carimbo próprio, caía na comparação de relógio e recarregava de novo — uma diferença de menos de um milissegundo entre o início do documento e o carimbo não dá para separar com `Date.now()`. Agora a aba marca, em sessionStorage, qual aviso ela já tratou, e o documento seguinte nasce sabendo que a recarga já aconteceu. Quem encerra o acompanhamento continua sem recarregar a própria aba, e um acompanhamento encerrado mais tarde ainda recarrega a vizinha uma vez.

- **A lista de modelos da assinatura do ChatGPT volta a acompanhar a conta conectada** Ao conectar uma assinatura do ChatGPT, o CRM passa a consultar o catálogo pelo endpoint oficial do Sign in with ChatGPT usando o token daquela conta. A lista segue mostrando apenas os modelos liberados para exibição; erros HTTP continuam visíveis e não apagam a lista já salva. O painel de Provedores reconhece os modelos dessa lista ao salvar os pontos e o modelo padrão, e a Prospecção pode selecioná-los quando oferecem ferramentas do CRM. Não é necessário configurar `CODEX_CLIENT_VERSION`.

  Contribuição de @omayklourenco.

- **Instalação em servidor único com o domínio atrás de proxy não para mais na conferência da chave** Na instalação em servidor único (o Supabase na mesma VPS do CRM), a conferência
  da chave do Supabase falava com o domínio público — que só passa a responder
  depois que o proxy da instalação sobe. Com o domínio atrás de proxy (Cloudflare
  no modo laranja, o padrão do kit), essa conferência recebia 521 e a instalação
  parava pedindo para conferir uma chave que estava certa. A conferência passa a
  falar com o Supabase da própria VPS, como a validação do endereço já fazia nesse
  modo; fora do servidor único, nada muda.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2933).

- **O agente responde mais rápido quando o modelo econômico raciocina** Antes de cada resposta, o agente classifica o estágio da conversa e confere se a mensagem tenta manipulá-lo. Essas duas verificações usam o modelo mais barato do provedor, e os mais novos raciocinam antes de responder até quando a resposta é uma palavra só. Na OpenAI, desde que o GPT-6 Luna virou o modelo econômico, isso somava perto de 1 segundo a cada resposta, e até 2 segundos nas mais lentas. Agora as duas verificações pedem ao modelo que não raciocine: medido em 60 conversas reais, a espera delas caiu de 1,7 s para 0,9 s (de 3,5 s para 1,3 s nas mais lentas). O mesmo vale para o Claude Haiku 5.5 quando ele entrar no catálogo: de 2,0 s para 0,9 s. Também custam menos, porque deixam de pagar o raciocínio. Quem ajustou o esforço de raciocínio da OpenAI no servidor (`OPENAI_REASONING_EFFORT`) continua com o ajuste nas demais chamadas. Nada a fazer na VPS.

  Contribuição de @jmpo.

- **Credencial do Google Agenda e do app da Meta gravada no /admin passa a valer na hora** Ao gravar a credencial do Google Agenda ou do app da Meta pela tela de administração, uma leitura que já estava em andamento podia trazer de volta o valor anterior e mantê-lo por até 30 segundos: o aviso de salvo aparecia, mas a Agenda não conectava ou a entrega da Meta falhava nesse intervalo. A leitura em andamento agora não reinstala o valor antigo. Contribuição de @webtecnica (#2905).

- **Na Inbox, {{nome}} e {{primeiro_nome}} digitados à mão saem com o nome do cliente** Quem escrevia `{{primeiro_nome}}` à mão no campo de resposta de um contato com nome mandava o texto cru para o cliente: sem aviso e com o botão Enviar liberado. Só a resposta rápida trocava a variável pelo nome. Agora o texto digitado passa pela mesma troca no envio, com o nome da conversa para onde a mensagem vai. Variável desconhecida, como `{{codigo}}`, continua como foi escrita. A nota interna também continua como foi escrita, porque não vai ao cliente. Contato sem nome segue barrado pelo aviso de antes. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2920), a partir da issue #2891.

- **O agente passa a salvar o resumo do atendimento quando o modelo raciocina antes de responder** Com modelos que pensam antes de responder (o raciocínio estendido da Anthropic), o fechamento do turno reenviava o raciocínio assinado numa chamada sem ferramentas, e a API recusa essa chamada, segundo o relato de quem contribuiu. O resumo do atendimento não era salvo. O raciocínio deixa de ser reenviado nessa chamada. Contribuição de @stivanellidrop-dotcom.

- **O fluxo de silêncio deixa de falar por cima do retorno que acabou de sair** Quando o lead pedia para ser procurado mais tarde, o sistema agendava o retorno e prometia voltar no horário combinado. Enquanto a promessa estava de pé, o fluxo de silêncio segurava o contato — mas, no minuto seguinte à mensagem do retorno, a inscrição nova deixava de ser segurada e o primeiro passo do fluxo saía por cima: duas mensagens seguidas, sem o lead ter respondido. A folga de um dia que já valia para quem estava no meio do fluxo passa a valer também para quem entra agora: enquanto o retorno acabou de sair, o contato não é inscrito pelo fluxo de silêncio, e continua valendo o mesmo prazo de sempre quando a folga termina. Nada muda para quem não tem retorno agendado, nem para os fluxos por etapa, por caso ou por lead.

  Contribuição de @webtecnica (#2929), a partir da issue #2907.

- **A busca de horários livres com dia e período juntos cobre o período a partir do dia** Quando o agente mandava `dia` e `dias_a_frente` juntos para `crm_find_free_slots` — o que modelos GPT via OpenRouter fazem mesmo em pergunta aberta, com `dia` igual a hoje —, a busca olhava só aquele dia, e a resposta saía vazia com a agenda cheia de vagas. Agora o período começa no dia pedido (nunca antes de agora) e cobre pelo menos `dias_a_frente` dias inteiros (pode trazer o começo do dia seguinte); horários da véspera ficam de fora. `dia` sozinho continua recortando naquele dia. Diagnóstico e primeira versão do conserto: @webtecnica (#2921), a partir da issue #2889.

- **Perder negócios em lote não troca mais o motivo de quem já estava perdido** Ao mover vários negócios de uma vez para uma etapa de perda com um motivo, o
  motivo era gravado em todos os negócios selecionados, inclusive nos que já
  estavam perdidos, e o motivo original deles era trocado sem nenhum registro.
  Agora só os negócios perdidos nesse lote recebem o motivo; os que já estavam
  perdidos são movidos e mantêm o motivo que tinham. Os que já estavam perdidos
  deixam de aparecer no histórico como se tivessem sido perdidos de novo com o
  motivo do lote, e cada negócio perdido no lote passa a ter um registro próprio
  na auditoria, como acontece ao perder um negócio pelo card. A atualização
  aplica a mudança de banco sozinha.

  Contribuição de @webtecnica (#2922), a partir da issue #2887.

- **A marca de aquecimento completo de cada número passa a ser gravada, e pela mesma régua do controle de ritmo** Cada número de WhatsApp tem uma marca de "aquecimento completo", exposta na lista de conexões da API (`is_warmup_complete`). Até aqui ela era sempre "não", em toda instalação: o início do aquecimento nunca era gravado, e sem ele a conclusão não acontecia. Agora a primeira conexão do número grava o início (numa instalação existente, é a primeira conexão depois da atualização, inclusive em números usados há meses), e a marca vira "sim" quando o controle de ritmo de envio já não põe limite de aquecimento nele — a data em "Este número é usado desde" já passou do último degrau, ou "pular o aquecimento" está ligado. Uma reconexão no mesmo dia não marca mais um número novo como aquecido.

  A marca anda quando o número informa que está conectado; um número que fica conectado sem reconectar recebe a marca com atraso, para o lado seguro. Depois de marcada, ela não volta: se "pular o aquecimento" for desligado ou a data em "Este número é usado desde" for trocada por uma mais recente, a marca continua "sim" enquanto o controle de ritmo volta a limitar. Por isso nada muda no envio: o limite de mensagens por dia continua vindo do controle de ritmo. Nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2672), a partir da issue #2432.

- **O relatório de dados chama o direito do titular de "Direito exercido", e Portugal lê os termos do RGPD** No Brasil, o relatório de acesso aos dados (PDF), o e-mail que o titular recebe e o aviso de prazo ao encarregado rotulavam a citação do art. 18 da LGPD como "Base legal". O art. 18 é um direito do titular; a base legal fica nos arts. 7 e 11. Agora os três dizem "Direito exercido", como Portugal já dizia. Só essa palavra muda: prazos, dados e links continuam os mesmos, e o arquivo `data.json` brasileiro não muda.

  Numa organização de Portugal, o rodapé do PDF passa a dizer "Responsável pelo tratamento" e "Encarregado da proteção de dados", em vez de "Controlador" e "Encarregado (DPO)". A política de privacidade passa a citar o RGPD e o NIPC, em vez da LGPD e do CNPJ. O `data.json` dessa organização ganha os campos `papel_controlador` e `papel_encarregado`. Os termos de Portugal foram revisados por IA, sem advogado, com a mesma ressalva da revisão anterior do RGPD.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2719), a partir da issue #2344.

- **A atualização deixa de parar depois do backup quando há alteração local em arquivo do kit** Atualizar pelo botão da tela (ou pelo `update.sh`) numa instalação que tem
  alteração local não commitada em arquivo que a versão nova troca passava pela
  conferência inicial, fazia o backup inteiro e só então parava no `git checkout`,
  com uma mensagem que não dizia quais arquivos eram nem o que fazer com eles.
  Agora a conferência inicial recusa antes de tocar em qualquer coisa, nomeia os
  arquivos e ensina a guardar ou desfazer o que é local. Alteração local em arquivo
  que a versão nova não troca continua não atrapalhando nada.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2932).

- **A conferência antes da atualização passa a recusar exatamente o que a troca de versão recusaria** A conferência inicial da atualização, que recusa antes do backup quando há
  alteração local no caminho da versão nova, ainda divergia da troca de versão em
  três casos: recusava à toa quando um arquivo do kit tinha sido apagado na
  instalação, ou quando a alteração já estava preparada e deixava o arquivo igual
  ao da versão nova; e deixava passar arquivo fora do controle de versão que a
  versão nova traz, que seguia parando a atualização depois do backup. Agora ela
  pergunta ao próprio git, com a mesma régua da troca de versão, e a mensagem
  nomeia todos os arquivos de uma vez, separando os alterados (guardar ou desfazer)
  dos que estão fora do controle de versão (mover ou apagar). A tela também deixa
  de repetir "nada foi parado" duas vezes.

  Você não precisa fazer nada.

  Conserto sobre a contribuição de @webtecnica (#2932).

- **Em Conversões, "Usar o recomendado" deixa de sugerir evento que o canal da conversa não repassa** Sem conexão direta com a Meta, o botão "Usar o recomendado" de Configurações › Conversões ligava etapas de qualificação com "Lead qualificado", um evento que o canal da conversa não repassa, e o aviso de evento sem saída aparecia em seguida. Agora, sem conexão direta, essas etapas ficam sem sugestão. Com conexão direta, nada muda. Conserto de @webtecnica (#2930).

- **Renomear conexão reabre com o nome atual, não com o texto que foi cancelado** Em Conexões, o diálogo Renomear reabria mostrando o texto que a pessoa tinha digitado e cancelado, em vez do nome atual da conexão — digite, cancele e reabra: o campo vinha com o que foi descartado (em português e em espanhol). Agora a reabertura sempre repõe o nome atual, pelos dois caminhos de abrir (o botão Renomear e a reabertura do diálogo); Cancelar, o X e o Escape continuam só fechando.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2919).

- **Renomear uma etiqueta para um nome que já existe junta as duas sem perder a cor, e avisa** Em Configurações › Etiquetas, renomear uma etiqueta para o nome de outra que já
  existe junta as duas numa só. A cor escolhida podia sumir nessa junção, porque
  ficava a primeira etiqueta da lista, tivesse cor ou não, e a tela dizia
  "Etiqueta atualizada" como num renome simples. Agora fica a etiqueta que tem
  cor ou descrição. Antes de confirmar, a tela avisa que as duas vão virar uma, e
  depois confirma com "Etiqueta juntada em". Mudar só maiúsculas e minúsculas do
  próprio nome continua sendo renome e não mostra o aviso. Excluir uma etiqueta
  segue sem tocar nas outras. A atualização aplica a mudança de banco sozinha.

  Contribuição de @webtecnica (#2817), a partir da issue #2801.

- **A marca "sempre atendimento humano" passa a valer também no envio do link da agenda** O link de reunião enviado pela IA passa a conferir a marca "sempre atendimento
  humano" do contato diretamente, em vez de deduzi-la da trava de passagem a
  humano. Contato marcado não recebe o link pelo envio automático; o envio pelo
  botão do responsável continua funcionando. A devolução do atendimento ao agente
  confere a marca no mesmo passo em que grava: se ela estiver ligada nesse
  momento, nada é devolvido. A atualização aplica a mudança de banco sozinha.

- **A tira de tons da marca mostra a escala da segunda cor, e o acompanhamento recusado pela agenda diz que foi a agenda** Na tela de marca da instalação, com duas cores (a segunda para o tema escuro), a tira de tons desenhava só a escala da cor principal e marcava nela o tom do botão escuro, que vem da segunda cor. Agora aparecem duas tiras, uma por cor, cada uma marcando os seus tons. Com uma cor só, nada muda. A tela de marca da organização ainda mostra uma tira só.

  Quando a verificação da agenda recusa um acompanhamento (por exemplo, porque o compromisso ao qual ele estava ligado mudou), o motivo do cancelamento passa a ser "Agenda do acompanhamento vencida", e não mais "Atendimento encerrado ou substituído". O cancelamento por atendimento encerrado continua com o texto de antes.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2900), fechando restos declarados nos #2687 e #2709.

## [1.81.0] — 2026-10-15

### ⚠️ Requer atenção

- **O pedido de dados que chega pela Nuvemshop passa a esperar o clique em Aprovar** Depois de atualizar, alguém com papel de administrador precisa aprovar cada pedido de dados que chegar pela Nuvemshop em Organização › LGPD. Sem a aprovação, o arquivo não é enviado e o prazo legal de 7 dias úteis corre. Confira também os pedidos que chegaram pouco antes da atualização e ainda aparecem como "Recebido": eles esperam a mesma aprovação.
- **Lembretes da agenda deixam de escolher arbitrariamente entre números da organização** Depois de atualizar, abra Configurações › Tipos de agendamento se a organização tem mais de um número. Escolha o canal do lembrete nos serviços que recebem reserva manual sem conversa; sem isso, o lembrete fica pendente com aviso na Central em vez de sair por um número qualquer. O mesmo vale para a reserva cuja conversa está num número desconectado ou arquivado: ela deixa de sair pelo número novo e fica pendente, o que atinge também quem trocou de número. Lembrete com a janela de 24 horas fechada passa a abrir aviso na Central.

### Adicionado

- **O histórico de uma conversa pode ser baixado em PDF, pelo endereço da rota e com a sessão logada** `GET /api/v1/conversations/[id]/export?formato=pdf` devolve o fio de mensagens em ordem cronológica, com até as 500 mais recentes. O papel `agent` baixa; `viewer` não leva o arquivo. Limite de 5 exportações por minuto por pessoa e 20 por organização. O botão na tela da conversa ainda não existe. Nenhuma mudança de banco.

  Contribuição de @webtecnica (refs #1982).

- **A automação ganha a ação Enviar e-mail, pelo e-mail que já está configurado** Dentro de um "ENTÃO", a regra manda um e-mail para o contato do negócio, para o responsável ou para um endereço fixo, pelo que já está configurado em Admin › E-mail (SMTP ou Resend). Sem e-mail configurado, ou com contato sem e-mail ou com recusa registrada, a aba Atividade mostra o motivo. Cada empresa envia até 200 e-mails de automação por hora; o excedente espera a hora seguinte.

  Contribuição de @webtecnica (#2794), a partir da issue #2726.

- **O funil ganha a visão Calendário por campo de data, com mês e semana** Ao lado do quadro, a aba Calendário mostra os negócios no dia de um campo de data do funil, ou como intervalo entre dois campos, por mês ou semana. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2790), a partir da issue #2770.

- **Campos personalizados condicionais — o campo aparece só quando outro tem o valor certo** Em Configurações, cada campo do funil ganha a caixa "Mostrar só quando". Esconder não apaga o valor gravado, e o campo oculto não é validado como obrigatório. Sem condição, todos os campos continuam aparecendo, como hoje.

  Contribuição de @webtecnica, a partir da issue #2728.

- **VPS atrás de NAT publica o CRM pelo Cloudflare Tunnel, com o Caddy desligado** Com `REVERSE_PROXY=cloudflared` e `CLOUDFLARE_TUNNEL_TOKEN` no `.env`, o Caddy fica desligado e um contêiner `cloudflared` publica o CRM sem porta de entrada. É opcional, e não é suportado no single-server: o instalador recusa com instrução.

  Contribuição de @caiofacchinato.

- **Contato ganha a marca "Sempre atendimento humano", que a devolução automática não desfaz** Marcada na ficha do contato, a IA para de atendê-lo de imediato, e nenhuma devolução, manual ou automática, a desfaz; só a ficha desliga. Nada precisa ser feito ao atualizar: a marca nasce desligada.

  Contribuição de @webtecnica (#2671, issue #2379).

- **Negócio ganho pode abrir um card de continuação no funil de pós-venda** Uma regra com o gatilho "negócio ganho" e a ação "criar ou mover lead" para outro funil cria lá um card com os dados do negócio ganho, que fica como está. Cada venda gera uma continuação só. Você não precisa fazer nada; a regra só age em quem a configurar.

  Contribuição de @webtecnica (#2787), a partir da issue #2769 de @aerosuiteapp.

- **Automações também podem ser montadas num designer de caixas ligadas, no mesmo formato do construtor de follow-up** Em Webhooks › Automações, "Montar no designer" abre a automação num canvas que grava a mesma automação do editor em lista, que continua disponível. Nada precisa ser feito ao atualizar. Contribuição de @Wyllams.

- **Automações podem disparar quando um contato ganha um telefone** O gatilho "Quando um contato ganhar um telefone" dispara quando a ficha sem número passa a ter um, pela edição da ficha ou ao aceitar a proposta de dado da conversa. Ainda não disparam, por exemplo: o contato criado já com telefone, a importação de planilha e a junção de duplicados.

  Contribuição de @webtecnica (refs #2812).

- **GPT-6 Luna, GPT-6.1 Sol e GPT-6 Astra entram na lista de modelos** Aparecem em Provedores de IA e no seletor do agente, com o custo contado em Uso e orçamento. O modelo padrão não muda. Se o seu `.env` tem `OPENAI_REASONING_EFFORT` em `none` ou `minimal`: o GPT-6.1 Sol e o GPT-6 Astra passam a receber `low` (antes recusavam a resposta), e o GPT-6 Luna com `minimal` passa a usar `none`. Crédito: @rafaelcesardev.

- **O guia de uso diário do CRM passa a conhecer todas as telas e todos os recursos lançados** O guia (a skill `deskcomm-operacao`) passa a conhecer os recursos da 1.79.0. Nada precisa ser feito ao atualizar. Contribuição de @paulolimajr77.

- **O Inbox ganha o botão Iniciar conversa, para número novo ou contato existente** No topo da lista do Inbox, o botão abre um painel: digite o telefone ou busque o contato, escolha o número de saída e escreva a primeira mensagem ou use um modelo. A conversa abre atribuída a quem a iniciou, e a IA não assume. Se ela já está com outro atendente, o painel diz com quem e a primeira mensagem não é enviada. Aparece para atendente ou acima. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2838), a partir da issue #2813 de @aerosuiteapp.

- **Guias para revender o CRM como SaaS, com cobrança, contrato e roteiros de aula, e o guia de assistente deskcomm-saas** `docs/saas/` ganha guias da jornada do dono, da cobrança (Stripe × Asaas), do contrato e da LGPD, e roteiros de aula; o guia de assistente `deskcomm-saas` conduz esse caminho pela conversa. Nada muda no sistema instalado.

- **Opção por organização para criar o Google Meet da reunião já com acesso aberto** Nova opção na Agenda, desligada por padrão: ligada, qualquer pessoa com o link entra sem pedir. Requer a API do Meet habilitada e o escopo de criação de espaços concedido na conexão do Google; no self-host, os passos estão na tela da opção. Desligada, nada muda.

  Contribuição de @webtecnica (#2089).

- **Conexões podem receber um nome interno fácil de reconhecer** O nome aparece nos cartões e seletores do CRM, sem alterar o nome público do perfil. Você não precisa fazer nada. Em Conexões, use **Renomear** no cartão desejado.

  Contribuição de @michelminato (#2802).

- **Marcar vários negócios como perdidos de uma vez, com um motivo, no quadro do funil** A barra de ações em lote ganha "Marcar como perdido…", com um motivo obrigatório aplicado a todos os selecionados e registrado na linha do tempo de cada um. Aparece quando o funil tem etapa de perda.

  Contribuição de @webtecnica (#2868).

- **Botão "Ressincronizar webhook" nas redes sociais depois de trocar o domínio** Em Conexões › Redes sociais, o botão aponta a assinatura para o domínio atual sem arquivar o canal nem mexer nos agentes. Se o provedor não confirmar, a tela avisa o erro.

  Contribuição de @webtecnica (#2867), a partir da issue #2863.

- **A tarefa combinada na conversa nasce presa à demanda, sem sair do Inbox** O painel lateral da conversa ganha "Tarefas desta demanda", com prazo, responsável e situação; a tarefa fica ligada à demanda, ao contato e ao negócio, e aparece também na aba Tarefas. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2842), a partir da issue #2818.

- **Tarefas dentro do card do negócio, com responsável, e o selo de pendências no quadro** O dossiê do negócio ganha a seção Tarefas, o formulário ganha o campo Responsável, e o card mostra as tarefas em aberto, em vermelho se alguma passou do prazo. O servidor passa a recusar responsável fora da equipe. Nenhuma mudança de banco.

  Contribuição de @profpeque.

- **Troca rápida de funil dentro do quadro** O nome do funil no topo do quadro virou um seletor: dá para pular para outro funil sem voltar à lista de Funis. Com um funil só, nada muda. Crédito: @paulolimajr77.

### Alterado

- **O uso das ferramentas passa a saber QUAL termo não foi encontrado** A auditoria passa a guardar também o termo buscado. Nada muda para quem opera a VPS: a migration entra sozinha na atualização e nenhuma tela nova aparece.

  Contribuição de @webtecnica (#2875).

- **O pedido de dados que chega pela Nuvemshop passa a esperar o clique em Aprovar** Nada é montado nem enviado ao cliente antes de alguém da equipe aprovar em Organização › LGPD; antes, o arquivo saía sozinho. A confirmação mostra o nome do titular e o e-mail de destino.

- **O botão de recolher a barra lateral sai do rodapé e vai para o alto** O botão fica agora na linha da logo, ou logo abaixo do símbolo com a barra recolhida. No celular nada muda. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2723), a partir da issue #2722.

### Corrigido

- **A auditoria e o veto do agente saem da janela que travava atrás de uma mudança na tabela de contatos** Durante uma atualização, o worker do agente podia parar sem erro nenhum ao gravar a auditoria da decisão; isso foi fechado para a auditoria e o veto, e o envio em si segue na issue #2426. Nada muda para quem opera a VPS: nenhuma configuração nova, nenhum passo manual.

  Contribuição de @webtecnica (#2827), a partir da issue #2426.

- **Evento de etapa que o canal não repassa avisa na hora da escolha** Em Configurações › Conversões, escolher um evento que o canal não repassa, sem conexão direta com a Meta, mostra um aviso ao lado do seletor, em vez de o problema aparecer dias depois no Histórico. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2839), a partir da issue #2457.

- **Inbox, contadores e fila param de resolver o contato por linha** A lista do Inbox, os números das abas e a fila de atendimento leem as travas do contato guardadas na própria conversa, com o mesmo resultado de antes e bem menos leitura no banco.

  Contribuição de @Tong-bit-art (#2748), a partir da issue #2739 e do diagnóstico de @mrmateussiilva (#1921).

- **A conversa que nasce durante uma trava do contato nasce no estado certo** A conversa criada no instante em que o contato recebia "atender humano" ou descadastro aparecia em Automático; agora nasce no estado certo.

  Contribuição de @Tong-bit-art (#2820), a partir da sugestão no #2748.

- **Criar um negócio direto numa etapa de perda sem motivo responde 422, não erro interno** Pela API (`POST /api/v1/leads`) e pelas fontes de captação, a resposta passa a ser 422 `lost_reason_required` em vez de 500; a importação de planilha para na primeira linha e desfaz os contatos que tinha criado. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2762), a partir da issue #2743.

- **Resposta com {{nome}} literal não sai mais para o cliente** Se o contato não tem nome, o compositor barra a resposta com {{nome}} ou {{primeiro_nome}} e explica o motivo; basta editar o texto. A legenda de anexo ainda não tem essa trava.

  Contribuição de @webtecnica (#2844), a partir da issue #2744.

- **O "digitando…" fica aceso no WhatsApp do cliente até a resposta do agente sair** O indicador acende quando o agente começa a trabalhar e é renovado a cada 10 segundos até a primeira bolha sair, por até 2 minutos. Nada muda na configuração, no banco ou no ritmo de envio.

  Contribuição de @KleberCoelho (#2843), com os commits de @rabbitkleber.

- **Editar o funil e o material de um agente pela API agora grava** O `PATCH /api/v1/ai/agents/:id/versions/:vid` com `pipeline_ids` ou `knowledge_source_ids` respondia 200 sem gravar; agora grava, e recusa material arquivado ou de outra organização. A tela do agente não era afetada.

  Contribuição de @ygorl.

- **Teste da paleta da Agenda espera o estilo do tema, não só o atributo** O teste intermitente da paleta da Agenda passa a esperar o estilo do tema mudar antes de medir. A régua não mudou.

  Contribuição de @Tong-bit-art (#2859), a partir da issue #2516.

- **Sem SMTP, o "esqueci a senha" diz o motivo em vez de mandar tentar de novo** No servidor único sem SMTP, a tela diz que a recuperação de senha não está disponível e que o administrador configura em /admin/email. Quem pôs o SMTP direto no `.env` do Supabase passa a ver essa mensagem: configure o mesmo servidor em /admin/email e rode o `update.sh`.

  Contribuição de @webtecnica (#2767), a partir da issue #2755.

- **Renomear uma etiqueta colorida não a deixa mais cinza para quem renomeou, e a cor se troca direto no Inbox** O nome novo aparece já com a cor, sem recarregar a página. Gerentes podem trocar a cor no editor de etiquetas do contato e da conversa. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2784), a partir da issue #2771.

- **Duas regras do mesmo evento que adicionam etiquetas não apagam mais a etiqueta uma da outra** A ação passa a ler as etiquetas atuais do negócio antes de juntar as novas. Dois eventos diferentes ao mesmo tempo ainda podem disputar a mesma lista. Nenhuma mudança de banco.

  Contribuição de @andersontomazi-ctrl (#2864), adaptada de jmpo/DeskcommCRM#89, de @jmpo.

- **Excluir uma etiqueta não apaga mais as outras etiquetas dos contatos, negócios e conversas** Agora sai só a etiqueta excluída. O que já foi apagado antes desta versão não volta sozinho; as etiquetas perdidas precisam ser colocadas de novo. Nada a fazer para atualizar.

  Corrige a issue #2895.

- **O guia do Coolify instala a versão atual do Coolify e já mostra a atualização pelo botão da tela** O comando do guia deixa de fixar o Coolify na 4.3.23, com a qual o painel terminava "not healthy" desde a 4.4. As conferências de "está no ar" passam a usar `/app` (`307`), porque a raiz do domínio responde `200`.

- **As seis abas do Inbox cabem na coluna da lista em qualquer largura** A faixa de abas quebra em duas linhas quando falta espaço, e as seis ficam sempre à vista. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2766), a partir da issue #2745.

- **No celular, a barra de ações da conversa fica em uma fileira e devolve a tela às mensagens** Abaixo de 768px, os botões do cabeçalho da conversa ficam numa fileira que rola na horizontal, sem esconder ação. No computador nada muda.

  Contribuição de @carloshmlima (#2810).

- **A prévia do vCard na lista do Inbox mostra o nome do contato** Em vez de `[contact]` ou `BEGIN:VCARD`, a linha mostra `Contato: <nome>`. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2765), a partir da issue #2742.

- **Quando o cadeado do domínio ainda não saiu, o fim da instalação diz isso, e não manda procurar erro no .env** A tela final passa a ser "Quase lá — falta o cadeado (HTTPS) do seu domínio": confira com `curl -sSI https://SEU_DOMINIO/app | head -1` e, quando der `307`, rode de novo o mesmo comando de instalação.

- **A instalação nova deixa de construir o CRM na VPS quando o registro de imagens não responde** Com o registro fora do ar, a instalação para e pede para rodar de novo em alguns minutos, em vez de construir na VPS e gastar a memória da máquina; para construir de propósito, use `DESKCOMM_BUILD_LOCAL=1`. Quem já tem o CRM instalado não precisa fazer nada ao atualizar.

  Contribuição de @webtecnica (#2644, fecha #2631).

- **A instalação nova diz por que não construiu o CRM na VPS, em vez de culpar sempre o registro de imagens** A mensagem separa três casos: falta o buildx (com o pacote que esta VPS tem), o registro não respondeu, ou a construção foi desligada com `DESKCOMM_BUILD_LOCAL=0`. Quem já tem o CRM instalado não precisa fazer nada ao atualizar.

  Contribuição de @webtecnica (#2693, fecha #2648).

- **Atrás do túnel da Cloudflare, o endereço de quem acessa passa a ser lido do cabeçalho que a Cloudflare escreve** Com o Cloudflare Tunnel, o app lê o IP de quem acessa do `cf-connecting-ip`. Sem o túnel, nada muda. Quem usa o túnel recebe a variável pelo próprio override na atualização; não há arquivo para editar.

  Construído sobre o Cloudflare Tunnel de @caiofacchinato (#2611).

- **Depois de gravar a marca, uma leitura feita no meio da troca não traz mais de volta a marca anterior** Antes, a marca anterior podia voltar por até 30 segundos; o mesmo foi fechado no CSS personalizado, no modo de cadastro, em /admin/sistema e nas credenciais do Google Agenda e do app da Meta. Nenhuma mudança de banco nem de configuração.

  Refs #1218.

- **Um pedido de dados do titular gera uma exportação, não duas** O webhook da Nuvemshop e a aprovação manual podiam exportar em dobro, com dois e-mails; agora só uma execução exporta.

  Contribuição de @Tong-bit-art (#2752), a partir da issue #2751.

- **O opt-out passa a reconhecer o vocabulário de Portugal** "remova-me da lista" passa a bloquear o contato, como a forma brasileira. "cancelar a subscrição" faz a IA parar e chamar a equipe, sem bloquear o contato. As formas brasileiras continuam valendo.

  Contribuição de @webtecnica (#2343).

- **Pedido de dados LGPD numa instalação sem e-mail passa a "Revisão pendente", com o PDF para você entregar, em vez de ficar em "Processando" para sempre** A página do pedido, em Configurações › Dados e acesso › LGPD, mostra "Baixar PDF" para você entregar por um canal seu. Pedidos já presos são corrigidos na atualização. Se algum continuar em "Processando", confira na "Trilha de auditoria": sem a linha `lgpd.export_generated`, não há como reprocessar o pedido pela tela.

- **O Gemini 3.6, 3.7 e 3.8 Flash passam a custar o dobro em 1º de janeiro de 2027** A partir dessa data (UTC), Uso e orçamento grava US$ 1,50 de entrada e US$ 7,50 de saída por milhão de tokens. Não é preciso fazer nada.

  Contribuição de @Frank-zhu2000 (#2781).

- **O aviso de buildx ausente do update manda instalar o pacote que esta VPS tem** O aviso cita `docker-buildx-plugin` ou `docker-buildx`, conforme o que o apt desta VPS oferece. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2763), a partir da issue #2754.

- **E-mails de recuperação de senha e de confirmação voltam a usar o modelo da instalação no single-server atrás de um proxy externo** Antes, podiam sair no modelo padrão do Supabase, em inglês. Você não precisa fazer nada: o `update.sh` ajusta o endereço que o próprio kit tinha gravado, e um modelo apontado para outro lugar continua como está.

  Crédito: @daviguerreiroa.

- **Recusa permanente do atendimento e da agenda para de travar o PostgREST (PT409, não 40001)** Numa instalação self-hosted, uma única recusa podia esgotar as conexões do banco e deixar o CRM inteiro em "Algo deu errado". A migration 0654 troca o código dessas recusas, e o PostgREST responde 409 sem repetir.

  Contribuição de @paulolimajr77 (#2805).

- **Aba oculta para de refazer as telas de atendimento a cada 45 segundos** O refetch do Inbox, do quadro e do dossiê pausa com a aba oculta e confere ao voltar, poupando a cota de tráfego do plano gratuito do Supabase.

  Contribuição de @Tong-bit-art (#2821), a partir da issue #2235.

- **Lembretes da agenda deixam de escolher arbitrariamente entre números da organização** Em Configurações › Tipos de agendamento, escolha o canal dos lembretes de cada serviço. Sem remetente seguro ou com a janela fechada, o lembrete fica pendente e a Central de avisos mostra como corrigir.

  Relacionado à issue #2594; preserva a proteção de janela introduzida no PR #2620. Contribuição de @ozzure (#2669).

- **Resposta rápida com {{nome}} usa o display_name quando o contato não tem nome** O contato que nasce pelo WhatsApp sem `name` passa a ter o `display_name` no lugar da variável. Sem nenhum dos dois, o compositor avisa para editar antes de enviar. Você não precisa fazer nada.

  Contribuição de @webtecnica (#2764), a partir da issue #2744.

- **O pedido para parar de receber mensagens encerra também o follow-up pausado à mão** Antes, o follow-up pausado pela equipe ficava vivo e fazia falhar todo follow-up novo para o contato. Nenhuma mudança de banco.

  Contribuição de @FabioMundoDigital.

- **O submenu Responsável do card do funil abre inteiro, por cima do menu** A lista de membros e agentes deixa de abrir cortada atrás do menu "⋯". Você não precisa fazer nada.

  Contribuição de @webtecnica (#2713), a partir da issue #2702 relatada por @DPalmercs.

## [1.80.0] — 2026-10-11

### Adicionado

- **Editar um contato direto da lista, sem abrir a ficha** Na tela de Contatos, cada linha ganhou um ícone de lápis entre "Abrir conversa" e "Excluir". Ele abre o mesmo formulário de edição da ficha, já preenchido, para corrigir nome, e-mail, telefone, nascimento e etiquetas sem sair da lista. A lista se atualiza ao salvar. Os campos personalizados do funil continuam na ficha. Contatos anonimizados não mostram o lápis, como já acontecia na ficha.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2717, issue #2715).

- **A etiqueta já nasce colorida no editor de tags do contato e da conversa** Até aqui a cor de uma etiqueta só se escolhia depois, em Configurações › Etiquetas. Agora, ao criar uma tag no editor de tags do contato ou no da conversa, um botão ao lado do campo "Nova tag…" abre a mesma paleta de oito tons de Configurações, com o nome de cada tom e a opção "Sem cor". O "+" adiciona a tag e grava a cor para a organização inteira. O botão aparece só para gerente e administrador, que são os papéis que podem mudar as etiquetas; quem atende como agente continua criando a tag sem cor, como antes. Escolher uma cor ao adicionar uma etiqueta que já existe troca a cor dela para a organização inteira, como em Configurações.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2720, issue #2718).

- **Quito e Guayaquil (Equador) entram na lista de fusos** As telas que perguntam o fuso horário (Configurações › Empresa, Configurações › Perfil, a jornada do atendente e a janela de envio) passam a oferecer "Quito e Guayaquil (Equador)". Antes, quem operava do Equador escolhia Bogotá ou Lima, que batem no relógio mas não no nome do lugar. O rótulo aparece traduzido em espanhol, inglês e chinês.

  Você não precisa fazer nada. Quem já escolheu um fuso continua com ele.

  Contribuição de @edaben (#2102, entrou pelo #2738), construído sobre o #2187 de @fabianmartinelli-fm.

- **Inbox com abas na ordem do trabalho, busca no seletor de etiquetas e etiqueta de automação gravada no contato** A faixa de abas do Inbox passa a seguir a ordem do trabalho: Automático, Fila, Minhas, Todas, Fechadas, Arquivadas. Só a posição mudou; nomes, permissões e contadores são os mesmos. O seletor de etiquetas ganhou um campo de busca, mantendo a seleção múltipla e o modo E/OU. Na ação "Adicionar tag" das automações agora dá para escolher o destino: o card (o comportamento de sempre, e o padrão) ou o contato do lead, uma das duas caixas que o filtro de etiquetas do Inbox consulta (a outra é a conversa). Com "Contato do lead", as etiquetas que o contato já tem são preservadas, e, se o lead não tiver contato vinculado, a ação é ignorada em vez de marcar o card no lugar.

  Você não precisa fazer nada. As automações que já existem continuam marcando o card como antes.

  Contribuição de @webtecnica (#2701), a partir da issue #2498 de @vagnerrm122.

- **Prospecção ganha dias da semana por conexão** A primeira abordagem da prospecção agora só sai nos dias marcados em Conexões › Proteção de envio › Dias da prospecção, dentro da janela de disparo do número. Fora do dia marcado, o envio fica agendado para a próxima abertura, sem tentativa e sem gastar o limite do dia — a fila espera, não morre.

  Os dias são próprios da prospecção: dá para responder no domingo e não prospectar no domingo (ou o contrário). Antes, o domingo único valia para os dois, e quem desligava para não incomodar no fim de semana calava junto a resposta.

  Quem instala agora começa com todos os dias marcados. Quem tinha o domingo desligado migra com segunda a sábado, sem mudar nada na operação — e qualquer mudança de dias fica registrada na auditoria. Nada a fazer na VPS além de atualizar.

  Contribuição de @paulolimajr77 (#2699).

### Alterado

- **Falha ao assinar o link de uma mídia vai para o log estruturado** Quando o sistema não conseguia gerar o link temporário de uma foto, áudio ou vídeo do WhatsApp guardado no armazenamento, o erro saía como uma linha solta no log do contêiner, sem dizer de qual mensagem era. Agora ele sai no mesmo formato dos demais erros, com o identificador da mensagem, o que facilita achar o caso no `docker compose logs`.

  Você não precisa fazer nada. O comportamento da tela não muda.

  Contribuição de @mrmateussiilva (#1921, entrou pelo #2740).

### Corrigido

- **Agendar pausa espera o fuso da organização antes de gravar** Se alguém agendasse uma pausa em Conexões antes de a tela terminar de carregar o fuso da organização, a hora digitada era convertida pelo horário de São Paulo. Uma organização em outro fuso (Manaus, por exemplo) gravava a pausa com uma hora de diferença, sem aviso nenhum. Agora os campos de data e hora e o botão "Agendar" ficam travados até o fuso chegar, e, se ele não puder ser carregado, o diálogo mostra o motivo em vez de gravar na hora errada.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2708, issue #2676, da triagem da tela do #2673).

- **Assumir a conversa interrompe o trabalho pendente da IA** Quando uma pessoa assume ou recebe a transferência de uma conversa, a IA para de responder nela: uma resposta que já estava sendo preparada não sai mais, mesmo que a conversa volte para o automático logo depois. Um follow-up que estava rodando naquele momento também para, respeitando a regra de pausa ou cancelamento do fluxo e a retomada dele. Lembretes, respostas já aprovadas e a atribuição automática de responsável seguem como antes. Uma ação que a IA já tinha começado fora do sistema não é desfeita.

  Você não precisa fazer nada.

  Contribuição de @ozzure (#2541).

- **Cópias de playbook editadas antes da 1.64.1 voltam a avisar versão nova do catálogo** Até a 1.64.1, editar pela tela um playbook instalado do catálogo gravava a versão nova sem a ligação com a origem. A cópia passava a aparecer como "manual" e nunca mais avisava quando o catálogo trazia uma versão nova. A 1.64.1 corrigiu as edições daí em diante, mas as cópias editadas antes continuavam desligadas. Agora a atualização refaz essa ligação a partir do histórico de versões da cópia, só para versões gravadas entre 23 e 30 de setembro de 2026 (do lançamento do editor até a correção), e só quando a cópia veio do catálogo. O conteúdo dos playbooks não muda, e cópias criadas por importação de pacote .zip fora desse período continuam manuais. Quem só atualizou para a 1.64.1 bem depois de 30 de setembro e editou nesse meio-tempo não é alcançado por esta reconstrução.

  Você não precisa fazer nada. Depois da atualização, as cópias reconstruídas podem passar a mostrar o aviso de versão nova do catálogo.

  Contribuição de @webtecnica (#2716, issue #1974).

- **O passo "Veja ele atender" do onboarding deixa de chamar de erro uma resposta que deu certo** No último passo do onboarding, "Veja ele atender", a pessoa manda uma mensagem de teste para o funcionário de IA. Quando ele respondia normalmente, a tela mostrava "Ele não conseguiu responder", com o motivo `o ensaio terminou como "ok"`, e mandava a pessoa procurar defeito na chave de IA, onde não faltava nada. Agora a resposta aparece na tela. Falha de verdade (chave sem saldo, mídia que não sairia) continua aparecendo como erro.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2692), a partir da issue #2686 de @Abel-Odorico.

- **Edição e movimentação do mesmo negócio não se atrapalham no turno da IA** Quando a IA pedia, na mesma resposta, para editar a descrição de um negócio e movê-lo de etapa, a edição podia anular a mudança de etapa. Agora, dentro da mesma resposta, as alterações no mesmo negócio são feitas uma de cada vez, e antes de cada uma a IA confere de novo se ainda é ela quem atende a conversa. Se uma alteração demorar mais de cinco minutos, a IA avisa que o resultado é incerto e pede conferência de uma pessoa; a alteração em andamento não é cancelada, e novas alterações nesse negócio, no mesmo processo, são recusadas até ela terminar. Negócios diferentes continuam sendo alterados em paralelo, e o que uma pessoa muda durante uma movimentação continua protegido. A correção cobre as ferramentas que alteram um negócio indicado e as etiquetas do negócio; operações indiretas da agenda e processos distintos mantêm as proteções que já tinham.

  Você não precisa fazer nada.

  Contribuição de @ozzure (#2540).

- **Mensagens de follow-up passam a chamar o cliente pelo nome** As mensagens de follow-up de texto fixo e de modelo de mensagem (o texto salvo em Modelos) passam a preencher `{{nome}}`, `{{primeiro_nome}}`, `{{contact.*}}` e `{{lead.*}}` com os dados do contato e do negócio, do mesmo jeito que as automações já faziam. Antes, só `{{volta}}` e `{{voltas}}` eram preenchidos, e o cliente recebia a marcação crua, como "Oi {{primeiro_nome}}". O modelo aprovado do WhatsApp oficial segue a regra própria dele.

  Variável sem valor sai da frase junto com o espaço: "Oi {{primeiro_nome}}!" chega como "Oi!" quando o contato não tem nome.

  Você não precisa fazer nada.

  Contribuição de @webtecnica (#2695), a partir da issue #2528 de @aerosuiteapp.

- **Follow-up em espera pela data do retorno deixou de ser cancelado na hora de disparar** Quem usa espera longa no follow-up ("volte a falar em 28 dias") via a inscrição sumir no dia do disparo, com o motivo "Atendimento encerrado ou substituído" e um aviso na Central — mesmo com a conversa aberta. Medido numa instalação real: as inscrições em espera pela data foram canceladas cerca de 1 minuto depois da hora programada, sem chegar a enviar. Agora a espera atravessa a data e o fluxo segue para o envio, e o aviso na Central só aparece quando o atendimento realmente acabou no meio da espera.

  Você não precisa fazer nada. Inscrições que já foram canceladas por esse motivo não voltam sozinhas; se alguma ainda fizer sentido, crie o follow-up de novo pelo caminho de sempre.

  Contribuição de @paulolimajr77 (#2709).

- **Worker de IA parado deixa de responder "saudável" em silêncio** O serviço do worker é quem transforma as mensagens recebidas em respostas da IA. Se uma consulta ao banco travasse no meio do caminho, ele parava de responder — as mensagens continuavam chegando, mas nenhuma resposta saía — e a checagem de saúde do serviço continuava dizendo "ok": foi assim que uma instalação real ficou dois dias sem a IA responder, com o aviso verde. Agora a checagem de saúde passa a acusar o problema quando o worker fica mais de cinco minutos sem concluir uma rodada, e a Central da equipe abre um aviso (que depende de o banco ainda atender). O aviso se resolve sozinho quando o processamento volta.

  Você não precisa fazer nada. Quem acompanha o `docker compose ps` pode ver o worker como `unhealthy` enquanto ele estiver parado; isso não reinicia o worker nem reverte uma atualização. O `/healthz` do worker ganhou o campo `ia_drain`.

  Contribuição de @Tong-bit-art (#2691, issue #2505), a partir do caso relatado no #2501 de @rafaelbatistazz.

- **Trocar de plano no teste grátis não espera mais o link de pagamento vencer** Quando a empresa trocava de plano no teste grátis com um link de pagamento ainda em aberto, a troca era recusada até o link vencer (até 24 horas) ou ser pago. Agora o sistema cancela esse link no provedor de pagamento e a troca vale na hora; o próximo "Assinar" gera um link novo, já com o preço do plano escolhido. Se o provedor não confirmar o cancelamento, nada muda e a recusa de antes continua valendo, para nenhum link sobreviver com o preço antigo. Links criados antes desta versão seguem a regra antiga até vencerem.

  A conferência da cobrança também passou a comparar o preço da assinatura no provedor com o preço do plano. Quando os dois divergem, a auditoria registra a ação `cobranca.preco_divergente`, com os dois valores. Nada é corrigido sozinho: quem administra decide.

  Você não precisa fazer nada. A atualização faz uma pequena mudança no banco, aplicada pelo próprio `update.sh`.

  Contribuição de @webtecnica (#2697, issue #2609).

- **Contatos compartilhados aparecem corretamente no Inbox** Cartões de contato compartilhados em que o telefone vem agrupado agora permitem abrir a conversa. Ao responder a um contato compartilhado, a prévia mostra o nome em vez do texto bruto do cartão.

  Você não precisa fazer nada.

  Contribuição de @Natan2121 (#2712).

## [1.79.0] — 2026-10-10

### ⚠️ Requer atenção

- **Só para quem alargou à mão a restrição de origem dos pedidos para gravar Tray, Loja Integrada ou WooCommerce** Troque a sua ponte para gravar a origem `external` (id `<plataforma>:<id>`, plataforma no `payload`) ANTES de rodar `bash update.sh`: depois da atualização, gravar o nome da plataforma é recusado e o pedido novo se perde. Os pedidos antigos são convertidos sozinhos. Quem não mexeu na restrição não faz nada.

### Adicionado

- **O cliente pode ter um vendedor dono (carteira); o dono é avisado por tarefa quando o cliente escreve numa conversa que está com outro vendedor, e o negócio novo desse cliente nasce com ele** Por enquanto a carteira é definida pela API (gerente ou acima); o cartão na ficha do contato vem depois. Cliente sem carteira segue o rodízio de hoje, e a atualização não põe ninguém em carteira.

  Contribuição de @webtecnica (#2667), a partir da proposta de @hudson-souza-mkt (#2591).

- **Configurações › Financeiro ganha Editar em contas, formas de pagamento, plano de contas, regras de comissão e lançamentos recorrentes** Sem desativar e recadastrar. Junto, editar uma regra de comissão deixa de dar erro, e editar uma conta deixa de zerar o saldo inicial e de voltar a moeda para BRL. Lançamentos e comissões já gerados não mudam.

  Contribuição de @webtecnica (#2661), a partir da issue #2641 de @carloshmlima.

- **Você pode cobrar as empresas que atende pelo Asaas, com Pix e boleto todo mês** Opcional: ligue "Cobrança dos seus clientes" em Admin › Recursos opcionais (desligada, o menu Cobrança não aparece); depois, em Admin › Cobrança › Conexão, escolha Asaas e cole a chave de API. Pix e boleto são pagos a cada cobrança (não é débito automático); atraso, suspensão e reativação funcionam como na Stripe. Assinaturas existentes ficam no provedor em que nasceram. Nada muda para quem não usa a cobrança.

- **A marca própria ganha uma cor opcional para o tema escuro, ao lado da cor principal, como o logo já tinha** Em Marca e em Configurações › Marca, o campo "Cor da marca no tema escuro". Vazio, nada muda; preenchido, só o tema escuro usa essa cor (e-mails e tema claro seguem na principal).

  Contribuição de @webtecnica (#2682), a partir da issue #2482 de @TOSTES-LAB.

- **O administrador da plataforma edita o cadastro, corrige o e-mail de acesso e exclui um tenant pela tela** A troca de e-mail avisa a Central da empresa e o endereço antigo. A exclusão só vale para tenant suspenso pelo administrador (nunca por falta de pagamento) e sem assinatura ativa, pede motivo e confirmação, e fica na auditoria. Exige acesso completo à plataforma e a verificação em duas etapas de quem a tem.

  Contribuição de @Draven9 (#1967, entrou pelo #2625).

- **O cartão de documento do Inbox mostra o nome original do arquivo, e não só a extensão** Vale para documentos recebidos depois da atualização; os antigos seguem mostrando a extensão.

  Contribuição de @webtecnica (#2619), a partir da issue #2613 de @gleisaum.

- **Conexões ganha Agendar pausa — a janela de manutenção pausa e retoma sozinha** Escolha início, fim e uma conexão ou todas; a mensagem que chega durante a janela é guardada e volta à fila na retomada. Janelas podem ser listadas e canceladas; ainda não dá para editar uma.

  Contribuição de @webtecnica (#2673, issue #2388), construído sobre o #2318 de @paulolimajr77.

- **Pedidos de plataforma sem integração nativa (Tray, Loja Integrada, WooCommerce) entram por uma origem genérica** Grave o pedido com a origem `external`, o id como `<plataforma>:<id>` e a plataforma no `payload`. Os três conectores nativos não mudam. **Se você alargou a restrição de origem à mão, os pedidos antigos são convertidos sozinhos, mas troque a sua ponte para gravar `external` antes de atualizar: depois, gravar o nome da plataforma é recusado e o pedido novo se perde.**

  Contribuição de @webtecnica (#2670), a partir da issue #2442 de @valterhjr.

- **Automações de tempo agora deixam escolher o funil e a etapa pela tela** "N dias sem mensagem" e "N dias na mesma etapa" ganham os seletores, e salvar pela tela não apaga mais o recorte.

  Contribuição de @Tong-bit-art (#2685), a partir da issue #2483 de @aleflores35.

- **Instalação com o banco na própria VPS passa a funcionar atrás do proxy do Coolify** Passo a passo medido em `docs/saas/coolify.md`. Quem instala sem as variáveis novas não vê mudança.

  Construído sobre o #2150 e o #2289 de @webtecnica, a partir da issue #2099 de @brunno-soaress.

### Alterado

- **Passar a conversa para uma pessoa por assunto jurídico vira uma chave por agente** Para um escritório de advocacia, "processo" e "advogado" são o vocabulário normal do cliente. No cartão "Passar para uma pessoa", um interruptor novo (padrão ligado, só admin muda) desliga essa passagem; o pedido explícito de pessoa e as palavras de passagem seguem valendo.

  Contribuição de @webtecnica (#2156), a partir da issue #2097 de @melgacoadv.

- **A tela de erro fatal passa a aparecer em espanhol para quem usa o navegador em espanhol, e os textos em espanhol passam a tratar por "tú"** Em português nada muda.

  Contribuição de @JowaniOrantes (#2632).

- **Comandas vira módulo — toda instalação anterior a esta versão continua com Comandas ligada; instalação nova liga em Administração › Módulos** Nada a fazer ao atualizar: os dados ficam como estão. O caixa (contas, lançamentos, Faturamento) continua com ou sem o módulo.

  Contribuição de @webtecnica (#1907).

### Corrigido

- **Follow-up de texto fixo respeita a janela de disparo do canal e a faixa do agente** Fora delas, o envio espera a próxima abertura em vez de sair de madrugada.

  Contribuição de @webtecnica (#2677), a partir da issue #2658 de @paulolimajr77.

- **Com a assinatura do ChatGPT conectada, a lista de modelos passa a ser buscada no serviço do Codex, e não mais num endereço que recusava o token** Se a busca falhar, o seletor mostra o motivo. A conversa em si ainda cai na credencial de reserva (#2602, em aberto). Se a lista não vier, declare `CODEX_CLIENT_VERSION` no `.env` (ex.: `0.160.1`).

  Contribuição de @webtecnica (#2622), a partir da issue #2602 de @GabrielBottan, construído sobre o #2456 de @omayklourenco.

- **Conexão com o banco que falha no meio de uma operação deixa de ser reaproveitada** No motor de atendimento, a próxima tarefa podia herdar a operação de quem falhou; agora a conexão que falha é descartada.

  Contribuição de @webtecnica (#2621, issue #2506), sobre o tempo limite trazido pelo #2501 de @rafaelbatistazz.

- **A resposta de quem clica num botão do modelo agora aparece na conversa** O toque (e respostas de botão e de lista) entra como texto com o nome do botão, e a IA passa a vê-lo.

  Contribuição de @ViktorHugodev (#2688).

- **Comentários e mensagens do kit passam a dizer o que o Compose mede, sem mudança na atualização** Só texto e testes do kit; a instalação que funciona segue igual.

  Contribuição de @webtecnica (#2517), a partir da issue #1060 de @AleksisDorsey.

- **Conexão que falha no meio de uma transação deixa de voltar para o grupo de conexões** Nas rotinas da prospecção, nos casos obsoletos, na saúde do número, nos roteadores e na leitura de banco externo, a próxima tarefa podia herdar uma operação ou uma trava presa de quem falhou; agora a conexão que falha é descartada.

  Contribuição de @webtecnica (#2652, issue #2624).

- **Na tela de marca, o contraste do modo escuro passa a medir a cor do tema escuro** O número agora é o do botão que aparece na tela; as cores não mudam.

  Achado na conferência pela tela do #2682 (@webtecnica).

- **Em Portugal, a dica da tela Marca manda conferir a "Denominação social" e fala de RGPD** No Brasil o texto não muda.

  Contribuição de @Tong-bit-art (#2646, issue #2503), construído sobre o #2502 de @webtecnica.

- **Etapa da Meta com evento que o canal não repassa vira pendência com motivo visível** A pendência diz o que fazer (escolher um evento que o canal repassa, ou conectar a Meta direto), em vez de pedir uma conexão que a instalação não tem.

  Contribuição de @webtecnica (#2660, issue #2457), construído sobre o #2455 de @jmpo.

- **Excluir um tenant confere a assinatura com o provedor de cobrança na hora, e recusa se o provedor não responder** Nada é apagado nesse caso; basta tentar de novo.

  Contribuição de @webtecnica (#2650, issue #2626).

- **O fio da conversa volta a rolar até o fim quando o cartão de passagem chega antes das mensagens** O "Assumir e responder" volta a ficar à vista ao abrir a conversa.

  Contribuição de @webtecnica (#2664, issue #2515).

- **Quem pula o passo do funil no onboarding já sai com três etapas do quadro ligadas ao assistente** Aguardando pagamento, Pago e Cancelado, como no pacote "Loja". Empresas que já pularam ficam como estão; ligue em Configurações › Funis.

  Contribuição de @webtecnica (#2663), a partir da issue #2451 de @TOSTES-LAB.

- **O lembrete de compromisso não é mais dado como enviado quando o canal não pode entregá-lo** Fora da janela de 24h (ex.: Instagram) ele tenta outro canal; se nenhum pode, tenta de novo na próxima rodada.

  Contribuição de @webtecnica (#2620), a partir da issue #2595 de @kristhianlumai-lgtm.

- **O arquivo de dados que o titular recebe ao pedir acesso é montado em partes e usa cerca de um terço da memória de antes** O conteúdo é o mesmo; se a leitura falhar no meio, o arquivo passa a avisar que pode estar incompleto.

  Contribuição de @webtecnica (#2651, issue #2576).

- **A tela de Equipe mostra os papéis no idioma da interface** Somente leitura, Atendente, Gerente e Administrador no lugar do código interno.

  Contribuição de @carloshmlima (#2689).

- **Poda de retenção interrompida no meio leva as contagens dos lotes que já passaram** O relatório e a auditoria deixam de registrar zero para o que já foi apagado.

  Contribuição de @Tong-bit-art (#2653, issue #2508).

- **Uma poda de retenção que falha não pula mais a anonimização do dia nem some com as contagens das outras podas** Cada poda falha sozinha e é nomeada no relatório; a retomada da LGPD roda de qualquer jeito.

  Contribuição de @Tong-bit-art (#2645, issue #2508).

- **Ligar um recurso opcional passa a dizer onde ele aparece** Cada linha de Recursos opcionais mostra o caminho completo, e os que não criam menu dizem isso. Empresa com o menu enxuto passa a ver a entrada do recurso ligado.

- **Encontre ofertas com palavras acentuadas antes de revisar a resposta** A revisão de promessas reconhece matrícula, grátis e demonstração.

  Contribuição de @vitorlacerdadigital (#2629).

- **O revisor considera o contexto e pedidos de transferência não viram promessas** Oferecer transferência não conta como promessa; promessas reais na mesma mensagem seguem barradas.

  Contribuição de @vitorlacerdadigital (#2629).

- **Ofertas aprovadas continuam explícitas nas respostas do agente** O revisor deixa de retirar a gratuidade aprovada na base; promessa sem respaldo segue vetada. Nada a configurar.

  Contribuição de @vitorlacerdadigital (#2629).

- **Identificar bloqueios de conteúdo do provedor no teste do agente** A prévia diz quando o provedor bloqueou o conteúdo, separado de saldo, credencial e veto de promessas.

  Contribuição de @vitorlacerdadigital (#2629).

- **Os dois prazos do arquivo de webhooks ganham o teto de 36500 dias** Um valor exagerado no `.env` não derruba mais a poda: é trocado pelo teto, com aviso no log.

  Contribuição de @webtecnica (#2623, issue #2612).

- **A anonimização por seção de módulo não grava mais o rótulo onde o campo estava vazio** Nenhum módulo oficial usa esse modo hoje; nenhum dado existente muda.

  Contribuição de @webtecnica (#2683, issue #2656).

- **Instalação com o banco na própria VPS deixa de mostrar as chaves do banco na tela** A saída completa fica em `.runtime/supabase-setup.log`, só para o root. Instalações existentes não mudam.

- **Instalação com o banco na própria VPS não falha mais quando o terminal está com permissões restritas** O instalador fixa as permissões de que o banco precisa.

- **Templates oficiais do WhatsApp com parâmetros nomeados (parameter_format NAMED) voltam a ser enviados pelo Inbox e pela API sem o erro meta_100** Sem reconfigurar nada.

  Contribuição de @webtecnica (#2678), a partir da issue #2659 de @gleisaum.

- **O agente pela assinatura fecha o turno — a fita da resposta chega ao fechamento** Com "OpenAI pela assinatura (ChatGPT)", o turno quebrava depois da resposta; agora fecha na prévia e no WhatsApp, e as sugestões com ferramenta (propostas, "preencher com a conversa") passam a funcionar.

  Contribuição de @webtecnica (#2675), a partir da issue #2657 de @GabrielBottan.

## [1.78.0] — 2026-10-08

### ⚠️ Requer atenção

- **A assinatura do ChatGPT passa a funcionar nos agentes, com login próprio e lista de modelos por empresa** Quem conectou a assinatura do ChatGPT antes desta versão precisa conectar de novo: em **IA › Credenciais**, use o link de conexão da assinatura e entre com a mesma conta. Até lá o agente não usa a assinatura (a chave de API de reserva, se houver, segue atendendo). Nenhum arquivo a editar.
- **A rota global do webhook do WhatsApp só atende a rede interna da stack** Só para quem roda o WAHA em OUTRO servidor entregando na rota global pelo domínio do CRM: aponte o webhook para `https://<seu-domínio>/api/v1/webhooks/waha/<token-do-canal>` (passo a passo em `docs/runbooks/waha-hostgator.md`). Quem usa o WAHA da stack não faz nada.

### Adicionado

- **Organizações fora do Brasil preenchem pela tela as alíneas a), c) e d) do art. 15.º que o relatório de acesso imprime** Em Configurações › Empresa, o cartão "Alíneas do art. 15.º do RGPD" (só para quem administra, só fora do Brasil) grava finalidades, destinatários e prazo de conservação, que antes saíam "não informado". No Brasil nada muda.

  Contribuição de @webtecnica (#2544, issue #2356).

- **Novos modelos Gemini 3.x disponíveis no seletor de inteligência do agente** Gemini 3.1 Flash-Lite e 3.6, 3.7 e 3.8 Flash aparecem para o provedor Google em IA › Agentes, com o custo no orçamento. O modelo padrão não muda.

  Contribuição de @tatarevick (#2533).

- **Você pode cobrar as empresas que atende, com pagamento pela Stripe, avisos de atraso e reativação automática** Opcional e desligado: ligue "Cobrança dos seus clientes" em Admin › Recursos opcionais, conecte a Stripe em Admin › Cobrança e crie os planos; uma lista de passos mostra o que falta até a primeira cobrança. Empresa nova ganha teste grátis; pagamento atrasado gera aviso na Central, faixa no topo e e-mail, e suspensão depois da tolerância (5 a 30 dias, padrão 7, com aviso final pelo menos 48 h antes). Paga, ela volta sozinha. Para quem não liga, só o menu Billing passa a se chamar Plano e cobrança.

- **No Inbox, a largura da lista de conversas e da ficha do contato agora se ajusta arrastando a divisória** Em tablet e notebook; a escolha fica no navegador, o duplo clique volta ao padrão e as setas do teclado também ajustam. No celular nada muda.

  Contribuição de @webtecnica (#2604), a partir da issue #2579 de @brunno-soaress.

- **Módulos podem guardar informação própria, e ela aparece na ficha do contato** Começa a plataforma de módulos: um módulo de nicho declara as fichas que guarda e o servidor cria as tabelas, isoladas por empresa e fechadas ao acesso direto do navegador. Como o catálogo oficial ainda não publica módulo desse tipo, nada muda na tela hoje. A atualização pode levar alguns segundos a mais, uma vez, por um índice novo na tabela de contatos.

- **Na conversa com a janela de 24h fechada, escolher um modelo aprovado mostra a prévia da mensagem completa, atualizada enquanto você preenche** O painel mostra cabeçalho, corpo, rodapé, botões e carrossel com cada {{n}} trocado pelo que você digita; o envio segue bloqueado com campo obrigatório vazio. Os guardrails do agente passam a ler cada valor no lugar certo.

  Contribuição de @webtecnica (#2539), a partir da issue #2446 de @Fabio-Ribeir0.

- **Quem pede acesso aos próprios dados no Brasil recebe também o arquivo de dados, com todas as mensagens e sem as anotações da equipe** O e-mail do pedido (LGPD, art. 18, II) passa a trazer, junto do PDF, o link do `data.json` com todas as mensagens. Nos dois países o arquivo deixa de levar o que é da equipe: conversa interna com a IA, dados de funcionários, o texto que a IA digitou em ações, passagens e casos, identificadores internos e dados técnicos. Anotações da equipe sobre o cliente não vão no Brasil; em Portugal vão, sem o nome de quem escreveu. O PDF não muda.

  Construído sobre o #2354 de @webtecnica.

- **Personalize formulários e direcione automações por fonte** Cada fonte de webhook pode gerar um formulário com perguntas extras (listas, caixas, números, valores em reais), as fontes podem ser renomeadas e as automações de novos contatos podem ser limitadas a uma fonte. As respostas ficam no lead.

  Contribuição de @omayklourenco (#2553, entrou pelo #2570).

### Alterado

- **O registro de auditoria de cada ferramenta do assistente passa a guardar o tamanho da resposta** A chave `result_bytes` (só o número, nunca o conteúdo) aparece no detalhe cru em Auditoria; nenhuma tela muda.

  Contribuição de @paulolimajr77 (#2614).

- **O aviso de mensagem recebida vai para quem cuida da conversa, não para a equipe inteira** Com atendente, avisa o atendente e os administradores; sem atendente mas com negócio aberto, o dono e os administradores; sem responsável, a equipe inteira, como antes. Grupos e avisos da Central seguem para todos.

  Contribuição de @Wyllams (#2583).

- **A cobrança dos seus clientes começa a chegar ao sistema, ainda sem poder ser ligada** Planos, limites e teste grátis chegam travados, e nenhuma empresa ganha limite. Muda para todos: ao reativar uma empresa suspensa, o aviso da Central cita os disparos e passos de follow-up que não saíram, e IA › Follow-ups os mostra como "não disparada". **Se uma integração sua (um n8n, por exemplo) lê `situacao` em `crm_list_followups`, ela passa a ver também `nao_disparado`:** confira que não o trata como "saiu". O teto do plano passa a valer também para a leitura de imagens e a transcrição de áudios com a chave de IA da instalação (hoje inerte: nenhuma empresa tem teto). As colunas `rate_limit_rps` e `ai_budget_cents` de empresas, que nada lia, saem do banco. E um administrador de empresa não consegue mais criar, direto pela API do banco, um membro provisório fora de qualquer contagem.

- **A assinatura do ChatGPT passa a funcionar nos agentes, com login próprio e lista de modelos por empresa** A conexão usa o "Sign in with ChatGPT" em vez do login emprestado do Codex; a tela de credenciais mostra os modelos que a assinatura de cada empresa libera, e o **Publicar** confere contra essa lista.

  Contribuição de @omayklourenco (#2456), a partir da issue #1639 de @TOSTES-LAB.

- **A rota global do webhook do WhatsApp só atende a rede interna da stack** A rota sem token (`/api/v1/webhooks/waha`) responde 404 ao que chega pelos proxies de borda do kit; o WAHA da stack chama `http://app:3000` e segue entregando, sem editar arquivo. A rota com token não muda.

### Corrigido

- **No modo "Só os seus", o negócio que o Atendente cria pelo "Novo Lead" nasce com ele de responsável** Antes a criação era recusada; agora o negócio nasce atribuído a ele e aparece na lista dele. Pedir um colega como responsável segue recusado, com a explicação.

  A partir da issue #2547 de @hudson-souza-mkt; construído sobre o #2556 de @webtecnica.

- **O aviso de menção no celular respeita quem pode ver a conversa** Segue a visibilidade da inbox (Configurações › Atendimento), como o aviso dentro do app.

- **O aviso de mensagem nova no celular respeita quem pode ver a conversa** Vai só para quem pode ver a conversa, pela mesma regra de visibilidade da inbox.

  Construído sobre o #2583 de @Wyllams.

- **Instalação com o Supabase na própria VPS, ou com um Supabase próprio, deixa de pedir um token do Supabase na nuvem** O token `sbp_...` só serve ao Supabase na nuvem, que continua recebendo o aviso. Com Supabase próprio, a primeira atualização pede para conferir `SITE_URL` e `ADDITIONAL_REDIRECT_URLS` no `.env` dele, mas quem nunca atualizou sem o token ainda vê o texto antigo uma última vez, na atualização que traz este conserto. Com o Supabase na VPS, o texto antigo já não sai nessa atualização.

- **Os backups passam a ser legíveis só pelo dono da VPS** Os arquivos do `backup.sh` do kit e do `scripts/backup-db.sh` (sessão do WhatsApp, anexos, dump) eram legíveis por outros usuários da máquina. Agora saem fechados, e a pasta `backups/` se fecha no próximo backup, com os antigos dentro.

- **O banco de dados conectado deixa de aparecer para o assistente quando o módulo está desligado, e tabelas com maiúscula passam a ser achadas** Com o módulo desligado em Admin › Sistema, as ferramentas do banco somem do assistente e do MCP; tabela com maiúscula é achada mesmo escrita em minúscula.

  Contribuição de @paulolimajr77 (#2537).

- **Instalar uma extensão do catálogo oficial volta a funcionar** Toda instalação falhava com "pacote adulterado" por causa das informações de vitrine do catálogo; agora só se compara o que o catálogo anuncia sobre o pacote, com a mesma proteção. Preparações paradas podem ser retomadas ou canceladas na tela.

- **A chave secreta do Google colada junto com o resto do arquivo é recusada na hora, com instrução, em vez de só falhar depois ao conectar** Aspa, vírgula ou espaço na chave do Google Agenda mostram na hora como copiar só o valor que começa com `GOCSPX-`.

  Contribuição de @Aleshan-dev (#2493).

- **A leitura do clima da conversa para de gastar quando a IA atinge o limite de gasto** Com "Parar a IA ao chegar no limite" ligado, ela para junto com o atendimento.

  Contribuição de @Wyllams (#2583).

- **A conexão com o Google Ads confere quem começou** O retorno passa pelas conferências do Google Agenda e da Nuvemshop; o que não confere volta para Conversões com aviso, em vez de página de erro.

- **A conferência de fato deixa de barrar resposta cujo preço está no material, mesmo quando o agente junta itens ("Flexível ou fosca: R$ 119,90")** O preço é normalizado antes do veto e a frase só passa se cada item nomeado tiver aquele preço no material; o resto do guardrail não afrouxa.

  Contribuição de @webtecnica (#2610), a partir da issue #2582 de @brunno-soaress.

- **A cópia de reserva passa a ser feita dentro do painel aberto e devolve o foco ao botão de copiar** Vale para quem acessa por `http://` e IP, e ajuda quem navega pelo teclado ou leitor de tela.

  Contribuição de @webtecnica (#2597), a partir da issue #2580 de @brunno-soaress.

- **Contato com CPF volta a ser salvo, com o CPF cifrado no banco** Todo contato com CPF era recusado (cadastro, edição e planilha). Agora o CPF é guardado cifrado, a busca por CPF volta, e só gerente ou administrador vê o número, com auditoria. A atualização leva ao banco a chave do CPF do seu `.env` (ou gera uma).

  Contribuição de @webtecnica (#2551), a partir da issue #2522 de @aerosuiteapp.

- **Testar do agente agora prepara a foto do produto como o envio real** O teste e o rascunho sugerido ao atendente procuram e copiam a foto como o envio; foto que não fica pronta reprova com o motivo. Nada é enviado, mas fica uma cópia de cada foto testada numa pasta de teste do armazenamento, que não é apagada sozinha.

  Contribuição de @webtecnica (#2538, refs #2490), a partir da issue de @Fabricio-Point-Machine.

- **Duplicados de contatos e exportação de auditoria não param mais em 1.000 linhas** A exportação entrega os 10.000 prometidos e a tela de duplicados só diz que varreu tudo quando varreu.

  Contribuição de @Tong-bit-art (#2585, issue #2561), a partir do que @hudson-souza-mkt apontou na #2548.

- **O bloco Mover lead no funil agora pede o motivo da perda quando o destino é etapa de perda, e a recusa aparece na linha do tempo** O construtor não publica sem o motivo. Fluxos já publicados sem motivo seguem sem mover o card, mas a falha agora aparece na linha do tempo: escolha o motivo no bloco e publique de novo.

  Contribuição de @paulolimajr77 (#2552).

- **Uma falha na confirmação de presença da agenda não para mais os follow-ups** A falha fica só na agenda, registrada em log, auditoria e monitoramento.

  Contribuição de @Wyllams (#2583).

- **Funil arquivado só volta com o nome livre, e o funil de clientes não é mais arquivado com a marca** Desarquivar com o nome de um funil ativo é recusado; para arquivar o funil de clientes, marque outro antes. Funil arquivado com a marca antes desta versão continua marcado até você marcar outro.

  Contribuição de @webtecnica (#2605, issue #2559; refs #979 de @rafaelbatistazz).

- **O diagnóstico passa a mostrar por que o agente de atualização falhou, em vez de uma linha em branco** O `healthcheck.sh` mostra a última falha numa linha (hora, endereço, resposta e código HTTP), cortada em 300 caracteres.

- **O instalador não deixa mais um arquivo temporário em /tmp a cada execução** Os `tmp.*` de execuções anteriores ficam; podem ser removidos à mão.

- **O instalador de extensões recusa um catálogo baixado vazio também no Ubuntu 22.04** No `jq` 1.6 o arquivo vazio passava como válido.

  Contribuição de @daviguerreiroa (#2616, separado do #2608).

- **Contato novo abordado pelo celular agora entra no funil padrão** A primeira mensagem enviada pelo celular a um número sem negócio cria o card na primeira etapa, pela regra da mensagem recebida, e dispara as automações de "lead criado". Não cria para quem já tem negócio, grupo, contato bloqueado ou pessoal, nem para envio do próprio CRM.

  Contribuição de @webtecnica (#2543, refs #2448), relatado por @mgnstudio.

- **Menção escolhida para a próxima nota não some quando a anterior termina de salvar** Vale para a nota interna da conversa.

  Contribuição de @Tong-bit-art (#2586, issue #2463).

- **As métricas de cada atendimento da IA voltam a ser gravadas** Desde a 1.77 o `worker` registrava "métricas do run não registradas" e não as gravava; o atendimento e as telas de custo não foram afetados. O intervalo entre a 1.77 e esta versão não é recuperado.

  Contribuição de @jmpo (#2617).

- **Os relatórios de Perdas e da análise do funil contam além de 1.000 negócios e avisam quando passam do limite** Leem até 5.000 linhas por leitura, do mais recente ao mais antigo; acima disso, a tela de Perdas avisa o corte.

  Contribuição de @webtecnica (#2560), a partir da issue #2548 de @hudson-souza-mkt.

- **O instalador deixa de escolher a rede do Traefik pela ordem alfabética quando ele está em mais de uma rede** Com mais de uma rede, usa a `coolify`; sem ela, para e pede `TRAEFIK_NETWORK` no `.env`. Quem já instalou não é afetado.

- **Um prazo de retenção enorme no .env não trava mais a limpeza diária** Prazo acima de 36500 dias (100 anos) vira o teto, com aviso no log; antes travava a limpeza e a retomada de anonimização da LGPD.

  Contribuição de @webtecnica (#2603, issue #2509).

- **O retorno da conexão com o Google Ads e com a Nuvemshop passa a valer uma vez só** Como no Google Agenda; quem conecta normalmente não percebe diferença.

- **Editor do roteador busca o estado atual ao abrir, em vez de confiar só no que veio do servidor** Sem sobrescrever o que a pessoa acabou de digitar.

  Contribuição de @webtecnica (#2600), a partir da issue #2569 de @InvestidorDiversificado.

- **O follow-up segue a política do fluxo quando uma pessoa assume a conversa** Antes ela valia só quando a IA passava a conversa. Agora, com "pausar", o passo espera a pessoa soltar a conversa; com "cancelar", a inscrição termina como passagem para a equipe.

  Contribuição de @jmpo (#2606).

- **"Sugerir resposta" e o "Testar" do agente passam a respeitar a janela de resposta, não a de disparo** Fora do horário de disparo o rascunho não era gerado, mesmo com a janela de resposta aberta. Disparos em massa e retomadas seguem na janela de disparo.

  Contribuição de @webtecnica (#2599), a partir da issue #2555 de @rogercampel.

- **Na aba Teste do agente, o passo a passo mostra o nome da ação proposta e os dados dela** Em vez de "(sem nome)" e "—".

  Contribuição de @webtecnica (#2596), a partir da issue #2550 de @hudson-souza-mkt.

- **O agente não deixa mais o cliente sem resposta quando escreve fora do envio** Quando o turno terminava sem mensagem, veto nem passagem à equipe, o agente recebe um aviso e uma chance de responder, pelas mesmas verificações de qualquer envio.

  Contribuição de @jmpo (#2607).

- **O instalador só aceita o endereço do Supabase quando quem responde é o Supabase** Num Coolify, o endereço do painel passava como Supabase; agora o instalador exige o serviço de login do Supabase e avisa qual endereço respondeu.

- **As ligações do agente de voz passam a aparecer em Uso de IA** Cada ligação grava tokens e duração; o custo em dinheiro ainda não é calculado e não entra no limite de gasto, e o cartão de Orçamento avisa quando há ligações no mês.

  Contribuição de @Wyllams (#2583).

## [1.77.0] — 2026-10-08

### Adicionado

- **O inbox mostra por qual canal cada conversa entrou, na lista e no cabeçalho da conversa aberta** O selo do canal passa a mostrar o nome dado em Conexões (o número só quando o canal não tem nome) e aparece também no cabeçalho da conversa aberta. Nada a fazer na atualização.

  Contribuição de @webtecnica (#2499), a partir da issue #2383 de @gleisaum.

- **Pausar uma conexão agora avisa a equipe inteira na Central, e o aviso some sozinho quando ela volta** O aviso diz o canal, quem pausou e quando; pausar de novo atualiza o mesmo aviso, e retomar, arquivar, excluir ou desconectar a conexão o resolve. Queda por falha de conexão continua com o aviso próprio. A mudança de banco vem na atualização.

  Contribuição de @webtecnica (#2496, issue #2389).

- **Ganhar um negócio pode abrir a comanda com o valor e o contato, opcional por funil** Em Configurações › Funis, a caixa "Abrir comanda ao ganhar um negócio neste funil" abre uma comanda com o valor e o contato do negócio, na moeda da organização, por qualquer caminho de ganho. A caixa nasce **desligada** em todo funil; a comanda nasce aberta, segundos depois do ganho, e reabrir e ganhar de novo não abre outra.

  Contribuição de @webtecnica (#2220), a partir da issue #1477 de @AnditecDev.

- **O gasto de IA com fotos, áudios e vídeos passa a aparecer em Uso de IA e em Execuções** Descrever foto, ler quadros de vídeo e transcrever áudio pelo modelo de conversa eram gastos que não apareciam; agora aparecem e somam no gasto do mês. O áudio do serviço de transcrição (`whisper-1` ou o da instalação) aparece sem valor e não conta para o limite.

  **Confira o limite em Uso de IA depois de atualizar:** se "Parar a IA ao chegar no limite" está ligado, a IA pode parar mais cedo no mês do que parava, sobretudo onde chega muita foto. Com o limite atingido, a foto não é enviada ao provedor e a Central explica o motivo. Consultas prontas de custo e tempo de atendimento em `docs/runbooks/medir-custo-e-latencia-da-ia.md`.

- **Gemini 3.5 Flash-Lite disponível no seletor de modelos Google** Aparece no seletor dos agentes quando a instalação usa credencial Google, com ferramentas e visão, e o custo entra no teto pelo preço Standard do Google. Modelos já configurados não mudam e nenhum agente é publicado sozinho.

  Contribuição de @vitorlacerdadigital (#2453).

- **Página inicial pública e política de privacidade com a seção de dados do Google, para a verificação do app no Google** O endereço principal abre, sem login, uma página com o nome da sua marca e os links da Política de Privacidade e dos Termos; a política ganhou a seção exigida pelo Google para Agenda e Google Ads. Quem confere o deploy: o domínio passa a responder 200 sem sessão (era 307), e o sinal de que o app responde passa a ser `/app` → 307.

  Contribuição de @paulolimajr77 (#2510).

- **Planos de tarefa — a sequência de tarefas salva uma vez e aplicada a cada negócio por uma regra** Em Tarefas › Planos, gerente ou administrador monta a sequência (título, prazo, prioridade, responsável); a ação de automação "Aplicar um plano de tarefas ao negócio" cria todas de uma vez, uma vez só por negócio. Nada a configurar na atualização.

  Contribuição de @webtecnica (#2213), a partir da issue #1752 de @franceschini-lucas.

- **Métricas ganham o quadro "Por canal", com conversas, 1ª resposta humana e conversas sem resposta de cada número** Uma linha por número, nos últimos 30 dias, com a mesma conta da tabela por atendente: resposta da IA, de automação ou pelo celular não conta como resposta humana. A função de banco vem na atualização.

  Contribuição de @webtecnica (#2504, refs #2390).

- **Os registros que a IA grava a cada conversa passam a ter prazo de guarda configurável** Sete tabelas da IA que cresciam para sempre entram na limpeza diária. Padrões: custo, métricas, skills e roteador 400 dias (`AI_TELEMETRY_RETENTION_DAYS`); registro do ritmo de envio 2 dias (`PACING_LEDGER_RETENTION_DAYS`); cópias das mensagens enviadas 30 dias (`OUTBOUND_COPIES_RETENTION_DAYS`); resumos substituídos 180 dias (`LEAD_CHECKPOINT_RETENTION_DAYS`).

  **Quer guardar mais que o padrão? Ponha a variável no `.env` ANTES de atualizar:** a primeira limpeza já apaga pelo prazo em vigor, e o apagado não volta. Para mudar um prazo, ponha a variável com o número de dias e recrie o app; valor abaixo do mínimo vira o mínimo. Numa instalação antiga a limpeza anda em lotes por alguns dias, sem travar o sistema.

- **Ao iniciar uma conversa pela lista de contatos, escolha por qual número ela sai** Com mais de um número conectado, "Iniciar conversa no Inbox" pergunta o número; números fora do ar não podem ser escolhidos. Com um só número, nada muda.

  Contribuição de @webtecnica (#2491), a partir da issue #2382 de @gleisaum.

- **Base para o agente de IA chamar um servidor MCP externo (ainda sem tela de cadastro)** O agente passa a poder chamar ferramentas de um servidor MCP externo registrado, com auditoria, chave cifrada e proteção contra endereços internos. Nenhuma tela usa isso ainda e cada agente precisa escolher as ferramentas, então nenhuma instalação muda de comportamento nesta versão.

  Contribuição de @webtecnica (#2204), a partir da issue #2147 de @brunno-soaress.

### Alterado

- **O agente deixa de pagar classificações repetidas e lê menos para sugerir a etapa do funil** As classificações de etapa e de manipulação só rodam quando chega mensagem nova do cliente, não em follow-ups nem respostas a casos, e telefone e e-mail saíram do que o classificador lê. Nada a fazer.

- **As classificações de etapa e de manipulação passam a usar o modelo mais econômico do mesmo provedor** Sem modelo escolhido para essas duas tarefas, elas usam o modelo mais barato do mesmo provedor e da mesma chave, entre os que têm preço. Se o provedor recusar, a chamada se repete no modelo de antes. Em IA › Provedores aparece o modelo em uso, e escolher outro continua possível.

- **Cada mensagem do agente faz menos consultas ao banco antes de sair** A conferência repetida antes de cada bolha sai, e os registros do envio deixam de segurar a resposta. Pausar o agente continua calando as bolhas seguintes, e o ritmo de envio não mudou.

- **O envio de mensagens deixa de reler o histórico inteiro do número a cada mensagem** As leituras feitas a cada envio deixam de crescer com o histórico, e o `/healthz` do worker deixa de percorrer a fila inteira (a contagem de `dead` segue no `/metrics`). Espaçamento, limite diário e proteção contra envio em dobro não mudaram.

- **A IA para de gastar com trabalho de fundo que não muda nada** O clima da conversa deixa de ser medido onde a IA não atende, a rotina do agente antigo sai cedo para quem já publicou agente, e a avaliação automática não reavalia atendimento já avaliado.

- **O banco ganha índices para as consultas que o agente e a limpeza diária repetem** Cinco consultas frequentes deixam de ficar mais lentas conforme o banco cresce. Durante a criação dos índices, na atualização, gravar em envios, chamadas de IA, memória do agente, etapas e eventos fica travado: instantes numa instalação pequena, mais tempo quanto maior o histórico.

- **Versão que pede alguma ação antes de atualizar passa a sair como minor, com o aviso em destaque** Major só sai por decisão do dono do projeto. Leia o aviso "Requer atenção" sempre que ele aparecer, qualquer que seja o número.

- **O agente começa a responder mais cedo — as leituras do turno que não dependem umas das outras correm juntas** As leituras antes de chamar o modelo caem de 16 idas ao banco em série para 5, com até 4 em paralelo por turno. No pico, elas podem esperar pelas 10 conexões padrão (`DB_POOL_MAX`).

- **A tela "Uso de IA" passa a contar o período inteiro e separa chamadas de turnos do agente** Acima de mil chamadas no período a tela somava só as primeiras mil; agora a conta é inteira. "Atendimentos com IA" vira "Chamadas de IA", e entram os cartões "Turnos do agente" e "Taxa de cache". O orçamento do mês não mudou. A função de banco vem na atualização.

- **A resposta do agente começa mais cedo — a mensagem que chega não espera mais a fila de eventos de todas as empresas** Com o `worker` de pé (o padrão), o recebimento pede o turno do agente antes de drenar a fila; notificações e automações de mensagem recebida podem chegar alguns segundos depois. Para o comportamento antigo, grave `EVENT_LOG_WORKER_DRAINS=false` no `.env` e reinicie o app.

- **O envio pelo WhatsApp para de perguntar ao WAHA, a cada mensagem, se o número existe** A resposta positiva fica guardada por 10 minutos por conexão. Se o número de um cliente mudar de grafia, o sistema pode levar esses 10 minutos para perceber.

### Corrigido

- **Aba que estava carregando quando o acompanhamento de suporte começou ou terminou passa a mostrar a organização certa** Era só a tela: o servidor já recusava gravar na organização errada.

- **Reservas chegam à IA com a hora local e são relidas após as ações** O agente recebe a hora da reserva no fuso do compromisso, e o resumo relê a agenda depois de criar, remarcar ou cancelar.

  Contribuição de @ozzure (#2523).

- **Arrastar um card no funil com filtro ligado não embaralha mais a ordem da etapa** Soltar um card com filtro ligado podia empatar a posição com um card escondido, e arrastos seguintes eram cancelados sem aviso.

  Contribuição de @webtecnica (#2558), a partir da issue #2545 de @hudson-souza-mkt.

- **Resposta do cliente "em cima" de uma mensagem agora aparece no fio da conversa** A mensagem que chega guarda a que ela responde, e o fio aparece no inbox. O agente ainda não usa a citação para responder (próximo passo da #2474).

  Contribuição de @Tong-bit-art (#2485), a partir da issue #2474 de @marcelovolei15, construído sobre o #305 de @jmpo.

- **Comanda do ganho: moeda certa, audit da abertura e corrida fechada** Com a moeda do negócio declarada e diferente da organização, a comanda não abre; a abertura entra na auditoria; duas comandas para o mesmo negócio deixam de ser possíveis; e uma comanda que ficou sem item é completada na repetição.

  Contribuição de @webtecnica (#2479, refs #2475).

- **"Conversar sobre o caso" volta a aparecer quando a IA é configurada só por Credenciais, sem chave no ambiente** O painel passa a usar a mesma credencial que a conversa usaria.

  Contribuição de @Aleshan-dev (#2495).

- **O gasto de quem atende com Gemini passa a ser contado, e o teto mensal passa a valer** Os seis modelos Gemini do catálogo eram registrados sem custo. **Com teto no modo que bloqueia e o gasto real do mês já acima dele, as respostas da IA passam a ser barradas** e as conversas vão para a fila humana; confira em IA › Uso e orçamento. O gasto passado não é recalculado.

- **Três dependências internas sobem para versões corrigidas** `sharp`, `seroval` e `source-map-js` sobem para versões com correção de segurança, e o Next.js vai de 16.3.6 para 16.3.8 pelo mesmo motivo (#2536).

- **Os avisos de negócio ganho, perdido, reaberto ou com novo responsável só nascem do próprio negócio** Notificação, webhook de saída e conversão para anúncios seguem funcionando por tela, automação e IA.

- **Mensagem enviada pelo CRM não aparece mais duas vezes nas conversas individuais com o motor WEBJS** O envio guarda o identificador no formato do eco. Grupos e o motor NOWEB não mudam.

  Contribuição de @webtecnica (#2525), a partir da issue #196 de @Gervanno.

- **Excluir um funil que já está no arquivo não manda mais arquivar de novo** A recusa continua; muda o conselho, que agora é tirar o funil do arquivo e resolver os negócios.

  Contribuição de @webtecnica (#2532), a partir da issue #979 de @rafaelbatistazz.

- **As mensagens da IA chegam ao WhatsApp sem "\n" escrito e sem asteriscos duplos** Antes de sair, o texto do agente, da automação "Mensagem escrita pela IA" e da prospecção passa para o formato do WhatsApp, sem mexer em links.

  Contribuição de @mentitaa (#2512).

- **A IA volta a responder sozinha quando a conexão com o banco morre sem aviso** A consulta presa desiste em até um minuto e a IA retoma sem reiniciar o `worker`.

  Contribuição de @rafaelbatistazz (#2501).

- **Um negócio recusado pela regra de visibilidade agora sai como "sem permissão", e não mais como erro interno** No modo "Só os seus", o Atendente que cria ou repassa negócio fora do que pode ver recebe a explicação, em vez de "Erro interno". A regra em si não mudou.

  Contribuição de @webtecnica (#2556), a partir da issue #2547 de @hudson-souza-mkt.

- **O agente que opera o funil pelo MCP consegue marcar um negócio como perdido** `crm_move_lead_stage` aceita `lost_reason`, conferido contra os motivos do funil.

  Contribuição de @erikyudi (#2500), a partir da issue #917 de @glrmelage.

- **Menção apagada da nota interna não notifica mais a pessoa errada** O aviso sai só para quem está no texto ao salvar.

  Contribuição de @Tong-bit-art (#2489, refs #2463).

- **Os quadros "Performance por atendente" e "Por canal" deixam de ler o histórico inteiro a cada visita** Os números não mudam. Com muito volume nos próprios 30 dias, ainda podem passar do limite de 8 s (issue #2514). A mudança de banco vem na atualização.

  Contribuição de @webtecnica (#2554, refs #2514).

- **As páginas de política de privacidade e termos de uso, e a tela de cadastro, passam a mostrar o nome da marca configurado na tela** O responsável pelos dados continua sendo a empresa que opera a instalação, e o PDF de LGPD segue sem marca.

  Contribuição de @webtecnica (#2534, refs #2511).

- **Regra de automação salva pela tela não perde mais o filtro de funil e de etapa** O que a tela não edita sobrevive ao salvar; antes, a regra passava a valer para todos os funis em silêncio.

  Contribuição de @Tong-bit-art (#2487), a partir da issue #2483 de @aleflores35.

- **A tela da organização passa a usar os rótulos do país dela (Denominação social e NIPC em Portugal)** No Brasil, continuam "Razão social" e "CNPJ".

  Contribuição de @webtecnica (#2502), a partir da issue #1946 de @maclevison.

- **O segredo usado pelo agendador deixa de aparecer na lista de processos do servidor** Nada muda na configuração: continua o `INTERNAL_SECRET` do `.env`. Quem trocá-lo por precaução: sem `INVITE_TOKEN_SECRET`, os convites ainda não aceitos deixam de valer.

- **Reabrir uma tarefa cancelada a devolve para Pendente, não para Concluída** E a linha do tempo do negócio deixa de ganhar "Tarefa concluída".

  Contribuição de @webtecnica (#2557), a partir da issue #2549 de @hudson-souza-mkt.

## [1.76.0] — 2026-10-07

### Adicionado

- **O editor da jornada copia os horários para os dias úteis e mostra o que ficou gravado** Em Equipe › Atendimento, o editor de horário de cada atendente ganhou o botão "Copiar estes horários para os outros dias úteis": as faixas do dia da primeira linha da lista passam para segunda a sexta, substituindo o que esses dias tinham, sem tocar sábado e domingo. Nada é gravado antes de Salvar, e Cancelar desfaz. Depois de salvar, o diálogo mostra o resumo do que o servidor gravou (ex.: "Seg–Sex 08:00–11:30") e só fecha quando a pessoa pede; se ela mexer nos horários depois disso, o resumo sai e o Salvar volta. Antes, quem preenchia só a segunda achava que tinha publicado a semana, e a Agenda só oferecia horário às segundas, sem aviso. Em telas largas, o botão do editor agora mostra o rótulo "Editar". Não há nada a configurar na atualização.

  Contribuição de @webtecnica (#2460), a partir da issue #2312 de @aleflores35.

- **Notas internas: autocompletar de menção (@) de atendentes, avisando só a pessoa escolhida** Ao digitar @ numa nota interna, abre a lista de atendentes da empresa. Quem é escolhido na lista fica gravado na nota pelo id da pessoa, e só ela recebe o aviso: duas atendentes com o mesmo primeiro nome deixam de ser avisadas juntas, e trocar o nome no cadastro não apaga a menção das notas antigas.

  Nota escrita à mão, sem passar pela lista, continua avisando do jeito de antes. Na nota, no sino e na prévia do aviso aparece só o nome (@Ana Lima); a exportação de dados do titular (LGPD) e o histórico que o agente de IA lê também recebem o texto legível, sem o identificador interno do atendente. Não há nada a configurar na atualização.

  Contribuição de @webtecnica (#2461), a partir da issue #2372 de @Fabio-Ribeir0.

- **Autorizar atendimento por IA a partir de um formulário** A fonte de formulário pode autorizar novos contatos para IA quando o envio estiver completo e houver consentimento explícito para atendimento automatizado. A opção nasce desligada e exige assinatura do integrador para conferir a origem do envio. O CRM confere fonte, organização, card e contato e preserva recusas e atendimento humano. Conceder ou renovar uma autorização vencida exige `external_id`, que impede que o reenvio do mesmo envio libere de novo; a recusa revoga mesmo sem ele. O integrador precisa enviar o aceite separado da política de privacidade; agente, canal e fluxo continuam precisando de configuração.

  Contribuição de @vagnerrm122 (#2452).

- **O CRM no celular ganha barra de abas, movimento nos sobrepostos e alvos de toque de 44px** No celular, uma barra de abas fixa no rodapé leva a Inbox, Funis, Agenda, Desempenho e "Mais" (a gaveta com tudo), e mostra só o que o menu lateral mostraria para aquele papel, módulos e plano; acima de 768px ela some. Gavetas, janelas e menus passaram a se mover (as classes de animação vinham de um plugin nunca instalado e não geravam CSS), respeitando o movimento reduzido, e o esqueleto de carregamento ficou visível. Campos, abas, seletores e botões têm 44px onde quem aciona é o dedo, e os campos usam 16px, o que acaba com o zoom do iPhone ao tocar a busca. O funil desliza uma etapa por gesto e a caixa de seleção do card aparece sem mouse; a agenda deixou de cortar texto; o painel de Desempenho ganhou tela de espera e de erro com "Tentar de novo"; a barra e os avisos respeitam o notch e o indicador de home.

  **Isto muda o desktop também:** o aviso (toast) passou do canto superior direito para o inferior direito. Fora isso, o layout no laptop não muda. Não há nada a configurar na atualização.

  Contribuição de @LeonardoMarcelo (#2411).

- **O Jev passa a conferir se o que o agente afirma sobre o negócio está no material consultado** Antes de cada resposta do agente sair, o Jev pode conferir as afirmações de fato que ela faz sobre o negócio (horário, preço, endereço, o que o lugar tem ou não tem) contra o material que o agente consultou naquele turno. Uma frase como "o check-in é a partir das 12h", quando o material diz 14h, é marcada como contradição; "temos piscina aquecida", quando o material não fala de piscina, é marcada como fora da base. Perguntas, saudações e links ficam de fora da conferência, e quando o agente não consultou material nenhum no turno, a conferência não roda.

  **Nasce em observação e não muda nada para o cliente.** O Jev vem desligado por padrão. Ligado, esta conferência só anota o que encontrou, na tarefa nova "Conferir afirmações de fato na resposta", no cartão do Jev, e a mensagem segue como hoje: nesta versão a tarefa não oferece "Deixar o Jev decidir". A guarda de promessa ("faço de graça", "entrego amanhã") não muda.

  **Custo:** com o Jev ligado, no máximo uma chamada a ele por turno do agente que tenha consultado material, e ela entra no Uso de IA e soma no consumo do mês. Uma reescrita da mesma resposta reaproveita a conferência e não paga de novo. A chamada acontece antes de o envio reservar a vez do número, junto da conferência de promessa, e não prende a fila do WhatsApp.

  Contribuição de @webtecnica (#2438), a partir da issue #2231 de @TOSTES-LAB.

- **Interruptor por empresa que desliga de uma vez todo passo a IA decide das automações** O passo `a IA decide` (#2228) passa a ter um freio único por organização: em
  Configurações → Automações, um interruptor desliga, de uma vez, todos os
  `ai_decide` da empresa, sem editar regra por regra.

  Com o interruptor desligado, a ação não consulta o modelo em nenhuma regra — o
  run grava `ai_decide_desligado_na_empresa` e a aba Atividade mostra a frase,
  com o caminho do interruptor dentro dela. A pré-checagem de adiamento também
  deixa de adiar o evento por um passo que não vai rodar, então as demais ações
  do mesmo gatilho não esperam à toa.

  A chave mora em `organizations.settings.automacoes.ai_decide` e o padrão é
  LIGADO: regra gravada depois do #2228 continua decidindo sem ninguém precisar
  ligar nada. Se não der para ler o interruptor, o passo não consulta o modelo e
  o run registra o motivo próprio `ai_decide_interruptor_ilegivel` (a próxima
  execução tenta de novo; aquele evento não é refeito), e a tela avisa que não
  conseguiu ler em vez de mostrar ligado. A troca entra no audit log com
  `settings.automation_ai_decide_updated`.

  Contribuição de @webtecnica (#2459, refs #2367).

- **O Jev percebe, numa mensagem represada pelo teto de envio, um risco que a regra de urgência não viu** Quando o número do WhatsApp está em warm-up ou bateu o teto de envio do dia, a resposta automática é adiada — às vezes por 20 horas. O produto já tinha uma regra que abre um alerta crítico na Central quando o cliente escreve uma urgência no vocabulário dela ("socorro", "sem freio", "cheiro de queimado"), e essa regra continua sendo a que decide. Mas ela fala só português e é conservadora de propósito: "minha mãe caiu e não consegue levantar", "o pedal afundou, tô na estrada", "the battery is swelling" ou "la estufa huele a gas" passam batidos, e a pessoa espera a janela inteira sem ninguém saber.

  Agora o Jev é perguntado, nessas mensagens represadas, apenas onde a regra disse não — com duas perguntas: se há risco à segurança ou à saúde agora, e se a frase é hipótese, fato passado ou figura de linguagem. Acima de 0,8 no risco e abaixo de 0,5 no hipotético, quando a equipe escolhe "Avisar a equipe", o Jev abre o mesmo alerta crítico que a regra abre, com a origem "percebido pelo modelo de decisão" visível só para vocês. A frase do cliente não vai para a Central: quem lê o alerta abre a conversa para ler.

  Começa em observação, como toda tarefa nova: o cartão em Agentes IA › Jev conta as mensagens em que o Jev percebeu esse risco que a regra não reconheceu, com link para a conversa, e "Avisar a equipe" fica atrás de uma confirmação. Nada muda no atendimento: o Jev não responde ao cliente, não passa a conversa, não cala o assistente e não fura o teto de envio. Com o Jev desligado, sem chave ou com o provedor fora, vale exatamente o comportamento de antes.

  Contribuição de @webtecnica (#2437), a partir da issue #2232 de @TOSTES-LAB.

- **Videochamada por Jitsi Meet direto da conversa** O cabeçalho da conversa ganha o botão **Vídeo**: ele cria uma sala nova a cada chamada, que abre em nova aba, e permite copiar o link ou enviá-lo na conversa. O envio segue a trava do campo de resposta: com a janela de 24h fechada, contato bloqueado ou anonimizado ou conversa encerrada, o botão desabilita e diz o motivo. Nada é gravado e não há migration; quem tem o link entra na sala.

  A feature nasce desligada: sem `JITSI_SERVER_URL` no `.env`, o botão não aparece e nada muda. Para ligar, veja `docs/features/videochamada.md` e o bloco do `.env.example`; a URL é lida em runtime, sem rebuild, e aparece em Recursos opcionais.

  Contribuição de @webtecnica (#2441, refs #2440).

### Alterado

- **A limpeza de mídia antiga passa a alcançar o anexo de nota interna** A limpeza diária já apagava fotos, áudios e documentos do WhatsApp mais velhos que o prazo da empresa (padrão 365 dias, mínimo 30). O arquivo anexado a uma **nota interna** ficava fora dessa regra de prazo: enquanto a nota existisse, ele nunca saía, e numa VPS com 1 GB de armazenamento dividido com a mídia do WhatsApp esses anexos (até 50 MB cada) cresciam sem limite.

  **Isto muda o que a versão 1.62.0 anunciou** ("enquanto a nota existir, o anexo continua lá"). A partir desta versão, a regra de prazo também alcança o anexo de nota que ainda existe, nas mesmas condições da mídia de conversa:

  - o **mesmo prazo** da empresa, contado a partir da data da nota;
  - o **mesmo interruptor** ("Limpeza automática de mídia antiga", nas configurações da empresa), que vem **ligado** por padrão: com ele desligado, a regra de prazo não apaga anexo de nota;
  - a **mesma pausa**: enquanto a empresa tem um pedido de LGPD em andamento, a limpeza por prazo fica parada.

  O que continua como era: o anexo de uma nota **apagada** sai no dia seguinte, com o interruptor ligado ou desligado, e o atendimento de um pedido de LGPD continua apagando os anexos do titular.

  Quando o anexo vence, só o arquivo sai. A nota continua lá, com o texto, mas **sem aviso** de que teve um anexo (a mensagem, ao contrário, mostra "Mídia apagada pela política de retenção").

  Quando isso começa a apagar: o anexo de nota existe desde a 1.62.0 (28/09/2026). Com o prazo padrão de 365 dias, nenhum vence antes de 28/09/2027. Com um prazo menor, os anexos mais velhos que ele saem na primeira limpeza depois de atualizar.

  Você não precisa fazer nada. Quem quer guardar os anexos de nota desliga o mesmo interruptor, sabendo que ele também para a limpeza por prazo da mídia do WhatsApp.

  Contribuição de @webtecnica (#2309), a partir da issue #1887.

- **Cada mensagem do WhatsApp faz menos chamadas ao banco, e a conferência de mensagens presas roda a cada 5 minutos** Cada evento que o WhatsApp entrega ao CRM (mensagem, confirmação de leitura, mudança de estado da conexão) fazia duas consultas ao banco antes de qualquer trabalho: buscar a conexão e decifrar o segredo da assinatura. Agora o CRM guarda esse par por 30 segundos na memória, e só volta a consultar o banco depois disso. Numa instalação em produção, a busca da conexão era a chamada que mais aparecia no registro do Supabase, e o plano grátis tem um teto de registros por mês. A conexão recém-criada, a falha de consulta e o segredo trocado continuam sendo lidos do banco na hora.

  A conferência de mensagens que ficaram presas em "enviando" passou de uma vez por minuto para uma vez a cada 5 minutos. Ela só marca como falha a mensagem presa há mais de 5 minutos, então rodar a cada minuto não adiantava a correção; o efeito é que uma mensagem presa pode levar até 10 minutos (antes, até 6) para aparecer como falha e gerar o aviso na Central.

  Não há nada a configurar na atualização.

  Contribuição de @automatikpg-ux (#2469).

### Corrigido

- **O roteador volta a mostrar o funil e a etapa de destino depois de salvar e recarregar** O editor do roteador aceitava salvar o funil e a etapa de destino de uma intenção, mas ao recarregar a página os dois campos voltavam para "Sem destino — só escolher o agente". A gravação existia (o banco e a API de detalhe já lidavam com os campos); o que faltava era a tela enxergar o que estava salvo: a carga inicial do editor (server-side) não selecionava o funil e a etapa de destino dos membros, e o estado editável da tela não reidratava quando a busca em segundo plano devolvia a resposta completa da API.

  Agora a carga inicial traz os dois campos e a tela reidrata o destino quando o dado carregado muda — sem sobrescrever uma edição local pendente. A regra continua a mesma: etapa vazia = primeira etapa aberta do funil; funil vazio = só escolher o agente.

  Atenção: antes desta correção, salvar as intenções de um roteador regravava sem destino toda intenção cujo funil não tivesse sido escolhido de novo naquele salvamento, porque a tela não enxergava o que estava salvo. O defeito veio com o destino por intenção, nas versões 1.73.0 e 1.74.0. Se algum roteador teve as intenções salvas nesse estado, o funil e a etapa de destino podem ter sido apagados. Vale abrir o editor de cada roteador e conferir. Não há nada a configurar na atualização.

  Contribuição de @webtecnica (#2431), a partir da issue #2415 de @Fabricio-Point-Machine.

- **Erro antigo de sincronização Google some sozinho quando não há mais nada para enviar** Um compromisso cuja sincronização com o Google falhou um dia (por exemplo, com a conta desconectada) continuava mostrando o erro para sempre, mesmo depois de a conexão voltar e não haver mais nada para enviar — e o botão "Tentar sincronizar novamente" não resolvia, porque a rodada seguinte concluía que estava tudo igual e mantinha o texto do erro.

  Agora, quando a rodada confirma que está tudo igual, ela apaga o erro guardado. Nada muda para quem nunca viu esse erro.

  Contribuição de @paulolimajr77 (#2470).

- **A assinatura do ChatGPT só aparece quando o recurso está ligado na instalação** O login do ChatGPT por assinatura é um recurso opcional da instalação, desligado por padrão. A tela de Credenciais já respeitava isso, mas outras telas não: Provedores, o editor do agente e o passo da chave no onboarding ofereciam "OpenAI pela assinatura (ChatGPT)" para toda empresa. Também dava para gravar essa opção num ponto de IA, no modelo padrão da empresa ou na versão de um agente, mesmo com o recurso desligado.

  Agora, com o recurso desligado, a opção não aparece nessas telas e toda gravação com ela é recusada, com uma mensagem dizendo que o recurso está desligado. Isso inclui voltar um agente para uma versão antiga que usava a assinatura. Com o recurso ligado, nada muda. Não há nada a configurar na atualização.

- **A conta do ChatGPT por assinatura só se conecta pelo botão de login** A credencial da assinatura do ChatGPT nasce marcada como conferida, porque quem a confere é o login. Mas o cadastro comum de chave (a API de credenciais e o passo da chave no onboarding) aceitava essa opção com um texto colado, e o texto virava uma credencial "conferida" sem login nenhum. Agora esses caminhos recusam a assinatura sempre, com o recurso ligado ou desligado, e a mensagem indica o botão de login em IA › Credenciais. O passo da chave no onboarding também deixou de oferecer essa opção.

  Duplicar um agente que usa a assinatura, com o recurso desligado, agora é recusado com a mesma mensagem das outras gravações. Antes, a cópia voltava a usar a assinatura. A montagem do agente de prospecção pula a assinatura quando o recurso está desligado e escolhe a próxima chave que funciona. Não há nada a configurar na atualização.

- **Canal pausado não reage mais: push, follow-up, retorno e automação ficam quietos** A pausa de um canal já tirava a conversa da caixa de entrada, acordava a IA e barrava o envio (1.74.0), mas os efeitos internos de uma mensagem recebida continuavam rodando: o push no celular disparava, de conversa individual e de grupo, com uma conversa que nem aparece na lista, o fluxo de follow-up avançava o nó e gravava o texto, o contato era inscrito no gatilho de retorno, e — o que de fato saía para fora — uma regra de automação podia disparar um webhook HTTP de saída com mensagem de canal que o operador acabou de desligar. O follow-up agendado antes da pausa ainda queimava as 5 tentativas do job e virava um Job descartado com aviso crítico na Central, um por follow-up, com o canal desligado e nada a fazer. Agora os cinco leem o canal da própria mensagem antes de agir e respondem "pulado — canal desativado": nada muda para quem está com o canal ligado, e, depois de religar o canal, as mensagens que chegarem voltam a correr como antes, sem reimportar nada. O que chegou ou venceu durante a pausa não é reprocessado: um follow-up que parou num nó do fluxo enquanto o canal estava desligado não volta sozinho. O job de follow-up de canal pausado passa a ser consumido sem erro — fim das retentativas e do alerta crítico.

  Contribuição de @webtecnica (#2433, refs #2329).

- **A confirmação de ligar a limpeza de mídia cita o anexo da nota interna** Com o #2309, ligar a "Limpeza automática de mídia antiga" passou a apagar também o anexo de nota interna que venceu o prazo. A frase de confirmação mostrada antes de ligar o interruptor, porém, continuava dizendo só "a mídia de mensagem com mais de {n} dias começará a ser apagada" — um consentimento para uma ação irreversível que subdeclara o que ele cobre. A frase de estado "Desligado: a mídia das conversas não é apagada por idade." tinha o mesmo problema, e a frase "Ligado: apaga a mídia com mais de {n} dias." também não citava a nota. As três agora citam o anexo de nota interna junto, em português, espanhol e inglês (pt, es e en). O comportamento da limpeza não muda: continua apagando o que apagava antes, e nenhuma ação é necessária.

  Contribuição de @webtecnica (#2466), a partir da issue #2428.

- **A IA não é mais pausada por engano quando o eco de uma mensagem enviada chega durante o próprio envio** Toda mensagem que o CRM envia pelo WhatsApp volta como um "eco" pelo webhook. O eco chegava enquanto o envio era confirmado e a IA era pausada por 1 hora, como se uma pessoa tivesse respondido pelo celular. Em versões anteriores à 1.60.0, a mensagem também aparecia duas vezes na conversa. O cliente que respondia nesse intervalo ficava sem resposta. Isso foi medido numa campanha real: o eco chegou 14 segundos depois do envio, e a confirmação caiu no meio do processamento dele.

  Agora o eco é reconhecido nessa janela também: a linha duplicada sai e a IA continua atendendo. A limpeza do eco depois do envio também passou a reconhecer, pelo final do id, o eco que volta com o contato identificado de outro jeito (`@lid` de um lado, `@c.us` do outro), inclusive ecos gravados no formato antigo, de antes da 1.60.0.

  Não há nada a configurar na atualização.

  Contribuição de @automatikpg-ux (#2468).

- **Os eventos de etapa da Meta saem pelo canal da conversa quando não há conexão direta** Com as regras de etapa da Meta (Configurações › Conversões), quem não tem token e conjunto de dados próprios — e reporta pela ponte do canal intermediado, como já fazia com a compra — via toda entrada de etapa ficar "Não enviado", com o motivo `sem_conexao`. Agora o evento de etapa vai pelo mesmo caminho da compra: o nome padrão da Meta (o gravado no primeiro envio e, na falta dele, o da regra), o instante da entrada na etapa e nenhum valor, igual ao envio direto. Com a conexão direta configurada nada muda, e os eventos que ficaram parados podem ser reprocessados pelo Histórico de envios.

  Em Configurações › Conversões, a seção "O que cada etapa do funil informa à Meta" passa a aparecer também para quem envia pelo canal da conversa (a chave "Enviar vendas pelo canal da conversa"); antes ela só aparecia com a conexão direta, e as regras não podiam ser vistas nem editadas pela tela.

  Contribuição de @jmpo (#2455).

- **Ajustar o invariante que a própria branch criou deixa de pedir a válvula** Para quem desenvolve no repositório: a catraca de `tests/invariants/` passa a aceitar, sem `DESKCOMM_GOV_INVARIANTS_EDIT=1`, a modificação de um invariante que a própria branch criou e que a `main` ainda não tem. Invariante da `main` editado, apagado, renomeado ou revertido continua barrado, e sem a ref `origin/main` a guarda falha fechada. Rodar `git fetch` antes de trabalhar mantém a guarda exata. Não exige ação de ninguém.

- **Etiqueta posta pelo agente de IA ou por integração (MCP) agora dispara a automação "ganhou uma etiqueta"** A ferramenta `crm_manage_tags` gravava a etiqueta no contato ou no negócio, mas não emitia o evento que a tela emite. Resultado: a regra "Quando um contato ganhar uma tag" (ou "Quando um lead ganhar uma tag") disparava quando a pessoa punha a etiqueta pela tela e ficava muda quando a mesma etiqueta chegava pela MCP — seja de um sistema de fora, como o n8n, seja do próprio agente de IA do CRM, que usa essa ferramenta para etiquetar durante a conversa. Regras de "ganhou etiqueta" que antes ficavam caladas quando a IA etiquetava passam a disparar.

  Agora a ferramenta emite `contact.tag_added` / `lead.tag_added` com o mesmo envelope da tela: só as etiquetas que o alvo não tinha, a lista completa e a origem do atendimento. Reenviar uma etiqueta que já estava, ou só remover, não emite nada. Conversa continua sem esse gatilho. Se a emissão do evento falhar, a etiqueta continua gravada e a falha vai para o log. Sem migration e sem ação do operador.

  Contribuição de @rgisjr (#2444, mesclada pelo #2445).

- **A paleta de comandos (⌘K) volta a caber na tela** A busca rápida aberta por **⌘K** encostava no alto da janela e saía cortada, sem como rolar até o conteúdo de cima. A causa era a animação de entrada dos sobrepostos, que passava por cima do ancoramento da paleta. Agora ela abre centralizada, com rolagem interna quando a lista é longa.

  Contribuição de @LeonardoMarcelo (#2411).

- **O restore.sh para antes num banco que já existe e restaura num banco vazio** Quem restaurava um backup com o `restore.sh` por cima de um banco que ainda tinha o schema recebia "✓ banco restaurado" sem nada ter voltado: o psql seguia por cima dos milhares de erros "already exists" e saía com zero, e as linhas apagadas de tabela cheia não voltavam. O script agora conta as tabelas de `public` antes de pedir a confirmação e, se o banco já tem o schema, para com a própria mensagem — sem alterar nada e sem nem chamar o `psql`.

  Também saíram as flags `-v ON_ERROR_STOP=1 --single-transaction`, porque elas faziam o restore falhar também em banco **vazio**. O dump do `backup.sh` traz os schemas internos (`auth`, `storage`, `realtime`, `vault`) e extensões como `pg_net`, que já existem num Supabase novo: medido em Supabase novo, Postgres 17 puro e database nova, as três deram `rc=3` e 0 tabelas; sem elas, nos dois primeiros, o mesmo dump entrou com `rc=0` e 110 tabelas. Restaurar num banco novo continua funcionando, e quem segura o banco populado é a checagem da contagem. Como não há mais transação única, uma falha fatal do psql deixa o banco incompleto — o script e o README avisam para conferir o estado antes de repetir.

  O script e o README agora dizem, em português, que o dump sai sem `--clean` e portanto não restaura por cima de um banco existente. Se a contagem não volta um número, o script também para sem alterar nada. Não é preciso fazer nada na instalação.

  Mudou o que o sistema diz quando uma atualização dá errado: a tela de atualização, as mensagens do `update.sh`, os READMEs e os guias deixaram de prometer que o `restore.sh` volta o backup por cima do banco em uso — essa promessa já era falsa antes, porque o restore dizia "✓" sem restaurar. Hoje o backup só volta num banco vazio, como um projeto Supabase novo em que o instalador ainda não rodou; fora disso, peça ajuda. Voltar o backup por cima do banco existente segue em aberto na #2120.

  Contribuição de @webtecnica (#2142), a partir da issue #2120 de @spoliagency.

- **O scrub da telemetria passa a apagar NIF, IBAN e código postal de Portugal, e o +55 com hífen ou ponto** O scrub da telemetria (`lib/sentry/scrub.ts`), que o Sentry e o Jev usam, não conhecia o perfil do país da organização — a máscara da ingestão para a IA conhecia, desde o #2416. Com isso, uma organização de Portugal ainda deixava passar no Jev formas que a ingestão já mascara: o NIF `PT123456789` saía inteiro, o IBAN saía `PT50 [PHONE] [PHONE] 9015 4` (a cadeia de telefone comia os blocos de 4 dígitos por dentro) e o código postal `1000-001` não caía. No Brasil, `+55-11-98765-4321` saía inteiro e `+55.11.98765.4321` saía `+55.[PHONE]`: o separador depois do `55` só aceitava espaço.

  O scrub agora aplica os padrões declarados em `lib/legal/perfil-do-pais.ts`, de todos os perfis — porque quem chama este scrub não tem organização na mão. O IBAN vem antes da cadeia de telefone, pela mesma razão do `apikey` e do UUID, e os demais vêm depois, para o que já saía apagado continuar saindo no mesmo formato de antes (o NIF sem prefixo segue saindo `[PHONE]`, como no #2345). Os resultados são travados por teste de resultado exato, forma a forma.

  No Brasil a máscara também cresce, e para TODA organização, porque o scrub não sabe o país e aplica todos os perfis: no Sentry e nos textos que o Jev lê, o CEP com hífen (`01310-100`) passa a sair `[CEP]`, e grupos de dígitos com a forma do código postal português (`1234 567`, `1234-567`) ou do NIF em dois blocos (`123456 789`) passam a sair `[CODIGO_POSTAL]` e `[NIF]` — também quando são um número de lote, protocolo ou pedido, e não dado pessoal. A conferência de campo personalizado fica de fora: ela pergunta ao Jev se o valor que a IA quer gravar foi dito pelo cliente, e com `[CEP]` na mensagem recusaria o CEP que o cliente acabou de digitar. Por isso ela continua recebendo as mensagens exatamente como antes.

  Contribuição de @webtecnica (#2435).

## [1.75.0] — 2026-10-06

### Adicionado

- **Admin › Sistema mostra se as entregas do WhatsApp já chegam assinadas** Ao lado do interruptor **"Exigir assinatura nas entregas do canal"**, em **Admin › Sistema**, a tela passa a dizer se as últimas entregas do WhatsApp chegaram assinadas (sim ou não), com a data da última assinada e da última sem assinatura, olhando os últimos 7 dias. Quando a resposta é sim e o interruptor está desligado, ela sugere: _"Pode ligar: o WhatsApp já assina."_

  O "sim" só aparece quando **nenhuma** entrega chegou sem assinatura desde a primeira assinada: se algum número chegou sem assinatura depois disso, a resposta é não e a tela não sugere ligar. Um número que não entregou nada nesse intervalo não entra na conta — com o WAHA do compose do Deskcomm todas as sessões assinam juntas, mas se você usa mais de um servidor de WhatsApp, confira cada número antes de ligar.

  **O padrão não muda:** o interruptor continua desligado, e nada é ligado sozinho. O conserto do nome da variável do segredo no compose saiu na v1.73.0, e com ele o WAHA do compose deve passar a assinar as entregas (ainda não medido numa VPS atualizada); a tela é justamente o jeito de conferir isso na sua instalação antes de ligar a exigência. Só quem administra a plataforma vê esta informação. Construído sobre o conserto de @paulolimajr77 (#2268).

- **Contato pessoal sai da operação com um toque** Quem usa o mesmo número para vender e para a vida agora pode marcar o contato como pessoal: gerente e dono ligam e desligam a marca no cabeçalho da conversa ou na ficha do contato. Marcar grava quem marcou e quando em auditoria e na linha do tempo, cancela follow-ups e retornos pendentes, tira o contato da campanha com saída própria (sem contar como "pediu para parar"), pula a prospecção e fecha as conversas tirando do atendente. Depois de marcado, o contato some do inbox, da busca, das contagens, do funil, da base da IA e das ferramentas externas (leitura exclui, escrita recusa); nenhum envio sai pelo CRM em nenhum papel, e ligação de pessoal desliga gravada sem a IA atender. A lista de Contatos exclui por padrão e o filtro "Pessoais" mostra com selo. Desmarcar relista tudo com o histórico intacto, sem reativar nada. Atendente não marca nem desmarca.

  Contribuição de @paulolimajr77 (#2391).

- **Pausar todas e Retomar todas — a pausa em lote chega à Central de Conexões** A Central de Conexões ganha os botões **Pausar todas** e **Retomar todas**, com a contagem ao lado: uma só ação leva todos os números da empresa ao estado escolhido, no lugar de um clique por canal durante a janela de manutenção do rodízio. A ação usa exatamente o mesmo caminho da pausa individual — um registro de auditoria por canal, com quem fez —, então nada muda no efeito: pausado continua pausado e o que era recusado continua recusado. Repetir é seguro: canais que já estavam no estado escolhido não são gravados de novo nem enchem o histórico de eventos. Os excluídos ficam de fora da operação, sem virar erro, e se algum número não sair o aviso lista quais canais não saíram — nunca um sucesso pintado no que falhou.

  Contribuição de @webtecnica (#2405).

- **Redes sociais ganham desvinculação de perfil e avisam quando o canal fica órfão** Quem trocou a conta no provedor e viu a faixa de erro eterna agora tem saída pela tela: a aba Redes sociais mostra a seção "Canais sem conta no perfil" com o botão Excluir para as linhas órfãs, em vez de uma faixa que nunca fecha. Também dá para desvincular o perfil do provedor depois de arquivar ou excluir os canais sociais, liberando a troca de perfil sem prender o operador no perfil morto. Reconfigurar a credencial ressincroniza a chave de todos os canais do perfil, inclusive os arquivados. Na aba do provedor parceiro, a validação agora distingue chave que não lista nenhuma conta de conta fora do alcance da chave, e avisa quando o id colado é de perfil em vez de conta.

  Contribuição de @paulolimajr77 (#2417).

### Corrigido

- **A agenda do Google volta a pedir reconexão quando o Google revoga o acesso** Quando o Google recusava a renovação do acesso e mandava uma explicação junto (por exemplo "Token has been expired or revoked."), a conexão seguia aparecendo como conectada e a renovação falhava em silêncio a cada 10 minutos, sem ninguém ser avisado. Agora essa recusa é reconhecida: a agenda passa a mostrar que é preciso reconectar, e depois de reconectar a agenda volta a funcionar como antes. Um app do Google mal configurado na instalação também deixa de ser tentado de novo sem fim: a agenda passa a mostrar que o Google recusou o acesso, com o motivo que ele mandou. Não há nada a configurar. Contribuição de @webtecnica (#2392), a partir da issue #2384 de @marcelovolei15.

- **A audiência da campanha lê até o fim, e a prévia avisa quando bate o teto de 20.000** As três leituras que montam a audiência de uma campanha (contatos do recorte, contatos sem filtro de negócio e o negócio mais novo de cada contato) paginavam por `range` e encerravam na primeira página "curta". Numa instalação com o `max_rows` do PostgREST abaixo de 1.000 isso parava a leitura cedo, e a campanha saía com menos gente do que o filtro pedia — em silêncio; um negócio criado ou movido no meio da leitura também deslocava o `offset`. Agora a paginação é por keyset em (`created_at`, `id`) e só a página vazia encerra. E quando o recorte de negócio bate o teto de 20.000 linhas, a prévia avisa que a lista pode estar incompleta, em vez de cortar calada. Contribuição de @Tong-bit-art (#2406).

- **Campanha com funil de mais de 1.000 negócios prepara a audiência inteira** A consulta que escolhe os contatos pelo negócio (funil, etapa, responsável ou situação) lia no máximo 1.000 linhas: o PostgREST corta toda resposta nesse teto e a consulta não paginava. Uma campanha filtrada por um funil maior preparava uma audiência parcial, em silêncio — sem erro e sem aviso na prévia. A consulta agora pagina em blocos até o teto de 20.000 linhas (o teto que já existia, e que antes nunca era alcançado por causa do corte). Nenhuma ação é necessária. Contribuição de @Tong-bit-art (#2403).

- **Campanha com filtro de funil grande volta a preparar (a URL não estoura mais)** Na preparação de uma campanha, o filtro de funil (ou de etapa, responsável ou situação) punha todos os contatos do recorte numa única URL; acima de ~200 contatos o gateway devolvia `414 URI too long` e a preparação inteira caía. A consulta agora é fatiada em lotes que cabem na URL, com a ordem e o corte feitos uma única vez no fim (a ordem e o corte são os mesmos; com limite acima de 1.000 a campanha agora respeita o limite escolhido, antes cortado em 1.000 pelo servidor), a lista de excluídos saiu da URL (é aplicada antes do corte) e os incluídos à mão também vão em lotes. Nenhuma ação é necessária. Contribuição de @Tong-bit-art (#2401).

- **A conferência de promessa do agente sai de dentro do envio e deixa de prender o atendimento numa atualização de estrutura do banco** Antes de cada mensagem do agente sair, uma consulta à IA confere se o texto promete algo que a empresa não oferece ("faço de graça", "entrego amanhã"). Essa consulta rodava com a vez do número já reservada e com uma transação do banco aberta. Isso tinha dois custos. O primeiro era o travamento: enquanto a IA respondia, o registro dessa chamada era gravado por outra conexão, e uma atualização de estrutura do banco que chegasse nesse instante fechava um ciclo de esperas que o banco não consegue desfazer sozinho. O envio esperava a IA, o registro esperava a atualização e a atualização esperava o envio. Medido em produção numa VPS: o atendente automático inteiro ficou parado por 8 minutos e 47 segundos, e o CRM respondeu com erro por cerca de 10 minutos, até alguém interromper a atualização à mão. O segundo custo era a fila: qualquer outra mensagem do mesmo WhatsApp esperava a IA responder. Agora a conferência acontece antes de o envio reservar a vez do número, ao mesmo tempo que a pausa de "digitando…", e o cliente espera a mais longa das duas, e não a soma. As regras de envio não mudam: o intervalo entre mensagens, a janela de horário e a ordem por número seguem como antes. Quando o agente reescreve uma mensagem e tenta de novo com o mesmo texto, a conferência é reaproveitada e não é paga outra vez. O registro do próprio envio (a mensagem, o rastro da conferência e o controle de envios) ainda é gravado com a vez do número reservada, e esse resto do mesmo risco segue em análise em #2426. Até lá, o `update.sh` continua pausando o atendente automático antes de atualizar o banco, o que evita o ciclo numa atualização normal. Não é preciso fazer nada na instalação. Construído sobre o #2363 de @AlecsanderAbreu, que mediu em produção o travamento em ciclo, encontrou a causa e é coautor do conserto (#2121).

- **A consulta de CNPJ volta a funcionar — a BrasilAPI recusava o cabeçalho padrão do Node** Em **Empresas**, o botão "Consultar CNPJ" respondia sempre _"Não foi possível consultar o CNPJ"_, com a dica de que seria um bloqueio temporário e que valia tentar mais tarde. Não era: quando o código não define o cabeçalho `User-Agent`, o Node manda `User-Agent: node` sozinho, e a borda que serve a BrasilAPI recusa esse valor. A consulta nunca funcionou em instalação nenhuma — não era o seu IP, nem limite de uso, nem indisponibilidade do serviço.

  Medido contra o mesmo CNPJ, na mesma rodada: **recusa** (403 ou 429, conforme a medição) com `User-Agent: node`, sem o cabeçalho ou com ele vazio; **200** com o valor neutro que a consulta passa a mandar.

  O conserto alcança os três caminhos que falam com a BrasilAPI: a consulta do cadastro de empresa, o enriquecimento automático de uma empresa já criada e a importação em lote. Quem recebia o erro pode repetir a consulta — o formulário volta a ser preenchido com razão social, nome fantasia, telefone e endereço completo. Se a BrasilAPI recusar uma consulta mesmo assim, a dica na tela deixa de prometer que é temporário e só diz o código e o que fazer.

  O valor enviado é neutro e não leva o nome da marca: o cabeçalho sai para um terceiro, e uma instalação de marca própria não deve entregar o nome de quem a revende à BrasilAPI.

  Contribuição de @LeonardoMarcelo (#2407).

- **Excluir um canal social pela Central de Conexões agora apaga a assinatura de webhook no provedor** Quem excluía um canal de Instagram ou Facebook pela Central de Conexões (em vez da aba Redes sociais) deixava a assinatura de webhook viva no Zernio: como a assinatura é por chave e não por conta, o provedor continuava entregando eventos numa URL que virou 404, sem erro do nosso lado — e se o perfil fosse desvinculado depois, essa assinatura ficava inalcançável. Agora a exclusão apaga a assinatura antes de arquivar ou excluir a linha (pelo id gravado, ou reconciliada pela URL quando o id faltar) e registra o desfecho na auditoria; se o provedor estiver fora do ar, a exclusão segue em best-effort e a falha fica registrada. Nenhuma ação é necessária. Contribuição de @paulolimajr77 (#2424, fecha #2419).

- **Os feriados brasileiros do prazo de LGPD passam a ser calculados, sem fim em 2030** O calendário de feriados brasileiros usado para contar o prazo de um pedido de titular era uma lista à mão só de 2026 a 2030 — fixos e móveis. A partir de 2031 o prazo seria contado sem feriado nenhum, sem erro e sem aviso. A Páscoa e os móveis que dependem dela (Carnaval, Sexta-feira Santa e Corpo de Deus) agora são calculados para qualquer ano, com o MESMO cálculo que Portugal usa; a cobertura vai até 2100 e um teste reprova se ela não alcançar o ano atual + 2. As datas que já existiam de 2026 a 2030 continuam exatamente as mesmas (o 20 de novembro, que faltava, entra em item próprio desta versão). Contribuição de @Tong-bit-art (#2420).

- **Os feriados portugueses do prazo do RGPD passam a ser calculados, sem fim em 2030** O calendário de feriados de Portugal usado para contar o prazo de um pedido de titular era uma lista à mão de 2026 a 2030: depois disso o prazo passaria a ser contado sem os feriados, em silêncio. A Páscoa e os feriados que dependem dela (Sexta-feira Santa e Corpo de Deus) agora são calculados para qualquer ano, a cobertura vai até 2100 e um teste reprova se o calendário não alcançar o ano atual + 2. O conjunto é o mesmo de antes — Carnaval continua fora, por ser facultativo. Contribuição de @Tong-bit-art (#2410, refs #2346).

- **A recusa do Google na renovação diz o status HTTP, e a recusa sem motivo vira conexão quebrada** Quando a renovação do token de uma agenda do Google falhava, a frase gravada dizia "sem resposta" mesmo quando o Google tinha respondido — quem lê procurava problema de rede para um acesso revogado. Agora a frase nomeia o status (`HTTP 400 (invalid_grant: ...)`), e a recusa que o Google respondeu com erro (não-2xx) sem motivo reconhecido marca a conexão como quebrada (`error`), em vez de ficar saudável repetindo para sempre. Queda de rede continua transitória, sem mexer na conexão — tanto a que acontece antes da resposta quanto a que corta o corpo no meio da leitura de uma resposta 200. Uma resposta 200 sem `access_token` também não conta como recusa e não mexe na conexão. Contribuição de @Tong-bit-art (#2400).

- **A conversa aberta no inbox que está fora da aba atual passa a se atualizar sozinha** Uma conversa aberta que não aparece na aba atual do inbox (fechada, ou de outro filtro) não recebia as mudanças que chegavam de fora, como uma mensagem nova, e podia ficar mostrando o estado antigo até um F5. Agora ela se atualiza sozinha. De quebra, os vários avisos de mudança que uma única mensagem gera viram uma só atualização da lista, em vez de várias que se cancelavam: menos carga no servidor. Não há nada a configurar.

- **A lista do inbox não volta ao esqueleto no meio da carga da Fila, nem some quando uma recarga falha** Quem abria a caixa de entrada via a lista de conversas aparecer, sumir e voltar como esqueletos: quando a leitura do atendimento automático respondia, a chave da busca da Fila mudava, a resposta que já tinha chegado era descartada e uma segunda requisição saía ~2 s depois — de 1 a 3 s de tela vazia a cada carga do inbox, medido no trace do #2360. Um refetch que falhava com a lista na tela também a apagava e trocava a tela cheia por "Erro ao carregar conversas". Agora, nessa troca (a mesma Fila, com a mesma busca e os mesmos filtros, só com a resposta do automático), a lista anterior fica visível até a nova chegar; uma recarga que falha deixa a lista onde está e o aviso de erro aparece sem destruir a tela; e a conversa aberta deixa de piscar junto. Trocar de aba ou de busca continua mostrando o esqueleto enquanto a lista nova carrega, para que nenhuma linha da aba anterior apareça como se fosse da nova. Nenhuma ação é necessária. Contribuição de @webtecnica (#2414).

- **O 20 de novembro passa a contar como feriado no prazo de LGPD do Brasil** O prazo para atender um pedido de titular no Brasil (7 dias úteis para entregar os dados, 15 para anonimizar) não descontava o 20 de novembro, Dia Nacional de Zumbi e da Consciência Negra, feriado nacional desde 2024 pela Lei 14.759/2023. Quando a data caía num dia de semana no meio do prazo, o vencimento saía um dia antes do que a lei permite. Agora o 20/11 entra no calendário a partir de 2024 (não antes): o prazo de um pedido que atravessa a data passa a vencer um dia depois — em 2026 o 20/11 é sexta. Pedidos que não atravessam a data não mudam, e o operador não precisa fazer nada. Construído sobre o cálculo de feriados de @Tong-bit-art (#2420).

- **A máscara de PII de Portugal cobre as formas reais, e o scrub não desfigura número internacional** A máscara do perfil de Portugal só via o NIF em nove dígitos colados e o código postal com hífen: NIF com prefixo `PT` ou separado (`123 456 789`), IBAN (`PT50 …`) e o telefone `+351` passavam na ingestão para o RAG. Agora a máscara cobre essas formas — com o telefone ANTES do NIF, para não comer o miolo do número, e com o NIF deixando o CPF separado para o padrão brasileiro. E no scrub da telemetria (que o Jev usa) o número internacional deixa de sair como `+[CPF]8` e o NIF/telemóvel em três blocos deixa de passar; o CPF separado continua saindo inteiro, como antes.

  O telefone brasileiro (+55) sai exatamente como antes.

  Contribuição de @Tong-bit-art (#2416).

- **A IA confere o par provedor e modelo antes de chamar, e um Claude não vai mais para a OpenAI** Antes de cada chamada de IA (atendimento, agente, mídia, base de conhecimento e classificação), o sistema confere se o modelo é do provedor que vai receber o pedido. Um par trocado, como um modelo Claude enviado para a OpenAI, é recusado antes de sair, com o motivo no log, em vez de virar um erro do provedor no meio da fila. A classificação de clima de uma empresa que usa OpenAI, Google ou DeepSeek passa a usar o modelo da própria empresa; sem par próprio que funcione, segue com o modelo padrão de antes. Agentes e respostas automáticas continuam respondendo como antes, sem nada a configurar. Contribuição de @webtecnica (#2385), a partir da issue #2377 de @Fabricio-Point-Machine.

- **Marcar um contato como pessoal tira do RAG os trechos já ingeridos** Marcar um contato como pessoal já impedia que as conversas dele entrassem em ingestões futuras, mas os trechos que já estavam no acervo continuavam alcançáveis pelo agente como conhecimento. Agora a marcação também remove esses trechos, e a auditoria registra quantos saíram. Desmarcar não reingere: a conversa volta à vista e só volta ao acervo quando alguém a marcar de novo como útil para o RAG. Contribuição de @Tong-bit-art (#2396).

- **O token com "gerente" e "administrador" marcados passa a valer como administrador** Em **Configurações › API Tokens**, quem marcava as duas caixas, "Tratar o token como gerente" e "Tratar o token como administrador", podia receber um token que valia só como gerente. O papel saía do primeiro `role:` da lista de escopos, e a tela grava os escopos na ordem em que as caixas são clicadas. Quem clicava em gerente antes de administrador, a ordem natural de cima para baixo, ficava com um token de gerente: nas portas que exigem administrador, como editar, testar e publicar o agente de IA por token (`config:write`), a chamada voltava `403 forbidden_role` com _"Role 'manager' insufficient (required: 'admin')"_, mesmo com a caixa de administrador marcada. Quem clicava na ordem inversa já recebia um token de administrador.

  Agora vale o maior papel marcado, em qualquer ordem. Token sem papel continua valendo como atendente (`agent`), como antes, e um token marcado só como leitor (`role:viewer`) continua leitor: o conserto não sobe o papel de ninguém além do que a própria tela concedeu.

  Um token que já existe com as duas caixas marcadas **pode** passar a agir como administrador depois da atualização: só muda o que teve a caixa de gerente marcada antes da de administrador, e a ordem aparece na lista de permissões do token na tela. Era isso que a caixa de administrador prometia. Se não era essa a intenção, revogue o token e crie outro só com "gerente". Tokens sem a caixa de administrador não mudam.

  Contribuição de @valterhjr (#2423, refs #2422).

- **Desconectar uma rede social apaga a assinatura de webhook que ficou órfã no provedor** Conectar uma rede social cria a assinatura no provedor e grava o id dela no canal só no fim; quando essa gravação falhava, o canal ficava `FAILED` com a assinatura viva lá fora e sem nenhuma referência a ela aqui. Desconectar então arquivava o canal e rotacionava o token do webhook, e a assinatura seguia mandando evento para uma URL que acabou de virar 404 — para sempre, sem erro na tela: o operador via a conta desconectada e o provedor reenviando. Agora, sem o id gravado, a assinatura é encontrada pela URL do próprio canal (o mesmo casamento que a conexão já faz, para não duplicar) e apagada antes do arquivamento. Quem tem o id gravado continua exatamente pelo caminho de antes, e uma falha do provedor segura a desconexão com a linha intacta para poder ser tentada de novo. Contribuição de @webtecnica (#2412, fecha #2364).

## [1.74.0] — 2026-10-06

### Adicionado

- **Automações ganham o passo opcional "a IA decide", que escolhe uma entre as opções montadas na regra (por enquanto só pela API)** O passo `ai_decide` recebe uma instrução e de 2 a 6 opções, cada uma com uma ação comum (etiqueta, tarefa, mover o negócio, responsável, mensagem, chamar endereço externo). A IA devolve só o nome de uma opção e o sistema executa a ação pelo caminho de sempre; resposta fora da lista, vazia ou ilegível não executa nada, e o motivo aparece na aba Atividade.

  É opcional por regra: quem não monta o passo não muda nada nem gasta nada. **Gasta IA**: cada execução faz ao menos uma chamada ao modelo (duas, se a opção for responder pela IA), entra no custo das automações e respeita o teto mensal da empresa; a regra só salva se declarar o gasto (`custo_de_token: true`). Ainda **não tem tela**. Ao provedor de IA vão a mensagem, os dados do negócio e as etiquetas; e-mail, telefone, nome do contato, título do negócio, identificadores internos e o CPF do cadastro não saem, mas o texto da mensagem e os campos personalizados do negócio vão como estão. Nada muda na configuração.

  Contribuição de @webtecnica (#2228, refs #1970).

- **A mensagem da campanha pode usar campos personalizados do negócio e do contato** O texto da campanha passa a aceitar `{{lead.campo}}`, que vem do negócio mais recente do contato, e `{{contato.campo}}`, que vem do cadastro do contato (o caminho da automação, `{{lead.custom_fields.campo}}`, também funciona). Campo vazio, ausente ou contato sem negócio não manda texto pela metade: a pessoa sai da lista como "Falta um dado que a mensagem usa", e isso aparece na contagem antes de enviar. Não é preciso fazer nada na instalação. Contribuição de @webtecnica (#2357), a partir da issue #2311 de @aleflores35.

- **Canais ganham o botão pausar: desativado nunca entra na inbox** Cada número conectado passa a ter Pausar/Retomar na Central de Conexões (WhatsApp por QR, API oficial e redes sociais). Canal pausado continua listado, mas as mensagens dele não aparecem na inbox e não acordam a IA. E nada sai por ele: nem resposta da IA, follow-up, automação ou envio manual (o envio é recusado), nem o aviso de caso à equipe, se for ele a conexão escolhida para os avisos. A entrega continua gravada e reaparece ao retomar, sem reimportar nada. Quem ativou a notificação no celular ainda recebe a de nova mensagem de canal pausado. Nada muda para quem nunca pausar nada. Contribuição de @paulolimajr77 (#2318).

- **Conexão de banco externo: escolha a coluna que identifica o cliente nas conversas** A conexão com um banco de dados externo (em **Dados externos**) ganhou o campo
  **Cliente nas conversas**: você escolhe se o cliente é identificado pelo telefone ou pelo
  e-mail e qual coluna das suas tabelas guarda esse dado. Com a coluna escolhida, durante uma
  conversa de atendimento o agente lê só as linhas em que essa coluna é igual ao telefone ou ao
  e-mail de quem está falando. A lista de conexões mostra um aviso enquanto a coluna não estiver
  escolhida. Fora das conversas (equipe, integrações, API), a consulta segue como antes.

- **Um token novo com a permissão de configurar o agente edita, testa, publica e pausa o agente de IA sem a tela** Integrações (n8n, scripts, Claude Code) passam a poder ler e editar o cadastro e o rascunho do agente de IA, rodar o teste, publicar uma versão e pausar, desligar ou arquivar o agente por token de API, sem abrir o navegador. Isso exige criar um token NOVO em Configurações › API Tokens marcando a permissão nova de configurar o agente (`config:write`, e `config:read` para leitura) junto com "Tratar o token como administrador". Para listar as versões do agente e criar um rascunho novo, o token também precisa de "Agentes de IA podem LER/AGIR no CRM (MCP)"; sem elas, `config:write` só edita, testa e publica um rascunho cujo id a integração já conhece. Os tokens que já existem não mudam: mesmo os de administrador com permissão de agir no CRM continuam recebendo recusa nessas ações. Para quem não criar o token novo, nada muda: publicar, pausar e testar seguem pela tela. O que for feito por token fica na auditoria com o token identificado. Não é preciso fazer nada na instalação. Contribuição de @webtecnica (#2194), a partir da issue #2052 de @spoliagency.

- **O Jev pode escolher o agente sozinho, com a sua IA de sempre de reserva** Quem administra agora pode deixar o Jev escolher o agente sem consultar a IA de sempre em cada mensagem: ela só é chamada quando o Jev falha, não acha a intenção ou fica em dúvida. O modo só liga onde a empresa tem a IA de sempre configurada; sem ela, vale a comparação de hoje, e o cartão diz por quê. O editor do roteador ajusta de zero a 16 mensagens anteriores para a IA de sempre (o Jev continua recebendo só a mensagem atual), com oito por padrão em roteadores novos. IA › Execuções › Roteamento mostra custos, tempos, casos e revisão humana. A atualização não exige ação na VPS. Contribuição de @vitorlacerdadigital (#2061).

- **Conectar a assinatura do ChatGPT (login do Codex) pela própria tela, com a chave da organização como reserva** Em **Administração › Recursos opcionais** (`/admin/sistema`) há um interruptor novo, **Login do Codex por assinatura**, desligado por padrão, que só quem administra a instalação liga. Ligado, cada empresa conecta a própria conta no painel de **Credenciais** (quem revende escolhe se conecta a conta dele ou deixa o cliente conectar a sua): abre o link do Codex, entra com a conta da assinatura e cola o endereço em que o navegador parou (`localhost:1455`; a página não abrir é esperado). O par de tokens é guardado cifrado, como as chaves de IA, e renovado sozinho antes de vencer; se a assinatura falhar, a chamada cai na chave de API da própria empresa. A tela avisa que o `client_id` e o `redirect_uri` são do Codex e não são contrato público da OpenAI. Com o interruptor desligado, nada aparece para as empresas; nada a fazer para quem não quiser usar.

  Contribuição de @webtecnica (#1672, refs #1639).

- **Bloqueio opcional de afirmação clínica para negócios de saúde** Em Segurança, na configuração do agente, há uma nova proteção: "Não fazer afirmação clínica". Ligada, ela impede que o assistente envie mensagens que digam o que a pessoa tem (diagnóstico), indiquem remédio, pomada ou dose, garantam resultado ou digam que uma lesão é câncer. O assistente recebe a orientação de reescrever oferecendo consulta; se insistir, a mensagem continua barrada e um caso é aberto para a equipe (se o agente tiver casos ligados). Não consulta modelo nem tem custo, reconhece frases em português e espanhol, e vem desligada: só faz sentido em clínica e consultório, porque em outros negócios poderia barrar frases normais. Contribuição de @hampikamayuq (#2321, a proteção) e de @Tong-bit-art (#2323, o espanhol e a instrução negada "não pode passar creme").

- **Portugal passa a aparecer no seletor de país, com a citação do RGPD revisada por IA** Em Configurações › Empresa, o seletor de país passa a oferecer Portugal ao lado do Brasil. Escolhido Portugal, o contato usa o NIF (com o dígito de controlo da Autoridade Tributária), o exemplo de telefone é `+351`, o prazo do pedido de titular conta os feriados portugueses, e o documento de acesso cita `RGPD art. 15.º (Regulamento (UE) 2016/679)` com o rótulo "Direito exercido". O e-mail ao titular sai em português de Portugal, e nem ele nem o alarme ao encarregado citam a LGPD.

  **A revisão da citação foi feita por IA, por delegação do dono do produto (doc 88), em 2026-10-05. Não é parecer jurídico e não houve advogado em Portugal.** As fontes conferidas estão no cabeçalho de `lib/legal/perfil-do-pais.ts`, e a tela avisa quem escolhe Portugal: os prazos do sistema (7 e 15 dias úteis) são mais curtos que o mês legal; **trocar o país muda a regra do documento do contato — a partir daí, CPF enviado por API, importação ou integração é recusado como NIF inválido**; e o sistema não substitui o encarregado da proteção de dados, que deve confirmar os textos enviados aos titulares, sobretudo nas campanhas de marketing, que em Portugal, em regra, exigem consentimento prévio (Lei 41/2004, art. 13.º-A). Hoje só os webhooks da Nuvemshop criam pedido de titular; numa organização portuguesa com loja Nuvemshop brasileira o titular é brasileiro, e citar só o RGPD fica incompleto.

  O que NÃO muda: quem está no Brasil (ou nunca escolheu país) recebe o e-mail, o alarme, o PDF e o `data.json` exatamente como antes. Portugal só vale para a organização em que alguém o escolher.

  PR #2339, construído sobre o perfil de Portugal de @webtecnica (#2084), a partir da issue #1946 de @maclevison, que pediu o perfil e a revisão da citação.

- **A rede social conectada agora pode sair do atendimento ou ser desconectada pela tela** Antes, a tela de redes sociais só conectava. Quem ligava um Instagram ou um Facebook ao atendimento não tinha como desfazer: a assinatura de webhook continuava viva no provedor e as mensagens continuavam entrando. Agora cada conta tem dois botões, e os dois pedem confirmação. **Remover do atendimento** apaga a assinatura de webhook no provedor e arquiva o canal, e a conta continua vinculada para voltar a receber depois. **Desconectar conta** faz o mesmo e também remove a conta do provedor. Nos dois casos as conversas já recebidas continuam no CRM. Se o provedor recusar a chamada, o canal fica como estava e dá para tentar de novo. Contribuição de @rafaelbatistazz (#2362, refs #1314).

- **Em Portugal, o relatório de acesso do titular passa a trazer as alíneas do art. 15.º e a ligação para o data.json** Numa organização com país Portugal, o PDF de acesso ganha a secção "Informações exigidas pelo art. 15.º, n.º 1". A alínea e) traz os direitos de retificação, apagamento, limitação e oposição. A f) traz a autoridade de controlo (CNPD, com o site). A h) descreve os assistentes de IA que estão no ar: quem responde automaticamente e quem só sugere respostas para uma pessoa decidir. Se nenhum estiver no ar, diz que não há assistente a responder. As alíneas a), c) e d) (finalidades, destinatários e prazo de conservação) saem como "não informado pelo controlador", porque ainda não há tela para preenchê-las (#2356).

  O e-mail ao titular passa a levar também a ligação para o `data.json`, com a mesma validade do PDF. Esse ficheiro leva todas as mensagens do titular, e não só as 100 mais recentes. As outras secções têm um número máximo de registos, e as que atingiram esse número vêm listadas em `secoes_no_limite`. Por isso o relatório não chama a cópia de "completa".

  O que NÃO muda: no Brasil, o e-mail, o PDF e o `data.json` saem exatamente como antes, e o worker nem pede a ligação do `data.json`.

  Contribuição de @webtecnica (#2354, Refs #2340).

- **A limpeza automática de mídia antiga ganha um interruptor, e a conversa avisa quando a mídia foi apagada** A limpeza que apaga a mídia das conversas (fotos, áudios, documentos) com mais de N dias, ligada desde a 1.53.0, **continua ligada** em todas as empresas: nada muda para quem atualiza. O que entra é o controle e o aviso. Em **Configurações › Empresa**, o interruptor **Limpeza automática de mídia antiga** mostra "Ligado: apaga a mídia com mais de N dias" e permite desligar; para ligar de novo, a tela pede confirmação. A partir desta versão, quando a mídia de uma mensagem é apagada, a conversa mostra "Mídia apagada pela política de retenção (N dias)" em vez de um erro, a transcrição do áudio sai junto, e o sistema não tenta buscar o arquivo de novo no WhatsApp. A mídia apagada antes desta versão (desde a 1.53.0) não tem esse marcador e segue o caminho antigo: o sistema tenta buscá-la no WhatsApp e, se não achar, mostra "Mídia indisponível". Enquanto a empresa tem um pedido de LGPD em andamento, a limpeza dela fica pausada. O piso de 30 dias vale mesmo com valor menor gravado no banco.

  Contribuição de @webtecnica (#2180), a partir da issue #1534 de @franceschini-lucas.

### Corrigido

- **Gravar a partir de uma aba que ficou na organização antiga passa a ser recusado (nas telas que usam o cliente da API), e a aba avisa quando a sessão mudou** A organização ativa é uma só por sessão do navegador, mas cada aba mostrava a que tinha quando abriu: depois de trocar de empresa numa aba, as outras seguiam exibindo a antiga enquanto já liam e gravavam na nova.

  Agora a aba avisa ("Esta aba está numa organização diferente da sessão. Recarregar?") e não recarrega sozinha, para não perder formulário em edição. Nas telas que gravam pelo cliente da API (`apiClient`), o servidor recusa a escrita com `org_divergente` (409) quando a organização da aba não bate com a da sessão. As telas que gravam com `fetch` direto e as server actions ainda não estão cobertas; o restante fica na #2335. Nada muda na configuração.

  Relatado por @aleflores35 (#2313). Contribuição de @webtecnica (#2360, refs #2335).

- **A conexão do WhatsApp ganha uma opção de guardar o histórico do número, desligada por padrão** A sessão do canal nascia sem guardar o passado do aparelho (3 conversas e 1 MB no número medido, contra 825 conversas e 57 MB com o acervo). Agora a tela de conexões oferece, por conexão, "Guardar o histórico anterior à vinculação" (`noweb.store` com `enabled` e `fullSync`), **desligada por padrão**. O histórico fica no servidor do canal, fora do alcance da anonimização do CRM (acompanhado em #2320), e ligar a opção não faz conversa antiga aparecer no inbox.

  Ligar tem custo: a vinculação de um número movimentado gasta tempo, CPU e disco do canal (o contêiner tem teto de 1.280 MB na instalação padrão). O histórico anterior (cerca de 1 ano) só vem se a opção estiver ligada NA vinculação; num número já pareado, ligar guarda daqui em diante, sem QR novo, e a conexão reinicia por alguns segundos. **Desligar num número já pareado pode apagar o que o canal já guardou**, e a tela avisa. Instalações atualizadas não mudam nada sozinhas.

  Contribuição de @webtecnica (#2319), a partir da issue #999 de @rogercampel.

- **O atendente vê os modelos aprovados do WhatsApp oficial quando a janela de 24 horas fecha** No inbox, quando a janela de 24 horas de uma conversa do WhatsApp oficial fecha, a única forma de falar com o cliente é um modelo aprovado. Para o atendente (papel `agent`), esse seletor aparecia vazio: a lista de modelos pedia papel de administrador e devolvia "sem permissão". Agora quem atende lê a lista. Sincronizar modelos e gravar o link de mídia continuam só com administrador, como no canal intermediado.

  Contribuição de @webtecnica (#2359).

- **A busca de contatos acha o nome com ou sem acento** A busca da lista de contatos comparava o nome com `ilike`, que ignora maiúsculas mas não ignora acento: quem digitava "Joao" não achava "João", e "MARCIA" não achava "Márcia". Agora as quatro colunas de texto (nome, nome exibido, e-mail e telefone) usam `imatch`, e cada letra com acento do português vira uma classe (`jo[aáàâãä…]o`), então o termo acha o cadastro nos dois sentidos, sem migração e sem `unaccent` no banco.

  Letra acentuada fora do português (`ñ`, `ë`, `å`, `ò`) continua achando pela grafia exata, como antes. Asteriscos seguidos no termo viram um curinga só, para que um termo longo de `*` não trave a consulta. Telefone e CPF seguem com a mesma comparação de antes. A busca de conversas continua em `ilike` e ainda não acha o nome sem o acento.

  Contribuição de @webtecnica (#2310, Refs #1835).

- **A tela de Produtos encontra qualquer produto do catálogo, não só os 500 primeiros** A tela de Produtos carregava só os 500 primeiros produtos e a busca procurava apenas entre eles. Em catálogos maiores, o restante não aparecia nem buscando pelo nome, embora o atendente de IA continuasse encontrando todos. Agora a busca procura no catálogo inteiro, por nome, código, marca ou categoria, e a lista mostra 50 produtos por página, com o total e botões para avançar e voltar. A busca também deixou de falhar quando o texto tem vírgula ou parênteses, e um `%` digitado passou a ser procurado como caractere, não como curinga. Uma falha ao ler o catálogo aparece como erro, não como catálogo vazio. Não é preciso fazer nada na instalação. Contribuição de @valterhjr (#2138, refs #2135).

- **A tela de Produtos de um catálogo grande abre sem "Algo deu errado"** Ler o catálogo custava cerca de 2 ms por produto, porque o banco conferia a regra de quem pode ALTERAR preço em cada linha, mesmo numa leitura. A tela de Produtos lê o catálogo inteiro para contar o total, e num catálogo de alguns milhares de produtos a leitura passava do limite de 8 segundos do banco: a tela mostrava "Algo deu errado" em vez da lista. Agora a regra de alteração só vale para alterar, e a leitura de 579 produtos caiu de cerca de 1,2 s para 10 ms. Quem pode ver e quem pode alterar o catálogo continua igual: só gerente e administrador cadastram, alteram e apagam. A atualização aplica o ajuste sozinha, e não é preciso fazer nada na instalação.

- **Etiquetas verde-água e vermelha passam a sair com texto branco, inclusive as que já tinham cor** Os dois tons da paleta de etiquetas que saíam com texto preto sobre fundo forte foram escurecidos: o verde-água passa de `#12a594` para `#00655a` e o vermelho de `#e54d2e` para `#cf3716`. Nos dois, o texto do chip agora é branco, com contraste de 6,98 e 4,99. Os nomes e a fileira de cores na tela de Tags continuam os mesmos.

  As etiquetas que já tinham sido pintadas com os tons antigos não precisam de nada: elas passam a ser lidas no tom novo, sem migration, e a tela de Tags abre com o tom certo marcado. Quem gravar um dos tons antigos pela API recebe o tom novo gravado. Nada muda na configuração.

  Relatado por @Fabio-Ribeir0 (#2373). Contribuição de @webtecnica (#2380).

- **Regras de WhatsApp por aniversário e por compromisso passam a enviar** As regras de automação com gatilho "No aniversário de um contato" ou "Agendamento criado/confirmado/remarcado/cancelado/compareceu/não compareceu" e ação de mandar WhatsApp (ou de acionar a IA, ou de iniciar um fluxo) nunca chegaram a enviar: o evento nascia sem a origem do atendimento e a ação terminava `failed` com `service_boundary_stale`, sem erro em lugar nenhum. O carimbo no instante da emissão e a resolução na leitura passam a ler a mesma tabela de `(tipo, entidade) → contato`.

  Atenção a quem já tem uma regra dessas configurada: depois desta atualização ela envia WhatsApp de verdade para o contato, no próximo aniversário ou no próximo evento de agenda. O envio respeita a janela de horário do canal, o limite diário e o espaçamento entre mensagens, como qualquer automação. Eventos anteriores à atualização não são reenviados. Se a regra foi criada e esquecida, revise-a ou desative-a antes de atualizar.

  Contribuição de @Tong-bit-art (#2330), a partir da issue #2326 de @Sandersono.

- **O instalador diz onde configurar o envio de e-mail ao pular a Resend** Quem deixava a chave da Resend em branco na entrevista terminava sem saber que o envio tinha caminho de volta: o `.env` saía sem remetente, e o CRM subia sem mandar convite de equipe, PDF de LGPD nem — em Supabase próprio — os e-mails de acesso (senha, cadastro). Agora o campo da Resend mostra o atalho junto do "Enter pula", e a tela final — a única que a pessoa lê inteira — repete a pendência dizendo o que não sai e onde ligar: Admin → E-mail, a mesma tela que configura o servidor SMTP próprio ou o serviço externo (Resend). Num Supabase próprio o aviso acrescenta o passo `bash hostgator-setup-kit/update.sh`, para o GoTrue passar a usar o mesmo servidor.

  Nenhuma ação para quem já manda e-mail: o aviso só aparece quando não há `RESEND_API_KEY` nem `SMTP_HOST` no `.env`.

  Contribuição de @Tong-bit-art (#2325, fecha #1110).

- **A tela de agendas não diz mais "Ainda não sincronizada" para agenda que só bloqueia horário** Quem conectou o Google e marcou várias agendas para bloquear horário via só UMA delas com "Última sincronização" na tela de agendas conectadas. As outras apareciam como "Ainda não sincronizada", e a única forma de conferir se estavam paradas era olhar o banco — enquanto isso a agenda seguia trazendo eventos normalmente (uma delas trouxe 39).

  A rodada de sincronização agora grava a marca em cada agenda que ela leu, e não só na que recebe os compromissos novos: quem só bloqueia horário é lida na mesma passada que a de destino e sai com a própria hora gravada. A marca continua sendo verdadeira — agenda que a rodada não leu não ganha carimbo, e a que não terminou de ler continua mostrando o erro na própria linha, como já mostrava.

  Nada a fazer na atualização: a próxima rodada de sincronização grava as marcas que faltarem.

  Contribuição de @webtecnica (#2332).

- **Quem marca para amanhã não recebe o lembrete de véspera no mesmo dia** Com o lembrete de 1 dia ligado, quem marcava hoje às 9h para amanhã às 14h recebia, hoje às 14h,
  a mensagem "passando pra lembrar do seu compromisso" — poucas horas depois de ter confirmado. O
  lembrete que já estava vencido na hora da marcação já não saía; faltava o que vence mais tarde no
  mesmo dia. Agora o lembrete de 1 dia ou mais não sai no mesmo dia em que a reunião foi marcada, no
  fuso da organização. O aviso curto, como o de 1 hora antes, continua saindo normalmente.

  Contribuição de @erikyudi (#2349).

- **O link de redefinir senha, de convite e de confirmar cadastro funciona para quem usa Hotmail, Outlook e e-mail corporativo** Quem recebia o e-mail num Hotmail, Outlook ou numa caixa corporativa clicava no link e caía em "Link inválido ou expirado", mesmo pedindo um link novo. O motivo: esses provedores abrem cada link sozinhos, segundos depois da entrega, para conferir se é seguro, e o CRM gastava o token de uso único nessa primeira visita. Agora o link leva a uma tela "Confirmar acesso" com o botão Continuar, e o token só é usado quando a pessoa aperta o botão. Verificador automático abre o link, mas não aperta o botão. Nada muda na configuração da instalação.

  Contribuição de @fabianmartinelli-fm (#2183).

- **O agente passou a incluir alguém da equipe no convite da reunião que marca (guest_email)** Quando o agente marcava uma reunião (`crm_book_appointment` ou `crm_find_and_book_appointment`), o convite do Google saía sem o consultor que ia conduzi-la: as ferramentas do agente não ofereciam o `guest_email` que a tela e a API já aceitavam. Agora as duas aceitam `guest_email` opcional, desde que seja de um usuário ativo da própria empresa; e-mail de cliente, de terceiro ou de outra empresa é recusado e nada é marcado. Sem `guest_email`, a marcação funciona como antes, e a tela da Agenda e a API não mudam. Nenhuma ação é necessária.

  Contribuição de @webtecnica (#2077), a partir da issue #2062 de @InvestidorDiversificado; a regra de "só da equipe" foi decisão do mantenedor, aplicada sobre o trabalho dele.

- **O relatório de acesso (LGPD) mostra o CPF informado na conversa mascarado, em vez de apontar para um arquivo que o titular não recebe** Quando o titular tinha informado o CPF numa conversa, o PDF de acesso dizia "Informado na conversa (valor no arquivo de dados)" e o mandava a um `data.json` que ele nunca recebe: o arquivo fica no servidor e o e-mail entrega só o PDF. Agora a linha mostra o próprio CPF com só os 4 últimos dígitos visíveis (`***.***.*47-25`). Quando o relatório não consegue saber com segurança qual valor é do titular (nenhum CPF guardado, ou dois campos de CPF com valores diferentes, como o do responsável e o do paciente), a linha diz "valor não disponível neste relatório", sem apontar para arquivo nenhum. O valor completo continua guardado só no arquivo de dados. Não há nada para quem opera a instalação fazer.

  Contribuição de @webtecnica (#2355, refs #2341).

- **A limpeza automática do arquivo de webhooks não trava mais quando há atraso acumulado** A poda pedia 500 itens de uma vez num endereço longo demais: com algumas centenas de linhas vencidas acumuladas, o endereço passava do limite do gateway e a limpeza parava na mesma leva para sempre, deixando o banco crescer sem teto (numa instalação medida, ~23 MB/dia). Agora o lote é cortado por data, e a poda esvazia o corpo das linhas vencidas como prometido. Nada muda na configuração.

  Contribuição de @Sandersono (#2324).

- **O roteador volta a escolher qual agente atende cada mensagem** Em empresas que usam a OpenRouter, o roteador de agentes falhava a cada mensagem com o erro "claude-haiku-4-5 is not a valid model ID" e nenhuma escolha de agente acontecia — toda conversa caía no mesmo agente, ou em nenhum, como se os roteadores configurados não existissem. A mensagem nunca aparecia no painel de erro: era o aviso que a própria tela do classificador mostrava.

  O modelo do classificador vinha gravado pelo próprio Deskcomm ao criar o roteador, com um nome que a OpenRouter não reconhece. Ninguém escolheu esse modelo, e a empresa podia ter configurado Claude como modelo de atendimento — o roteador é que insistia no dele. Agora o roteador nasce em "Automático": quem decide o modelo do classificador é o painel de provedores ou, na falta dele, o modelo de atendimento da empresa, e nenhuma escolha é sobrescrita por baixo dos panos.

  Quem já tinha um roteador com esse modelo gravado de fábrica, numa empresa que não usa a Anthropic diretamente, passa para "Automático" ao atualizar. Se quiser um classificador mais barato e rápido do que o modelo de atendimento, basta escolhê-lo na tela do roteador. Empresas que usam a Anthropic diretamente não mudam nada: lá esse modelo funciona, e o roteador continua com ele. Também não muda nada para quem escolheu o modelo do classificador na tela, inclusive o Claude Haiku 4.5 pela Requesty, nem para quem não usa roteador de agentes. Não é preciso fazer nada na instalação.

  Contribuição de @dilneiss (#2134).

- **A IA não pede mais o máximo de tokens do modelo em cada resposta** Quando a organização não definia um limite de tamanho de resposta, a chamada ao modelo saía sem
  limite nenhum. No OpenRouter isso reserva o máximo do modelo (64 mil tokens no Claude Haiku 4.5)
  contra o saldo da chave, e uma chave com crédito para milhares de respostas curtas recusava todas
  com "can only afford". O agente parava de responder e as sugestões do modo assistido falhavam.
  Agora, sem limite configurado, cada resposta pede no máximo 4.096 tokens; quem definiu um limite
  próprio continua com o dele.

  Contribuição de @erikyudi (#2350).

- **A transferência de funil pergunta a régua da etapa de perda da origem antes de criar o clone** A troca de funil (`transfereParaOFunil`, usada pela automação `create_or_move_lead` e pelo roteador de intenção) criava o clone no funil de destino e só depois encerrava a origem — e a exigência de campos da etapa de perda mora dentro do encerramento. Quando a etapa de perda da ORIGEM tinha `obrigatorio_em` (`ao_perder` ou `etapas`) apontando um campo que o negócio não tinha, a recusa `required_fields_missing` nascia depois do clone gravado: o cliente ficava com dois negócios abertos, um em cada funil, com a recusa dizendo que nada mudou.

  A régua agora é conferida antes da primeira escrita, com a mesma função de sempre (`validaCamposExigidos`) e o mesmo 422 com `details.faltando` — os dois chamadores continuam tratando exatamente o mesmo código, e quando a régua recusa nenhum negócio novo é gravado.

  Nada muda para quem não configurou `obrigatorio_em` no funil da origem: a regra continua opt-in, e uma leitura indisponível das configurações deixa a transferência acontecer como antes.

  Contribuição de @webtecnica (#2308, fecha #2303).

## [1.73.0] — 2026-10-05

### Adicionado

- **A auditoria da edição do negócio passa a guardar o valor anterior e o novo de valor, moeda, responsável e data prevista** Antes, a linha `lead.updated` do log de auditoria dizia só QUAIS campos mudaram. Agora ela também traz, em `metadata.valores`, o antes e o depois de cinco campos: valor, moeda, responsável (pessoa ou agente) e data prevista de fechamento — e só quando o campo mudou de fato. Isso permite responder "quem mudou o valor desta proposta, e de quanto para quanto?".

  Título, descrição, etiquetas e campos personalizados continuam registrados só pelo nome: o log de auditoria não é reescrito pela anonimização da LGPD, então o texto livre do cliente não entra nele. Os cinco campos que entram são os mesmos que a anonimização preserva de propósito no próprio negócio. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2292, fecha #1755).

- **O produto se edita pela tela do catálogo** Quem administra corrigia um preço ou uma descrição do catálogo só reimportando a planilha — e a importação, de propósito, não grava `descricao` nem `ativo`. Agora a tela Produtos tem o botão **Editar**: ele abre o formulário já preenchido com o que está cadastrado e grava pelo `PATCH /api/v1/products/:id` que a API já aceitava, mandando para o servidor somente os campos que realmente mudaram (sem mudança, a tela avisa e não faz chamada nenhuma).

  Produtos sincronizados de uma integração (`origem` que não seja `manual` nem `planilha`) abrem o formulário **somente leitura**, com o aviso de que a edição vale na origem: a próxima sincronização sobrescreveria o que fosse mudado aqui. As fotos continuam editáveis pelo botão de sempre, porque a integração não mexe nelas.

  Contribuição de @webtecnica (#2288, refs #2135).

- **Cada intenção do roteador pode levar o negócio para o funil certo** Na tela do roteador, cada intenção ganha um campo opcional de funil de destino (e, se quiser, a etapa; sem etapa, vale a primeira etapa aberta do funil). Quando o roteador escolhe a intenção, o negócio do cliente vai para esse funil antes de o agente responder, e o agente passa a trabalhar no card do time certo. Até aqui o roteador só escolhia o agente, e o card ficava no funil de entrada.

  Sem destino configurado, nada muda: quem atualiza continua com o roteamento de antes. Se o cliente troca de assunto para outra intenção que tem destino, o card vai para o novo funil e o negócio anterior é encerrado como transferência, com o motivo "Levado para outro funil", que não conta como perda nas métricas. A linha do tempo registra que foi o roteador de intenção quem levou o card. Se o contato já tem um negócio aberto no funil de destino, nenhum card novo é criado.

  Contribuição de @webtecnica (#2290, fecha #2155).

- **Tempo na etapa (quem está nela agora) na tela de etapas, medido por stage_changed_at (#2032)** A tela de etapas passa a mostrar, ao lado da taxa histórica de ganho (#1753), quanto tempo os negócios estão NA etapa AGORA — medido pela ENTRADA do negócio na etapa (`crm_leads.stage_changed_at`, carimbada pelo trigger `trg_stamp_stage_changed_at` desde a migration 0071), com `created_at` de reserva para o lead sem carimbo. `last_activity_at` não entra na conta: é tempo sem resposta, e uma nota na conversa zerava o relógio de um negócio parado há semanas. É a mesma escolha do card do Kanban desde o #1908.

  Quem entrega o número é `lib/metrics/tempo-da-etapa.ts` (puro, relógio injetado), publicado pela rota `GET /api/v1/pipelines/{id}/stages/win-rates` no bloco `tempo_na_etapa`, com `medida` e `base` escritos na resposta: a taxa ao lado é de OUTRA população (quem passou pela janela de dias, reconstruída das atividades `stage_changed`) e as duas não se somam. Por etapa saem quantidade, média e mediana de horas, além da amostra `com_carimbo`/`sem_carimbo` — número medido sobre reserva não é número medido sobre carimbo. Ganho e perda não recebem a frase: lá a coluna não segura trabalho em curso.

  Sete testes do módulo cobrem os três casos da issue, inclusive o de `last_activity_at` mais recente ser ignorado; a rota e a tela têm teste próprio, e etapa vazia não ganha «0 h».

  Contribuição de @webtecnica (#2225, fecha #2032).

### Corrigido

- **Instalação single-server atrás de um Traefik próprio ganha rota para as seis APIs do Supabase** Quem já tem um Traefik ocupando as portas 80/443 (em modo host, como na Hostinger; Traefik em bridge, como Coolify/Dokploy, ainda não é coberto) e instala o modo single-server com `REVERSE_PROXY=traefik` consegue concluir a instalação, desde que o entrypoint HTTPS desse Traefik se chame `websecure` ou que `TRAEFIK_ENTRYPOINT` seja exportado com o nome dele (a rota do Supabase lê o entrypoint só do ambiente; com outro nome, como `https`, ela é ignorada pelo Traefik): o Caddyfile do modo Caddy roteava `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1`, `/functions/v1` e `/graphql/v1` para o Envoy do Supabase, e o overlay do Traefik não tinha essa regra — o Traefik entregava esses caminhos ao app, que devolvia 404, e o instalador parava em "NEXT_PUBLIC_SUPABASE_ANON_KEY inválido". As seis prefixos agora viram etiquetas de rota no `api-gw`, ligadas só quando o instalador grava `TRAEFIK_ENABLE=true` no `.env` do Supabase, com prioridade acima da rota geral do app e abaixo do bloqueio do webhook do WAHA.

  Para quem instala em Caddy — a maioria — nada muda: a rota nasce desligada (`traefik.enable=false`) e nenhuma variável nova do produto é lida. Para quem já instalou em Caddy não há efeito visível (o contêiner do Envoy é recriado uma vez na atualização), e para quem já instalou atrás de Traefik basta rodar de novo o `install-single-server.sh` com `REVERSE_PROXY=traefik` no ambiente, que regrava o `.env` do Supabase e recria o contêiner do Envoy com a rota.

  Contribuição de @webtecnica (#2289, fecha #2099).

- **O assistente para de prometer retorno ao cliente sem que alguém fique responsável** Medido em produção em 16 de setembro. O assistente escreveu ao cliente: *"Vou encaminhar as informações do site imobiliário para análise e te retorno com a proposta."* O cliente saiu da conversa esperando um orçamento — e ninguém ficou devendo nada, porque o sistema não registrou nada: nenhum caso para alguém resolver, nenhum retorno marcado, nenhum aviso na Central.

  Existe uma trava exatamente para isso — o assistente não pode prometer que uma pessoa da empresa vai agir sem que alguém fique responsável. A trava disparou **uma vez**, o assistente reformulou a frase, e a segunda formulação **passou**. O sistema dependia de reconhecer promessa por palavra: exigia "equipe", "setor" ou "responsável" colado ao verbo, e um objeto no meio da frase ("as informações") já a despistava. De sete frases equivalentes medidas, **cinco passavam** — inclusive uma que escrevia "equipe".

  Agora a trava também pergunta ao classificador que já roda a cada envio se a mensagem promete que alguém da empresa volta a falar com o cliente. Os dois sinais valem juntos: o antigo, que é de graça e imediato, e o novo, que pega o que a palavra não pega. **Nenhuma consulta a mais é feita** — a pergunta entrou na mesma que já existia.

  Quando quem promete voltar é o próprio assistente (*"Combinado! Te retorno amanhã de manhã."*), marcar o retorno na agenda de follow-up também resolve: se o assistente agendou o retorno naquele mesmo atendimento, a mensagem sai sem precisar de caso. Isso vale só para a promessa do assistente. Se a frase diz que alguém da empresa vai agir (a equipe, uma análise, o responsável, um setor), o caso continua obrigatório, com ou sem retorno agendado. Na dúvida, por exemplo quando a resposta do classificador vem incompleta, vale a regra mais rígida: o caso é exigido.

  Um detalhe que vale saber na hora de decidir: a camada que faz a segunda pergunta segue a escolha que já existe na tela do assistente, no painel de segurança, e só o administrador da empresa a muda. Desligando, o reconhecimento volta a ser só por palavra — isto é, aquelas cinco frases voltam a passar.

  Contribuição de @paulolimajr77 (#1873).

- **A catraca do espanhol passa a enxergar a chave montada em runtime e o t() sobre variável** O gate que cobra a tradução em espanhol só reconhecia texto escrito no código (`t("literal")`) e tabela resolvível (`t(TABELA[k])`): quando a chave é montada em runtime (``t(`Meta de ${x} batida`)``) ou vem de uma variável que ninguém consegue ler (`t(rotulo)`), o gate ficava verde mesmo sem nada em espanhol — e, como `traduzir()` devolve a própria chave quando ela falta, a frase saía em português para quem escolheu espanhol. A catraca agora cobre as duas formas, apontando arquivo:linha de cada uma.

  34 sítios já existentes foram congelados em uma lista com a razão escrita de cada um (a lista só encolhe; nenhuma tradução foi mexida) — consertar um por um é decisão de produto, e está declarado assim. Métrica e gates na PR.

  Contribuição de @webtecnica (#2298, continuação da #603).

- **Criar negócio direto numa etapa exigente também passa pela régua de campos obrigatórios** A criação de negócio (`POST /api/v1/leads`, o diálogo do Kanban com etapa escolhida, a ferramenta MCP `crm_create_lead`, a importação de planilha, a automação `create_or_move_lead` — ao criar e ao transferir entre funis — e a prospecção) passou a perguntar a mesma régua de campos obrigatórios que o arrasto, o lote, o encerramento e o clone já perguntavam. Até aqui a criação era o único caminho que nascia na etapa exigente com o campo em branco, e a cobrança só aparecia na escrita seguinte, com o negócio já lá. Agora a recusa é visível onde alguém configurou o caminho: a importação mostra a frase, e a automação fica com status de falha e a mesma frase, como já acontecia ao mover.

  Os formulários de captação (webhook de entrada) seguem entrando como antes: o lead que chega de fora entra na etapa padrão da fonte mesmo que ela exija um campo que o formulário não mandou.

  Nada muda para quem não configurou `obrigatorio_em` num campo do funil: a regra continua opt-in, e uma leitura indisponível das configurações deixa a criação acontecer como antes. Na transferência entre funis a recusa acontece antes de clonar e de fechar a origem, então o negócio continua aberto no funil de onde saiu.

  Contribuição de @webtecnica (#2295, fecha #1710).

- **Agente criado pela API sem `version`, ou duplicado de um agente antigo sem versão, nasce com rascunho v1 editável na tela** Uma integração que criava agente por `POST /api/v1/ai/agents` sem o campo `version`, e a duplicação de um agente antigo que nunca teve versão, gravavam um agente sem nenhuma versão, que nem o atendimento do CRM nem o agent-engine enxergam: ele existia na lista e nunca respondia.

  Agora os dois casos nascem como agente do formato atual (`kind: "mcp_agent"`) com uma versão 1 em rascunho, montada do prompt e do modelo enviados. O agente aparece como parado e só atende depois que alguém publica a versão na tela, como qualquer agente novo; por isso ele também deixa de gerar o aviso de "agente sem versão".

  A resposta da API para o formato sem `version` continua sendo a linha do agente, e o modelo omitido continua sendo `anthropic/claude-sonnet-5`. Muda o valor de `kind`, que passa de `rag_bot` para `mcp_agent`. Os agentes antigos que já existem não são alterados.

  Contribuição de @webtecnica (#2296, refs #1357).

- **O diálogo de excluir contato avisa do compromisso na Agenda antes do clique** Ao abrir "Excluir contato?", a tela agora consulta o que vai barrar a exclusão e, se o contato tem compromisso na Agenda, diz isso já no diálogo, com um link para abrir a Agenda. Antes o aviso só aparecia depois de tentar excluir. Sem compromisso, o diálogo continua igual e a exclusão segue normalmente. A tela usa a mesma contagem que a exclusão.

  Contribuição de @webtecnica (#2293, fecha #1925, continuação do #1949).

- **O item "demanda aberta sem próximo passo" do Radar vira link, e o caso cancelado ou resolvido marca um próximo passo na demanda que ele abriu** No Radar de risco, o item "demanda aberta sem próximo passo" deixava de ser só
  texto: agora é um link para a conversa vigente da demanda (ou, sem conversa,
  para a ficha do contato), como já eram as outras seções — dava para chegar à
  demanda pelo alerta.

  E um caso cancelado ou resolvido passa a marcar um próximo passo na demanda que
  ele abriu por handoff ("Revisar o caso encerrado e registrar o desfecho da
  demanda"): antes ela ficava "em atendimento" e sem próximo passo para sempre,
  presa na seção de risco do Radar. O sistema não decide o desfecho — só tira a
  demanda de "sem próximo passo" e a deixa visível em "Demandas abertas" do painel
  da conversa, com "Encerrar demanda" ao lado, até alguém registrar o desfecho.

  Demanda antes presa em `em_atendimento` num caso rescindido não é
  retroativamente corrigida por esta versão. Sem ação necessária.

  Contribuição de @webtecnica (#2056, fecha #2035).

- **As recusas da régua de campos obrigatórios agora chegam a quem precisa ver** Com a régua na criação de negócio (#2295), quatro caminhos recusavam sem que a pessoa certa visse — ou deixavam um resto. Os quatro passam a se comportar assim:

  1. **Roteador de intenção (#2290).** Quando a etapa de destino exige um campo, `transfereParaOFunil` lança e a recusa morria num `runLog.warn` que ninguém lê. Agora a recusa é capturada em `aplicaDestinoDaIntencao` — onde o negócio de origem é conhecido — e abre um aviso na Central (`kind: other`, apontando para o negócio), sem empilhar o mesmo aviso aberto. O negócio de origem continua aberto, como antes: nada se perde, e agora alguém fica sabendo.
  2. **Tool MCP `crm_create_lead`.** Ganhou `custom_fields` no `inputSchema`: o agente que sabe o valor consegue criar um negócio numa etapa exigente, pelo mesmo `createLeadHandler` e a mesma régua de todo mundo. Sem a chave, `z.object` descartava o argumento antes de chegar a quem pergunta a exigência.
  3. **Import de planilha.** O contato da linha 1 é criado antes do `createLeadHandler` da mesma linha, e um 422 da régua (ou um 404 de etapa) derruba a importação inteira: agora os contatos que ESTA requisição criou e que ficaram sem negócio são devolvidos ao banco antes da resposta de erro. Os que já estavam no cadastro e os que já viraram card nunca entram no desfazimento.
  4. **Captação.** O motivo da recusa na tela "Leads recebidos" deixa de ser `erro_ao_criar_lead` para tudo: a régua vira `recusa_da_regra` com rótulo próprio, funil/etapa seguem com o rótulo original, e o resto vira `erro_inesperado` — o rótulo não promete mais "funil e etapa" numa recusa que não é deles.

  A régua não afrouxa em nenhum dos quatro: a isenção da rota de captação (`exigirCamposDaEtapa: false`, decisão do #2295) continua intacta, e nenhum caminho passa a criar o que a régua recusava.

  Contribuição de @webtecnica (#2302, fecha #2297).

- **O banco recusa nome de sessão WAHA acima do teto de 54, em vez de só o teste conferir** O teto de 54 caracteres que o WAHA impõe no nome da sessão era conferido em três lugares de código — o teste de banco, o teste unitário e a guarda antes de chamar o WhatsApp — e em nenhum deles dentro da escrita da linha. Um INSERT direto (um script, o PostgREST, ou uma migration que copiasse o corpo antigo) gravava um nome acima do teto sem que nada recusasse, e o erro só aparecia quando o operador tentava conectar o número, com o card preso em "Parado".

  Agora a própria tabela `channel_sessions` recusa a linha com o mesmo código de erro das recusas de domínio da reserva: um nome novo acima de 54 não entra, e renomear uma linha para cima do teto também não. Instalação existente não é afetada — uma linha antiga com nome acima do teto continua recebendo mudanças de status, metadata e lease normalmente, porque a recusa olha apenas o nome que está sendo escrito; e o caminho de conserto (renomear para o formato curto de 45) continua cabendo na mesma linha.

  De quebra, o teste de tela de pré-go-live deixa de montar `prego_` à mão e passa a usar o mesmo gerador que o banco usa, com o formato real conferido.

  Contribuição de @webtecnica (#2301, fecha #686).

- **Ligação telefônica de contato bloqueado é recusada e aparece como "Cancelada"** Quem mandou "PARAR" não recebe mais ligação da IA: no telefone (SIP), a chamada de entrada de contato bloqueado é desligada na hora, sem virar negócio, sem tocar aviso para a equipe e sem carimbar a linha do tempo — recusar é não-interação. A linha fica gravada no histórico e na tela de chamadas como "Cancelada", o status existente mais próximo de recusa (um rótulo próprio pode vir em PR seguinte), para a equipe saber que a ligação existiu sem precisar agir. No WhatsApp a ligação não é recusada: a perdida de bloqueado só deixa de gerar aviso e linha do tempo, e a atendida por alguém da equipe continua na linha do tempo. A saída (discar para bloqueado) já era recusada e continua igual; falha ao ler o bloqueio deixa a chamada passar, nunca derruba ligação legítima por instabilidade.

  Contribuição de @paulolimajr77 (#2299).

- **O WAHA passa a assinar as entregas de webhook e a exigência de assinatura passa a funcionar** O compose entregava o segredo ao contêiner do WAHA numa variável que não existe na documentação dele (`WHATSAPP_HOOK_HMAC` em vez de `WHATSAPP_HOOK_HMAC_KEY`), então o WAHA ignorava e nunca assinava nada — e ligar "Exigir assinatura nas entregas do canal" cortava a entrada de mensagens com `401 signature_required`.

  Agora o nome é o exato da documentação (nos três composes e no runbook). Na atualização o contêiner do WAHA é recriado e passa a mandar `X-Webhook-Hmac` em toda entrega; quem tem a exigência ligada volta a receber mensagens, agora com `valid_signature = true` no log. Nenhuma ação do operador: o segredo é o mesmo, só o nome da variável mudou.

  Contribuição de @paulolimajr77 (#2268).

## [1.72.0] — 2026-10-04

### Adicionado

- **Quem escreve fora do horário de atendimento pode receber um aviso configurável — uma vez por contato por período fechado** O turno de quem chega fora da janela do agente era adiado para a abertura sem nenhuma resposta: no sábado à noite, silêncio até segunda de manhã, e a pessoa sem saber se a mensagem chegou. Agora a tela de gatilho do agente (em "Só atender em horário de funcionamento") aceita um texto de aviso, e esse texto é enviado quando a mensagem chega fora da janela, registrado na conversa como Automação. Vale só para quem preencher o texto: o padrão é não enviar nada, e quem não mexer na tela não vê mudança nenhuma.

  O aviso só sai DENTRO da janela de envio do número (por padrão 7h–22h, ajustável por canal). Quem escreve entre o fechamento dessa janela e a abertura seguinte (por padrão, das 22h às 7h) não recebe o aviso na hora: o turno fica em silêncio até a janela de envio abrir, e só então o aviso sai, se o horário de atendimento ainda estiver fechado.

  Vale no máximo um aviso por contato por período fechado: o período começa quando a janela fecha e só volta a valer quando ela abre e fecha de novo: um segundo contato na mesma noite não recebe de novo, e o contato bloqueado (opt-out/`is_blocked`), o titular anonimizado e o número interno da própria organização não recebem nunca. O aviso é RESPOSTA a quem escreveu primeiro, não disparo ativo: ele respeita a janela de resposta do número, o warm-up, o teto diário e o espaçamento, e entra na contagem de envios como qualquer outro. Quando o horário de atendimento abre, a IA responde normalmente sobre a conversa que já tem o aviso.

  Contribuição de @webtecnica (#2284, refs #1926).

- **Em coexistência, o que a equipe cadastra no endereço do app WhatsApp Business vira cadastro no CRM** Num número em coexistência (o mesmo número no app WhatsApp Business e na Cloud API), a empresa também cadastra e renomeia contato no **endereço** do app — o da agenda do celular. A Meta entrega isso no webhook `smb_app_state_sync`, que o canal oficial descartava: o CRM ficava sem o nome que a equipe usa no celular, e o contato só nascia na primeira mensagem, muitas vezes sem nome nenhum.

  Agora esse webhook entra: o contato passa a existir no CRM com o nome do app (o mesmo que a Meta manda para o `display_name`, pela mesma resolução de número da mensagem recebida e do eco). A aba "API Oficial (Meta)" passa a listar `smb_app_state_sync` entre os campos a assinar no dashboard da Meta — sem coexistência a Meta não envia esse evento, então assinar é inofensivo para quem não usa.

  O que este passo **não** faz, de propósito: não cria conversa nem mensagem (nada mudou na caixa de entrada, em `last_inbound_at`, no contador de não lidas nem no agente — ninguém trocou mensagem), não sobrescreve um nome que já existe no CRM (o `coalesce` da `fn_upsert_wa_contact` preenche quando vazio e nunca sobrescreve), e não apaga cadastro quando o app remove o contato do endereço (a Meta manda `remove` sem nome, e apagar histórico do CRM por causa da agenda do celular não está provado em lugar nenhum).

  A importação do histórico de conversas (`history`, até 180 dias) e o botão de Embedded Signup com coexistência continuam fora deste passo — ver a #1632.

  Contribuição de @webtecnica (#2283, refs #1632).

- **Relatórios ganham a aba Por etiqueta** Em Relatórios (Atividades) há agora a aba **Por etiqueta**: para cada etiqueta em uso, quantas conversas ela teve no período (7, 30 ou 90 dias), quantas estão abertas e quantas foram resolvidas, a espera média e a fatia do total. Espera que não foi medida aparece como "—", nunca como zero, e período sem conversa etiquetada diz o motivo em vez de mostrar uma tabela de zeros. A aba abre direto por `/app/activities?aba=etiquetas`.

  Cada etiqueta leva à caixa de entrada na aba Todas, já filtrada por ela. O número da linha e a lista podem não bater: a lista também traz as conversas em que a etiqueta está no contato, e não se limita ao período.

  Nada a fazer na VPS.

  Contribuição de @webtecnica (#2285, refs #1891).

- **Empresas ganham consulta de CNPJ antes de criar, edição e exclusão na tela, e o CNPJ mantém a máscara quando o enriquecimento falha** No cadastro de uma empresa nova, o botão "Consultar CNPJ" busca os dados públicos na BrasilAPI e preenche o formulário para revisão antes de criar. Nada é gravado na consulta, e a tela avisa quando o CNPJ já existe na organização. Quando a BrasilAPI recusa a consulta (403) ou está fora do ar, a tela diz que é indisponibilidade e sugere tentar de novo, em vez de dizer que o CNPJ não existe. A consulta exige o papel de gestor, o mesmo da criação.

  A tela de detalhe da empresa passa a permitir editar o cadastro e excluir a empresa. Excluir exige o papel de gestor e fica registrado na auditoria. Se houver pessoas vinculadas à empresa, a exclusão é recusada e a tela mostra quantas são.

  O CNPJ deixa de perder a máscara (aparecia `33547054000120` no lugar de `33.547.054/0001-20`) quando o enriquecimento automático falha.

  Nada é preciso fazer na instalação.

  Contribuição de @webtecnica (#2273), a partir da issue #1937 de @Fabricio-Point-Machine.

- **A ficha do negócio lê as pessoas relacionadas ao negócio** A ficha do negócio passa a listar, abaixo do contato principal, as outras pessoas ligadas àquele negócio, com o papel de cada uma e a marca de anonimizado quando for o caso. Nesta versão nenhuma tela grava esse vínculo ainda (é a próxima etapa da #1506), então quem opera não vê diferença. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2272, refs #1506, proposta de @Alencaf).

### Corrigido

- **O cron do scheduler que falha deixa de falhar em silêncio — o log do scheduler diz qual rota errou e o que conferir** Quando uma rodada de cron do `scheduler` falha (o caso clássico é o `sync-model-catalog` tomando 401 porque o segredo que o agendador manda não é o que o app enxerga, o defeito da #1109), a linha do crontab descartava a saída E o erro do `curl` (`>/dev/null 2>&1`), e o crond ignora o status de saída. O resultado era um cron quebrado sem sintoma nenhum em lugar nenhum: o catálogo ficava vazio e ninguém via um log.

  Agora o `>/dev/null` fica só no corpo da resposta. O status continua no STDERR do `curl -fsS` (é o `-S` que o imprime) e, quando o comando falha, a linha imprime no STDERR qual rota falhou e o que conferir — os dois chegam ao `docker logs` do scheduler. Em rodada saudável nada muda: o `||` só dispara em falha.

  Nada a fazer na instalação.

  Contribuição de @webtecnica (#2279, refs #1109).

- **Com o Jev medindo o clima, relatar o problema deixa de passar a conversa para uma pessoa, e a concordância do Jev usa o limiar de cada agente** Quando o Jev decide o clima da conversa (Jev decidindo, ou sem IA de linguagem configurada), a escala dele passa a separar o relato do problema, que fica no neutro e não aciona a passagem, da insatisfação com o atendimento e da hostilidade aberta, que acionam. É a mesma separação que a IA de linguagem ganhou na 1.71.0. Vale para toda organização com o Jev decidindo, sem ajuste nenhum. Quem atende e-commerce deve ver menos passagens para uma pessoa por decepção com produto; para passar mais, suba o limiar do agente.

  O cartão do Jev passa a medir a concordância e os clientes irritados pelo limiar de cada agente, gravado em cada mensagem. Mensagens anteriores seguem medidas pelo padrão 0,3 até saírem da janela. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2248, refs #2219, #2209).

- **As ações do assistente numa conversa passam a valer só para o cliente dessa conversa** Durante uma conversa, toda ação do assistente que aponta um registro pelo identificador (contato, conversa, compromisso, retorno, chamado, marcador) só é aceita quando o registro é do cliente com quem a conversa está. Fora disso, a ação é recusada com uma explicação para o assistente seguir a conversa, e nada é alterado. Integrações e pessoas usando o sistema continuam com o mesmo alcance de antes.

  Nada a fazer na instalação.

- **Com as propostas desligadas, Configurações › Propostas esconde o link de modelos, e a tela de modelos explica como ligar em vez de travar em Carregando** Com as propostas comerciais desligadas na organização, a tela Configurações › Propostas deixa de mostrar o link Modelos de proposta, que levava a uma tela que travava em Carregando…. O link segue o valor salvo, então virar a chave sem salvar não o mostra. Quem chega à tela de modelos pela URL vê uma explicação e o atalho para Configurações › Propostas, em vez do aviso cru Not found e de Carregando para sempre. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2270, refs #1889).

- **A atualização não devolve mais INSERT/UPDATE/DELETE em orçamentos de IA nem TRUNCATE do log de auditoria às chaves anon e authenticated** O `baseline.sql` é reaplicado inteiro em toda atualização. Duas concessões do snapshot ao papel `anon` eram revogadas só no fim do arquivo: `INSERT/UPDATE/DELETE` em `ai_budgets` e `TRUNCATE` em `api_audit_log` (o privilégio que a RLS não alcança). Entre as duas pontas, e até a próxima atualização completa se a passada morresse no meio, a chave anônima carregava o privilégio.

  Agora as revogações acompanham as concessões, e o estado final não muda: o `anon` segue sem o que era revogado e com o resto — a leitura escopada por política em `ai_budgets` e `SELECT`/`INSERT` no log de auditoria. Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2257).

- **A atualização para de devolver o TRUNCATE do log de auditoria ao papel de serviço, e anon/authenticated perdem o TRUNCATE em orçamentos de IA** O `baseline.sql` é reaplicado inteiro em toda atualização. Três pontas da mesma família ficaram de fora do #2257: o `service_role` recuperava `TRUNCATE` no log de auditoria entre a concessão do snapshot e o bloco da 0258 (mais de 20 mil linhas de janela, de pé até a próxima atualização completa se a passada morresse no meio); e `anon`/`authenticated` mantinham `TRUNCATE` em `ai_budgets` no estado final, porque a 0160 revogou só INSERT/UPDATE/DELETE.

  Agora a revogação acompanha as concessões nos três casos, e o `TRUNCATE` de `ai_budgets` sai também do estado final para as duas chaves — ele não passa pela RLS e nenhum consumidor o usa (toda escrita da tabela é service role). Leitura e escrita legítimas seguem como estavam. Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2259).

- **A atualização interrompida não deixa mais de pé a versão antiga do portão de anonimização** O `baseline.sql` reaplica a história da função de anonimizar contato em duas definições. A intermediária, anterior à correção do #2196, ainda usava a checagem de plataforma que ignora o `scope` do JWT: se uma atualização morresse entre as duas, era essa versão que ficava no banco até a próxima passada completa, e um platform admin `support_readonly` fora de sessão de suporte voltava a poder anonimizar contato.

  A definição intermediária passou a usar a guarda completa (`fn_is_platform_admin_full`, que já existe no snapshot), então o furo não fica de pé em nenhuma passada. O estado final não muda e nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2256).

- **A atualização não devolve mais o privilégio de TRUNCATE ao papel anônimo em idempotency_keys** O `baseline.sql` é reaplicado inteiro em toda atualização. A concessão de `ALL` ao `anon` em `idempotency_keys` vinha do snapshot e a revogação de `TRUNCATE` — um privilégio que a RLS não alcança — ficava no apêndice: entre as duas pontas, e até a próxima atualização completa se a passada morresse no meio, o papel anônimo carregava o privilégio.

  Agora a revogação acompanha a concessão, e o estado final não muda: o `anon` continua sem `TRUNCATE` e com os demais privilégios da concessão. Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2253).

- **A atualização da VPS deixa de reabrir o gatilho velho da demanda e a permissão anônima das tabelas de conhecimento** O `baseline.sql` é reaplicado inteiro em toda atualização. Dois trechos eram reconstruídos no começo do arquivo e desfeitos no fim, e cada passada reabria a janela: o gatilho `trg_demanda_fecha_com_conversa` (substituído pelo modelo de atendimento na migration 0222) voltava a valer até ser derrubado, e quatro tabelas de conhecimento (fontes, versões, chunks e FAQ da IA) recebiam `ALL` para o papel `anon` — a chave pública do navegador — até serem revogadas adiante. Se a atualização morresse no meio, o gatilho antigo e a permissão anônima ficavam de pé até a próxima tentativa.

  Agora as duas recriações saíram do texto: o gatilho não é mais reinstalado, e as quatro tabelas não são mais concedidas ao `anon` de passagem. O estado final é o mesmo de antes — nenhuma tela, nenhuma regra e nenhum dado mudam, e nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2250).

- **A Central para de abrir em dobro os avisos de orçamento de IA (limite atingido e aviso de gasto)** Os dois avisos de orçamento — "o orçamento de IA foi atingido" e "o gasto passou do aviso" — deduplicam por organização e tipo, mas a pergunta "já existe um aberto?" e a escrita não eram atômicas, e dois turnos podem avaliar o gasto no mesmo instante (o worker roda tarefas em paralelo, e o worker de respostas é outro processo). Dois avisos idênticos apareciam para o mesmo problema.

  Agora o banco é quem segura: um índice único parcial em `agent_inbox_items` (organização e tipo, só enquanto o aviso está aberto) recusa a segunda linha. A decisão do orçamento continua chegando inteira — os dois caminhos do motor tratam a recusa como "já havia aviso", sem trocar o bloqueio por um erro. E a escrita do aviso não depende de o índice já existir: para quem atualiza, tanto faz se o código novo sobe antes ou depois do banco — o portão de orçamento segue fechando, e a deduplicação vale a partir do momento em que o índice chega. Os dois tipos convivem abertos, como sempre: um relata que a IA parou, o outro que o gasto passou do aviso e ela segue.

  Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2265, com o refinamento do #2266).

- **A Central para de abrir em dobro os avisos de IA por título (Jev parado, saldo, endereço sem chave)** Quatro avisos da Central deduplicam pelo TÍTULO — o "O Jev parou de funcionar", o de IA sem saldo, a recusa por endereço sem chave da empresa e o aviso de laço do processamento de eventos. A pergunta "já existe um aberto?" e a escrita não eram atômicas, e os escritores rodam concorrentes: o worker roda tarefas em paralelo e o aviso do Jev chega por dois drenos. Dois avisos idênticos apareciam para o mesmo problema.

  Agora o banco é quem segura: um índice único parcial em `agent_inbox_items` (organização, kind e título, só enquanto o aviso está aberto) recusa a segunda linha, e os quatro escritores tratam a recusa como "já havia aviso" — nenhum deles para de avisar. Avisos que abrem UM POR NEGÓCIO (o espelho de estágio e o de etapa) continuam abrindo um por negócio, mesmo com o título repetido.

  Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2263).

- **A Central para de abrir em dobro o aviso de resposta a caso obsoleto quando a rota e o worker escrevem no mesmo instante** A resposta de um humano a um caso que já mudou de atendimento abre um aviso na Central ("Resposta registrada; atendimento mudou"), deduplicado por conversa. Dois escritores podiam chegar juntos — a rota que registra a resposta e o worker que percebe a fronteira de serviço velha — e os dois inseriam, porque a pergunta "já existe um aviso aberto?" e a escrita não eram atômicas.

  Agora o banco é quem segura: um índice único parcial em `agent_inbox_items` (organização, kind e conversa, só enquanto o aviso está aberto) recusa a segunda linha. A resposta do humano continua sendo registrada mesmo quando o aviso já existia — o caminho transacional isola o aviso num savepoint, para que a recusa do banco não derrube a resolução do caso. Avisos `job_dead` de tarefa e de cron seguem como sempre foram, um por ocorrência.

  Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2260).

- **Numa conversa de atendimento, preencher resposta pronta e abrir conversa ficam no contato da conversa** Numa conversa de atendimento, `crm_render_message_template` passa a preencher a resposta
  pronta apenas com os dados do contato daquela conversa: um `contact_id` ou um `lead_id` de
  outro contato é recusado, e sem nenhum dos dois o contato da conversa é usado. Em
  `crm_get_conversation`, toda conversa que não é do contato da conversa recebe a mesma
  recusa. Fora de uma conversa de atendimento (integração, MCP externo, rota HTTP), nada muda.

- **Numa conversa de atendimento, as consultas do agente a negócios, agenda, retornos e casos ficam no contato da conversa** Numa conversa de atendimento, as consultas do agente a negócios, compromissos, retornos,
  radar de risco e casos humanos passam a considerar apenas o contato daquela conversa. Um
  pedido sobre outro cliente recebe a mesma recusa que um identificador inexistente. A
  busca de contatos encontra o contato da conversa mesmo quando outros nomes parecidos vêm
  antes na lista.

  Fora de uma conversa de atendimento (integração, MCP externo, rota HTTP), nada muda.

- **A mensagem de um fluxo de follow-up apagado não sai mais depois da exclusão** Apagar um fluxo de follow-up pela tela encerra a inscrição, mas o turno que já estava na fila (ou adiado para a janela de envio, via cron) continuava valendo: o worker enviava a mensagem e só depois conferia se a inscrição ainda existia — o cliente recebia um passo de um fluxo que não existe mais, e o item terminava como concluído, sem aviso.

  Agora o turno confere a inscrição antes de qualquer efeito: se ela foi apagada, cancelada, pausada ou já saiu do nó, o envio é descartado em silêncio — a mesma regra que o caminho sem worker já aplicava. Nada muda para quem tem a inscrição viva no nó certo, e nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2261).

- **Os pedidos de privacidade, os honorários e a lista de conversas de uma conversa de atendimento também ficam do lado do contato do turno** O #2182 escopou ao contato da conversa as quatro leituras do Atender, mas deixou três
  ferramentas e um conserto de página de fora. Um pedido de EXCLUSÃO de outro cliente
  (`crm_list_privacy_requests`) continuava chegando ao modelo como instrução de "não insista
  com esta pessoa", e o contrato e as parcelas de honorários de um caso que não é desta
  conversa (`crm_get_honorarios_contrato`, `crm_list_honorarios_parcelas`) continuavam
  trazendo valor, percentual e repasse para o lado de cá. As três agora leem
  `ctx.contatoDoTurno`: a lista de privacidade filtra a própria consulta pelo contato do
  turno, e o contrato e as parcelas são recusados — antes da consulta — quando o caso não
  é deste cliente, com a mesma resposta para caso que não existe, caso de outra organização
  e caso de outro cliente.

  `crm_list_conversations` também passa a filtrar o contato NA CONSULTA, e não mais na
  página que o handler já tinha truncado: com a conversa mais antiga do mesmo cliente fora
  da primeira página, o agente ouvia que não havia mais nada. No predicado, cursor e
  `has_more` voltam a valer, porque a página já é do contato. O `404` de um uuid
  inexistente em `crm_get_conversation_history` passa a ser a MESMA recusa de uma conversa
  de outro cliente, em vez de dois estados distintos para o mesmo "não é seu para ler".

  Fora de uma conversa de atendimento — rota HTTP, MCP externo, agente sem conversa —, os
  pedidos de privacidade, os honorários e o histórico seguem como antes. A lista de conversas
  muda num ponto: `GET /api/v1/conversations` passa a aceitar `?contact_id=` (antes o parâmetro
  era ignorado e a resposta era a lista da organização inteira), e `crm_list_conversations` com
  `contact_id` explícito passa a filtrar no banco, então cursor e `has_more` descrevem as
  conversas daquele contato. O filtro só estreita a lista, nunca a amplia.

  Contribuição de @webtecnica (#2271, refs #2184).

- **A reunião remarcada para mais longe volta a receber o lembrete da data nova** Quando um lembrete já tinha saído e a reunião era remarcada para uma data mais distante, a data nova ficava sem esse lembrete, porque o sistema guardava apenas que ele já tinha sido enviado, sem dizer para qual data. Agora o lembrete volta a valer para a data nova e sai uma única vez, na hora certa.

  Para não mandar duas mensagens em sequência, o lembrete só volta quando a hora dele na data nova fica a pelo menos metade do seu intervalo depois do último envio. Para o lembrete da véspera, isso quer dizer 12 horas: a reunião empurrada para o mesmo horário do dia seguinte recebe a véspera nova, e a reunião empurrada em 30 minutos logo depois de a véspera sair não recebe uma segunda. Remarcar para mais perto não reenvia nada, e o lembrete cuja hora já tinha passado no momento da remarcação continua não saindo. Reuniões remarcadas antes da atualização para a 1.71.0, quando o sistema ainda não registrava a hora da remarcação, seguem como antes.

  Contribuição de @webtecnica (#2249, refs #2243).

- **O Testar do agente mostra a resposta mesmo fora do horário de envio, com um aviso** Fora do horário de envio configurado, o botão Testar do agente escondia a resposta: a regra de ritmo de envio (horário, aquecimento do número e limite diário) barrava o candidato também no teste, onde nada é enviado. Agora o Testar mostra a resposta com o aviso de que, em produção, ela não sairia naquele momento, e o registro da verificação diz que essa regra não foi aplicada ao teste, em vez de dizer que passou. O envio real não muda: fora do horário ele continua barrado. Só essa regra é afrouxada, e só no Testar; a janela de 24 horas do WhatsApp, o descadastro e as regras de conteúdo seguem na mesma cadeia de antes, e o rascunho do modo assistido continua barrado fora do horário.

  Na aba Execuções, as rodadas do Testar passam a aparecer como teste. Os rascunhos do modo assistido, que atendem conversas reais, continuam aparecendo como produção. E um teste que não produziu resposta deixa de aparecer como aprovado.

  Contribuição de @leadframeassessoria-lab (#2254, substitui #2252).

- **O follow-up pausado volta a andar quando o atendimento humano termina** Um follow-up que estava no passo de enviar mensagem e ficava pausado porque uma pessoa assumiu o atendimento perdia o envio em silêncio: o turno rodava durante a pausa, era descartado, e nada ficava registrado. Quando o atendimento era retomado, o motor continuava achando que aquele turno estava em voo — só conferia de novo, nunca mandava outro — e o fluxo ficava parado no mesmo passo até o sistema marcá-lo como morto por tempo esgotado, com um motivo que não era o verdadeiro.

  Agora o descarte durante a pausa deixa o mesmo rastro que a suspensão da conta já deixava: na retomada, o passo é reenfileirado e a mensagem sai normalmente. Follow-ups encerrados, passos que já andaram e fluxos apagados continuam descartados em silêncio, como antes — e nada precisa ser feito na instalação.

  Contribuição de @webtecnica (#2277, refs #2262).

## [1.71.0] — 2026-10-04

### Adicionado

- **Card do funil e dossiê do lead ganham a ação "Abrir conversa"** Lead recebido por webhook chega ao funil com telefone e sem conversa nenhuma, e nem o card nem o dossiê ofereciam jeito de começar o atendimento: o atalho só existia quando a conversa já estava lá. Agora o card e o painel do lead mostram o botão "Abrir conversa" quando o negócio tem contato — ele chama a MESMA rota que a tabela de contatos usa (POST /api/v1/conversations/open-with-contact), que reabre a conversa que já existe ou cria a que falta, e leva para a Inbox na conversa aberta. Conversa já vinculada continua sendo um elo direto, sem ida ao servidor. Sem telefone, o botão fica desabilitado na linha dizendo o motivo, e nenhuma chamada sai do navegador. Nenhuma mudança de banco: os dados já estavam no payload do quadro.

  Contribuição de @webtecnica (#2207, refs #1993).

- **Criar negócio para um contato que já tem outro aberto no mesmo funil agora avisa, sem bloquear** Na tela do funil, o diálogo de novo negócio para no aviso, com link para o negócio aberto, e pergunta se deve criar mesmo assim; recusar não cria nada. Pelo Inbox, o aviso chega depois da criação. A API POST /api/v1/leads continua criando e devolvendo 201, e acrescenta meta.avisos=["negocio_aberto_existente"] e meta.negocio_aberto_existente {id,title}. Funil diferente ou negócio encerrado não avisam. Nenhuma mudança de banco.

  Contribuição de @webtecnica (#2218, refs #1751).

- **Análise do funil na API — conversão por etapa, dias até fechar e ganho × perda por origem** A rota `GET /api/v1/metrics/funil` responde as três perguntas básicas do funil que hoje não têm resposta: quantos passam de cada etapa para a seguinte (sempre com a amostra da própria linha, e `null` — nunca `0` — quando não há medida), quanto tempo leva do primeiro contato ao fechamento (mediana e quartis, só dos ganhos, com a palavra "mediana" no payload) e de que origem vêm os que fecham (ganhos × perdas por origem, com valor somado **por moeda**, sem total cruzando moedas). A conversão é reconstruída das passagens de etapa já registradas — as feitas à mão e também as feitas pelo agente, pelo handoff e pela agenda: nenhuma tabela nova, nenhuma migration.

  A contra-métrica vem no mesmo corpo, como manda a doutrina: turnos até o desfecho e opt-outs medidos na mesma janela pelo `fn_atrito_metrics` que alimenta o Índice de Atrito — se essa leitura falhar, os números vêm nulos com a razão escrita, não somem e não viram zero.

  Ainda não há painel em `/app/metrics`: esta entrega é a consulta (rota + contas testadas sem banco); a tela é o passo seguinte da mesma issue.

  Contribuição de @webtecnica (#2222).

- **A CA do Supabase pode ser declarada uma vez no .env, e o diagnóstico passa a testar o TLS do banco** Quem exige verificação de certificado na conexão com o banco do Supabase agora declara uma linha no `.env`: `SUPABASE_SSL_ROOT_CERT=/root/certs/prod-ca-2021.crt`. Com o arquivo existindo, o kit o monta somente leitura no app, no worker, no agendador (onde o Node soma a CA à confiança) e nos psql temporários de instalação, atualização e backup. O `healthcheck.sh` ganhou o passo "TLS do banco", que testa a conexão com verificação total da cadeia e do nome do servidor.

  Sem a linha, o app, o worker e os psql funcionam como antes. O healthcheck mostra uma linha informativa dizendo que a chave é opcional, sem aviso e sem pedir download nenhum; no single-server ele diz que o passo não se aplica. A verificação de certificado nunca é desligada.

  Para quem declara a CA: nos psql do kit, uma connection string com `sslmode=require` passa a verificar a cadeia, porque a libpq trata `require` como `verify-ca` quando há uma CA. Uma CA errada faz a instalação, a atualização e o backup falharem fechado. Sem `sslmode` na string, nada muda.

  O diagnóstico da connection string no `install.sh` também passou a explicar a falha de certificado com o nome da variável, sem confundir senha errada ou queda de rede com problema de certificado.

  Contribuição de @webtecnica (#2215, fecha #829).

- **O Jev pode conferir na conversa o campo personalizado que a IA vai gravar** Nova tarefa do Jev, "Conferir o campo antes de a IA gravar": antes de o agente de IA gravar um campo personalizado do negócio, o valor é conferido nas mensagens do cliente daquele turno. Número, data, e-mail e valor em dinheiro são procurados no texto, sem chamada nenhuma; só o que sobra vai numa única pergunta ao Jev. O campo que o cliente não disse deixa de ser gravado e a IA é orientada a perguntar a ele; os outros campos da mesma chamada seguem gravando.

  A tarefa nasce DESLIGADA: ela lê as mensagens do turno juntas, e por isso só roda com o aceite da conversa e depois de alguém ligá-la no cartão do Jev (IA › Provedores). Desligada, sem credencial ou com o Jev fora, o campo é gravado como antes.

  Vale só para o agente de IA interno (o Conversador e o Operador). A tela, a API e as integrações MCP por token gravam como sempre, sem conferência e sem leitura extra. A chamada aparece em IA › Execuções e o gasto em Uso de IA.

  Contribuição de @webtecnica (#2245), a partir da issue #2234 de @TOSTES-LAB.

- **Ajuste o visual do sistema com CSS personalizado** A página Marca da instalação passa a permitir regras CSS cosméticas para ajustar login e telas das organizações, com validação de segurança e sem editar arquivos nem reiniciar o servidor. Se uma folha deixar as telas ilegíveis, abra a página com `?sem_css=1` no endereço para vê-la sem o CSS personalizado e desfazer o ajuste.

  Contribuição de @rodrigotxt (#2241).

- **Pedido de parar de receber mensagens ou de falar com uma pessoa dito em áudio passa a abrir aviso na Central** Um "não quero mais receber mensagens" falado chegava ao CRM com o texto vazio, e nem o bloqueio da entrada nem o Jev o enxergavam. Agora, quando a transcrição de um áudio do cliente fica pronta, a mesma regra que reconhece o pedido por escrito roda sobre o transcrito e, onde ela não reconhece e a tarefa de pedidos do Jev está ligada, o Jev é perguntado como numa mensagem de texto. O resultado é só um aviso na Central. O aviso da regra ("Um cliente pediu para parar de receber mensagens num áudio" ou "...para falar com uma pessoa num áudio") abre com a tarefa do Jev ligada ou desligada. O aviso só abre onde o atendimento automático rodaria naquela conversa: há um agente não pausado no número, a IA pode responder, o contato não está com uma pessoa nem bloqueado, e a conversa não é de grupo.

  A transcrição de um áudio não bloqueia o contato. O bloqueio corta todo envio ao contato (resposta do agente, funil, follow-up, campanha) e só um admin o desfaz, à mão (Contatos › Desbloquear); uma transcrição pode errar, e o erro dela somaria com o da regra. É a mesma política do texto digitado, onde o pedido ambíguo escala para uma pessoa e não bloqueia. Quem quiser parar de receber continua bloqueado ao responder PARAR por escrito, e o aviso diz isso à equipe.

  Contribuição de @webtecnica (#2246, refs #2233).

- **Taxa histórica de ganho por etapa, sugerida ao gestor para calibrar a probabilidade** Quem monta o funil passa a ver, ao lado do campo de chance de cada coluna, **quantos negócios encerrados passaram por ela e quantos foram ganhos** — a contagem com o denominador sempre visível e o período de onde o número veio («nos últimos 12 meses»). Abaixo de 10 casos a fração aparece sem convite («poucos casos para sugerir»); uma coluna sem histórico diz «sem dados», nunca 0%.

  Nada é gravado sozinho: o botão «Usar N%?» escreve pelo MESMO caminho de digitar no campo, quem aceita o número é quem opera, e `crm_lead_scores` não é tocado.

  Contribuição de @webtecnica (#2221).

- **Webhook de saída ganha os gatilhos de ganho, perda, reabertura e troca de responsável** Quem liga o CRM a um ERP, ao faturamento ou a uma planilha de comissão agora recebe um evento quando um negócio é **ganho** ou **perdido**, quando um lead encerrado **reabre** e quando o **responsável muda** — e recebe o mesmo evento com o mesmo corpo em todo caminho que muda um negócio que já existe: arrastar o card, o botão Ganhou/Perdeu, o mover em lote, o fechamento da IA (`crm_close_demand`) ou o mover de uma automação. Antes, o arrasto emitia `lead.stage_changed` e o botão não disparava regra nenhuma: o fato era o mesmo e o webhook dependia do botão.

  Limite conhecido: criar o negócio já numa etapa de ganho ou perda, ou já com responsável, **não** emite esses eventos — eles só nascem quando um negócio existente muda.

  Os quatro gatilhos novos aparecem no seletor de automações com os campos de condição do próprio negócio. Neles, por ora, a automação não pode "Atribuir a um atendente" nem "Criar/mover lead no funil": a própria mudança dispararia a automação de novo, sem fim. O corpo da troca de responsável **não** leva UUID de usuário nenhum.

  Duas mudanças aditivas valem também para quem já tem regras de negócio (`lead.created`, `lead.stage_changed`): o lead no corpo do webhook passa a trazer `lost_reason` e `closed_at`; e a opção "Incluir o responsável no corpo", que antes só valia em compromisso, passa a incluir o responsável do negócio (`owner`: `kind`, `id`, `name`). Quem valida o corpo com lista fechada de campos precisa aceitar os dois.

  Contribuição de @webtecnica (#2211, fatia da proposta #1528).

### Alterado

- **O limiar de sentimento do agente se ajusta pela tela, e o medidor de clima passa a medir hostilidade com o atendimento, não o assunto** A tela do agente ganha o cartão "Limiar de sentimento": a nota abaixo da qual o clima da conversa é considerado fechado e ela passa para uma pessoa. Antes, o valor só mudava por SQL direto no banco. O padrão continua 0,3, e o limiar não muda para quem não mexer nele. Nota mais alta manda mais conversas para uma pessoa; nota mais baixa deixa só a hostilidade forte acionar a passagem.

  O que muda para todos os agentes, sem ajuste nenhum, é o texto do medidor de clima quando quem mede é a IA de linguagem (o caminho padrão). Ele deixou de presumir e-commerce e passa a medir hostilidade com o atendimento (ameaça, xingamento, pedido agressivo de falar com uma pessoa). Quem só descreve o problema que o trouxe, como em advocacia, saúde ou assistência técnica, fica no neutro e não aciona a passagem. Quem atende e-commerce deve ver menos passagens para uma pessoa por decepção com produto ou entrega; para voltar a passar mais conversas, suba o limiar.

  Quando o clima é medido pelo Jev (Jev decidindo, ou sem IA de linguagem configurada), a escala dele não mudou e ainda lê "reclamando" abaixo de 0,3; o acompanhamento está na #2219. Contribuição de @webtecnica (#2216, refs #2209).

### Corrigido

- **O selo "Consultado por" do acervo de conhecimento volta a mostrar os assistentes que usam cada material** Na tela de materiais da base de conhecimento, todo material aparecia com "Consultado por: nenhum assistente ainda", mesmo quando a versão publicada de um assistente o usava em conversa. A consulta da tela era recusada pelo banco por ambiguidade, e a recusa era descartada em silêncio. Agora a tela lê a versão publicada de cada assistente e mostra quem consulta o material. Se a consulta falhar por outro motivo, a tela continua abrindo, e a causa fica registrada no log do servidor. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2238, fecha #2236, relatada por @kristhianlumai-lgtm).

- **A recusa "o atendimento desta conversa mudou" para de citar um link que não existe em compromisso sem Meet** A frase que `meet_conversation_stale` mostra na tela dizia "O atendimento desta conversa mudou **depois que o link foi criado**". Em compromisso PRESENCIAL ou POR TELEFONE não existe link nenhum, então a frase afirmava um fato que não aconteceu — e é a frase que aparece no fluxo natural do atendente (resolver a conversa → marcar o compromisso → mandar os dados), porque quem recusa é `fn_meet_boundary_current`, que compara `service_revision`, `current_demanda_id`, `demanda.revision`, `fechada_em` e o status da conversa, nunca um link.

  A frase passa a dizer só o que é verdade nos dois casos: "O atendimento desta conversa mudou. Escolha a conversa atual e autorize o envio de novo." Nenhuma mudança de fluxo, de status ou de recusa — só a frase. As traduções (`es` no dicionário e `en.json`) acompanham a chave nova.

  O ponto de produto que o relator também sugeriu (texto próprio quando o atendimento está ENCERRADO, ou o envio abrir um novo atendimento) continua em aberto: escolher entre as duas é decisão de mantenedor, e este fragmento não toma nenhuma delas.

  Contribuição de @webtecnica (#2244, refs #2188, relatada por @amexgestao).

- **O aviso de envio retido na conversa julga cada envio pela janela certa, e o aviso de escalação dentro de um follow-up segue a janela de disparo** O registro de envio retido passa a guardar se a mensagem segurada era uma resposta a quem escreveu ou um disparo (follow-up, campanha). O aviso de retenção da conversa usa a janela de resposta para respostas e a janela de disparo para disparos, e a hora que ele mostra é a da janela do envio retido. Antes todo envio retido era tratado como resposta. O aviso de que uma pessoa vai atender, quando nasce dentro de um follow-up, agora é avaliado pela janela de disparo. Com as janelas padrão (7h às 22h nas duas) nada muda. Registros antigos continuam lidos como resposta. Nenhuma ação do operador.

  Contribuição de @webtecnica (#2227, refs #2112).

- **Atualização com o registro de imagens fora do ar não derruba mais a instalação** Clicar em **Atualizar** num momento em que a VPS não alcançava o registro de imagens (DNS saturado, rede instável) podia deixar o CRM fora do ar: o update parava os serviços, não conseguia baixar a versão nova, tentava construir as imagens na própria VPS, gastava a memória inteira dela e terminava com app, worker e proxy parados — 502 para todo mundo até alguém reiniciar o Docker à mão.

  Agora, antes de parar qualquer coisa, o update confere se as quatro imagens da versão nova existem no registro. Se não existem, ou se o registro não responde, ele recusa sem começar (código 3) e a versão atual segue no ar, intocada. A construção local deixa de acontecer sozinha quando quem falhou é o registro; continua disponível de propósito, com `DESKCOMM_BUILD_LOCAL=1`.

  Se a atualização falhar depois de trocar a versão — inclusive quando o app responde mas o worker, o agendador ou o proxy não sobem —, os pins de versão do `.env` voltam sozinhos para a versão anterior e os serviços sobem nela. O banco nunca é revertido. Toda execução deixa um resumo em `.deskcomm-update-diagnostico.log`, e o healthcheck passou a ter prazo, em vez de ficar preso em "▶ Containers" quando o Docker não responde.

  Nada é preciso fazer na instalação: a mudança chega com a próxima atualização.

  Contribuição de @webtecnica (#2208, fecha #1955).

- **A conversa passada para humano só porque o áudio ainda não tinha transcrição volta sozinha ao agente quando a transcrição chega** Quando a transcrição ou a descrição de uma mídia atrasava (por exemplo, sem saldo no provedor) e o agente passava a conversa para humano porque não havia texto, a conversa ficava parada até alguém clicar em "Devolver ao automático", e o motivo exibido seguia dizendo que não havia transcrição. Agora, quando a transcrição chega e ninguém assumiu nem respondeu ao cliente, a conversa volta ao agente pela mesma função do botão e o agente responde ao áudio. Se uma pessoa já assumiu ou já respondeu (pelo inbox ou pelo celular), a conversa fica com ela e só o motivo é corrigido. O pedido do cliente por um atendente, feito por escrito, continua permanente. Contribuição de @webtecnica (#2217, fecha #2210).

- **O lembrete de véspera não sai mais na hora quando a reunião é marcada com menos de 24h, nem sai duas vezes** Lembrete cuja hora já tinha passado quando a reunião foi marcada não sai mais, e isso vale para qualquer lembrete, inclusive o principal: reunião marcada com menos antecedência que o lembrete não recebe esse lembrete (por exemplo, num tipo de compromisso que só tem o lembrete de véspera, a reunião marcada para o dia seguinte não recebe nenhum). O mesmo lembrete não sai duas vezes para o mesmo compromisso, mesmo quando a gravação do envio falha: se o registro não grava, a rodada não envia e tenta na seguinte, e o lembrete que falha no envio depois de registrado não é reenviado. Contribuição de @webtecnica (#2226, refs #2223).

- **A marca da instalação aparece também no login** O nome configurado em Administração → Marca passa a aparecer também sob o título Entrar, sem editar a configuração do servidor.

  Contribuição de @rodrigotxt (#2241).

- **O painel de Provedores mostra quem de fato ouve o áudio do cliente, e não mais whisper-1 fixo** O ponto "Ouvir o áudio do cliente" anunciava `whisper-1` para toda organização, inclusive para a que não tem chave OpenAI e transcreve pelo próprio modelo de conversa (por exemplo, Gemini com a chave do Google validada). O painel passa a rodar a mesma escada de transcrição do worker e mostra o degrau que vai rodar: o serviço da instalação (`TRANSCRIPTION_API_KEY`), a chave OpenAI com o modelo de transcrição em vigor, ou o modelo de conversa da organização quando ele declara a capacidade de áudio. Sem nenhum dos três, mostra "—" e o motivo, traduzido no idioma de quem usa a tela. A ordem dos degraus não mudou. Contribuição de @webtecnica (#2205, refs #2190).

- **A reunião remarcada para menos de 24h não recebe mais o lembrete de véspera minutos depois da remarcação** Quando uma reunião marcada com dias de antecedência era remarcada para o dia seguinte, o lembrete de véspera saía logo depois da remarcação, porque o sistema ainda media a partir da data em que a reunião foi criada. Agora vale o momento em que o horário atual foi marcado: o lembrete cuja hora já tinha passado nesse momento não sai, e o lembrete que ainda estava por vir continua saindo na hora certa. Reuniões que nunca foram remarcadas não mudam de comportamento. Contribuição de @webtecnica (#2239, fecha #2230).

- **Quatro bibliotecas internas sobem de versão para fechar avisos de segurança** O aviso automático de segurança do repositório apontou quinze alertas em quatro bibliotecas que o sistema usa por dentro. Três vão na instalação: `ip-address` (lida com endereços IP no limite de requisições do servidor MCP), `fast-uri` (interpreta endereços na validação de esquemas) e `brace-expansion` (expande padrões de nomes de arquivo). A quarta, `undici`, é usada só nos testes do projeto.

  Todas subiram para versões corrigidas dentro da mesma linha que já usavam (`ip-address` 10.7.3, `fast-uri` 3.1.8, `brace-expansion` 1.1.21 e 5.0.12, `undici` 8.11.2). Nenhuma tela, nenhuma configuração e nenhum comando mudam: quem opera uma VPS só precisa atualizar como de costume. (#2214)

- **Acesso só de leitura ao painel de plataforma deixa de escrever nas tabelas de IA, agenda, campanhas, CRM, financeiro, vendas e comissões** A 0508 e a primeira fatia fecharam a escrita de quem entra no painel de plataforma com `scope=support_readonly` em parte do banco, mas 45 regras de escrita criadas nos blocos seguintes ainda aceitavam a checagem que ignora o scope do JWT: agentes de IA, base de conhecimento, disponibilidade e agenda, campanhas, catálogo, funil e tarefas do CRM, honorários, sessões de voz, os moldes de lançamento recorrente, contas, formas de pagamento, plano de contas, vendas, comissões, lançamentos financeiros e fidelidade.

  Agora todas exigem `scope=full` para escrever. A leitura continua como estava — `support_readonly` segue enxergando os dados, só não altera; os moldes recorrentes e as nove tabelas de dinheiro (contas, formas de pagamento, plano de contas, vendas e seus itens, regras de comissão, comissões, lançamentos e fidelidade) ganharam um par de regras (ler/escrever), porque nenhuma tinha regra de leitura própria. Membros da organização e platform admin `full` escrevem exatamente como antes.

  Nada é preciso fazer na instalação.

  Contribuição de @Tong-bit-art (#2202, continua #2115).

## [1.70.0] — 2026-10-03

Esta versão junta 106 mudanças. Cada item é curto para caber na tela de atualização; a explicação completa está no PR citado. Nenhuma exige ação na atualização.

### Adicionado

- **Fluxo de follow-up ganha caixas de mover o card no funil e gravar tag** Duas caixas novas no editor: "mover lead no funil" e "editar tag do lead". Contribuição de @webtecnica (#2181).

- **Token de API administra fluxos de follow-up, agentes, prospecção e tipos de agendamento** Vale para o token `dsk_` com papel `admin`; a escrita vai para rascunho e publicar continua pela tela. Contribuição de @webtecnica (#2028).

- **A assinatura (HMAC) de uma fonte de captação agora se liga pela tela** Em Automações › Fontes, seção "Assinatura (HMAC)": o segredo aparece uma vez e o endereço passa a recusar envio sem assinatura. Contribuição de @maclevison (#2023).

- **Mensagens enviadas ao cliente podem mostrar quem fala (atendente ou IA) em negrito, na linha de cima** Liga em Configurações › Distribuição de atendimento; nasce desligado. Contribuição de @webtecnica (#2079), a partir da issue #2066 de @Cgaban.

- **O balão do áudio avisa "Transcrevendo…" enquanto a transcrição é gerada** Contribuição de @webtecnica (#2154).

- **Cadastrar, na captação, o campo que o formulário mandou** Em Webhooks › Leads recebidos, o botão "Cadastrar como campo do lead". Contribuição de @paulolimajr77 (#2051).

- **O chat de casos mostra os trechos do acervo ligados à pergunta** Os trechos aparecem ao lado; a IA ainda não os usa para responder. Contribuição de @webtecnica (#1952).

- **Venda de quem veio de anúncio da Meta pela sua página agora é reportada ao pixel, com o valor lido da conversa** Vale para quem chega com UTM de anúncio da Meta; sem valor no negócio, a IA lê o valor escrito na conversa. Contribuição de @agencyspeedagend-del (#2076).

- **Cada etapa do funil pode avisar a Meta, não só a venda** Em Configurações › Conversões, o cartão "O que cada etapa do funil informa à Meta". Contribuição de @agencyspeedagend-del (#2087).

- **Um guia de IA passa a orientar o uso diário do CRM pela interface** Contribuição de @italopabloferreria (#2088).

- **O "digitando…" do agente passa a aparecer também no número oficial (WhatsApp Cloud API)** Contribuição de @lauropilatti-c01 (#2054).

- **O segundo fator pode ser exigido de qualquer nível de papel, com carência** Em Configurações › Segurança: nível mínimo de papel e carência de 0 a 30 dias. Contribuição de @webtecnica (#2163).

- **Extensão declarativa pode contribuir um tema (gancho)** Contribuição de @webtecnica (#2091).

- **A janela de esfriando de cada etapa vira um campo editável** Atenção: diminuir a janela de uma etapa cheia esfria vários negócios de uma vez na passada seguinte do radar. Contribuição de @webtecnica (#2161), construída sobre a proposta de @franceschini-lucas (#1532).

- **O cartão do Jev avisa quem é da área da saúde** Contribuição de @webtecnica (#2085).

- **Uma rede a mais para a LGPD alcançar os módulos instalados** Contribuição de @webtecnica (#2083).

- **Campos do formulário nas mensagens das automações** `{{servico}}` vale como atalho do campo do lead, e os campos do funil viram botões na ação de WhatsApp. Contribuição de @paulolimajr77 (#2051).

- **O operador escolhe quais empresas da prospecção entram na fila antes de iniciar as abordagens** O padrão continua sendo todas marcadas. Contribuição de @webtecnica (#2048).

- **Quem responde PARAR tem o negócio aberto fechado sozinho, com o motivo "Pediu para não receber mensagens"** Contribuição de @paulolimajr77 (#2049).

- **O fluxo de silêncio pode esperar antes de recomeçar para quem já passou por ele** Com a pausa em 0 (o padrão), nada muda. Contribuição de @jmpo (#2037).

- **A pausa do gatilho de silêncio pode contar a partir do último envio do fluxo** Contribuição de @jmpo (#2037).

- **Portugal entra no registro de países, ainda fora do seletor até a citação do RGPD ser revisada** Contribuição de @webtecnica (#2084), com revisão de @maclevison.

- **O pino de localização do WhatsApp pode chegar com a rua e a cidade aproximadas** Exige uma chave da Geocoding API do Google em Agente de IA › Provedores › Mapas; sem chave, nada muda. Contribuição de @jmpo (#2043).

- **Cada empresa escolhe quanto tempo a IA espera depois de uma resposta pelo celular** Em Configurações › Atendimento, de 5 minutos a 24 horas; o padrão continua 60 minutos. Diagnóstico e teste de @gaberaldo-svg (#2005).

- **A proteção contra promessas considera as condições comerciais consultadas pelo agente** Contribuição de @vitorlacerdadigital (#2010), construída sobre o caminho aberto por @webtecnica no #1981.

- **Dá para ajustar o ritmo de uma campanha de prospecção pausada** Contribuição de @paulolimajr77 (#2104).

- **Na Prospecção, dá para mexer na fila de uma campanha pausada e excluir as empresas desmarcadas** Contribuição de @paulolimajr77 (#2106).

- **Na Prospecção, a empresa pode entrar no funil só quando for abordada** Campanhas novas nascem nesse modo; as já criadas seguem como eram. Contribuição de @paulolimajr77 (#2105).

- **A distribuição de atendimento ganha o modo por menor carga** Em Configurações › Atendimento. Contribuição de @webtecnica (#1711).

- **O gatilho de silêncio aceita um máximo — o fluxo só começa enquanto o silêncio for recente** Sem o máximo (o padrão), nada muda. Contribuição de @jmpo (#2037).

- **O texto do áudio aparece no balão da conversa, logo abaixo do player** Contribuição de @webtecnica (#2060), a partir do pedido de @Alencaf.

- **As varreduras de LGPD, RLS e security definer agora veem os módulos instalados** Contribuição de @webtecnica (#2201).

### Alterado

- **O seletor de etiqueta do atendimento passa a ter prova com dublês que respeitam a organização ativa** Contribuição de @webtecnica (#2045).

- **A resposta do agente com Anthropic custa menos — os passos do laço de ferramentas leem do cache** Contribuição de @jmpo (#2038).

- **A bolinha colorida no avatar da lista de conversas diz o que significa** Contribuição de @valterhjr (#2075).

- **Migration nova se descreve no próprio arquivo e para de conflitar com as outras** (#2149)

- **A busca de prospecção passa por um despachante de provedor, e a Apify continua sendo a fonte** Contribuição de @webtecnica (#2174).

### Corrigido

- **Sessão volta a ser renovada na tela de conta suspensa** Contribuição de @webtecnica (#2019).

- **A regra "admin de plataforma pode escrever nesta empresa?" agora é UMA função** Contribuição de @webtecnica (#2027).

- **"Mandar ao cliente" passa a enviar compromisso que não é Google Meet** Valia para compromisso presencial ou de qualquer local que não seja Google Meet. Contribuição de @Tong-bit-art (#2192); causa medida no banco por @amexgestao.

- **O calendário de "Novo agendamento" não abre mais num mês sem horário livre** (#2058)

- **A anonimização de um contato não é mais desfeita por um worker de mídia ou de clima que estava no meio do trabalho** (#2191) Construído sobre o trabalho de @webtecnica (#2030).

- **Campos diferentes gravados ao mesmo tempo no mesmo negócio não se apagam mais** Contribuição de @paulolimajr77 (#2009).

- **Aplicar uma proposta deixa de apagar onze configurações do assistente** Contribuição de @webtecnica (#2145).

- **O registro de auditoria passa a ser só-inclusão para todo papel do banco, inclusive o do worker** (#2137)

- **Quem responde pedindo para parar (ex.: "Parar não é daqui") recebe a confirmação de saída, e não o texto de "passei seu pedido para um atendente"** Contribuição de @paulolimajr77 (#2050).

- **Envio das boas-vindas numa empresa já configurada não mostra mais "db_error"** Contribuição de @webtecnica (#2152).

- **O vazio da aba Grupos do inbox explica quais grupos entram e a partir de quando** Contribuição de @webtecnica (#2200).

- **O banco deixa de acusar os avisos de segurança do painel do Supabase** Contribuição de @usebeehub (#2125).

- **O gatilho de silêncio não tenta mais inscrever, a cada minuto, quem já está num follow-up** Contribuição de @jmpo (#2107).

- **Boas-vindas gravam na organização da aba, não na que estava ativa** Contribuição de @webtecnica (#2072).

- **Boas-vindas não renomeiam mais uma organização que já terminou o onboarding** Contribuição de @webtecnica (#2143); relato de @trackerrm122-hub (#2113).

- **Fonte de captação com assinatura só aceita envio que ela consegue conferir** Se o segredo não puder ser lido nesta instalação, gere a assinatura de novo no painel da fonte. (#2136)

- **A Central para de abrir o aviso de mídia não lida em dobro quando dois workers rodam juntos** Contribuição de @Tong-bit-art (#2185).

- **Comanda nasce na moeda da organização, não mais em real fixo** Contribuição de @webtecnica (#2173).

- **Atendimentos sem comanda mostram a moeda da empresa, não mais real fixo** Contribuição de @webtecnica (#2159).

- **A conversão de venda clique-para-WhatsApp para de ser recusada pela Meta** Para a venda passar, preencha em Configurações › Conversões o ID da Página (ou da conta do WhatsApp Business). Contribuição de @webtecnica (#2197).

- **O cálculo de custo do runtime nativo legado reconhece os ids da OpenRouter e não chama de grátis o preço que não conhece** Contribuição de @webtecnica (#1963).

- **O dossiê do follow-up não lê mais falha do motor como contato com o cliente** Contribuição de @webtecnica (#2081), a partir da issue de @hudson-souza-mkt (#2014).

- **Empresas paradas deixam de virar uma lista de ids na URL que crescia sem teto (5 varreduras)** Contribuição de @webtecnica (#2122), vindo do #2022.

- **Encerrar uma conversa com a tela desatualizada não deixa mais o CRM lento** Contribuição de @AlecsanderAbreu (#2123).

- **Escape no nome e na chance da etapa volta a descartar o rascunho, não a gravar (#2164)** Contribuição de @webtecnica (#2172).

- **As conversas, o histórico e os pedidos numa conversa de atendimento também só alcançam o contato do turno** Contribuição de @webtecnica (#2182).

- **Exportação LGPD do titular passa a incluir a transcrição/texto extraído da mídia** Contribuição de @webtecnica (#2020).

- **O resumo que o agente grava ao fim de cada resposta pede uma correção antes de repetir a resposta inteira** Contribuição de @jmpo (#2039).

- **A ficha do negócio e o painel do CRM não desfazem mais o que outra pessoa alterou** Contribuição de @webtecnica (#2151).

- **A trava de imutabilidade da versão publicada do agente cobre proposal_ai_draft_enabled e inbound_debounce_ms** Contribuição de @webtecnica (#2013).

- **O aviso ao cliente na passagem para atendente humano não usa mais travessão** Contribuição de @webtecnica (#2026).

- **Roma entra nos fusos, e o fuso escolhido no primeiro acesso aparece igual em Configurações** Contribuição de @fabianmartinelli-fm (#2187).

- **O guia de montagem para escritório de advocacia deixa de prometer a passagem automática por assunto jurídico** (#2157)

- **A dica do laço na ação de texto do follow-up deixa de mostrar um "e" em português para quem usa em espanhol** Contribuição de @ajsaranetaeu (#2177).

- **Retenção, escalação e resposta aprovada usam a janela de RESPOSTA pelo tipo** Contribuição de @webtecnica (#2031).

- **Janelas (Dialog) com conteúdo alto rolam por dentro, e os botões ficam alcançáveis** Contribuição de @webtecnica (#2055).

- **O agente deixa de perder a resposta quando o modelo repete o objeto JSON** Contribuição de @webtecnica (#2144).

- **O comentário da timeline do negócio não promete mais o valor anterior no log de auditoria** Contribuição de @webtecnica (#2024).

- **A busca e a ficha de contato numa conversa de atendimento só alcançam o contato do turno** Contribuição de @webtecnica (#2175).

- **O media-derive-worker não grava mais transcrição em mensagem já anonimizada** Contribuição de @webtecnica (#2030).

- **O negócio que nasce de uma mensagem no Instagram ou no Facebook não aparece mais como vindo do WhatsApp** Contribuição de @paulolimajr77 (#2199).

- **A nota interna de uma conversa deixa de poder ser editada ou apagada por um colega que não a escreveu — só o autor ou um manager+ pode** Contribuição de @webtecnica (#2080).

- **OpenRouter: quatro auxiliares do agente leem o JSON do modelo mesmo com cerca de código, prosa ou repetição** Contribuição de @webtecnica (#2096).

- **Quem tem acesso só de leitura ao painel de plataforma deixa de conseguir alterar empresas e outros dados pela API** Contribuição de @webtecnica (#2078).

- **No número oficial intermediado, o pino que chegou sem coordenadas é recuperado sozinho** Contribuição de @jmpo (#2043).

- **A barra do prazo das telas de LGPD conta até o fim do dia, e não até a meia-noite do servidor** Contribuição de @Tong-bit-art (#2170).

- **A coluna "Vence em" da lista de LGPD para de anunciar atraso antes do prazo vencer** Contribuição de @Tong-bit-art (#2176).

- **O prazo de uma solicitação LGPD passa a sair no dia certo no e-mail ao DPO, e a lista deixa de marcar "Vencido" na véspera** Contribuição de @Tong-bit-art (#2101).

- **O painel da instalação deixa de contar prazo de LGPD a mais e de anunciar atraso na véspera** Contribuição de @Tong-bit-art (#2179).

- **O painel da plataforma para de marcar "Vencido" na véspera do prazo, e a contagem de "Vence em" passa a contar até o fim do dia** Contribuição de @Tong-bit-art (#2168).

- **O prazo nas telas de detalhe de LGPD sai no dia certo, e a última hora do dia do prazo para de mostrar "0h restantes" ao lado de "Vencido"** Contribuição de @Tong-bit-art (#2169).

- **O próximo passo que o sistema escreve na demanda nova aparece no idioma de quem lê** Contribuição de @jmpo (#2040).

- **O link de "esqueci a senha" da instalação single-server passa a abrir a troca de senha** Quem já instalou recebe a correção pelo `update.sh`. Contribuição de @webtecnica (#2153), sobre o diagnóstico de @brunno-soaress na #2109.

- **A regra "criar ou mover negócio" agora transfere o card quando o gatilho é uma etiqueta de negócio** Contribuição de @webtecnica (#2162).

- **Mudar a regra de verificação em duas etapas da empresa pede o código na sessão de quem já usa a verificação** (#2167)

- **A gravação de sessão do diagnóstico de erros passa pelo mesmo filtro de URL do resto da telemetria** (#2186)

- **O roteador de intenções volta a classificar a transcrição do áudio — a conversa não fica mais presa no agente anterior** Contribuição de @webtecnica (#2082).

- **O fluxo de silêncio deixa de inscrever conversa que uma pessoa da equipe assumiu** Contribuição de @jmpo (#2037).

- **O instalador single-server deixa de apagar o REVERSE_PROXY escolhido no ambiente** Atenção: a instalação single-server atrás de proxy próprio ainda não conclui (Traefik para com 404 na fase 2; ver #2099). Contribuição de @webtecnica (#2150), sobre o diagnóstico de @brunno-soaress na #2099.

- **Skill importada por .zip volta a ser editável na tela sem perder references/ e assets/** Mudar os arquivos do pacote continua sendo por novo .zip. Contribuição de @webtecnica (#2203).

- **Acesso só de leitura ao painel de plataforma deixa de poder anonimizar contatos** Contribuição de @Tong-bit-art (#2196).

- **Acesso só de leitura ao painel de plataforma deixa de alterar conversas, mensagens, leads, sessões de canal e convites** Contribuição de @Tong-bit-art (#2193).

- **Suspender uma empresa passa a calar a IA e os envios dela; quem tem acesso só de leitura ao painel deixa de poder alterar dados** Ao reativar, nada sai em rajada: a Central lista as conversas que receberam mensagem durante a suspensão. (#1987) @Draven9 atacou o mesmo defeito, em paralelo, no #1967.

- **O teste do kit "instalar sem chave de IA" para de reprovar por acaso (intermitência da #1570)** Contribuição de @webtecnica (#2033).

- **Teto de escrita por token passa a valer também no upload de mídia e na abertura de conversa pelo contato** Contribuição de @webtecnica (#2012).

- **A transcrição de áudio usa o modelo de conversa da organização quando não há chave OpenAI, e o status da derivação nunca fica nulo** Contribuição de @webtecnica (#2189).

- **Reverter uma versão ou criar um agente pela tela não desliga mais o follow-up automático** Contribuição de @webtecnica (#2011).

- **Formulários do Elementor Pro passam a criar lead pelo webhook** Contribuição de @paulolimajr77 (#2051).

- **O lixo interno do JetFormBuilder não aparece mais no lead** Contribuição de @paulolimajr77 (#2051).
## [1.69.0] — 2026-09-30

### Adicionado

- **O Jev passa a ler, só observando, a resposta do cliente ao follow-up e comparar a saída que ele escolheria com a da sua IA** O Jev ganha a tarefa **Ler a resposta ao follow-up**. Num fluxo de follow-up com o passo **"Classificar (IA)"**, a sua IA de sempre lê a resposta do cliente à mensagem do fluxo e escolhe por qual das saídas que você criou no passo o fluxo segue. Com o Jev ligado, ele responde a mesma pergunta, entre as mesmas saídas e ao mesmo tempo, recebendo só o que o cliente digitou na resposta — sem CPF, telefone e e-mail — e as saídas e a dica que você escreveu no passo. Resposta em áudio, imagem ou documento não é enviada ao Jev.

  Nesta versão a tarefa **só observa**: quem escolhe a saída do fluxo é sempre a sua IA de sempre, e o follow-up não espera pelo Jev. O cartão do Jev, em **IA › Provedores**, mostra em quantas mensagens dos últimos 30 dias os dois puseram a resposta do cliente na mesma saída, e diz por que não há o botão "Deixar o Jev decidir" nela: a saída escolhida muda o caminho do cliente no fluxo, e primeiro se mede, com respostas de verdade, o quanto os dois concordam. Passos "Classificar (IA)" com uma saída só não são enviados ao Jev: sem escolha, os dois concordariam sempre. Onde nenhum follow-up publicado tem o passo com duas saídas ou mais — e nenhum cliente ainda está andando num fluxo que o tenha, mesmo desativado —, o cartão mostra a tarefa como **"Não roda"**, com o motivo e o link para **Follow-ups**, antes e depois de ligar o Jev. Em **IA › Execuções**, a chamada aparece como **"Ler a resposta ao follow-up"**, marcada como observação.

  **Quem já tem o Jev ligado** vê a tarefa com o selo **"Nova"**, já observando: ela usa o mesmo dado que você já autorizou — cada mensagem, sozinha. Isso é uma chamada a mais ao Jev a cada vez que a sua IA de sempre lê uma resposta digitada pelo cliente (uma fração de centavo de dólar, cobrada na sua conta da TypeSafe). Para não usar, clique em **"Pausar esta tarefa"** no cartão. A política de privacidade passa a listar essa finalidade. Nada precisa ser editado para atualizar.

  Se a instalação voltar para uma versão anterior, a tarefa deixa de rodar e o estado dela fica guardado.

### Corrigido

- **O passo "Classificar resposta" dos fluxos de follow-up espera o cliente responder** Num fluxo que manda uma mensagem e em seguida classifica a resposta com a IA, o
  passo de classificar seguia pela saída "Sem resposta" poucos segundos depois do
  envio, sem dar ao cliente o tempo de espera configurado no passo (15 minutos
  por padrão, ou o prazo que você escolheu). O cliente que respondia dentro desse
  prazo já tinha sido tratado como quem não respondeu.

  Agora o passo espera o prazo inteiro:

  - se o cliente responder dentro dele, a resposta dele à mensagem do fluxo é
    classificada e o fluxo segue pelo caminho da classe — inclusive quando o
    agente ou alguém da equipe já respondeu ao cliente antes;
  - se o prazo acabar sem resposta, o fluxo segue por "Sem resposta", e uma
    condição "Desfecho do passo anterior" logo depois enxerga esse desfecho;
  - enquanto espera, a história do follow-up mostra "Esperando a resposta do
    cliente" com a hora limite, em vez de parecer parada.

  Não é preciso fazer nada para receber a correção. Quem colocou um passo
  "Aguardar" antes do "Classificar resposta" para contornar o problema vai ver os
  dois tempos somados (a espera do "Aguardar" e depois o prazo do classificar);
  se a espera extra não faz mais sentido, basta tirar o "Aguardar" do fluxo.

## [1.68.0] — 2026-09-30

### Adicionado

- **O Jev passa a perceber quando o cliente pede para falar com uma pessoa ou para parar de receber mensagens, e pode avisar a equipe na Central** O Jev ganha duas tarefas: **Perceber pedido para falar com uma pessoa** e **Perceber pedido para parar de receber mensagens**. Hoje quem percebe esses pedidos é uma regra sem IA: ela passa a conversa a uma pessoa quando o cliente escreve "quero falar com um atendente" (ou uma das palavras de passagem do agente) e bloqueia o contato quando ele manda "PARAR". Ela é precisa, mas estreita: "quero falar com alguém de verdade, não com robô" passa por ela sem ser visto.

  O Jev só é perguntado **onde a regra de hoje disse não** — a mensagem que ela já pegou nem sai para a TypeSafe, e a regra olha todas as mensagens do cliente ainda sem resposta, como o atendimento automático olha: "quero falar com um atendente" seguido de "por favor, alguém de verdade" é um pedido que ela pegou — e só onde há um atendente automático no ar naquele número, sem pessoa no comando. Pedido mandado por áudio não é perguntado. As duas perguntas vão juntas, numa chamada ao Jev separada da do clima da conversa: uma falha nela nunca muda a medição do clima.

  As duas tarefas **começam só observando**. O cartão do Jev, em **IA › Provedores**, mostra em quantas **mensagens** dos últimos 30 dias o Jev percebeu um pedido que a regra de hoje não reconheceu, com links para as conversas mais recentes, para você ler o que o cliente escreveu. A conta é por mensagem, e não por pedido: um cliente que escreve duas frases desse tipo seguidas conta duas. Onde nenhum atendente automático está no ar (ou o atendimento está com um sistema de fora), o cartão mostra as duas tarefas como **"Não roda"**, com o motivo. Em **IA › Execuções**, a chamada aparece como **"Perceber pedidos do cliente"**.

  Quando quiser, clique em **"Avisar a equipe"** na tarefa (o cartão explica o efeito e pede confirmação antes de valer). A partir daí, cada pedido que o Jev perceber abre **um aviso na Central de avisos**, um por conversa, com o botão **"Abrir a conversa"**; se o cliente pedir de novo, o mesmo aviso volta a abrir (ou, se ainda estiver aberto, sobe para o topo), com a data do pedido novo. O aviso não repete o que o cliente escreveu — a mensagem fica na conversa, para quem pode vê-la. O de **falar com uma pessoa** se fecha sozinho quando a conversa fica com uma pessoa (alguém assume, ou o atendimento automático a passa) ou é encerrada; se isso aconteceu enquanto o Jev respondia, ele nem nasce. O de **parar de receber** diz à equipe o que ela pode fazer — assumir a conversa, para o assistente parar de responder, e pedir ao cliente que responda "PARAR", que é o que bloqueia o contato —, e por isso **não** se fecha ao assumir: fica aberto até o contato ser bloqueado ou a conversa ser encerrada. O "Marcar resolvido" continua valendo para os dois. Com as tarefas avisando, o cartão segue dizendo que o Jev **observa**: ele não decide nada no lugar da regra. Em nenhum estado o Jev passa a conversa, bloqueia alguém, cala o agente ou responde o cliente: quem passa a conversa continua sendo a regra de hoje ou uma pessoa, e quem bloqueia o contato é só a regra de hoje, quando o próprio cliente manda "PARAR". Para voltar, clique em **"Voltar a só observar"**.

  **Quem já tem o Jev ligado** vê as duas tarefas com o selo **"Nova"**, já observando: elas usam o mesmo dado que você já autorizou — cada mensagem, sozinha, sem CPF, telefone e e-mail. Isso é uma chamada a mais ao Jev por mensagem em que a regra não viu algum dos pedidos (uma fração de centavo de dólar, cobrada na sua conta da TypeSafe). Para não usar, clique em **"Pausar esta tarefa"** no cartão. A política de privacidade passa a listar essas duas finalidades. Nada precisa ser editado para atualizar.

  Se a instalação voltar para uma versão anterior, as duas tarefas deixam de rodar e o estado delas fica guardado; os avisos já abertos continuam na Central, e seguem se fechando sozinhos.

### Corrigido

- **O update.sh não falha mais com "duplicate key ... ai_pricing_pkey" quando um mesmo modelo está cadastrado em dois provedores** A atualização do aplicativo parava na etapa "Atualizando o banco de dados" com erro
  `duplicate key value violates unique constraint "ai_pricing_pkey"` quando o mesmo
  modelo existia ativo, com preço, em dois provedores ao mesmo tempo (ex.: openrouter
  e requesty) e ainda não tinha linha em `ai_pricing`. Como `ai_models` permite um
  `model_id` por provedor, o backfill de preços gerava duas linhas iguais dentro do
  mesmo comando e a chave primária (que é só o `model`) recusava a segunda. O erro
  não deixava nenhuma versão atualizar nem voltar com `--force` naquela instalação.

  Agora o backfill emite uma única linha por modelo, escolhendo de forma determinística
  o provedor de menor preço quando houver o mesmo modelo em mais de um provedor;
  o mecanismo idempotente (não reescrever preço já existente) continua intacto. Quem
  estava travado por esse erro basta rodar a atualização de novo: ela completa sem
  ação manual no banco.

  Contribuição de @webtecnica (#2008); reportado e investigado no banco por @aerosuiteapp (#1998).

- **O agente respeita os funis autorizados ao atualizar a etapa de um negócio** Ao confirmar uma etapa durante a conversa, o agente agora passa ao espelho do CRM os funis autorizados em sua versão publicada. Um agente sem acesso ao funil não move mais o cartão, inclusive quando retoma um caso interno; agentes com o funil autorizado continuam podendo atualizar a etapa. O estado da conversa e a resposta ao cliente seguem seu fluxo normal.

  Contribuição de @arodalves (#2006).

## [1.67.0] — 2026-09-30

### Adicionado

- **O tempo que o agente espera antes de responder passa a ser ajustável por número** A proteção de envio de cada número (em Conexões › Proteção de envio) ganhou quatro campos para o "tempo de pensar" do agente antes da primeira mensagem da resposta: o tempo para ver a notificação, o tempo por caractere digitado, o mínimo e o máximo. Campo vazio mantém exatamente o ritmo de antes (0,9 s + 22 ms por caractere, entre 1,2 s e 7,5 s). Um mínimo acima do máximo é recusado na hora, com a explicação na tela.

  Quando a resposta sai em várias mensagens, o intervalo entre elas passa a seguir o "intervalo entre mensagens" configurado para o número, em vez de um valor fixo de 1,2 s a 2 s. Quem nunca mudou esse intervalo não nota diferença; quem mudou vê as mensagens da resposta seguindo o valor escolhido.

  Não é preciso fazer nada na instalação: a atualização acrescenta as colunas sozinha.

  Contribuição de @webtecnica (#1996), fechando a #653.

- **Espera antes de responder (janela de rajada) configurável por agente** No cadastro do agente, em "Freios de segurança", agora dá para ajustar quanto tempo o agente espera antes de responder mensagens do mesmo contato que chegam em partes (ex.: "Obrigada" e, 14 s depois, "Tem piscina?"). Deixar o campo vazio usa a janela padrão da instalação (8 s), e o valor máximo é 60 segundos — nada de travar o atendimento sem querer. Não muda nada para quem não mexer: o campo é opcional e o comportamento de antes (janela padrão da instalação) segue valendo quando ele está vazio.

  Contribuição de @webtecnica (#1997).

## [1.66.1] — 2026-09-30

### Corrigido

- **Anonimizar um contato passa a apagar também a transcrição dos áudios e o texto lido das imagens dele** Quando um contato era anonimizado (LGPD), o texto das mensagens virava "[mensagem anonimizada]", mas a transcrição automática dos áudios e o texto lido das imagens e documentos continuavam guardados e legíveis, inclusive para o agente de IA. Agora a anonimização apaga esse texto junto, pelo pedido formal e pelo botão da ficha, e a atualização limpa também os contatos que já tinham sido anonimizados antes. Não é preciso fazer nada na instalação. Achado na triagem do #1988 (@AlecLimaDev).

## [1.66.0] — 2026-09-30

### Adicionado

- **Cada número ganha uma janela de resposta separada da janela de disparo** Até aqui, a proteção de envio de cada número tinha um único horário (7h às 22h por padrão), e ele valia para tudo: a resposta do agente a quem escreveu, os disparos em massa e as mensagens que retomam conversa parada. Para o agente responder de madrugada, era preciso abrir o horário inteiro, e com ele os disparos.

  Agora há duas janelas por número, em Conexões › Proteção de envio. A **janela de resposta** vale quando o cliente escreveu e o agente responde. A **janela de disparo** vale para disparos em massa, prospecção e mensagens que retomam conversa parada. Para o agente responder a qualquer hora, use 0 e 24 na janela de resposta.

  Nada muda ao atualizar: enquanto a janela de resposta estiver em branco, ela segue a janela de disparo, como antes. O teto diário, o aquecimento do número e o intervalo entre envios continuam valendo para os dois tipos de envio.

  Contribuição de @suporteubere99-coder (#1983).

## [1.65.0] — 2026-09-30

### Adicionado

- **Instalação em VPS ARM64** O instalador agora atende VPS ARM64/aarch64, como Oracle Ampere A1, AWS Graviton e Hetzner CAX, inclusive no modo com Supabase na mesma VPS. As imagens do DeskcommCRM são construídas em máquina ARM nativa e publicadas na mesma tag das de amd64, e o WAHA usa a variante oficial NOWEB ARM64 (`devlikeapro/waha:noweb-arm-2026.7.2`). Nada é compilado na VPS. Quem já roda em ARM passa a atualizar pelas imagens publicadas, e o `update.sh` troca no `.env` o WAHA amd64 antigo pela variante ARM (um valor escolhido à mão fica intacto). Em amd64 nada muda.

  Contribuição de @mauriciobera1990-droid (#1938).

- **Skills mostram o que mudou entre a sua cópia e a versão nova do catálogo antes de adotar** Ao ver o aviso de que o catálogo publicou uma versão nova de uma skill, o operador agora vê o que mudou em relação à cópia que a organização tem em uso — descrição, palavras-chave de ativação e as linhas adicionadas/removidas do procedimento — antes de decidir adotar.

  Contribuição de @webtecnica (#1972).

### Alterado

- **A anonimização de um contato passa a apagar também as notas do agente, os argumentos das ferramentas da IA, a próxima ação da lead e a identidade social — direto no banco** Antes, o pedido de esquecimento (LGPD) só limpava a memória do agente, os argumentos de ferramentas da IA, a próxima ação da lead e o perfil social quando a camada de aplicação rodava; se a anonimização acontecesse por outro caminho (um update direto, por exemplo), essas quatro fontes ficavam com dados da pessoa. Agora a cascata do banco, disparada quando o contato vira anonimizado, redige as quatro na mesma transação: as notas da IA, o registro das ferramentas (preservando o nome da ferramenta), o estado da lead e a identidade social. Operação idempotente, então a varredura diária não reescreve o que já foi limpo.

  Contribuição de @webtecnica (#1973).

### Corrigido

- **A exportação de dados do titular inclui a memória e os registros da IA sobre ele** O direito de acesso entregava conversas, leads, atividades e a ficha do titular, mas não três fontes que a cascata de anonimização já limpa a pedido dele: as notas de memória da IA (`lead_notes`), os argumentos passados às ferramentas (`ai_agent_runs.tool_calls`) e a próxima ação e a qualificação do funil (`lead_state`). O que se apaga a pedido do titular é o que se entrega a pedido dele.

  A exportação agora coleta as três, filtradas por organização e contato, e as entrega no arquivo que o titular recebe (`data.json`), com a qualificação íntegra e, de cada execução da IA, o nome e os argumentos de cada ferramenta — que é o texto que o titular escreveu. O resultado das ferramentas e o texto intermediário do modelo ficam de fora: uma busca de contatos feita pelo agente devolve telefone e e-mail de outras pessoas, e isso não pode chegar ao arquivo de um titular. Quem já usa o produto recebe o relatório mais completo sem precisar fazer nada na instalação.

  Refs #1965

  Contribuição de @webtecnica (#1969).

- **Turno descartado como obsoleto não emite mais a pergunta pendente do roteiro** Quando o #1940 recusa a resposta de um turno porque o cliente escreveu de novo enquanto o agente pensava, o turno é descartado. Mas, num agente com roteiro de atendimento, a pergunta pendente do roteiro ainda saía no fim desse turno descartado — e o turno da mensagem nova respondia em seguida. Efeito: resposta dupla.

  Agora, num turno descartado como obsoleto nada mais sai, nem a pergunta do roteiro: ela fica pendente para o turno da mensagem nova, que lê a conversa inteira. Nenhuma configuração ou ação é necessária.

  Refs: #1940, #1943

  Contribuição de @webtecnica (#1968).

## [1.64.1] — 2026-09-30

### Corrigido

- **A agenda desenha no fuso da organização, não no do navegador** A agenda aberta fora do fuso da empresa desenhava as horas no relógio de quem
  abriu a tela: um compromisso às 09:00 da clínica aparecia às 09:00 do relógio
  de quem estava viajando ou com a máquina em outro fuso, a régua do "agora"
  subia para a hora local, e a chave de dia dos horários livres era a do navegador.

  A âncora da semana já vinha do relógio da organização; faltava a grade. Os
  blocos, os rótulos de hora, a linha do "agora" e a chave de dia agora saem de
  `partesNoFuso` e `diaLocalISO` (`lib/agenda/fuso.ts`) sobre o fuso resolvido em
  `page.tsx` — a mesma fonte que o servidor usa para a primeira pintura.

  Para quem tem navegador e organização no mesmo fuso — a maioria das
  instalações — a conversão é a identidade e nada muda de lugar. Um teste novo
  escolhe de propósito um fuso diferente do ambiente, fixa o instante e mede a
  posição da régua e o rótulo do card contra a hora de parede esperada; ele
  reprova se a grade voltar a ler o relógio local.

  Refs #1362

  Contribuição de @webtecnica (#1831).

- **A cópia de playbook que a organização editou também avisa quando sai versão nova no catálogo** Até aqui, a primeira edição de um playbook copiado do catálogo desligava de vez o aviso de versão nova: a cópia editada passava a aparecer como "manual" e nunca mais era avisada, justamente na empresa que mais precisa saber da atualização. Agora a cópia editada continua ligada à versão do catálogo de onde veio, segue marcada "do catálogo" e mostra o aviso quando a plataforma publica versão nova.

  O aviso agora diz que, se a cópia foi editada, adotar a versão nova torna ativa a versão do catálogo e deixa as alterações só no Histórico de versões, de onde podem ser restauradas. Skills importadas por arquivo .zip continuam sem aviso. Uma cópia editada antes desta versão já tinha perdido o vínculo e continua sem o aviso.

  Refs #1951

  Contribuição de @webtecnica (#1960).

- **Anonimizar um contato também limpa a memória e os registros da IA sobre ele** Anonimizar um contato limpava a ficha, as conversas, as leads, as atividades e a régua, mas deixava dado pessoal em quatro lugares que o agente de IA escreve: as notas de memória (`lead_notes`), o registro de execução com os argumentos passados às ferramentas (`ai_agent_runs.tool_calls`), a próxima ação e a qualificação do funil (`lead_state`) e a identidade social do contato (`contacts.social_identity`).

  As quatro fontes agora entram na cascata de anonimização. No registro de execução fica só o nome das ferramentas que rodaram, para a trilha do que o agente fez continuar legível; o texto do modelo, os argumentos e os resultados são apagados. Quem anonimiza pela ficha do contato tem tudo limpo na hora. Um pedido formal de exclusão tem essas fontes limpas na varredura diária de retenção, que já completava cascatas interrompidas. Nada precisa ser feito na instalação.

  Refs #1957

  Contribuição de @webtecnica (#1958).

- **O nome da marca no onboarding segue a configuração da tela Marca** As telas de boas-vindas, de primeiro acesso e o cabeçalho do onboarding escreviam o nome da marca lido só do arquivo de instalação (.env), então quem trocou o nome em Administração › Marca continuava vendo o nome antigo justamente nas primeiras telas. Agora elas usam o mesmo resolvedor do título da aba: a configuração salva na tela vence, e o .env segue como reserva. Sem marca própria configurada, nada muda.

  Refs #1944

  Contribuição de @webtecnica (#1961).

## [1.64.0] — 2026-09-29

### Adicionado

- **A cópia de um playbook do catálogo avisa quando sai versão nova, e deixa adotar** Quando a plataforma publica uma versão nova de um playbook do catálogo que a organização
  instalou, o painel de Skills passa a mostrar um aviso nessa skill com o botão "Adotar versão
  nova". Nada é trocado sozinho: adotar é um clique de quem é gerente, a versão nova passa a ser
  a ativa e a que estava em uso continua no Histórico de versões, de onde pode ser restaurada.
  Skills importadas por arquivo .zip nunca mostram o aviso. Uma cópia que a organização já
  editou no editor ainda não mostra o aviso.

  Contribuição de @webtecnica (#1950).

### Corrigido

- **A busca deixa de devolver a lista inteira quando o termo tem só asteriscos** Digitar um termo feito só de asteriscos (duplo estrela, `* *` sem espaços) na busca da caixa de
  entrada ou de contatos podia devolver tudo: o asterisco não era tratado como separador e virava
  curinga no `or=`, equivalente a buscar sem critério. Agora o piso da busca o ignora — um termo só
  de asteriscos não vai ao banco.

  Contribuição de @webtecnica (#1948, issue #1935).

- **Excluir contato com compromisso avisa o que barra e como resolver** Ao excluir um contato que tem compromisso na Agenda, a mensagem genérica ("registros
  vinculados") cede lugar a um aviso que diz qual é o vínculo e oferece abrir a Agenda para
  resolver antes de excluir.

  Contribuição de @webtecnica (#1949, issue #1925).

## [1.63.6] — 2026-09-29

### Corrigido

- **O cabeçalho do onboarding mostra o ícone da marca própria em vez de nenhum** Quem configurou marca própria em Marca da instalação não via ícone nenhum no cabeçalho do onboarding, só o nome escrito. Agora aparece o mesmo ícone da aba do navegador: o arquivo subido em Marca, ou a inicial na cor da marca quando nenhum arquivo foi subido. Sem marca própria, nada muda: o cabeçalho segue com o símbolo do produto, que acompanha o tema claro ou escuro. Nenhuma configuração ou ação é necessária.

  Contribuição de @carlos0195 (#1942).

- **O agente não envia a resposta que ficou desatualizada porque o cliente escreveu de novo enquanto ele pensava** Cliente que escreve em várias mensagens ("Oi", "Boa tarde", depois a pergunta) recebia duas ou mais respostas seguidas. A primeira saía desatualizada ("Como posso te ajudar?" com a pergunta já na conversa) porque o agente leu a conversa antes de a pergunta chegar e levou alguns segundos para escrever. Numa instalação real, 39% das respostas de um agente saíram a menos de 3 minutos de outra resposta ao mesmo cliente.

  Agora, se chega mensagem nova do cliente enquanto a resposta está sendo escrita, ela não é enviada: o turno seguinte lê a conversa inteira e responde a tudo de uma vez. Para quem escreve sem parar não ficar sem resposta, a regra vale só enquanto a mensagem mais antiga sem resposta tiver menos de 2 minutos. Depois disso, a resposta sai mesmo assim. O tempo é ajustável por `RESPOSTA_OBSOLETA_TETO_MS`, e `0` desliga. Uma mensagem reentregue com atraso, com horário anterior ao da última que o agente leu, não segura a resposta: essa mensagem não abre turno próprio, e segurar a resposta deixaria o cliente sem nenhuma. Nenhuma configuração ou ação é necessária.

  Contribuição de @automatikpg-ux (#1940).

- **O valor do negócio e o documento do contato deixam de dizer Brasil sempre** Quem escolheu outra moeda em Configurações › Organização continuava lendo "Valor (R$)" ao criar ou editar um negócio, embora o valor já fosse gravado e mostrado na moeda da empresa. Agora o rótulo e o eco logo abaixo do campo usam a moeda certa — a do próprio negócio, que continua valendo mesmo se a empresa trocar de moeda depois, e a da empresa quando o negócio é novo. Na ficha do contato, o documento e o exemplo de telefone passam a vir do país da organização — a API já validava o documento por ele, só a tela é que escrevia "CPF" e um telefone brasileiro em duro. Para quem opera no Brasil nada muda. Crédito: @maclevison.

  Contribuição de @maclevison (#1945).

## [1.63.5] — 2026-09-29

### Corrigido

- **A busca da caixa de entrada para de consultar o banco com um termo feito só de parênteses** Um termo como `()`, `((` ou `(a` passava pelo tamanho mínimo da busca da caixa de entrada: o parêntese contava como letra, mas na consulta vira curinga, e a busca casava todas as conversas. Era uma consulta cara que não filtrava nada. Agora o tamanho mínimo é medido sem os parênteses, com a mesma régua que a busca de contatos já usava. Um termo assim conta como curto: a tela mostra a lista sem filtro, como acontece com uma letra só, e quem chama a API recebe a recusa de termo curto em vez da lista inteira. Nenhuma configuração ou ação é necessária.

  Contribuição de @webtecnica (#1934).

- **Gasto de IA sem arredondamento para cima, sentimento parado quando nenhum agente está no ar, e a frase de falta de saldo da OpenAI reconhecida** Três consertos medidos numa instalação real.

  O custo das chamadas registradas pelos workers de sentimento e de resposta legada era arredondado para cima até o centavo inteiro. Uma classificação de sentimento, que custa cerca de um centésimo de centavo, entrava como um centavo inteiro. No mês medido, isso respondia por mais de 90% do gasto que o teto de orçamento enxergava. Agora o custo é gravado fracionado, como o motor do agente já fazia. Os registros antigos não são recalculados automaticamente. Por isso o gasto de IA mostrado em Uso e orçamento cai a partir desta versão, e o mês corrente mistura os registros antigos, arredondados, com os novos. O teto passa a disparar menos, porque deixa de contar gasto que não existiu.

  Com todos os agentes pausados ou despublicados, o classificador de sentimento continuava rodando em cada mensagem recebida. A passagem para humano por sentimento mandava ao cliente "não há atendente disponível… sua conversa entrou na fila" enquanto a equipe já respondia por fora. Agora, sem agente no ar, o sentimento não roda: não cobra e não avisa ninguém.

  A espera pela recarga de saldo não reconhecia a frase "You have no credits remaining" da OpenAI. Nesse caso a fila voltava a gastar as tentativas e gerava um `job_dead` por conversa. Agora a frase é reconhecida e a resposta espera a recarga como nos outros casos. Nenhuma configuração ou ação é necessária.

  Contribuição de @automatikpg-ux (#1936).

## [1.63.4] — 2026-09-29

### Corrigido

- **Com OpenRouter, o custo das respostas da IA volta a ser contado — e o limite de gasto passa a valer** Com o provedor OpenRouter (ou qualquer gateway que nomeie o modelo como `anthropic/claude-…` ou `openai/gpt-…`), o custo das respostas do agente, das guardas e da classificação de etapa ficava em branco: a tela Uso de IA mostrava gasto zero e o limite de gasto da organização nunca era alcançado. A busca de preço agora entende esse formato. Modelo que não está na tabela de preços continua sem custo — nunca com o preço de outro.

  O que muda depois de atualizar: a tela Uso de IA passa a mostrar o gasto das chamadas feitas a partir da atualização (as anteriores seguem sem custo, então o total deste mês começa a contar do dia em que você atualizou). Se alguma organização tem limite de gasto configurado para interromper o atendimento, esse limite passa a valer de verdade: ao chegar nele vem primeiro o aviso na Central e, depois, a IA para de responder e as conversas vão para a fila humana. Aumentar o limite evita paradas novas, mas não devolve a IA às conversas que já pararam — cada uma é retomada na própria conversa. Para conferir antes, abra Uso de IA › Orçamento; a parada de emergência da instalação inteira fica em Administração › Recursos opcionais › Comportamento ("Proteção de gasto de IA"), com `AI_BUDGET_ENFORCEMENT=off` no `.env` como alternativa.

  Contribuição de @webtecnica (#1929). Relatado por @eduardosuruagy (#1880).

- **O aviso de evento morto não abre mais em dobro quando dois drenos rodam juntos** O dreno que vaza eventos para a Central consultava "já existe um aviso aberto?" e só depois inseria — e o cron `event-log-drain` e o drain-loop do worker disparam os dois ao mesmo tempo. Os dois liam "não existe" antes de qualquer escrita, os dois inseriam, e o problema de verdade ficava com dois avisos idênticos na Central. Aviso repetido é aviso que ninguém abre.

  O banco agora é quem segura a fila: um índice único parcial em `agent_inbox_items` (organização, kind e título, só enquanto o aviso está aberto) recusa a segunda linha, e os dois caminhos de escrita passam a tratar essa recusa como o que ela é — "o aviso já estava aberto", e não um erro do dreno. A chave leva o título porque o `event_dead` tem duas famílias que precisam conviver abertas na mesma organização (a da IA que parou de responder e a de mídia), e o predicado é parcial porque uma linha resolvida não pode segurar o slot: reabrir um aviso continua funcionando, e reabrir quando já existe um aberto idêntico volta com resposta clara em vez de erro interno.

  Kinds diferentes, organizações diferentes e as duas famílias do `event_dead` seguem gravando normalmente, em paralelo.

  Contribuição de @webtecnica (#1928).

- **O playbook de agenda ensina os dois passos — listar o que a empresa atende e só depois consultar horários** O playbook `agendamento` é o texto que entra na conversa quando o cliente fala em "agendar", "horário disponível" ou "que horas vocês". Ele começava no meio da cadeia: dizia que a IA só tem acesso à agenda se `crm_find_free_slots` estiver disponível e mandava consultar horários, mas nunca dizia de onde vem o `event_type_slug` que essa ferramenta exige. O primeiro passo, `crm_list_event_types`, não aparecia em nenhuma linha do texto.

  Por isso acontecia a cena da issue #1019: a IA listava os tipos de atendimento, parava ali e respondia "vou verificar", ou passava para a equipe, em vez de oferecer um horário real.

  Agora o texto ensina a cadeia inteira. Primeiro `crm_list_event_types`, de onde sai o `slug` de cada tipo de atendimento. Depois, **no mesmo turno**, `crm_find_free_slots` com esse `event_type_slug`. Quando o cliente escolhe um horário, `crm_book_appointment` com o `starts_at` que a consulta devolveu. Parar depois da lista e responder "vou verificar" passa a ser descrito como o erro que é.

  Cada ferramenta só é mencionada com a condição "se ela estiver na sua mão". O texto vale para a organização inteira e chega por palavra-chave, sem saber quais ferramentas o agente tem ligadas. Para o agente que não tem a ferramenta, nada muda: ele não inventa horário e avisa a equipe.

  A atualização reaplica o `baseline.sql`, e isso já troca o texto padrão. Nenhuma ação é necessária. Uma organização que instalou este playbook pelo catálogo, ou o editou, tem uma cópia própria: essa cópia continua como está e não recebe o texto novo.

  Contribuição de @webtecnica (#1922).

## [1.63.3] — 2026-09-29

### Alterado

- **O CI passa a rodar a conferência de isolamento da atualização contra o banco novo** Da v1.61.0 à v1.63.0, a atualização de quase toda instalação parava no meio e deixava o CRM atrás da página de manutenção: a conferência das regras de isolamento do `update.sh` passou a cobrar regras de um módulo que a instalação não tinha, e nenhum dos cinco checks obrigatórios rodava essa conferência. Agora o check `invariants` a roda contra o banco recém-montado pelo `baseline.sql`, em três versões do script — a do próprio PR, a da última release publicada (é a que roda do disco de quem atualiza) e a da v1.63.0, a última que ainda lê as regras só pelo texto. Uma mudança de banco que travaria a atualização de alguém passa a reprovar antes do merge. Nada muda para quem opera.

### Corrigido

- **O histórico de um follow-up e as versões publicadas de um fluxo não podem mais ser apagados por quem só visualiza** Qualquer membro da organização, inclusive quem só tem o papel de visualizador, conseguia apagar ou alterar o histórico de uma inscrição de follow-up (o que foi enviado, pulado ou cancelado) e as versões publicadas de um fluxo, que são a base para voltar a uma versão anterior, falando direto com o banco pela chave pública do sistema e pela própria sessão, sem passar pelas telas. Agora o histórico só recebe registros novos, e só de quem é gerente ou administrador, que é o papel que as telas já exigiam para pausar, retomar, pular, adiar ou cancelar um follow-up. Ninguém altera nem apaga um registro do histórico por esse caminho, e as versões de um fluxo só saem quando um gerente ou administrador apaga o fluxo inteiro. A leitura continua liberada para todos os membros, e as telas e os envios automáticos funcionam como antes. Não há nada para fazer: a regra entra sozinha na próxima atualização.

## [1.63.2] — 2026-09-29

### Corrigido

- **O tempo na etapa do card do Kanban não zera mais a cada nota ou mensagem** O rodapé do card do Kanban contava o "tempo no estágio" a partir da última atividade do negócio: qualquer nota, edição ou mensagem na conversa zerava o relógio de um negócio parado na mesma etapa havia dias. Agora o tempo é contado a partir da entrada na etapa atual (a coluna `crm_leads.stage_changed_at`, carimbada pelo banco desde a migration 0071), e só mudar de etapa zera o relógio. Negócio sem esse registro cai na data de criação, nunca na última mensagem. Contribuição de @webtecnica (PR #1908).

- **Excluir um contato que já passou por retorno automático não perde mais o histórico** Quem tentava excluir pela tela um contato que já passou por um retorno automático levava um erro **e** ficava com a ficha na base sem histórico: as mensagens e as conversas já tinham sido apagadas quando a exclusão foi recusada. A auditoria registrava `contact.delete_blocked` com `apagados: ["messages","conversations"]` — o rastro exato do estrago.

  O defeito tinha duas metades e as duas foram consertadas. O banco recusava com `42501` o DELETE que chega **em cascata** quando a ficha é apagada, porque o gatilho de proteção do follow-up não distinguia cascata de escrita direta — agora ele distingue pela profundidade do gatilho: a cascata passa, quem apaga um turno de follow-up pela API com sessão de usuário continua sendo recusado, como sempre. E a rota, que apagava mensagens, conversas e a ficha em **três passos separados**, passa a chamar uma função única: as três saem numa transação só, ou sai tudo ou não sai nada.

  Ficha com compromisso na agenda continua sendo recusada antes de qualquer coisa ser apagada, e uma exclusão que falhe por qualquer outro motivo deixa o histórico exatamente onde estava. Nada muda para quem opera além de a exclusão passar a funcionar. Não exige ação.

  Contribuição de @webtecnica (#1912).

- **Só gerente ou administrador consegue cancelar ou apagar uma inscrição de follow-up pelo acesso direto ao banco** Qualquer membro da organização, inclusive quem só tem o papel de visualizador, conseguia apagar ou alterar uma inscrição de follow-up, ou um fluxo inteiro, falando direto com o banco pela chave pública do sistema e pela própria sessão, sem passar pelas telas e sem ficar registrado na auditoria. Apagar a inscrição levava junto o histórico dela e as mensagens de follow-up já agendadas. Agora só quem tem o papel de gerente ou de administrador consegue criar, alterar, cancelar ou apagar uma inscrição ou um fluxo de follow-up por esse caminho, que é o mesmo papel que as telas e a API já exigiam. A leitura continua liberada para todos os membros, e as telas e os envios automáticos funcionam como antes. Não há nada para fazer: a regra entra sozinha na próxima atualização.

## [1.63.1] — 2026-09-29

### Corrigido

- **Atualização de instalação sem o módulo de honorários não para mais no aviso de regras de isolamento** Desde a 1.61.0, atualizar uma instalação que não tem o módulo de honorários parava no passo do banco com o aviso vermelho `⛔ REGRAS DE ISOLAMENTO AUSENTES`, listando 8 regras das tabelas `honorarios_contratos` e `honorarios_parcelas`, e deixava o CRM parado atrás da página de manutenção. Não faltava regra nenhuma: essas 8 só existem depois que o módulo é instalado, e a conferência as cobrava mesmo assim. Agora a conferência só cobra regra de tabela que existe no banco, e uma regra de tabela existente que sumir continua parando a atualização, como antes.

  Quem não ficou preso não precisa fazer nada: a próxima atualização passa direto. Isso vale também para quem ainda está numa versão anterior à 1.61.0, porque esta versão muda o `supabase/baseline.sql` de forma que a conferência do `update.sh` antigo, que é o que roda durante a atualização, deixa de contar essas 8 regras.

  Se a sua atualização para a 1.61.0, 1.62.0 ou 1.63.0 parou nesse aviso, o CRM está fora do ar e o botão da tela não responde. Entre no servidor e rode a atualização de novo, na pasta do CRM: `bash hostgator-setup-kit/update.sh`. Ela termina e tira a página de manutenção do ar. Se mesmo assim parar no mesmo aviso, rode estes três comandos, que trocam o código para esta versão antes de atualizar e assim usam a conferência nova: `git fetch --tags origin`, depois `git checkout v1.63.1`, depois `bash hostgator-setup-kit/update.sh --to v1.63.1 --force`.

  Contribuição de @webtecnica (#1906). Relatado por @emersonraza (#1893), @Draven9 (#1897) e @pmfproducer (#1899).

## [1.63.0] — 2026-09-29

### Adicionado

- **Módulos opcionais passam a poder declarar o que a anonimização de LGPD apaga neles** Um **módulo opcional** passa a ter como fazer a exclusão de dados de LGPD alcançar as tabelas dele, sem que a instalação precise lembrar de nada: o módulo declara uma vez, na própria migration, quais colunas guardam texto livre sobre a pessoa e como a linha se liga a ele, e a anonimização passa a redigir essas colunas junto com as do resto do sistema. Hoje nenhum módulo declara seção (honorários não guarda texto livre sobre a pessoa), então nada muda na sua instalação até um módulo declarar. Quem **não** instalou o módulo não muda de comportamento — a seção declarada para uma tabela que não existe é pulada na hora, sem erro, e a exclusão do contato segue funcionando igualzinho. Antes, o caminho seguro seria alguém reescrever a cascata inteira de anonimização a cada módulo novo; quem esquecesse entregaria **sucesso com a pessoa ainda legível**, que é exatamente o que a LGPD não permite.

  A declaração errada (coluna que não existe) agora **falha alto**, dizendo qual módulo e qual tabela, em vez de redigir pela metade e devolver sucesso — porque entregar um pedido de exclusão como cumprido com dado legível é pior do que ele falhar e ser repetido. O registro que guarda essas seções é fechado: só quem aplica o schema escreve nele — nem a chave de serviço do app —, e o gatilho não roda em papel de cliente.

  Também entra a prova de que **as funções de um módulo existem mesmo sem as tabelas dele** — que é como toda instalação vive, já que as tabelas só nascem quando alguém instala o módulo: a cadeia inteira é recriada com a validação de corpo ligada e as tabelas ausentes, e tem de compilar. Não exige ação de quem já está rodando: o `update.sh` cria a tabela do registro (vazia) e o gatilho, sem nenhuma mudança de tela.

  Contribuição de @webtecnica (#1901).

- **A tela de atualização diz onde está o detalhe da disputa de banco** Quando a atualização pelo botão da tela encontra o banco em uso por outro processo e precisa de mais de uma passada, o resumo dessa disputa já aparecia no fim da atualização. Faltava dizer onde procurar o detalhe.

  Agora, logo abaixo do resumo, a tela aponta o arquivo `.update.log`, na pasta do projeto no servidor, onde fica o que cada passada não aplicou. A linha aparece tanto quando a atualização termina bem quanto quando ela volta para a versão anterior. Se a rodada não teve disputa, ou se ela não foi medida, a linha não aparece. Nada muda para quem atualiza pela linha de comando. Não exige ação.

  Contribuição de @webtecnica (#1898, issue #1040).

- **Relatório por etiqueta — volume, espera e desfecho de cada assunto no período** Quem opera agora pode perguntar à API **qual assunto ocupou a operação em um período e quanto tempo o cliente esperou**. `GET /api/v1/reports/tags` devolve, para cada etiqueta em uso, quantos atendimentos começaram no período, quantos ainda estão abertos e quantos foram encerrados, a espera média pela nossa resposta e a fatia de cada etiqueta sobre o total. A lista de etiquetas vem das que existem de fato nas conversas: uma etiqueta sem atendimento no período aparece com zero em vez de sumir, e um período sem dado nenhum diz isso na resposta em vez de devolver uma tabela de zeros. O pedido aceita `de`, `ate` (datas válidas, até 90 dias) e `tz`, porque a janela é contada no fuso de quem lê. Quando a janela tem mais conversas do que a leitura alcança, a resposta avisa que está cortada. É só leitura, sem migration e ainda sem tela: a tela vem depois. Contribuição de @webtecnica (#1888).

### Alterado

- **A exclusão de uma conexão passa a ter prova de que o aviso dela sai junto** O fecho do aviso quando a conexão é removida já existia na rota, mas a prova na rota só cobria o ramo que ARQUIVA. O ramo que EXCLUI de vez — canal sem histórico, o `.delete()` — seguia sem teste nenhum com aviso aberto, que é exatamente o caso descrito na issue: o operador apaga a conexão e o crítico continuava na Central. Agora há um caso de rota para esse ramo, afirmando que nenhum aviso daquela conexão sobra, que o aviso de outra conexão segue aberto e que a auditoria diz `avisos_fechados: resolvido`. Nada muda no comportamento de quem opera: só a cobertura.

  Contribuição de @webtecnica (#1903, issue #1023).

### Corrigido

- **A busca de contatos entende como a gente digita — e para de devolver a lista inteira** Quem procura um contato passa a achar mesmo digitando do jeito que se digita na pressa: **"Paulo  Lima"** com espaço duplo, **"Paulo Jr"** com as palavras separadas e **"Silva, Maria"** com ou sem vírgula encontram o cadastro, onde antes davam zero para gente que existe. Digitar **uma letra só** deixa de devolver a lista inteira dos contatos — lista inteira sob busca não é resposta, é ruído que parece resposta.

  A busca de contatos passou a seguir a **mesma régua da caixa de entrada**: todo separador (espaço, vírgula, ponto e vírgula) vira o curinga da busca e o termo só vai ao banco depois de ter os dois caracteres mínimos. A régua é uma só e continua morando em `lib/inbox/termo-de-busca.ts`, então a caixa de entrada e os contatos andam juntos a partir de agora — e se a regra mudar, muda para os dois ao mesmo tempo. A busca por telefone, CPF e e-mail continua exatamente como estava, e a caixa (maiúscula/minúscula) continua sendo do banco.

  A busca continua sem diferenciar acento: "Joao" ainda não encontra "João". Isso é outra fatia, porque exige coluna nova no banco e preenchimento dos cadastros existentes. Não muda esquema nenhum. Não exige ação.

  Contribuição de @webtecnica (#1892, issue #1835).

- **Dar merge na main deixa de ser acusado como autoria de quem fez o merge** Mergear a `main` na sua branch voltou a passar sem válvula nenhuma — e sem afrouxar nada. Quem atualizava a branch com o que a `main` publicou (um invariante reescrito, uma migration nova) era tratado como quem escreveu aquilo: a catraca de invariantes e a guarda de `plan/features.json` liam o índice do merge inteiro e não tinham como separar o que veio da `main` do que a branch introduziu. A causa era do git, não da regra: ele chama o `pre-merge-commit` ANTES de escrever o `MERGE_HEAD`, então as referências de procedência estavam vazias no instante exato em que a pergunta é feita — e a guarda, no lado seguro, falhava fechado sobre o merge todo. Era o lado seguro errado: ela não estava defendendo a regra, estava punindo o merge.

  A regra continua idêntica. O que mudou é como o alcance é calculado: o git entrega o outro lado, naquele instante, em `GITHEAD_<sha>=<ref>`, e é por ali que a guarda agora enxerga de onde veio o que o commit tem. Com o outro lado em mãos, as condições de procedência valem igual no caminho limpo e no caminho conflituoso — o que a `main` já tinha continua não sendo autoria de quem mergeia, o invariante da `main` modificado pela branch continua barrado, e a migration com sequência já usada continua barrada. Nenhuma barreira foi removida, nenhum escape foi retirado: o que some é só a acusação sobre o merge.

  Como esse sinal é uma variável de ambiente, quem roda o commit pode forjá-lo, e o mesmo valia para um `MERGE_HEAD` escrito à mão. Por isso a guarda de `plan/features.json` ganhou as duas condições que a catraca de invariantes já tinha: o conteúdo que entra tem de ser o que a `main` tem agora, e a branch não pode ter tocado o arquivo. Antes, um commit comum com o sinal apontando para uma versão antiga da `main` conseguia apagar features do plano.

  Não exige ação de ninguém.

  Contribuição de @webtecnica (#1900).

## [1.62.0] — 2026-09-28

### Adicionado

- **Perguntar ao acervo direto da conversa, e a busca do atendente ganha gráfico próprio em Evolução** Quem atende ganha, no painel ao lado da conversa, uma caixa "Acervo" para perguntar sobre o material da própria empresa (as fontes que a IA usa nas respostas). A resposta traz os trechos que passaram no limiar, com a semelhança de cada um, e separa três situações que antes chegavam iguais: o acervo está vazio, a base não tem essa informação, ou há algo parecido abaixo do limiar. É a mesma busca e o mesmo limiar que a IA usa; não existe uma segunda régua para a tela.

  Cada pergunta gasta uma chamada de embedding na chave da organização, então a caixa tem limite de 12 perguntas por pessoa e 60 por organização a cada minuto, e a pergunta vai até 1000 caracteres. Sem chave de embedding cadastrada, a caixa diz isso e aponta Credenciais.

  A pergunta do atendente passa a ser registrada, e a tela de Evolução a mostra num gráfico próprio, "Consultas da equipe ao acervo". Ela não entra nos números do agente nem nas "perguntas de clientes sem resposta". Não há ação para quem opera a VPS: a migração é aditiva e roda sozinha na atualização.

  Contribuição de @webtecnica (#1877, entrou pelo #1882).

- **Anexo de imagem, arquivo, áudio ou vídeo dentro de nota interna** A nota interna de conversa passa a aceitar anexo. Quem escreve nota pode anexar imagem, documento, áudio ou vídeo, e o anexo aparece na própria nota como apoio para o time. Documento aparece como cartão com o tipo e o tamanho do arquivo; o nome original do arquivo não é guardado.

  O arquivo não sai da empresa: ele fica num espaço de armazenamento próprio (`internal-media`), separado da mídia de conversa, e **nunca vai para o cliente no WhatsApp**. Ele também fica fora da retenção por idade da mídia de conversa (a que a empresa configura): enquanto a nota existir, o anexo continua lá.

  Para quem lê a nota, o anexo abre por um endereço temporário (60 segundos) e só se a pessoa puder ver a conversa daquela nota — a mesma regra de permissão que a própria nota já tinha, sem permissão nova.

  **Limpeza**: quando uma nota com anexo é apagada, a rotina diária de limpeza remove o arquivo dela depois de 1 dia. Quando um contato pede exclusão de dados (LGPD), o texto das notas das conversas dele é redigido e o anexo vai para a fila de remoção. A exportação de dados do titular passa a listar as notas internas, com os dados do anexo (tipo, tamanho e caminho), sem o arquivo em si.

  **Para quem opera a VPS**: anexo de nota que continua existindo **não expira** e ocupa o armazenamento da instalação (o mesmo espaço da mídia do WhatsApp). Cada anexo pode ter até 50 MB.

  **Sem mudança de comportamento para a nota sem anexo**: ela continua como estava.

  Contribuição de @webtecnica (#1883).

- **A base de conhecimento pode ser preparada pelo Google (Gemini), não só pela OpenAI** Quem só tem a chave do Google passa a ter base de conhecimento: em **IA › Conhecimento**, o cadastro de chave oferece Google ao lado de OpenAI e OpenRouter, e a tela mostra quem prepara a base hoje, com o botão para trocar. Trocar entre OpenAI e Google **refaz a base inteira** — todo o material é preparado de novo com o novo provedor, e a tela avisa isso antes de trocar. Enquanto o material é refeito, o agente pode não encontrar o que ainda não foi refeito.

  Nada muda para quem já usa a OpenAI: a chave do Google só é usada sozinha quando não há nenhuma chave OpenAI, OpenRouter ou gateway, e trocar é sempre uma escolha feita na tela. Depois que a base é preparada, o provedor fica fixo: cadastrar ou remover uma chave não o troca — se a chave do provedor da base deixar de funcionar, a tela diz isso e oferece a troca, em vez de passar a buscar com outro provedor e não achar nada. Não há mudança no banco: o Google entrega vetores do mesmo tamanho (1536) que a OpenAI. Não exige ação.

  Contribuição de @vgamkt (#1130, entrou pelo #1864).

- **Filtre a lista por várias etiquetas de uma vez — todas (E) ou qualquer uma (OU)** O filtro de etiqueta passa a aceitar mais de uma escolha nas três listas: Inbox, Funil e Contatos. Você marca quantas quiser no menu (o menu não fecha mais a cada clique) e escolhe o sentido:

  - **Todas (E)** — a lista mostra só quem tem todas as etiquetas escolhidas, juntas na mesma caixa (na conversa ou no contato), que era o sentido de filtrar por duas e comparar na cabeça.
  - **Qualquer uma (OU)** — a lista mostra quem tem pelo menos uma delas, em qualquer caixa.

  O modo aparece no menu só quando há duas ou mais etiquetas, porque com uma ele não muda nada. O gatilho do filtro resume a escolha ("vip +1") e "Limpar filtros" continua limpando tudo. Os filtros continuam nos endereços: `?tag=vip&tag=orçamento` com `&modo=ou`, e qualquer link salvo ou chamada de API com uma etiqueta só segue funcionando igual, sem mudança.

  Uma combinação ainda não é possível: "vip na conversa **e** orçamento no contato", misturando as caixas. Ela fica registrada como decisão de produto pendente — as duas caixas de hoje não a expressam, e o filtro não finge que expressa.

  Contribuição de @webtecnica (#1886, issue #1274).

- **Uma área só mostra todos os recursos opcionais, se estão ligados e onde se ajustam** Os recursos que se ligam e desligam estavam espalhados: os módulos do servidor numa tela chamada "Comportamento", as chaves de cada empresa em pelo menos nove telas, e os que dependem do servidor em tela nenhuma. Agora há um lugar que junta tudo.

  - **Quem administra o servidor:** a entrada **Comportamento** do Admin passa a se chamar **Recursos opcionais**, na mesma tela, em três blocos: **Módulos** (os interruptores de sempre), **Comportamento** (as chaves de sempre, mais o caminho para Cadastro e Destinos internos) e **Depende do servidor**, só leitura, que diz se e-mail, Google Agenda, API oficial da Meta, WhatsApp oficial por parceiro, chamada de voz, Nuvemshop, Google Ads, notificação com a aba fechada e transcrição estão configurados, com o que fazer em uma linha. Nenhum valor de segredo aparece, só "configurado" ou "não configurado". A telefonia por SIP aparece como "não dá para ver daqui": ela vive nos contêineres do servidor, fora do alcance do app.
  - **Cada empresa:** tela nova em **Configurações › Sua empresa › Recursos opcionais**, para administrador e gerente. Lista os módulos do servidor ("disponível nesta instalação" ou "desligado por quem administra o servidor"), as chaves da empresa com o estado e as dos agentes numa linha só. O botão **Ajustar** leva à tela onde a chave mora. O gerente vê a lista inteira, mas só ganha o botão onde a tela de destino o aceita.

  A tela central não liga nada: quem liga continua sendo a tela de cada assunto, para não existirem dois lugares gravando a mesma chave. Não há mudança no banco. Não exige ação.

  Pedido do mantenedor (#1876).

- **Confira a senha ao entrar ou criar sua conta** O login e o cadastro, inclusive pelo link de convite, permitem mostrar ou ocultar cada senha digitada. No cadastro, o indicador de força ajuda a escolher uma senha melhor sem mudar as regras de aceitação atuais. Crédito: @matheuspedro360.

  Contribuição de @matheuspedro360 (#1871).

### Corrigido

- **O caminho de um arquivo enviado não sai mais da pasta da conversa por `..`** A conferência de que um arquivo pertence à conversa (`isMediaPathOwnedBy`) olhava só o começo do caminho, `{organização}/{conversa}/`. Um caminho como `{organização}/{conversa}/../../{outra}/arquivo` passava nessa conferência. Agora, depois do prefixo, só são aceitos nomes comuns: nada de `..`, `.`, segmento vazio ou barra invertida. A regra vale para o envio de mídia ao cliente e para o anexo da nota interna. Não foi medido se o Storage chegava a resolver o `..`; o conserto fecha a porta sem depender disso. Nada muda para quem opera a instalação.

  Achado na revisão do #1883, de @webtecnica (#1884).

- **O assistente não grava mais no negócio de outro cliente** Quando o assistente anota algo num negócio durante uma conversa (valor, campos, etapa), ele informa qual negócio é — e às vezes informa errado. Medido em produção em 15 de setembro: o cliente respondeu "sim, já tenho os textos", o assistente tentou anotar num negócio que não existia, a anotação foi recusada e a resposta se perdeu. O caso pior não chegava a dar erro: se o código informado fosse de um negócio real de **outro** cliente, no mesmo funil, a anotação era aceita e ia para a ficha errada.

  Agora toda anotação do assistente numa conversa é conferida contra os negócios da pessoa com quem ele está falando. Se o negócio informado é dessa pessoa, segue. Se não é e ela tem um único negócio aberto, a anotação vai para ele. Com nenhum ou com vários abertos, o assistente recebe a recusa com o motivo e segue a conversa, em vez de escolher por palpite. Anotações feitas por pessoas, pela API ou por automações não mudam. Crédito: @paulolimajr77.

  Contribuição de @paulolimajr77 (#1874).

## [1.61.0] — 2026-09-28

### Adicionado

- **Módulo opcional para quem vende para empresas — Empresas, Pessoas que decidem e importação de planilha** Quem administra o servidor ganha em Sistema › Módulos opcionais a chave "Empresas e pessoas (venda para empresas)", desligada por padrão. Ligada, o CRM de cada empresa passa a ter o cadastro de Empresas (razão social e CNPJ, com os dados públicos preenchidos pela BrasilAPI), as Pessoas que decidem dentro delas, com vários telefones, e a importação de planilha CSV ou Excel (.xlsx) que cria empresa, pessoa e contato de uma vez. As três telas ficam em CRM › Ver tudo. Desligada, nada muda: as telas, o menu e as rotas não existem, e nenhum CNPJ sai do servidor. Anonimizar um contato também apaga o nome da pessoa ligada a ele e as linhas de planilha que falavam dela, e o pedido de acesso aos dados passa a entregar essas informações. Não há ação para quem opera a VPS.

  Contribuição de @renatofortal (#1621, entrou pelo recorte #1860).

- **Grupos de clientes no chat, com resposta dos atendentes** Em **Conexões**, o botão **Grupos** de cada número conectado por QR Code lista os grupos em que ele está. Cada grupo tem uma chave, e todos vêm desligados. Os grupos ligados aparecem no chat com a etiqueta **Grupo**, mostram quem mandou cada mensagem e podem ser respondidos pelos atendentes como qualquer conversa. Grupo sem atendente fica na fila das pessoas (**Aguardando atendente**), nunca na aba do automático, e um grupo fechado volta a abrir sozinho quando chega mensagem nova. **A IA nunca responde em grupo**, e grupo não vira negócio no funil, não entra em campanha nem em listas de contatos. Só o **administrador** liga grupos pela tela. Ao ligar o primeiro grupo de um número, o WhatsApp dele passa a enviar as mensagens de todos os grupos para o sistema, que descarta os não escolhidos. Ao desligar o último, tudo volta a ser como antes. Entram só as mensagens que chegarem depois de ligar. Áudio e imagem mandados em grupo ficam guardados, mas — diferente do que já acontece numa conversa individual — não são transcritos nem descritos automaticamente. Um pedido de LGPD de quem já é contato alcança também o que essa pessoa escreveu nos grupos ligados: a anonimização apaga essas mensagens e a exportação as entrega; o participante de grupo que não é contato não tem pedido por esta tela.

  Contribuição de @bossprt (#1647).

- **Módulo opcional de Honorários para escritórios de advocacia** Contribuição de @nsbastosconsultoria (#1578). Um módulo opcional, **desligado por padrão**:
  contrato de honorários de cada caso (fixo, êxito ou misto), calendário de parcelas, e o agente de
  IA sabendo responder sobre os dois.

  **Instalar.** Quem administra a instalação vai em **Módulos**, no menu do painel da instalação, e
  instala "Honorários" com um clique. As tabelas do módulo só nascem nessa hora (ADR-0002): quem não
  instala não carrega tabela nenhuma, não vê porta no menu e o agente não ganha capacidade nova.

  **Usar.** A tela **Análise › Honorários** registra o contrato e as parcelas. Pagar uma parcela lança
  o valor no caixa da empresa, na conta escolhida, junto com o resto do dinheiro que entra. Um clique
  duplo em "Pagar" lança uma vez só, e a conta tem de ser da própria empresa.
  Toda a equipe vê os contratos; criar, alterar e apagar é de gerente ou administrador, e uma
  parcela paga não se apaga, nem o contrato que a tem.

  **A IA.** O assistente ganha "Ver o contrato de honorários" e "Ver as parcelas", para confirmar o
  modelo de cobrança e o status de pagamento em vez de estimar um número.

  **LGPD.** O pedido de acesso do titular traz os contratos e as parcelas dos casos dele. Os
  contratos não guardam dado pessoal (só valores e o vínculo com o caso), então a anonimização não
  tem o que apagar neles.

### Alterado

- **O README cita a Requesty entre os provedores de IA** A Requesty é provedor do produto desde o #1638, e a linha de IA da tabela de tecnologias do README (português, inglês e espanhol) passa a citá-la. Nada muda no produto nem para quem opera.

  Contribuição de @Thibaultjaigu (#1866).

- **Logo próprio nas telas de acesso respeita o tamanho do arquivo, até 80 px de altura** O logo da marca própria nas telas de entrada, cadastro e recuperação deixa de ter altura fixa de 40 px. Um logo grande passa a ocupar até 80 px de altura (no máximo 192 px de largura), mantendo a proporção. Um logo com menos de 40 px de altura natural deixa de ser ampliado e passa a aparecer **menor** do que antes, no tamanho do arquivo: para ter o logo maior, suba em Marca (`/admin/marca`, a marca da instalação, que é a que as telas de acesso usam) um arquivo com pelo menos 80 px de altura. O logo padrão do produto, usado quando não há marca própria, não muda. Não exige ação para quem não quiser trocar o arquivo.

  Contribuição de @vitorlacerdadigital (#1858).

- **O checkpoint e a abertura do turno saem de inbound-turn.ts para um módulo próprio em abertura/** O arquivo inbound-turn.ts, que concentra o turno de recepção, passou a delegar a dois módulos novos dentro da mesma pasta: abertura/checkpoint.ts guarda o schema do checkpoint, o tipo da linha, a instrução de fechamento, a leitura e a gravação; abertura/ritual.ts guarda o ritual de abertura do turno (ritualBlocks e buildOpeningMessage). O inbound-turn.ts continua importando e reexportando esses símbolos, então quem já os busca por ele — os testes, o follow-up, a resposta de caso, o preview — continua achando os mesmos objetos, sem mudança de comportamento e sem mudança de caminho. A extração é a primeira das três que a issue #636 pede, feita com git mv para o histórico do arquivo acompanhar o módulo novo. Não há ação para quem opera a VPS.

  Contribuição de @webtecnica (#1861).

- **Roteiro de perguntas já concluído não recomeça para o mesmo cliente, a não ser que o roteiro permita** Um roteiro de atendimento que o cliente já respondeu até o fim não volta a fazer as mesmas perguntas quando ele repete a palavra-gatilho, nem quando um roteador de intenção ou o fim de outro roteiro aponta para ele de novo. Antes, repetir a palavra reabria um cadastro já feito. A palavra-gatilho passa a valer para o próximo roteiro que o cliente ainda não concluiu.

  Cada roteiro pode escolher o contrário: no início do roteiro, a opção **Pode recomeçar para quem já concluiu** faz ele começar de novo, útil para roteiros que se repetem, como agendamento. A opção nasce desligada, inclusive nos roteiros que já existem: quem dependia de um roteiro que recomeça precisa ligá-la nele. Um roteiro encerrado por prazo ou interrompido não conta como concluído e pode começar de novo. Não há mudança no banco.

  Contribuição de @vgamkt (#1130, entrou pelo #1865).

### Corrigido

- **O guardião do espanhol reprova t() sobre o que o operador digitou** A catraca de i18n passa a reprovar `t()` aplicado sobre dado que o operador
  digitou — parâmetro livre de função, não chave de tradução. Foi o defeito do
  PR 600: "Retorno" virando "Seguimiento". Dado de operador não é chave de
  dicionário, traduzi-lo muda o dado na tela.

  - 39 sítios reais (35 pares arquivo + expressão) congelados em
    `DADO_DO_OPERADOR_CONGELADO`, cada entrada com razão escrita; a lista só
    encolhe: entrada que deixa de casar com sítio é vermelho.
  - Literal, tabela de módulo e wrapper passa-adireto seguem passando: nenhuma
    tela legítima começa a reprovar.
  - Os cegos A e B da issue 603 ficam como próximo passo desta mesma entrega.

  Contribuição de @webtecnica (#1867).

- **A nota interna chega na hora para quem pode ver a conversa, e deixa de aparecer para quem não pode** A nota interna (a escrita no modo **Nota interna**, que nunca vai para o cliente) passa a chegar **em tempo real** para os demais atendentes. Antes ela só aparecia para os outros quando alguém recarregava a página: o canal ficava aberto, mas a tabela não estava publicada, e nada avisava do erro.

  As notas também passam a seguir a **mesma regra de visibilidade da conversa**. Numa organização com "ver as conversas" em `own_and_unassigned` (o padrão), o atendente que não pode abrir uma conversa deixa de ler e de escrever notas nela, e quem perdeu a conversa numa passagem de atendimento deixa de ver as notas dela. Antes, qualquer atendente da organização conseguia ler todas. Viewer, manager e admin continuam vendo as notas de todas as conversas que já veem, e o administrador da plataforma continua vendo tudo.

  Não exige ação de quem instalou.

  Contribuição de @webtecnica (#1868, issue #1863).

- **Follow-up de silêncio para de mandar mensagem a cada poucos minutos para o mesmo contato** Um fluxo de follow-up disparado por silêncio (ex.: "Triagem parada") reinscrevia o mesmo contato a cada rodada do relógio (1×/min), assim que o envio anterior terminava — em vez de esperar o intervalo de silêncio configurado (ex.: 2 horas) entre uma tentativa e outra. Um contato que nunca respondia recebia uma mensagem nova a cada poucos minutos, indefinidamente — medido numa instalação real: 32 disparos em cerca de 9 horas para o mesmo número, risco real de o número ser marcado como spam pelo WhatsApp. Agora a varredura respeita o intervalo configurado entre o fim de uma tentativa e o início da próxima para o mesmo contato no mesmo fluxo. Ninguém precisa reconfigurar nada.

  Contribuição de @nsbastosconsultoria (#1578).

## [1.60.0] — 2026-09-28

### Adicionado

- **O ícone enviado em Marca também identifica o aplicativo instalado** O campo de ícone da instalação passa a usar a mesma imagem na aba do navegador e no app instalado no celular, com tamanhos de 192 e 512 pixels. Sem imagem própria, mantém o desenho da marca. PNG ou JPG até 512 KB, sem editar arquivos no servidor. Crédito: @vitorlacerdadigital.

  Contribuição de @vitorlacerdadigital (#1848).

- **Use uma chave OpenRouter para preparar o acervo de conhecimento** O acervo aceita uma chave OpenRouter cadastrada em IA › Credenciais ou na instalação (`OPENROUTER_API_KEY`) para indexar e consultar documentos com o mesmo modelo de embedding. Em IA › Conhecimento, o aviso de chave faltando permite cadastrá-la sem sair da página. A OpenRouter só entra quando não há chave OpenAI nem gateway: quem já usa OpenAI continua com a configuração anterior.

  Contribuição de @obrunogonzaga (#1854).

- **A empresa passa a ter proposta comercial, do rascunho da IA ao PDF que o cliente recebe no WhatsApp** Nova tela Propostas. É módulo opcional, desligado por padrão, com duas chaves: quem
  administra o servidor liga "Propostas comerciais" em /admin/sistema › Módulos
  opcionais (com ela desligada, nenhuma empresa vê a tela, o menu nem as ferramentas
  do agente), e cada empresa liga a dela em Configurações › Propostas. Ligada, o assistente que conversa com o cliente levanta o briefing antes
  de rascunhar — objetivo, entregas, o que o cliente já tem e os acessos,
  responsabilidades, prazo, quem decide e orçamento, e uma referência —, formulando as
  perguntas com as palavras de cada pedido (serve para site, automação ou projeto sem
  nicho), mostra um resumo e só cria o rascunho depois que o cliente confirma. O
  rascunho abre um aviso na Central, aparece em destaque na tela de quem está com o
  CRM aberto e entra no Radar como "proposta esperando revisão"; nada sai para o
  cliente sem uma pessoa revisar. A empresa escolhe os modelos em Configurações ›
  Propostas › Modelos: pode desligar os que vêm com o sistema, editar, criar os dela
  e importar o PDF ou o texto que já usa — a IA divide em seções, troca por campos o
  que muda de um cliente e de um projeto para outro, e mostra o que o modelo vai pedir
  antes de salvar. No editor, "Preencher com a conversa" sugere valores para os campos
  em aberto (você confirma cada um), cada seção pode ser reescrita, e "Ver como o
  cliente recebe" abre o PDF exatamente como ele vai chegar. O envio exige modelo
  confirmado e preços definidos, grava o que foi digitado antes de enviar, numera a
  proposta por organização e ano, e manda o PDF pelo WhatsApp da empresa, com a marca
  dela. Anonimizar um contato (LGPD) também apaga do armazenamento o PDF das propostas
  dele, e o relatório de acesso aos dados passa a listá-las. Nada exige ação de quem
  opera a instalação: quem não liga o módulo não vê diferença nenhuma.

  Contribuição de @paulolimajr77 (#1832).

- **A venda que veio de anúncio pode ir para a Meta pelo próprio canal intermediado, atrás de uma chave que vem desligada** Contribuição de @jmpo (#1819).

  Quando o número de WhatsApp está conectado por um canal intermediado que já
  liga o conjunto de dados da Meta ao número (na tela do próprio provedor), a
  venda fechada no CRM — botão Ganhar, arrasto no quadro ou mover em lote —
  pode ser reportada por esse canal: o evento `Purchase` sai com o valor, a
  moeda, o telefone e o id da conversa, e o provedor completa o vínculo com o
  clique do anúncio.

  **Vem desligado.** Nada muda na atualização: o env…62152 tokens truncated…amente o que impede a exclusão. Antes ele
  contava só a versão publicada e podia mostrar zero numa chave que o sistema não deixava excluir.

  Nada a fazer na instalação: nenhuma chave existente é tocada e nenhum dado é convertido.

### Corrigido

- **O aviso de mensagem nova diz quem escreveu** O aviso que aparece na esquina quando chega mensagem dizia sempre "Nova
  mensagem", nunca o nome de quem escreveu: a leitura do contato saía sem sessão e
  o banco respondia com zero linhas — sem erro, sem log, sem nada reprovando. O
  aviso agora busca o contato pelo mesmo caminho autenticado que o avatar já
  usava, mostra o nome (ou o telefone) de quem escreveu, e traz o botão "Abrir
  conversa" para ir direto até ela. Nada a fazer na VPS além de atualizar.

- **Condição por "Desfecho do passo anterior" volta a filtrar leads** A condição **Desfecho do passo anterior** — e a negação escrita com ela
  ("não é <classe>") — agora decide de verdade. O motor montava esse campo como
  `null` fixo, então o filtro era decorativo: quem escrevia uma negação via o
  fluxo mandar **todos** os leads pelo ramo da negativa, inclusive os que nunca
  passaram por um passo de classificação, e o follow-up seguia calado pelo
  caminho errado.

  O que muda em quem opera a VPS:

  - a condição passa a ler a classe escolhida pelo último passo de classificação
    da inscrição — o mesmo desfecho que o histórico da conversa mostra;
  - lead **sem classificação** deixa de satisfazer a negativa: "não foi X" só vale
    para um lead que **foi classificado** com outra classe. Ausência de dado não
    prova a negativa (e `é`/`contém` já eram falsos nesse caso);
  - vale conferir os fluxos que usam essa condição com `não é`: eles podem passar
    a desviar leads que antes seguiam reto por ali. Nada quebra e nada precisa ser
    reconfigurado — era o filtro que o dono da VPS achava que já estava valendo.

- **Ligar o pacote "Atender e responder" não oferece mais duas capacidades que o motor descartava** Na configuração do agente, o pacote **Atender e responder** listava duas capacidades com
  checkbox marcável que o motor recusava em silêncio a cada turno: enviar mensagem de WhatsApp
  e passar a conversa para uma pessoa. Quem marcava via o agente publicado com a capacidade
  ligada, e nada acontecia — o único sinal era uma linha no log do worker.

  As duas continuam existindo e continuam acontecendo: quem envia é o próprio sistema, pelo
  caminho seguro, com opt-out, regra anti-ban e o silêncio dos follow-ups quando um humano
  assume. O que muda é a tela — em vez de um checkbox que o motor descartava, ela mostra a
  capacidade com o motivo escrito, e o pacote passa a contar só o que ele de fato entrega.

  Quem instala não precisa fazer nada: nada que o agente já fazia deixou de funcionar, e
  nenhuma capacidade ligada por engano passa a ter efeito.

- **A pausa que imita digitação humana deixa de segurar o número inteiro** Quando a IA respondia, a pausa que imita digitação humana era paga com a trava do
  número na mão. Enquanto um cliente esperava 1,2s a 7,5s, todo atendimento do MESMO
  WhatsApp esperava atrás dele — e com o throttle anti-ban somado no mesmo ponto, o
  pior turno segurava a fila por até 9,5s. Dois atendentes no mesmo número entravam em
  fila; a fila ficou mais longa.

  A pausa continua existindo, com a mesma duração e o mesmo aviso de digitando: ela só
  passou a ser paga antes de a trava do número ser tomada, então durante a espera o
  número já pode atender o próximo. Nada a fazer na VPS.

- **A Agenda encontra clientes pelo nome exibido em Contatos** Em Novo agendamento, o cliente que chegou pelo WhatsApp e só tem o nome do perfil não era encontrado pela busca e aparecia em branco na lista de quem será atendido. Agora a busca procura pelo nome do cadastro e pelo nome do perfil do WhatsApp, e a lista mostra o mesmo nome da tela de Contatos: o do cadastro e, na falta dele, o do perfil. Nada para configurar. Crédito: @vanksestevao.

- **Na Agenda, o papel Somente leitura não vê mais "Novo agendamento"** Quem entra na Agenda com o papel "Somente leitura" via o botão "Novo agendamento", podia clicar num horário livre da grade e podia abrir o painel de marcação pelo "Marcar compromisso" que chega do Inbox — e só descobria a recusa no 403 da rota, depois do gesto. Agora as três portas somem para esse papel: o botão não aparece, a grade fica só de leitura (sem bloco clicável) e o painel não abre sozinho pelo link. O rótulo do botão e o comportamento de quem tem papel de equipe ficam iguais — e a rota continua decidindo, como sempre. Ficam de fora, ainda com o 403 da rota: "Confirmar", "Remarcar", "Cancelar", "Realizado" e "Faltou" no Histórico da Agenda. Crédito: @webtecnica.

- **Excluir uma conexão de WhatsApp fecha o aviso crítico que ficava aberto para sempre** A Central de avisos mantinha um alarme crítico para uma conexão que já não existia — "WhatsApp fora do ar (STOPPED) — Nenhuma mensagem entra nem sai por esta conexão até ela voltar" — e o cartão nem conseguia mostrar o contexto: "Este contexto não está disponível para você". O aviso só fechava quando a própria sessão avisava que tinha voltado, e uma conexão arquivada nunca mais manda evento nenhum: o único caminho que resolveria o episódio desaparecia no mesmo instante em que a conexão era removida. Enquanto isso, a conexão nova, com o mesmo número, podia estar funcionando normalmente nos dois lados.

  Agora, ao excluir (ou arquivar) uma conexão, os avisos abertos DELA são resolvidos no mesmo ato — e só os dela: o alerta de outro número que segue caído continua na Central, e o número que voltar a cair avisa de novo. O que a operação fez com os avisos fica registrado na auditoria.

  Crédito: @webtecnica. Relato: @rogercampel.

- **O boot não acusa falta de IA quando a credencial pode estar no painel** O aviso de inicialização agora distingue ausência de chave no ambiente de ausência real de credencial, evitando orientar quem opera a corrigir uma configuração que pode já estar válida em IA › Credenciais. Crédito: @joaopaulomirandamatias.

- **A atualização diária da lista de modelos de IA voltou a rodar** Numa instalação nova, a tarefa que atualiza todos os dias a lista de modelos de inteligência artificial disponíveis era recusada pelo próprio sistema e não fazia nada. O instalador cria dois segredos diferentes para as tarefas agendadas, e essa tarefa — só ela, entre as vinte e quatro — aceitava apenas um deles, enquanto o agendador usa o outro. Como a saída dessas chamadas não é guardada, a recusa diária não aparecia em lugar nenhum.

  Você não precisa fazer nada: nenhuma configuração muda e nenhum segredo precisa ser trocado. A tarefa passa a ser aceita como as demais.

  Também saiu do projeto o arquivo de agendamento que só servia a uma plataforma de hospedagem que o produto não usa, junto com a exigência de mantê-lo atualizado a cada tarefa nova. A lista que vale continua sendo a do agendador que acompanha a instalação, e ela segue protegida: tarefa sem agendamento, ou agendamento apontando para tarefa que não existe, continuam reprovando na verificação automática.

- **A ficha do contato identifica o nome do perfil do WhatsApp** Na visão geral do contato, o nome recebido do perfil do WhatsApp deixa de aparecer com o rótulo técnico em inglês e passa a ser identificado claramente na interface. Crédito: @joaopaulomirandamatias.

- **A agenda, o novo contato, o novo lead e o onboarding passam a falar o idioma de quem usa** Quem usa o sistema em espanhol deixa de ver em português os motivos e horários dos blocos da agenda, os avisos de remarcação, o campo de e-mail do novo contato, a janela de novo lead e o rótulo do botão de tema. O onboarding passa a seguir o idioma da organização quando a pessoa não escolheu um idioma próprio, e a página passa a declarar ao navegador o idioma em uso assim que carrega. A tradução completa da interface para chinês simplificado entrou no sistema, mas ainda não aparece para escolha. Em português, nada muda. Crédito: @xxjjjj.

- **O intervalo antes do atendimento passou a valer também na hora de marcar** Se você configurou um intervalo antes (ou depois) do atendimento — aquele tempo de respiro entre um compromisso e outro —, o vizinho só era levado em conta quando caía dentro do horário consultado. Na hora de MARCAR (pela IA, por token ou por webhook) a conferência olhava só a janela do próprio atendimento, o compromisso vizinho ficava fora dela e o horário era aceito, mesmo invadindo o intervalo que você pediu para guardar; e a lista de horários tinha a mesma falha na borda do período pedido. Agora as duas olham também o intervalo antes e depois. Efeito que você pode notar: pedir à IA para passar um compromisso para o horário logo depois dele, com intervalo configurado, passa a ser recusado, porque o próprio compromisso ainda ocupa o intervalo. Nada para configurar: os agendamentos que já existem seguem como estão.

  Crédito: @webtecnica.

- **Arquivo que o sistema não conseguiu ler deixa de virar resposta inventada** Quando a leitura de um arquivo enviado pelo cliente falhava de vez — um PDF
  escaneado, sem texto de verdade, é o caso mais comum —, o agente recebia apenas
  a marca "[documento]". Isso diz que chegou um arquivo e não diz que ninguém
  conseguiu abri-lo, e o agente respondia como se soubesse o que havia ali.

  Medido numa instalação real: uma cliente mandou um PDF de catálogo, o extrator
  de texto falhou, e o assistente respondeu que o material "parece ser de
  distribuidora/promocional" — uma afirmação sobre um conteúdo que ele nunca leu.

  Agora a falha grava a mesma marca que os outros casos de arquivo ilegível já
  gravavam: "não consegui interpretar". Da mensagem seguinte em diante o agente
  sabe que houve um arquivo que não deu para ler e avisa, em vez de supor. O
  aviso na Central continua aparecendo como antes, com o motivo técnico.

  O turno que já tinha respondido não volta atrás — a correção vale do próximo em
  diante, que é quando o agente lê o histórico da conversa.

- **O editor do agente diz na tela por que o Publicar está desabilitado** No editor do agente, o motivo de o botão Publicar estar desabilitado existia só no `title` do botão: aparecia com o ponteiro parado em cima dele. Em celular e tablet não existe hover, e um botão desabilitado não recebe foco do teclado — quem mais precisava da explicação era exatamente quem não a recebia. Agora o motivo aparece como texto na própria tela, logo abaixo do cabeçalho do editor, e o botão aponta para ele por `aria-describedby`, então o leitor de tela anuncia a explicação junto do rótulo. As frases do motivo não mudaram e continuam traduzidas em espanhol. Nada muda na sua VPS: nenhuma migration, nenhuma variável, nenhum comando. Crédito: @webtecnica.

- **Campos de lista fechada voltam a aceitar mais de uma opção** No editor de campos do funil, em Configurações, digitar a vírgula entre as opções de um campo de seleção apagava o separador e colava a palavra seguinte na anterior — na prática só dava para salvar uma opção. Agora a lista aceita quantas opções você digitar. Crédito: @deskcommopp4s-cmd.

- **A recusa do Google passa a dizer o que aconteceu** Quando o Google recusava uma alteração da Agenda, o erro gravado no compromisso dizia apenas "Google HTTP 400". O Google já tinha dito o motivo na resposta (`invalid`, `insufficientPermissions`, `rateLimitExceeded`…), mas ele era descartado antes de virar a frase. Agora a frase diz o tipo da recusa (sem permissão no calendário, limite de uso do Google, evento que não existe mais, recusa que repetir não resolve), o código HTTP e o motivo que o Google mandou — por exemplo: "o Google recusou e repetir não muda o resultado — HTTP 400 (invalid)".

  O compromisso recusado continua marcado com erro e continua sendo reexaminado pela sincronização, como antes. Da resposta só entra o que tem formato de identificador (letras e sublinhado): e-mail de convidado e frases ficam de fora da frase, que é gravada e mostrada na tela. Quando o calendário inteiro foi apagado no Google, a frase agora diz isso, em vez de falar do evento. Nada para configurar. Crédito: @webtecnica.

- **A documentação deixou de dizer que o sistema roda numa plataforma que ele não usa** Vários textos do projeto — o guia de quem contribui, os runbooks de operação, as especificações e até uma mensagem de erro do próprio sistema — afirmavam que o CRM era publicado e testado numa plataforma de hospedagem gerenciada. Isso deixou de ser verdade: o produto é instalado na sua própria infraestrutura, e é lá que ele opera.

  Nada muda no que você roda hoje. O que muda é o que você lê: a mensagem que aparece quando falta uma variável agora manda ajustar o `.env` da instalação, em vez de um painel que você não tem; os procedimentos de trocar chave do WhatsApp e de rotacionar credenciais passam a descrever o `.env` e a recriação dos contêineres; e o texto que quem contribui recebe ao abrir um pedido de mudança deixa de anunciar um resultado de verificação que não existe mais, e diz onde olhar o que de fato trava a entrada do código.

  O agendador de tarefas para quem instala sem cron próprio continua existindo e funcionando igual — só deixou de ser descrito como coisa de uma plataforma específica.

## [1.32.1] — 2026-09-17

### Corrigido

- **A senha das rotinas automáticas deixa de ser gravada no log do servidor** A rotina que processa a fila de eventos a cada minuto levava a senha interna escrita na própria linha do agendamento, e o servidor anota cada execução no log do sistema: a senha ia parar lá uma vez por minuto. Agora ela fica num arquivo que só o administrador do servidor lê, e a linha do agendamento só aponta para ele. Instalações novas já nascem assim; nas existentes, a troca acontece sozinha a partir da atualização SEGUINTE a esta, porque a atualização em curso ainda roda o instalador da versão anterior. Crédito: @rafaeskytrabalho.

## [1.32.0] — 2026-09-17

### Adicionado

- **Guias opcionais podem ser instalados e ativados por organização** A área Extensões permite ao responsável pela instalação admitir um catálogo revisado e baixar guias declarativos sem reconstruir o aplicativo. Cada organização escolhe quais guias ativar e como apresentá-los no CRM; desativar preserva a configuração. Os pedidos ficam registrados, com retomada e cancelamento de preparações interrompidas. O conteúdo instalado continua disponível quando o catálogo está fora do ar.

  O responsável pela instalação também atualiza um guia para outra versão do catálogo, desfaz a última troca mesmo com o catálogo fora do ar e remove um guia da instalação. Enquanto houver um guia sendo preparado, a atualização do sistema pela tela espera; a própria tela diz como retomar ou cancelar essa preparação em Extensões. Remover desliga o guia em todas as organizações, guarda a configuração de cada uma e registra na auditoria de cada organização por que ele saiu; ao reinstalar, cada organização decide se ativa de novo.

  Este primeiro perfil aceita apenas conteúdo e ações conhecidas do sistema. Código externo e o catálogo público com avaliações ainda não são oferecidos. O sistema continua funcionando com zero extensões, e a atualização normal aplica as tabelas necessárias, sem variável obrigatória nem edição manual de arquivo. A única variável nova, `EXTENSIONS_LOCAL_CATALOG_ORIGIN`, é de laboratório e fica vazia por padrão.

### Corrigido

- **As travas do modo somente leitura do suporte cobrem todas as tabelas já na instalação nova** As travas do modo somente leitura do suporte cobrem todas as tabelas da organização já na primeira aplicação do schema, e uma instalação nova chega ao mesmo conjunto de travas que uma instalação atualizada.

  Não há nada a fazer: a próxima atualização aplica a correção sozinha.

## [1.31.1] — 2026-09-17

### Corrigido

- **A atualização refaz o banco quando ele está ocupado, e para de mostrar avisos falsos** Quem tinha materiais do acervo ligados a um agente via, a cada atualização, até três avisos de banco (`could not create unique index`), mesmo com tudo certo. Não havia dado errado: o instalador tentava recriar três regras antigas do acervo que ele mesmo apaga logo depois, e que não cabem mais no jeito atual de guardar os materiais. Essas tentativas saíram, e nenhum dado foi apagado ou alterado.

  A atualização também recriava, por um momento, 21 regras de acesso antigas que ela mesma apagava em seguida, e reinstalava outras 2 numa versão mais larga que a de hoje. Isso acabou. Algumas dessas regras eram mais largas que as atuais: no meio-tempo, um usuário só de leitura conseguia alterar dados que as regras de hoje protegem — medido num Postgres de verdade, com um `viewer` que hoje não altera, não apaga e não cria um lead, e que com a regra antiga fazia as três coisas. E se a atualização falhasse justo no comando que apaga a regra antiga, ela ficava valendo até a atualização seguinte.

  O ruído escondia um problema de verdade. Com o CRM atendendo, o banco às vezes recusa um comando da atualização por disputa com o próprio app (`deadlock detected`), ou a conexão cai no meio. A atualização avisava e seguia, e o que não aplicou ficava para trás: numa instalação real, o acervo dos agentes ficou sem a regra que permite lê-lo. Agora a atualização aplica o banco de novo, em até três passadas no total, e mostra na tela o que precisou refazer. Se ainda assim o banco não terminar limpo, o **fim** da saída diz isso e explica o que fazer conforme a causa: repetir a atualização quando o banco estava ocupado, ou acertar a conexão do `.env` quando faltou permissão — repetir, nesse caso, não resolveria. Na atualização pelo botão da tela esse aviso ainda não aparece: ele fica registrado em `.update.log`, na pasta do projeto no servidor.

  A nova tentativa vale a partir da atualização seguinte a esta, porque quem executa uma atualização é o instalador que já está no servidor. Os avisos falsos e as regras de acesso antigas saem já nesta.

- **A atualização deixa de reabrir, no meio do caminho, permissões que ela mesma fecha adiante** O instalador aplica o arquivo de banco inteiro a cada atualização, um comando de cada vez. Três linhas dele concediam uma permissão que o próprio arquivo retira adiante — o banco ficava, no meio do caminho, com uma permissão a mais do que teria no fim.

  As três linhas saíram. O estado final do banco é exatamente o mesmo de antes: quem termina a atualização fica com as mesmas permissões de sempre, e nada muda para quem usa o sistema. Duas guardas novas impedem a volta: uma lê o arquivo e recusa concessão no corpo que seja revogada adiante, e a outra prova em banco que reaplicar o arquivo não deixa nenhuma função ganhar permissão que ela não tinha.

## [1.31.0] — 2026-09-17

### Adicionado

- **O agente confere e marca o horário na mesma chamada** Quando a pessoa já dizia o dia **e** a hora ("quinta às 14h"), o agente conferia a agenda,
  respondia que o horário estava livre e encerrava o turno — **ninguém marcava nada**, e o
  compromisso só existia na conversa. Consultar e marcar eram duas idas ao modelo, e o turno
  parava no meio do caminho com o cliente achando que estava agendado.

  Agora o agente tem uma ferramenta que faz as duas coisas numa chamada só: se o horário pedido
  estiver livre, ele é marcado na mesma resposta, com o mesmo tipo de atendimento, a mesma reserva
  de horário e a mesma exigência de aprovação da equipe dos agendamentos que já existem.

  Se o horário **não** estiver livre, nada é marcado — e o agente recebe os horários que a agenda
  tem naquele dia, para oferecer uma alternativa na mesma conversa em vez de pedir outra data no
  escuro. O horário marcado é sempre o que a agenda confirmou como livre, nunca o texto que veio
  na mensagem.

  Em quem já usa o assistente, a capacidade nasce desligada: o que cada assistente pode fazer
  fica gravado na versão publicada dele, e capacidade nova não entra sozinha. Abra o assistente,
  vá em "O que o agente pode fazer", ligue "Ver se o horário está livre e já marcar" — o pacote
  "Vender e mover o funil" vai aparecer como parcial até você ligar — e publique. Em instalação
  nova o assistente já nasce com ela.

- **Etiquetas ganham tela própria para renomear, juntar e excluir** Configurações agora tem a tela de Etiquetas: a lista das etiquetas em uso, com quantos
  contatos, negócios, conversas e regras de agente cada uma alcança. De lá dá para renomear,
  juntar duas numa só e excluir. No renomear e no juntar, a regra de marcação dos agentes que
  escrevia a etiqueta é corrigida na mesma operação, numa transação só; no excluir, a tela avisa
  quantas regras continuam escrevendo a etiqueta e não mexe nelas.

  Era esse o defeito de origem: renomear a etiqueta sem corrigir a regra deixava o agente
  escrevendo a grafia velha na próxima conversa. Quem instala não precisa fazer nada: o
  `update.sh` aplica a migration e a tela aparece em Configurações para gerentes e
  administradores.

- **Levar um negócio aberto para outro funil (o clone que a P-01 mandava usar)** Negócio que começou no funil errado (ou que muda de natureza no meio do caminho —
  o pedido de suporte que virou venda) não tinha por onde sair: o quadro só sabe
  trocar a etapa DENTRO do mesmo funil, e quem tentava pela API recebia "não é
  permitido, clone o negócio" — apontando para um clone que não existia em lugar
  nenhum do produto. A instrução apontava para o vazio.

  Agora existe a troca de funil, por enquanto pela API (`POST
  /api/v1/leads/[id]/clone`); o botão no quadro vem na fatia seguinte. O negócio é
  criado no funil de destino (na primeira etapa aberta, ou na etapa que você
  escolher) com os mesmos dados — título, contato, valor, dono, previsão, tags e
  campos personalizados (os que o funil de destino não tiver continuam guardados no
  negócio, mas só aparecem na tela quando você criá-los lá) — e a origem é encerrada
  como perdida. Os dois lados contam a troca na linha do tempo: o novo negócio mostra
  de qual funil veio, e o antigo mostra para qual funil foi levado, em vez de
  aparecer como uma perda comum.

  Duas coisas que a troca NÃO faz, de propósito: negócio já encerrado não é clonado
  (reescrever um ganho como perda apagaria o desfecho que alguém registrou) e trocar
  de etapa dentro do mesmo funil continua sendo o arrastar de sempre, sem encerrar
  nada.

### Alterado

- **O botão que cria um lead no painel do Inbox passa a se chamar "Novo Lead"** No painel lateral do Inbox, o botão "Lead" passa a se chamar "Novo Lead". Ele sempre abriu o cadastro de uma negociação nova para o contato, mas o nome curto dava a entender que mostraria o lead que já existe. O lead existente continua sendo editado em "Leads recentes", no mesmo painel, e a ficha da pessoa continua em "Ver contato". Nada muda no que o botão faz. Crédito: @rafaelbatistazz.

### Corrigido

- **A janela de perder mostra os motivos que você cadastrou no funil** Quem cadastrava os próprios motivos de perda em Funis não os encontrava na hora de marcar um
  card como perdido: a janela oferecia sempre a lista padrão do produto. O operador escolhia
  "Outro", digitava o motivo à mão e só descobria no clique se aquele funil aceitava o texto —
  com erro na cara quando não aceitava.

  Agora a janela lê os motivos do funil do próprio card. Se você cadastrou "Sem orçamento" e
  "Fora do perfil", são esses dois que aparecem, com as suas palavras; sem nada cadastrado, a
  lista padrão continua valendo. Nos funis com motivos cadastrados, "Outro" passa a recusar ali na
  tela o texto que aquele funil não aceita — antes do clique, em vez de depois dele — e a dizer onde
  se cadastra um motivo novo. Deixar o detalhe em branco continua valendo em qualquer funil: grava
  "Outro", como sempre.

- **Arrastar o mesmo card duas vezes seguidas no funil deixa de dar "modificado por outro usuário"** No funil, o primeiro arrastar de um card funcionava, mas arrastar o mesmo card de novo logo em seguida mostrava "Lead foi modificado por outro usuário. Recarregue e tente novamente.", sem ninguém mais usando, e só voltava a funcionar recarregando a página. O próprio movimento registra a mudança de etapa no histórico, e esse registro atualizava o card de novo depois que a tela já tinha guardado a versão anterior. Agora o servidor devolve a versão final do card e a tela a guarda na hora, então, assim que o primeiro movimento é confirmado, dá para mover o mesmo card de novo sem recarregar a página. Crédito: @rafaelbatistazz.

- **O compromisso do Google que atravessa a borda do período volta a aparecer na grade** O compromisso do Google Agenda que começa antes do período que a tela desenha e termina dentro dele — das 23:30 às 00:30, por exemplo — passa a aparecer quando atravessa a borda desse período: a virada da semana na visão Semana, a virada do mês na visão Mês e toda meia-noite na visão Dia. Ele entra fatiado no pedaço que cai dentro do período. Antes, a grade perguntava pelo começo do compromisso e só desenhava os que começavam dentro do período: o horário que a tela mostrava livre era recusado na hora de marcar. A tela e a rota que a alimenta passam a usar a mesma conta do motor de disponibilidade (interseção de intervalos), lida de um só lugar. Para quem lê a lista pela API, o bloco do Google passa a vir recortado no período pedido — o instante de começo nunca é anterior ao período, e o de fim nunca é posterior. Fora isso, nada mudou: a grade continua recebendo apenas identificador, dono e os dois instantes, nunca o conteúdo do evento.

- **Mover um card para uma etapa de perda sem motivo deixa de dar erro 500** Mover um card para uma etapa que fecha o negócio como perdido sem informar o
  motivo respondia "Erro inesperado" (500) — e o card não se movia, sem dizer por
  quê. Acontecia nos três caminhos que trocam a etapa do negócio: o arrasto no
  quadro, o movimento em lote e o movimento feito pelo assistente de IA.

  O motivo da perda é exigência do banco desde sempre (a etapa de perda fecha o
  negócio, e fechar como perdido sem causa registrada não é permitido). Quem estava
  errado era a tela, que deixava a pergunta chegar ao banco e devolvia a recusa como
  falha de servidor.

  Agora a resposta é a recusa de negócio, com o que fazer: no arrasto, o card volta
  para a coluna de origem e a tela avisa "Informe o motivo da perda: use “Marcar
  como perdido” no menu do card, que pede o motivo."; no lote, a recusa avisa antes de tentar, em vez de derrubar o lote inteiro
  por causa de um card; e o assistente de IA não leva o card para a etapa de perda:
  ele avisa na Central que o negócio deveria ser marcado como perdido e que o motivo
  é uma decisão de quem está no negócio. O aviso não se repete a cada mensagem do
  cliente: enquanto o primeiro estiver aberto na Central, não nasce outro igual para o
  mesmo negócio.

  Nenhuma ação é necessária na instalação: a regra do banco não mudou e nenhum dado
  foi tocado.

- **Dá para excluir um card do funil pelo menu do próprio card, inclusive no celular** Para excluir um card do funil era preciso selecioná-lo e usar a barra de ações em lote. No celular e no tablet isso era impossível: a caixa de seleção e o botão de menu do card só apareciam com o mouse em cima. Agora o menu de ações do card tem "Excluir", com confirmação que diz o nome do card e o que vai junto (o histórico de atividades; o contato e as conversas continuam), e o botão do menu fica visível em telas de toque. A opção aparece para quem já podia mexer no funil. Selecionar vários cards de uma vez continua só no computador: a caixa de seleção do card segue aparecendo apenas com o mouse em cima. Crédito: @rafaelbatistazz.

- **Conectar o Google Agenda deixa escolher qualquer conta do Google, não só a do e-mail de login** Ao conectar o Google Agenda, quem já tinha aberta no navegador a conta com o mesmo e-mail do login no CRM ia direto para ela, sem passar pela escolha de conta. Quem entra no CRM com um e-mail e tem a agenda em outro não conseguia vincular a agenda certa. Agora o CRM pede ao Google o seletor de contas em toda conexão, com a conta do login apenas sugerida — quem desenha essa tela é o Google. A conexão continua sem expirar sozinha. Crédito: @rafaelbatistazz e @webtecnica.

- **"Leads recentes" do Inbox diz o funil, a etapa e o status em português** No painel lateral do Inbox, a seção "Leads recentes" mostrava só título, status e valor. Dois leads de mesmo nome em funis diferentes ficavam idênticos ("open · —"), e o status aparecia em inglês. Agora cada lead mostra o funil e a etapa onde está e o status traduzido (Aberto, Ganho, Perdido). Leads de funil arquivado deixam de aparecer na lista. Arquivar um funil não fecha os leads dele, então eles continuavam na lista. Nenhum dado é alterado. Crédito: @rafaelbatistazz.

- **O nome que você edita no contato passa a aparecer no lugar do nome do WhatsApp** Quem corrigia o nome de um contato em "Editar contato" continuava vendo o nome do perfil do WhatsApp — às vezes um apelido ou um emoji — no Inbox, na lista de contatos, nas notificações e no radar de risco. O agente de IA e o lembrete da agenda também chamavam o cliente pelo nome do perfil. Agora o nome preenchido na ficha vem primeiro em todos esses lugares; o nome do WhatsApp só aparece quando o contato não tem nome cadastrado. Nada precisa ser refeito: contatos que já têm nome passam a mostrá-lo na hora. O mesmo vale para o card da Agenda, para a prévia de um pedido de LGPD e para o título do negócio que uma automação cria — três lugares que ainda montavam o nome por conta própria e podiam mostrar um código interno do WhatsApp no lugar do nome. Um efeito fica GRAVADO: o card de negócio que nascer de uma primeira mensagem a partir de agora leva esse nome no título — os cards que já existem continuam com o título que receberam quando nasceram. Crédito: @rafaelbatistazz.

- **O Radar de risco deixa de mostrar leads de funil arquivado** Depois de arquivar um funil, os leads dele continuavam aparecendo no Radar de risco, e na lista de demandas sem próximo passo, como se precisassem de atenção. Arquivar um funil não fecha os leads, e o radar lia todos os leads abertos da organização. Agora leads de funil arquivado e as demandas ligadas a eles ficam de fora do radar, tanto na tela quanto na consulta que o agente de IA faz. Nenhum dado é alterado: os leads e o histórico continuam guardados no funil arquivado. Um número ainda não acompanha: o contador "Demandas abertas sem próximo passo", na tela de Métricas, continua somando as demandas de funil arquivado — ele sai de outra consulta, e será alinhado em seguida. Até lá as duas telas mostram números diferentes para a mesma coisa, e o do Radar é o que já exclui o funil arquivado. Crédito: @rafaelbatistazz.

- **Tag em lote no funil mostra as tags que já existem** No funil, ao selecionar vários cards, o menu "Tag…" da barra de ações só oferecia um campo para digitar uma tag nova, sem mostrar as tags que os leads já usam. Agora o menu lista até 10 tags já usadas pelos leads do funil, filtrando pelo que você digita, e clicar aplica a tag a todos os cards selecionados. Digitar uma tag nova continua funcionando. A atualização não muda nada no seu banco: a tela passa a mostrar tags que já existem. Crédito: @rafaelbatistazz.

- **Tags do contato no Inbox sugerem as tags que já existem** No painel lateral do Inbox, o editor de tags do contato não sugeria nada: cada pessoa digitava a tag do zero, e a mesma ideia virava várias tags diferentes ("google", "gogle", "google ads"). Agora ele mostra, como botões "+ tag", as tags que já existem nos contatos mais recentes da organização — até oito por vez —, do mesmo jeito que o editor de tags da conversa já fazia. Clicar aplica a tag, sempre em minúsculas — é a mesma forma com que o editor já gravava o que se digita, então o rótulo do botão diz exatamente o que vai ser gravado. A atualização não mexe em nenhum dado: as tags que já estão gravadas continuam como estão, e o que muda é a sugestão aparecendo na tela. Crédito: @rafaelbatistazz.

## [1.30.0] — 2026-09-16

### Adicionado

- **A conversa ganha "Arquivar" — sai da fila viva, fica guardada numa aba própria e volta sozinha quando o cliente escreve** Quem atende passa o dia na Fila, e nem tudo que acaba ali merece continuar à vista: conversa que o cliente abandonou, número que era trote, atendimento que já terminou e ninguém fechou. Até agora não havia nada a fazer com isso — a conversa ficava na lista para sempre, empurrando para baixo o que ainda é trabalho. Excluir de vez continua fora, porque o histórico é do cliente e não se apaga.

  Agora existe **Arquivar**. Tudo que já é do passado ruma para uma pasta própria: a conversa sai da Fila e das listas de conversas em andamento, aparece na aba **Arquivadas** (ao lado de "Fechadas", com o próprio número) e o histórico continua inteiro para quem for consultar. Arquivar **encerra o atendimento**, como um fechamento — a diferença é onde a conversa fica guardada e o rastro que fica na auditoria. Se o cliente escrever de novo, a conversa volta sozinha para a caixa de entrada — o banco já fazia essa volta, e agora a tela conta isso em vez de esconder.

  Quem pode arquivar é quem já podia encerrar: atendente para cima. O que passa a ficar registrado é o motivo da mudança: arquivar deixa o evento próprio `conversation.archived` na auditoria, em vez de se confundir com "devolvida" ou com o fechamento do atendimento. Fechar continua sendo fechar, e o número da aba "Fechadas" passa a contar só as fechadas — antes ele somava as arquivadas e mostrava mais do que a lista.

- **Os guias do assistente passam a funcionar em qualquer pasta, e dois deixam de ser descartados** Um comando só (`curl -fsSL https://raw.githubusercontent.com/melgarafael/DeskcommCRM/main/scripts/instalar-guias.sh | bash`) liga os guias `deskcomm-instalar`, `deskcomm-cliente-novo`, `deskcomm-metricas`, `deskcomm-prompt`, `deskcomm-contribuir` e `deskcomm-doutrina` nas pastas globais do Claude Code, Codex, Cursor, OpenCode e Antigravity — antes eles só existiam com o assistente aberto dentro de um clone atualizado, o que deixava de fora justamente quem ainda não instalou. Pedir o assunto em português aciona o guia em qualquer um deles. Os guias não se atualizam sozinhos: rodar o comando de novo traz a versão nova, e `curl -fsSL https://raw.githubusercontent.com/melgarafael/DeskcommCRM/main/scripts/instalar-guias.sh | bash -s -- --remover` desfaz. O cabeçalho de dois guias trazia um erro de formato que assistentes mais rigorosos descartavam sem avisar, e foi corrigido.

- **Quem ainda não tem conta já vê login, cadastro, convite e páginas legais em espanhol** O idioma da interface sempre dependeu de uma sessão: `preferência da pessoa → idioma da
  organização → padrão`. Fora dessa cadeia — login, cadastro, aceite de convite, política de
  privacidade e termos — não havia nenhum sinal para seguir, e a tela caía sempre em português,
  mesmo para quem nunca vai ler português.

  Agora essas telas também consultam o `Accept-Language` que o navegador já manda em toda
  requisição: se o visitante não tem preferência salva (é a primeira vez, ainda não tem conta),
  o idioma dele na lista de preferências decide. Uma preferência já salva continua vencendo
  sempre — isto só entra em jogo para quem a tela nunca viu antes.

### Corrigido

- **A ajuda de "esperar a resposta por" no follow-up voltava a português mesmo em espanhol** O texto de ajuda do campo "Esperar a resposta por (minutos)" (nos construtores de
  classificação e de resposta correspondida do fluxo de follow-up) era uma string pronta em
  português — composta uma vez, no idioma do arquivo, citando o rótulo da aresta e o mínimo em
  minutos. Com o idioma em espanhol, ela continuava aparecendo em português, porque nunca
  passava por `t()`: só existia como texto fixo.

  Virou uma função que compõe a frase no idioma de quem está olhando, citando o mesmo rótulo
  traduzido que a aresta mostra no canvas do fluxo. Nenhum comportamento muda para quem usa
  português.

- **O construtor de follow-up para de reaproveitar identificadores, e "cancelar se o lead responder" passa a valer na espera** Duas coisas que estavam quebradas no acompanhamento automático. A primeira: ao abrir um fluxo já salvo e acrescentar um passo ou uma ligação, o construtor recomeçava a contagem de identificadores do zero — o passo novo nascia com o mesmo identificador de um que já existia, e a ligação que você acabou de desenhar aparecia por cima de outra, ou o salvamento era recusado. Agora a contagem continua de onde o fluxo parou. A segunda: a chave "cancelar se o lead responder" só valia enquanto o fluxo esperava uma resposta; numa espera por tempo — "aguarde 2 dias" —, a resposta do cliente não cancelava nada e a próxima mensagem saía assim mesmo, como se ele não tivesse respondido. Agora cancela nos dois casos.

  Um aviso para quem já editou fluxos antes desta versão: um rascunho que ficou com identificadores repetidos **não se conserta sozinho**. Abra o fluxo, apague o passo ou a ligação duplicada pela tela e salve de novo — daí em diante o problema não volta.

- **O domínio de quem manda o PR não viaja mais dentro da imagem** Nada muda na sua VPS: nenhum endereço de terceiro foi encontrado no código que
  embarca hoje, e nada foi trocado em produção. O que muda é o portão do
  repositório. A catraca que já barrava o nome antigo do produto — "DeskcommCRM"
  escrito na tela de quem instalou com a marca dele — passou a barrar também
  domínio de terceiro: site pessoal, endereço de teste ou visão de alguém
  enterrado numa parte do código que vai para a imagem. Quando isso acontece, o PR
  é reprovado com o endereço e o arquivo na mensagem. Foi por esse buraco que a
  identificação enviada à OpenRouter levava o endereço pessoal de quem escreveu o
  PR: o consumo de cada instalação ficava creditado a um site que não é o seu nem
  o nosso.

  Crédito: @webtecnica.

- **A marca enviada deixa de sumir da barra lateral quando o banco não responde** Quem sobe o logo da instalação em Configurações › Marca recebe o aviso “Logo atualizado.” e, no render seguinte, o desenho da marca. Se a consulta ao banco falhasse exatamente nesse instante — uma resposta perdida, um pico de carga no banco —, o sistema tratava o silêncio como resposta e guardava “não há marca gravada” por 30 segundos: a barra lateral voltava a desenhar a marca do produto, sem logo, com o arquivo novo já gravado e sem nada na tela dizendo que algo tinha falhado. Agora a leitura que falha vale só para aquela tela: a tela seguinte pergunta ao banco de novo e mostra a marca enviada. Quando o banco responde, nada muda — a marca continua sendo lida uma vez a cada 30 segundos.

- **Material arquivado que ficou marcado no assistente volta para a tela, com o desmarcar a um clique** Arquivar um material do acervo não podia travar o assistente que o tinha marcado — mas travava: o
  acervo chegava na seção já sem os arquivados, o id continuava em `knowledge_source_ids`, e o salvar
  recusava a versão com "um dos materiais marcados não existe mais, ou foi arquivado" sem oferecer
  onde desmarcar. Agora o arquivado **e marcado** aparece na lista com o selo "arquivado no acervo" e
  com o desmarcar a um clique; o arquivado que ninguém marcou continua fora da lista, e arquivado não
  conta como material do assistente em nenhum aviso.

- **Material do tipo documento para de oferecer o editor de perguntas e respostas** Quem cadastrou um documento — uma política de troca, um manual, um contrato — clicava em
  "Editar conteúdo" no cartão dele e caía num editor de pergunta e resposta EM BRANCO, como se
  o material tivesse sido cadastrado vazio. O botão agora nasce do tipo do material: documento
  não guarda pergunta e resposta, então não oferece esse editor. O que ele continua oferecendo
  é preparar de novo, ver o que o agente aprendeu e arquivar.

- **Importar a planilha não perde mais o produto de nome longo** Quando a planilha não trazia a coluna de código, o nome do produto virava o código
  dele, cortado em 60 caracteres. Nome de importado passa disso e difere no fim — 100 ml
  e 200 ml, 128 e 256 GB —, então dois produtos diferentes chegavam com o MESMO código: a
  segunda linha era recusada como "código repetido na planilha", citando um código que
  não existe na planilha, e o produto não entrava no catálogo. Agora o corte leva junto
  uma assinatura curta do nome inteiro, o que mantém os 60 caracteres, continua
  distinguindo, e a reimportação continua atualizando em vez de duplicar.

  O corte também acontecia antes de colapsar os espaços, e um código terminado em espaço
  é uma identidade diferente da que a tela grava: editar esse produto pela tela mudava o
  código dele, e a importação seguinte criava uma segunda linha do mesmo produto. Isso
  acabou junto.

  Se o seu catálogo já tem produto de nome muito longo que entrou pela planilha, o código
  dele passa a terminar com essa assinatura. A próxima importação da mesma planilha cria
  uma linha nova ao lado da antiga, a de código cortado — a antiga pode ser apagada pela
  tela do catálogo. Nada a fazer antes de atualizar.

  Crédito: @webtecnica.

- **A tela de criar agente e alguns avisos de IA voltaram a português mesmo com o idioma em espanhol** O guarda de i18n (`tests/unit/i18n-espanhol-cobre-a-tela.test.ts`) varre o AST das telas
  atrás de prosa em português fora de `t()`, mas não alcança texto que mora fora da tela — em
  constantes importadas de `lib/`. Quatro pontos escapavam por essa lacuna:

  - Os pacotes de capacidade (Atender e responder, Vender e mover o funil, Não perder o
    cliente, Passar para um humano, Organizar a operação, Aprender e evoluir) na tela de criar
    ou editar agente, e o texto de cada um.
  - O prompt padrão de um agente novo — que também é o `system_prompt` de verdade se ninguém
    editar, por isso em espanhol ele já instrui a IA a responder em espanhol, não em pt-BR.
  - Os seis avisos de erro do cadastro da chave de inteligência artificial (onboarding).
  - No construtor de fluxo de resposta correspondida, duas opções ("Se a informação já
    existir" e as três alternativas dela) que a mesma tela de classificação já traduzia
    corretamente — só esta ficou para trás.

  Corrigido envolvendo cada ponto em `t()`/`useT()` no local de exibição (mesma convenção do
  resto do produto) e completando o dicionário. Nenhum comportamento muda para quem usa
  português.

- **O atendimento para de se desligar sozinho 15 minutos depois de ser ligado** Em Equipe › Atendimento, ligar a chave de um atendente durava
  **cerca de quinze minutos**. Passado esse tempo, o sistema desligava a chave
  sozinho e nada a religava — a pessoa aparecia como offline, deixava de receber conversas novas e
  sumia dos horários oferecidos na Agenda, sem ter feito nada. Quem percebia
  religava, e quinze minutos depois acontecia de novo.

  A causa: uma rotina automática desligava quem não desse "sinal de vida", e esse
  sinal **nunca foi implementado em lugar nenhum do sistema**. Como ninguém o
  emitia, todo atendente era considerado ausente logo depois de se declarar
  disponível — em toda instalação, sempre.

  A rotina foi removida, e a disponibilidade passou a ser calculada na hora:

  - chave **desligada** → indisponível, e ninguém religa por você
  - chave **ligada, sem jornada publicada** → disponível 24 horas por dia
  - chave **ligada, com jornada publicada** → disponível dentro dela, indisponível
    fora — e **volta sozinho** no início do próximo horário

  Essa última linha é a que não existia: a jornada só sabia restringir, nunca
  reativar. Agora a chave é a sua decisão ("eu atendo") e a jornada diz quando —
  sem ninguém precisar ligar nada todo dia.

  A coluna "Status" da tela passa a mostrar três estados em vez de dois:
  **De plantão**, **Fora do horário** e **Desligado**. Antes, quem estava com a chave
  ligada às 22h aparecia igual a quem tinha desligado — e ia procurar defeito onde
  só havia uma jornada que terminou.

  Você não precisa fazer nada para adotar. Se alguém da sua equipe estava
  aparecendo como offline sem explicação, volta ao normal nesta versão.

  Um detalhe que vale conferir na sua equipe: quem fica com a chave ligada e **sem jornada publicada** passa a contar como disponível 24 horas por dia, porque não há horário que o limite. Se não for isso que você quer para alguém, publique a jornada da pessoa em Equipe › Atendimento.

## [1.29.0] — 2026-09-16

### Adicionado

- **O "Novo Lead" do funil passa a escolher o contato** Pelo funil, o "Novo Lead" pedia título, etapa, valor e tags, mas não tinha onde pôr a pessoa: o negócio nascia sem contato, sem telefone e sem ligação com a base de contatos. Quem cadastrava pelo quadro ficava com um card que o WhatsApp não consegue responder e que as automações não conseguem casar com ninguém. A importação de planilha já fazia o certo — procura o contato pelo telefone, reaproveita e cria quando falta —, e as duas telas davam resultados diferentes para a mesma coisa.

  Agora o diálogo abre com um campo **Contato** no topo: procure pelo nome ou pelo telefone, escolha da base ou crie na hora, sem sair da tela. Escolher alguém com o título ainda vazio preenche o título com o nome do contato.

  O contato continua **opcional**: quem abre o card no meio da ligação e completa depois segue conseguindo. Sem contato escolhido, a tela diz o que o lead perde — não recebe WhatsApp nem entra nas automações. Aberto pelo Inbox, que já sabe de quem é a conversa, nada muda.

  Leads sem contato criados antes desta versão continuam como estão; vinculá-los pela tela é a próxima fatia da #852. Crédito: @rafaelbatistazz.

- **A tela de Contatos passa a filtrar quem veio de anúncio** A lista de Contatos oferecia filtrar por Manual, WhatsApp, Nuvemshop e Importado (CSV). Quem chegou por um clique em anúncio — do Meta ou do Google — ficava gravado com essa origem no sistema e não aparecia em filtro nenhum: para encontrá-lo era preciso abrir contato por contato. Agora as duas origens de anúncio estão na mesma lista de filtros, em português e em espanhol.

- **Dá para digitar o identificador do modelo quando o provedor não tem catálogo** Na tela do agente, o campo Modelo só oferecia uma lista. Quando o provedor escolhido não devolve catálogo — é o caso de quem usa um serviço compatível, um gateway próprio ou um modelo que acabou de sair —, a lista aparecia vazia e não havia como seguir: o agente ficava sem modelo, mesmo com a chave certa cadastrada. Agora, quando não há catálogo para aquele provedor, o campo vira um campo de digitação e aceita o identificador do modelo exatamente como o serviço o nomeia. Com catálogo, nada muda: a lista continua sendo a lista.

- **Áudio pode ser transcrito em outro serviço compatível, sem trocar a chave da conversa** Quem quiser transcrever áudio num serviço diferente do padrão — Groq, um Whisper próprio, qualquer endereço com o mesmo formato de transcrição da OpenAI — agora preenche `TRANSCRIPTION_API_KEY` no `.env`, e opcionalmente `TRANSCRIPTION_BASE_URL` (o endereço do serviço) e `TRANSCRIPTION_MODEL` (o modelo de transcrição). A chave vale só para a transcrição: a conversa com o cliente e a leitura de imagem continuam usando o provedor que já está configurado. Sem essas variáveis, nada muda — a transcrição segue usando a chave da OpenAI, e se ela também não existir, o comportamento é o de hoje, com o aviso na Central e a orientação para cadastrar a chave.

### Corrigido

- **Um aviso de atualização antiga que falhou não trava mais o botão de atualizar** Quando uma atualização feita pela tela falhava e o sistema voltava sozinho para
  a versão anterior, a tela de Atualização passava a mostrar "A atualização para a
  versão … não deu certo", sem o botão de atualizar. Se depois alguém atualizasse
  por outro caminho (o `update.sh` no terminal, por exemplo), o sistema subia
  normalmente, mas o aviso antigo continuava ali. Quando saía uma versão nova, a
  tela mostrava de novo a falha de dias atrás e não oferecia o botão, e o único
  jeito de sair desse aviso era justamente clicar nele. Isso foi medido numa
  instalação real: uma falha de 13/09 impedia atualizar para a 1.27.2 pela tela em
  15/09, com a 1.23.0 já no ar desde 14/09.

  Agora, quando o servidor informa uma versão diferente das duas envolvidas na
  tentativa que falhou, a tela entende que a falha foi superada e volta a oferecer
  a atualização normalmente. Uma falha que ainda é o estado atual do servidor
  continua sendo mostrada como antes, com o comando para voltar.

- **Automação com condição de tag passa a funcionar quando a caixa difere** Numa automação, a condição sobre tags só disparava quando o texto digitado era idêntico à tag, maiúsculas incluídas: a regra escrita para "Google" não rodava para a tag "google", que é exatamente como o Inbox grava toda tag de contato. A regra existia, aparecia ativa na tela e nunca acontecia. Agora a condição compara a tag inteira sem diferenciar maiúsculas — "Google" pega "google" e continua não pegando "Google Ads", que é outra tag. Nada que funcionava antes deixa de funcionar, e nenhuma regra passa a alcançar quem não alcançava. Na tela de regras, o operador desses campos passa a se chamar "tem a tag", que é o que ele faz.

- **Automação por tag do contato deixa de criar lead repetido** Uma regra com gatilho "quando um contato ganhar uma tag" e ação "criar/mover lead no funil" criava um negócio novo toda vez que rodava, mesmo quando o contato já tinha um negócio aberto naquele funil — o contato acabava com vários leads iguais. E as ações seguintes da mesma regra, como "atribuir a um atendente", ficavam sem lead para agir, então a execução aparecia como "Parcial" na aba Atividade. Agora a automação move o negócio que o contato já tem no funil de destino, cria só quando não existe nenhum, e as ações seguintes passam a agir sobre esse lead. Leads criados em duplicidade antes desta versão continuam onde estão. Uma consequência que vale saber: numa regra assim, a ação "adicionar tag" que vier depois passa a etiquetar o NEGÓCIO, não mais o contato — é o efeito de as ações seguintes enxergarem o lead. Crédito: @rafaelbatistazz.

- **Contato que veio de anúncio da Meta pelo número oficial passa a ter a origem do anúncio** Quem clicava num anúncio "Clique para o WhatsApp" e caía num número conectado pela API oficial da Meta ficava com a origem "whatsapp", como se tivesse escrito por conta própria. O anúncio de onde a pessoa veio não era gravado, e a venda desse contato não podia ser devolvida à Meta como conversão. Agora a origem passa a ser o anúncio da Meta, com o clique e o título do anúncio, como o canal intermediado já fazia. Vale para os cliques a partir desta versão: a Meta só envia esses dados na primeira mensagem, então os contatos que já entraram continuam como estão. Crédito: @rafaelbatistazz.

- **O CI volta a medir a instalação em PostgreSQL 17, além do 15** Nada muda na sua VPS: nenhuma variável nova, nenhuma migration, nenhuma imagem. O que muda é o que o pipeline mede antes de a release sair — o gate de banco do CI voltou a rodar nas duas majors do PostgreSQL (15 e 17) e passou a exercitar também o `update.sh` sobre um banco COM DADOS, que é o caso da sua instalação e não o de um banco vazio. Crédito: @webtecnica.

- **A spec do inbox em tempo real volta a medir o que conserta o canal, e não só a tela** Nada muda na sua VPS: nenhuma migration, nenhuma variável, nenhuma imagem. O que muda é o que o teste mede. A spec do inbox em tempo real olhava só a saída — o texto na tela, que chega por dois caminhos por causa do `refetchOnWindowFocus` — e por isso ficava verde com o canal de tempo real mudo. Agora ela assere o que trafega no socket (`phx_join` autenticado e o `postgres_changes` com o corpo da mensagem) e reprova quando o conserto do #327 não está no bundle. Crédito: @webtecnica.

- **A hora na linha da Fila passa a ser a do tempo de espera** Na aba Fila a lista ordena por quem espera resposta há mais tempo, mas a hora mostrada à direita de cada linha era a da última mensagem de qualquer lado: responder uma conversa fazia o horário dela pular para agora sem que ela saísse do lugar, e a coluna de horas saía fora de ordem. Agora a hora na Fila é a da última mensagem do cliente — a mesma que ordena a lista e a mesma que a pílula "Aguardando há…" já usava. Nas demais abas nada muda, e a ordem da Fila continua por tempo de espera, agora com teste que a prende. Crédito: @webtecnica.

- **A resposta da IA não aparece mais duplicada depois de o WhatsApp reconectar** Quando o WhatsApp caía e voltava, as respostas da IA que tinham ficado esperando
  eram reenviadas sozinhas — e a mesma frase podia aparecer duas vezes na conversa.
  O reenvio automático era o único caminho que não apagava a cópia criada pelo eco
  do WhatsApp. Agora ele apaga, do mesmo jeito que o envio normal já fazia.

  Quem usa o motor WEBJS tinha um problema pior no mesmo caminho: a mensagem podia
  ficar presa e ser mandada ao cliente de novo a cada minuto. Isso também foi
  corrigido.

- **Mídia recebida volta a usar o endereço do provedor configurado no ponto** Quando um ponto de IA era apontado para um serviço compatível — um endereço que não é o oficial do provedor, como um gateway interno —, o atendimento pelo chat funcionava, mas as imagens que os clientes enviavam continuavam sendo descritas pelo endereço oficial, e falhavam, porque a chave era daquele outro serviço. A leitura de mídia agora pega o endereço cadastrado no mesmo lugar em que o chat pega, então imagem e conversa usam o mesmo provedor. Quem nunca cadastrou endereço próprio não percebe diferença: vale o padrão do provedor, como antes. A transcrição de áudio não era afetada por este caminho.

  Duas recusas passam a existir nesse caminho, e as duas abrem aviso na Central em vez de falharem em silêncio: se o endereço cadastrado apontar para dentro do próprio servidor (endereço local, rede interna do Docker, metadados da nuvem), a imagem e a chave não saem para lá; e se a empresa tiver endereço próprio cadastrado mas estiver usando a chave de IA da instalação, a leitura é recusada com a instrução de cadastrar a chave da empresa — a chave que paga a conta da instalação inteira não viaja para um endereço escolhido por uma das empresas.

- **O worker passa a dizer se o laço do event_log carregou, e a publicação exige isso antes de marcar stable** Nada muda na sua VPS: nenhuma migration, nenhuma variável, nenhum comando. O `/healthz` do worker passa a publicar um campo a mais (`event_log_drain`, com o motivo quando o laço não carregou) e a falha ao carregar o laço deixa de ser um aviso de rotina para ser erro — era o aviso que fazia um drain parado parecer normal, e foi assim que a fila do `event_log` ficou dez dias sem drenar com o worker respondendo saudável. Do lado da publicação, o CI passa a executar as imagens do worker e do scheduler antes de publicá-las: worker que não sobe ou laço que não carrega não vira a versão `stable` de quem self-hospeda. Crédito: @webtecnica.

- **No Inbox, o botão de tags diz que a tag é do contato** No painel lateral do Inbox, o botão que abre as tags do contato dizia apenas "Tag", enquanto logo abaixo, no mesmo painel, fica a seção "Tags da conversa". Os dois lugares guardam tags diferentes, e quem atende não sabia em qual estava mexendo. Agora o botão se chama "Tags do contato". Nada muda no comportamento. Crédito: @rafaelbatistazz.

- **O provisionamento do Supabase lê as chaves em qualquer ordem e não perde mais a senha do banco** Na instalação, o passo que busca as chaves de API do projeto novo lia a resposta
  da Management API por POSIÇÃO: procurava `anon` e, só no que vinha depois dela,
  `api_key`. Quando a API do Supabase passou a devolver `api_key` antes de `name`,
  a leitura passou a voltar vazia e a instalação morria no passo 5 com "Não
  consegui ler anon/service_role" — num projeto que já estava criado e de pé. A
  leitura agora é por objeto, e a ordem dos campos deixou de importar.

  O estrago maior era o outro lado. A senha do banco é gerada no começo e a API
  não a devolve depois, então quem morria no passo 5 ficava com um projeto
  ocupando uma das duas vagas do plano grátis e sem a credencial à mão. A senha
  passa a ser gravada em `.env.supabase-provision` (só leitura pelo dono, 600)
  antes de o projeto ser criado; quando um passo falha, a mensagem diz onde ela
  está; e uma segunda tentativa reaproveita a mesma senha em vez de gerar outra.

## [1.28.0] — 2026-09-16

### Adicionado

- **O CRM pode reconhecer quem já é cliente pela agenda** Nova regra em Configurações › Tipos de agendamento, desligada em toda organização: quando um administrador liga “Clientes pela agenda”, todo contato com horário marcado ganha a etiqueta “cliente” e a data de “Cliente desde” na ficha — a data do primeiro horário que conta — o dia em que se combinou, ou o dia do atendimento quando ele for mais antigo —, nunca uma data futura —, e quem já tinha horário marcado ganha na hora de ligar. Horário cancelado, falta e horário apagado não contam: se não sobrar nenhum, sai a etiqueta que o sistema pôs, e a que a equipe pôs à mão fica. Se alguém da equipe tirar a etiqueta, ela não volta — e a etiqueta que a equipe puser à mão o sistema nunca tira. As automações “Quando um contato ganhar uma tag” disparam uma vez por contato, na primeira vez que o sistema acrescenta a etiqueta: não disparam para quem já era cliente ao ligar, para quem já tinha a etiqueta posta à mão, nem de novo para quem cancela e marca outra vez, nem ao juntar contatos duplicados. Com a regra ligada, a tela de Funis permite marcar um “funil de clientes”, onde abre o negócio de quem já é cliente e volta a escrever. Atualizar não muda nada em organização nenhuma até alguém ligar a regra. Contribuição de @423313 (PR #867).

### Corrigido

- **O nome do compromisso pessoal da agenda do Google deixa de ficar ao alcance dos colegas** Quem conecta a agenda pessoal do Google ao CRM costuma fazer isso só para os horários ocupados contarem na agenda da equipe. A tela nunca mostrou o nome desses compromissos, mas a permissão do banco deixava qualquer pessoa da organização, inclusive com acesso somente leitura, consultá-lo diretamente com o próprio login.

  Na prática, só havia nome para ler em agendas sincronizadas antes da versão 1.17.0. Desde ela, o serviço que sincroniza com o Google guarda só o horário, sem o nome, e apaga o nome que encontra quando atualiza o evento. O que sobra são compromissos gravados antes disso e que a sincronização não voltou a atualizar: os que já passaram, os cancelados, e os de agendas que ela deixou de ler — desmarcadas, removidas da conta do Google, de quem saiu da equipe ou com a conexão caída. Eles ficam até a limpeza automática removê-los, por padrão 90 dias depois de terminarem.

  Agora nenhum login de usuário lê esse nome — nem os colegas, nem a própria pessoa que conectou a agenda, já que nenhuma tela o exibia. Os horários ocupados continuam contando exatamente como antes. Esta versão não apaga os nomes que sobraram: ela fecha a leitura.

  Continua ao alcance de qualquer pessoa da organização o identificador de cada agenda sincronizada — que, na agenda principal do Google, é o e-mail da conta conectada. Dá para fechar isso sem mudar nenhuma tela — limitando a leitura dessas linhas a quem conectou a agenda e a quem gerencia a equipe, que já vê essa conta —, mas isso muda quem enxerga o quê e não entra nesta correção.

## [1.27.3] — 2026-09-15

### Corrigido

- **O áudio da chamada de voz sai e chega, e o painel some quando a ligação acaba** Quem ligava pelo CRM com o sistema aberto em mais de uma aba, ou em mais de um
  computador, ficava com a ligação muda dos dois lados: cada aba abria o próprio
  áudio, o serviço de voz ficava só com a última, e ela podia ser a aba que
  ninguém estava olhando. Agora o áudio abre só na aba onde você clicou em
  "Chamar" ou "Atender", já no clique. As outras abas avisam que o áudio está em
  outra aba e oferecem trazer para ela.

  Consertos que vinham junto:

  - Quando o cliente desligava, o painel da ligação podia continuar na tela, com
    o botão de encerrar ativo. Agora ele confere com o servidor e some sozinho.
  - O aviso de áudio passou a separar "o áudio não abriu" de "o áudio caiu", cada
    um com um botão para tentar de novo.
  - Clicar duas vezes em encerrar deixou de registrar dois encerramentos, e
    encerrar uma ligação que já tinha acabado não registra mais nada.
  - O canal que atualiza a tela em tempo real voltava de uma queda e, pouco
    depois, caía de novo sozinho. Isso afetava também a caixa de entrada.

## [1.27.2] — 2026-09-15

### Corrigido

- **A chamada de voz pelo WhatsApp liga de verdade depois de parear** Quem pareava o número de chamada de voz e clicava em "Chamar" recebia "Não foi
  possível completar a chamada. Tente novamente em instantes." e continuava
  recebendo, mesmo com o número pareado, até alguém reiniciar o serviço de voz. O
  pareamento pedia ao serviço para "re-parear" logo depois de criar a sessão, e
  isso deixava a ligação presa a uma conexão já descartada. Agora o pareamento
  cria a sessão uma vez só, e o código QR chega do mesmo jeito.

  Consertos que vinham no mesmo caminho:

  - Celulares brasileiros que o WhatsApp registrou sem o nono dígito eram
    discados com ele, e o telefone do outro lado nunca tocava: a tela ficava em
    "Chamando…" até desistir. O CRM agora pergunta ao WhatsApp qual é o número
    registrado antes de ligar.
  - A ligação feita pelo CRM era registrada como recebida. A que o cliente não
    atendia virava um aviso de "chamada perdida" na Central, pedindo para ligar
    de volta a quem você acabou de ligar. Agora ela aparece na linha do tempo
    como "Chamada de voz sem resposta", sem aviso.
  - Ao começar a ligação, a tela às vezes mostrava um erro enquanto o telefone
    do outro lado já tocava, e o painel da ligação podia sumir.
  - Desvincular o aparelho pelo celular deixava a tela dizendo "pareado" para
    sempre. Agora ela volta a "não pareado" e dá para parear de novo.
  - Clicar em "Parear" de novo, com o aparelho recém-vinculado e a tela ainda
    desatualizada, podia desconectar o aparelho. Agora o CRM confere com o
    serviço de voz antes de apagar qualquer coisa.
  - Desconectar o número quando o serviço de voz já tinha perdido a sessão dava
    erro sem fim. Agora desconecta.
  - O código QR que vencia continuava na tela sem funcionar. Agora a tela avisa
    que venceu e libera o botão para gerar outro.

## [1.27.1] — 2026-09-15

### Corrigido

- **O dia bloqueado também vale para o horário da noite** Em agendas com fuso diferente de UTC — no Brasil, os horários da noite —, a folga ou o feriado cadastrado para um dia não barrava o horário perto da virada: a lista de horários livres o oferecia, e a IA conseguia marcá-lo. As exceções de data passam a ser buscadas pelo dia local da jornada, e não pelo dia UTC do horário pedido — o mesmo dia que a lista de horários pergunta. A tela, a IA e a conferência da marcação feita pela IA usam a mesma leitura, então mudam juntas. O encaixe que uma pessoa marca fora da lista continua dispensando a exceção de data, como antes.

- **A ocupação do Google Agenda vale para quem marca na agenda de outra pessoa** Um Atendente que marca na agenda de outra pessoa passa a conferir a ocupação contra o Google Agenda dela, e não só contra os compromissos do sistema. Antes, a conexão de Google do dono não era visível para o Atendente, e com ela sumiam os compromissos pessoais do dono: a lista de horários livres os oferecia e a marcação era aceita por cima deles, tanto no horário da lista quanto no encaixe fora dela. A tela e a recusa dizem só ocupado ou livre; para conferir, o sistema lê o início e o fim de cada compromisso do Google de quem atende, nunca o título ou o conteúdo do evento. A grade da agenda ainda não desenha esses compromissos para o Atendente; quando ele escolhe um desses horários, a recusa avisa que o horário já está ocupado na agenda de quem atende.

## [1.27.0] — 2026-09-15

### Adicionado

- **Processamento que para de tentar agora aparece na Central de avisos** Quando um processamento em segundo plano falha cinco vezes e o sistema desiste dele — ler uma foto ou um áudio que o cliente mandou, rodar uma automação, preparar um material da base de conhecimento, ou fazer a IA responder uma mensagem de cliente —, a Central de avisos passa a receber um alerta crítico com o tipo do processamento e o motivo da falha. Antes isso acontecia em silêncio: o efeito não ocorria e nada indicava o problema em nenhuma tela. Quando o que não aconteceu foi a resposta da IA, o aviso tem título próprio ("A IA deixou de responder uma mensagem de cliente") e orienta a responder pelo Inbox. Para uma pane não inundar a Central, cada organização tem no máximo dois desses avisos abertos por vez — um para a IA que deixou de responder e um para os demais processamentos —, e um não esconde o outro: o aviso aberto de uma foto que não pôde ser lida não impede o da IA de aparecer. Depois de corrigir a causa, marque o aviso como resolvido para voltar a ser avisado.

### Alterado

- **Três índices redundantes saem do banco** O banco mantinha três índices cujo trabalho já era feito por outro índice da mesma tabela. Eles cobravam o preço em toda gravação e ocupavam espaço em disco. Foram removidos na atualização. As buscas que os usavam continuam atendidas por índice — o maior, da mesma tabela — e nenhuma proteção contra duplicidade foi perdida.

### Corrigido

- **Automações da Agenda voltam a disparar quando alguém marca ou confirma pela tela** Quando uma pessoa da equipe marcava, confirmava, remarcava ou cancelava um compromisso pela tela da Agenda, o compromisso era gravado normalmente, mas as automações ligadas a esses momentos — por exemplo "quando um agendamento for confirmado, avise o cliente" — não rodavam. O aviso para as regras era recusado pelo banco sem nada aparecer na tela. Agora ele é registrado pelo mesmo caminho que o resto do sistema usa, e as regras da Agenda disparam também para o que é feito pela equipe. Os compromissos marcados pelo assistente de IA não eram afetados.

- **O registro de auditoria não pode mais ser alterado nem apagado pela chave de serviço** Num projeto Supabase, a tabela de auditoria herdava do próprio Supabase a permissão de alterar, apagar e esvaziar registros — inclusive pela chave de serviço, que ignora as regras de acesso por organização. Na prática, quem tivesse essa chave conseguia apagar ou reescrever um registro escolhido da auditoria. Essas permissões foram removidas: a auditoria agora só recebe registros novos e é lida. A limpeza legítima, que apaga apenas registros mais antigos que o prazo de retenção configurado, continua funcionando como antes.

- **A falha ao atualizar a conversa depois de uma mensagem passa a ficar registrada nos três canais** Quando uma mensagem é gravada e a atualização da conversa falha logo em seguida, a mensagem existe, mas a conversa não sobe na lista do Inbox e, no canal oficial, a janela de resposta de 24 horas não abre. No canal oficial essa falha não era registrada em lugar nenhum; no canal intermediado ficava só no log do servidor, que se perde quando ele reinicia. Agora os três canais gravam a ocorrência no registro de eventos do banco, com a conversa, o sentido da mensagem e o motivo. Nenhuma tela mostra esse registro ainda: ele serve para quem investiga uma conversa que ficou para trás. O texto da mensagem do cliente não é copiado para ele.

- **Foto ou áudio que o provedor de IA recusou passa a abrir aviso na Central** O aviso "O agente não conseguiu ler uma foto ou áudio que o cliente enviou" já aparecia na Central quando o modelo escolhido não enxerga imagens, quando o provedor não está disponível nesta instalação ou quando falta a chave para transcrever áudio. Quando a falha vinha da própria chamada ao provedor — chave recusada, modelo que a conta não pode usar, tempo esgotado — ou do download do arquivo, o sistema tentava cinco vezes e desistia sem avisar ninguém. Agora essa desistência abre o mesmo aviso, com a frase de erro do provedor, que diferencia chave errada de modelo não liberado. No mesmo momento a Central recebe também o aviso de processamento que parou de tentar, se não houver um desses já aberto; numa pane, fica no máximo um de cada aberto por organização. Esses avisos não escondem o de que a IA deixou de responder um cliente, que abre por conta própria.

## [1.26.0] — 2026-09-15

### Adicionado

- **Quem opera a agenda agora pode confirmar um pedido de horário pela tela** Na agenda, a aba "Aguardando confirmação" e o painel de detalhe do compromisso ganharam o botão Confirmar. Em negócios que exigem aprovação de cada horário, o pedido que o assistente reservou só virava compromisso se o cliente respondesse no WhatsApp — caso contrário o prazo vencia e a reserva era cancelada automaticamente. Agora a decisão pode ser tomada por quem atende, com um clique.

- **O App da Meta passa a ser cadastrado pela tela de administração, sem editar o servidor** Para receber mensagens pelo número oficial da Meta, era preciso abrir o arquivo de configuração do servidor e escrever lá a chave secreta do aplicativo e um código de confirmação inventado por quem instalou.

  Agora quem administra a instalação faz isso em **Admin › API Oficial (Meta)**: cola a chave secreta do aplicativo e o sistema gera sozinho o token de verificação, mostrado uma única vez, pronto para copiar para o painel da Meta. A chave fica guardada cifrada e nunca volta a aparecer. Se o token se perder, dá para gerar outro na mesma tela — ela avisa antes que o novo precisa ser colado na Meta.

  A tela de Conexões e o primeiro acesso passam a apontar para esse lugar, em vez de mandar configurar o servidor.

  Você não precisa fazer nada. Quem já tem a chave e o token no arquivo de configuração continua funcionando como está: o arquivo segue valendo como reserva, e só deixa de ser usado quando alguém salvar pela tela.

  A guarda da credencial na instalação é contribuição de @webtecnica.

- **A agenda aceita encaixe fora da grade quando quem marca é da equipe** O sistema oferece horários numa grade fixa: a partir do começo de cada faixa do
  expediente, de duração em duração. Isso vale para o que o assistente oferece ao
  cliente — mas quem atende precisa poder marcar o que combinou por fora dela: o
  cliente que só pode 10:30, o encaixe, o atendimento que começa mais cedo.

  Antes, o servidor recusava todo horário fora da grade, viesse de quem viesse, e a
  saída era mudar o horário do cliente para caber numa régua interna.

  Agora, quando quem marca é **uma pessoa da equipe logada no sistema**, o servidor
  aceita horário fora da grade, até fora do expediente, desde que o responsável já
  tenha publicado seus horários de atendimento.

  Na tela, isso fica em **Agenda › Novo agendamento**: depois de escolher o dia, abaixo
  dos horários dele aparece **"Outro horário"**. A pessoa digita a hora e segue para a
  mesma confirmação de sempre. O dia sem nenhum horário publicado (um domingo, por
  exemplo) também pode ser escolhido — de hoje em diante, nos meses que o calendário
  do painel deixa abrir —, e ali o campo de hora já abre direto. A hora digitada vale
  no fuso que o painel mostra ("Horários no fuso …"). **Remarcar**, na lista de
  compromissos, abre o mesmo painel e tem a mesma opção.

  "Outro horário" não aparece para quem tem o papel **Somente leitura**, que não pode
  marcar, nem enquanto o responsável não publicou seus horários. Clicar num horário
  vazio da grade e arrastar um compromisso continuam oferecendo só os horários da
  grade.

  O assistente e as integrações por token não ganham o encaixe: para eles o horário
  continua tendo de ser um da grade do expediente, respeitando a antecedência mínima
  e a janela de reserva do tipo.

  Para os dois, o sistema recusa marcar em cima de outro agendamento do mesmo
  responsável (cancelado ou falta não contam), ou de um evento do Google Agenda dele
  numa agenda marcada como "Conta como ocupado" (evento marcado como "Disponível" no
  Google não conta). Quando a recusa acontece pelo painel, o motivo aparece logo acima
  do botão Confirmar, o painel continua aberto e, no encaixe, a hora digitada continua
  no campo. A conferência do Google tem dois limites.

  O primeiro: ela só conhece o que a sincronização já trouxe, que vai de um dia atrás
  até cerca de 90 dias à frente. Marcar depois desse período, ou em cima de um evento
  criado no Google e ainda não sincronizado, passa. Para períodos fora da
  sincronização, a tela de horários avisa "Ocupação do Google ainda não verificada
  neste período."

  O segundo: uma pessoa com papel de Atendente, marcando na agenda de outra pessoa,
  não enxerga o Google Agenda dela, e a marcação passa. O próprio responsável,
  gerentes e administradores enxergam.

### Alterado

- **A versão da Graph API passa a morar num lugar só** A versão da Graph API com que a instalação fala (hoje `v22.0`) deixa de estar copiada à mão em dez arquivos de produção e passa a viver num só, com uma catraca que reprova a suíte se alguém escrever a versão à mão em qualquer outro arquivo. Nada muda para quem opera: a instalação continua falando `v22.0`, e `META_GRAPH_VERSION` continua mandando quando existe — inclusive quando ela está preenchida com espaço ou vazia, que antes virava URL sem versão. O que muda é o dia do bump: subir de versão passa a ser uma edição deliberada num arquivo, em vez de dez edições com uma esquecível.

  Crédito: @webtecnica.

### Corrigido

- **Sincronizar modelos e enviar modelo usam a credencial salva na tela do canal** O envio de texto do canal oficial já resolvia a credencial da conexão (sessão primeiro, ambiente como reserva). O caminho do MODELO não: tanto o POST de `/api/v1/channels/templates` quanto o envio de modelo liam `META_SYSTEM_USER_TOKEN` e `META_PHONE_NUMBER_ID` do `.env`. Numa instalação que conectou o número pela tela, "Sincronizar modelos" respondia **400 `missing_meta_token`** para quem tinha a credencial salva e visível na própria tela, e o segundo número oficial da instalação não sincronizava nem enviava um modelo — logo o modelo, que é o que a janela fechada exige.

  Agora os dois caminhos resolvem pela sessão, com o ambiente só como reserva, pela mesma porta que o resto do canal usa. A ordem dos desfechos não muda: sem canal oficial a resposta continua `no_meta_channel`, e sem credencial nenhuma (nem na sessão, nem no ambiente) continua `missing_meta_token` e o envio segue o desfecho de "canal não conectado" (`meta_not_configured`, recuperável) em vez de virar falha.

  Nada muda para quem só tem o ambiente: a instalação continua sincronizando e enviando pelo `.env` como antes.

- **O botão Confirmar do painel de marcação volta a aparecer em telas de notebook** Em telas de notebook comuns, o painel de **Agenda › Novo agendamento** (e o de
  **Remarcar**) cortava a parte de baixo sem mostrar barra de rolagem. Depois de
  escolher o horário, o botão **Confirmar** ficava fora da área visível: inteiro
  escondido em 1280×800 e 1366×768, e cortado ao meio em 1440×900. Não havia como
  clicar nele com o mouse.

  Agora a coluna do calendário rola por conta própria quando não cabe, e escolher um
  horário leva a confirmação até a vista. O contexto à esquerda e a lista de horários
  à direita ficam parados, e em telas grandes e no celular nada muda.

- **Cadastrar um contato com telefone já usado explica o motivo, em vez de "Erro interno"** Criar pela tela um contato cujo telefone já pertencia a outro contato da mesma organização
  terminava num aviso de "Erro interno. Tente de novo em instantes." — e tentar de novo dava o
  mesmo erro, porque não havia nada de errado com o servidor: o telefone já estava em uso.

  Agora o aviso diz o que aconteceu: "Já existe um contato com este telefone." (em espanhol,
  "Ya existe un contacto con este teléfono."). O cadastro continua recusado, como antes; o que
  muda é a explicação.

  Por baixo, a resposta de `POST /api/v1/contacts` passou de 500 para 409, com o código
  `contact_exists` e o id do contato que já usa o telefone em `details.contact_id`. Por
  enquanto nenhuma tela usa esse id — ela só mostra a frase —, e essa rota aceita apenas a
  sessão de quem está logado, não token de integração. O e-mail e o CPF também não podem se
  repetir nessa tabela, e o 409 só sai quando já existe um contato ativo com aquele telefone:
  qualquer outra recusa continua como antes.

  Você não precisa fazer nada.

  Achado e corrigido por @webtecnica.

## [1.25.1] — 2026-09-15

### Corrigido

- **A agenda para de chamar de falha do servidor o erro de quem chamou errado** A listagem da agenda respondia "erro do servidor" para toda recusa que não fosse
  "falta um recorte". O caso que apareceu na prática é o id de um CONTATO enviado
  no lugar do id de um negócio — a mesma troca que a #509 mediu. A consulta era
  recusada corretamente, mas a resposta dizia que o problema era do servidor: a
  tela tratava como falha nossa, e o monitoramento de erros contava como incidente
  uma requisição que só estava com o parâmetro trocado.

  Agora essa recusa sai como erro de quem chamou, com um código próprio que diz que
  o id mandado não é um negócio do funil e que a correção é usar o do contato. O
  "erro do servidor" fica reservado para o que é falha de verdade, com teste que
  atravessa a rota para separar os dois.

  Você não precisa fazer nada.

  Achado e corrigido por @webtecnica.

- **Atualizar o CRM deixa de desligar os lembretes** Toda atualização desligava o lembrete de todos os tipos de agendamento em que
  alguém o tinha ligado. Sem erro e sem aviso: a tela mostrava o controle
  desmarcado como se ninguém o tivesse marcado, e o cliente deixava de receber o
  aviso do compromisso.

  A correção de histórico que fazia isso era certa quando foi escrita, numa época
  em que nada lia esse campo — só que ela voltava a ser aplicada a cada
  atualização, e o disparador nasceu no meio do caminho. Agora ela roda uma vez
  por banco e para de reescrever a sua escolha.

  **Se você já usou lembretes, confira se continuam ligados** em Configurações ›
  Agenda, no campo "Avisar o cliente antes do compromisso". Uma atualização
  anterior pode tê-los desligado, e esta versão não religa sozinha: religar por
  conta própria mandaria mensagem para clientes de quem desligou de propósito.

- **A IA deixa de afirmar o tamanho de um catálogo que não mediu** Quando a varredura do catálogo era cortada e a loja não informava o total, a resposta ao
  cliente saía com o número `null` no meio da frase — o agente dizia "o catálogo desta loja
  tem null". Era uma afirmação sobre um tamanho que ninguém mediu, justamente no lugar onde a
  regra é declarar a dúvida.

  O mesmo valia para a lista vazia: "não encontrei" podia ser ouvido como "a loja não tem",
  quando o que houve foi uma varredura que não chegou ao fim. Lista vazia só é ausência quando
  a varredura terminou.

  Agora o tamanho medido continua sendo dito — é ele que explica o corte a quem opera — e o que
  não foi medido é dito como desconhecido. Nada muda no que o operador precisa fazer: as mesmas
  ferramentas respondem, e a regra de não afirmar ausência sem varredura completa já valia.

- **Três mensagens seguidas deixam de virar três negócios** Quando alguém escrevia várias mensagens em sequência — "oi", "tudo bem?",
  "queria marcar" —, cada uma podia abrir um negócio novo no funil. O mesmo
  cliente aparecia duas ou três vezes, tudo no mesmo minuto, e quem organiza a
  fila tinha que limpar à mão.

  Agora a entrada é serializada por cliente: a segunda mensagem encontra o card
  que a primeira criou, em vez de criar outro.

  Continua possível ter mais de um negócio aberto para o mesmo cliente quando é
  você quem cria — o que mudou vale só para o card que o sistema abre sozinho.

- **Integração com token de servidor volta a conseguir escrever** Um token de servidor sem escopo de agente era tratado como se fosse uma pessoa
  logada, e o sistema tentava anotar o token como "quem fez". O banco recusava,
  porque token não é gente — então mandar mensagem ou marcar compromisso por
  token respondia **erro interno**, sem pista do motivo.

  Agora o token é reconhecido como integração, e essas escritas voltam a
  funcionar. Se você tem um sistema ligado por token, três coisas passam a valer
  para ele junto com isso:

  **O envio por token respeita o modo de teste do canal.** Enquanto o número
  estiver em teste, só os números da lista de teste recebem; para os outros a
  mensagem fica como falha, com o motivo "modo de teste do canal". É a mesma
  regra que já valia para a IA e para as automações. Para liberar, abra
  "Configurar acesso da IA" no número, em Conexões, e deixe-o como "IA aberta ao
  público".

  **Comparecimento e falta continuam sendo registrados pela equipe.** Por token, a
  API recusa com o pedido de confirmação humana na Agenda, em vez de devolver um
  erro genérico.

  **Mensagem enviada por token não pausa a IA** na conversa, ao contrário da
  resposta de um atendente pela tela.

  Token de agente de IA nunca foi afetado, e continua igual.

## [1.25.0] — 2026-09-15

### Adicionado

- **O aniversário do contato pode disparar uma automação** A data de nascimento já aparecia na ficha do contato e não acionava nada: para
  parabenizar alguém era preciso descobrir sozinho quem fazia aniversário.

  Em Automações, o gatilho "No aniversário de um contato" já pode ser escolhido, e
  a ação de mandar WhatsApp é a mesma das outras regras. A mensagem sai às 9h no
  fuso da organização, uma vez por pessoa, e só para quem configurou a regra.

- **A instalação pode aceitar só quem foi convidado** Em **Admin › Cadastro** há um interruptor novo: **cadastro apenas por convite**. Ligado, `/signup` deixa de aceitar quem chega sem convite — e quem chega com um convite válido entra igual.

  **Nada muda para quem não ligar.** O padrão é o comportamento de sempre: qualquer pessoa cria conta e abre a própria empresa. Instalações que já existem não precisam fazer nada.

  **Por que isto é do produto, e não do proxy.** Fechar `/signup` no nginx era a única saída até aqui, e ela erra por construção: proxy não sabe o que é um convite. Medido numa instalação real em 2026-09-10 — a regra que bloqueava `/signup` bloqueou junto o `/signup?invite=…`, ou seja, exatamente quem deveria passar, e o convidado ficou sem conseguir entrar.

  **A recusa tem tela.** Quem abre o cadastro sem convite numa instalação fechada vê uma página com a marca e o idioma da instalação, explicando que o acesso é por convite e oferecendo o login — não um `403 Forbidden` cru do servidor.

  **Fecha nas quatro portas, não só na tela.** A tela é adulterável e a server action é chamável direto, então a recusa acontece também em `signUp()`, em `/auth/confirm` (que é quem provisiona a organização, e pega inclusive conta nascida fora da tela) e na recuperação de organização. Uma porta só seria outro capacho.

  **Se o banco parar de responder, a instalação fechada continua fechada.** A leitura guarda o último valor conhecido em vez de cair no padrão — senão um soluço do banco reabriria o cadastro sem ninguém ver. E instalação que ainda não aplicou esta versão do schema continua aberta, como sempre esteve.

- **Automação externa agora consegue abrir a primeira conversa com um cliente novo** Até aqui, uma automação de prospecção (por exemplo, um fluxo que acabou de captar um lead) não
  tinha como abrir a primeira conversa com esse cliente pela chave de integração: só dava para
  mandar mensagem numa conversa que já existia. Agora existe uma nova capacidade de integração
  ("Iniciar conversa com cliente novo e enviar mensagem") que cadastra o cliente se precisar, abre
  a conversa no número de WhatsApp escolhido — o próprio fluxo decide qual, em vez de o sistema
  escolher sozinho — e manda a primeira mensagem. Crédito: @hamiltonviana.

- **O lembrete de compromisso pode avisar mais de uma vez** Um tipo de agendamento tinha um lembrete só. Quem queria avisar o cliente com um
  dia de antecedência **e de novo poucas horas antes** não tinha como: ligar o
  segundo aviso exigiria apagar o primeiro.

  Em Configurações › Agenda, cada tipo ganhou o campo "E de novo, quantos minutos
  antes", que aceita até três avisos adicionais. Vazio é o comportamento de
  sempre, um lembrete só — nada muda para quem não mexer no campo.

### Corrigido

- **O acompanhamento que já encerrou deixa de derrubar o banco** O banco da instalação podia ir a 100% de processador sem ninguém usando o produto. A causa era um acompanhamento (follow-up) que já tinha acabado: o sistema tentava atualizá-lo, o banco recusava, e o recuso era do tipo que o próprio banco pede "tente de novo". Ele tentava de novo — milhares de vezes por minuto — e o processador não saía do teto.

  Isso não muda tela, fluxo nem configuração. Na próxima atualização o recuso deixa de pedir retry, e o banco volta a respirar.

  Nada para fazer na VPS além de atualizar quando o aviso aparecer.

- **O primeiro pareamento de chamada de voz recebe o código QR** Com o serviço de voz configurado, a tela prepara a sessão antes de abrir a conexão de eventos e pedir o QR. A conexão do pareamento e a ponte que acompanha as chamadas passam a enviar a credencial já usada nas demais operações. Falhas ao receber o código aparecem na tela e permitem tentar novamente.

## [1.24.0] — 2026-09-14

### Adicionado

- **Você passa a ver, por cliente, qual agente está publicado** Se você administra a instalação, agora dá para saber se cada cliente está sendo atendido sem abrir cliente por cliente: a tela de Uso ganhou a coluna com o agente publicado (e o mesmo campo no CSV), e cada cliente ganhou a aba **Agente**, com a versão que o motor executa, o provedor e o modelo. A leitura fica registrada na auditoria com o seu usuário e a organização visitada. Nada precisa ser feito na VPS. Crédito: @jostoz.

### Corrigido

- **O agente para de dizer que a mensagem veio vazia quando ela tem texto** Quando chegava um áudio ou uma foto sem legenda, o agente lia a coluna crua da
  mensagem e recebia o corpo vazio — mesmo com a transcrição já gravada e o texto
  à vista na tela da conversa. Com isso ele respondia ao cliente dizendo que a
  mensagem tinha vindo em branco, e a trava que impede exatamente essa frase
  ficava desarmada, porque aos olhos dele não havia texto nenhum. Agora a
  mensagem que acorda o agente é lida pela mesma função que monta o histórico da
  conversa: com texto, com transcrição ou com o marcador da mídia, ele nunca mais
  anuncia vazio.

  Achado e corrigido por @webtecnica.

- **O hub de IA respeita o idioma escolhido** Ao abrir a área de IA em espanhol, títulos, seções e descrições agora acompanham o idioma escolhido em vez de aparecerem em português. Crédito: @alexneverland.

- **Grafo corrompido deixa de passar no schema** O schema do fluxo validava cada nó e cada aresta isoladamente, então um grafo corrompido passava no salvamento: aresta apontando para nó que não existe mais (o estrago que o editor produz ao excluir um nó), dois nós com o mesmo id e duas arestas com o mesmo id. O `flowGraphSchema` agora tem uma catraca de integridade que rejeita os três casos com mensagem explícita dizendo o id a corrigir — `aresta "e-3" aponta para nó inexistente: "no-9"`, `id de nó repetido: "no-1"`, `id de aresta repetido: "e-2"`.

  Esses grafos só quebravam longe do defeito: no meio de um disparo, quando uma aresta não resolvia para nó nenhum. Como salvar o rascunho e carregar a versão usam a mesma porta, o erro passa a aparecer na hora de salvar, com o id na mensagem, em vez de virar um caso de suporte.

  Quem já tem rascunho corrompido passa a ver o erro ao abrir e salvar o fluxo e precisa corrigir a aresta — não há migração automática, decisão registrada na issue #699. Grafo íntegro e campo desconhecido seguem como antes, com controle nos testes.

- **Material .txt e .md salvo no Windows entra na base de conhecimento sem mojibake** Arquivo de texto salvo no Bloco de Notas — que grava em cp1252 (ANSI) por padrão, e é assim que quem monta a base de conhecimento no Windows escreve os `.txt` e `.md` — entrava no conhecimento do agente com cada acento virando U+FFFD — "Ação" entrava como "A��o". Não dava erro, não dava aviso: o material aparecia como pronto na tela, o índice era construído, e o agente passava a citar o texto corrompido para o cliente.

  Agora a leitura dos bytes usa a mesma decisão de codificação que a importação de planilhas já usava (lê como UTF-8 e só troca para windows-1252 quando o arquivo prova não ser UTF-8), e material que não é texto — um `.xlsx` renomeado para `.md`, ou um `.txt` salvo como "Unicode" (UTF-16) — é recusado no envio com uma frase dizendo o que fazer, em vez de entrar como lixo. Material que já era UTF-8 entra exatamente como antes.

- **O canal não volta sozinho para o modo de teste depois de aberto ao público** O modo de acesso da IA de um canal mora em três chaves de metadata: uma diz se o
  canal está aberto, em allowlist por origem ou em lista de testadores; outra diz
  se ele está em pré-go-live. Ao abrir o canal ao público, a segunda chave era
  gravada sempre com o mesmo valor — "em teste" — mesmo quando o canal já não
  estava em teste. Sozinha, a chave errada não mudava nada. Na volta, sim: o script
  que liga o allowlist POR ORIGEM gravava só a primeira chave, então o canal
  reaparecia em modo de teste com a lista de testadores antiga, em vez de atender
  quem tem autorização por origem. A IA parava de responder a quem deveria atender
  sem erro nenhum na tela, e o próprio simulador do script prometia que o contato
  seria atendido.

  Agora as duas chaves andam juntas nas duas pontas: abrir ao público tira o canal
  do teste, e o script escreve o alvo nos dois campos — recusando a gravação se o
  motor continuaria lendo modo de teste. O simulador do script passou a prometer o
  mesmo veredito que o motor executa.

  Canais que hoje estão abertos com a chave velha continuam abertos: ela sai na
  próxima gravação da tela ou do script. Você não precisa fazer nada para adotar.

  Achado e corrigido por @webtecnica.

## [1.23.0] — 2026-09-14

### Adicionado

- **A navegação responde na hora, e a atualização para quando o backup falha** Clicar numa aba do menu deixou de parecer que a tela travou. Uma barra fina
  aparece no topo no instante do clique e acompanha o carregamento, então você
  sabe que o sistema ouviu — antes, entre o clique e a página aparecer não havia
  sinal nenhum, e a reação natural era clicar de novo.

  As telas de dentro do sistema também abrem mais rápido: as consultas que toda
  página precisa fazer (quem é você, de qual empresa, quais conexões estão fora do
  ar) passaram a ser feitas ao mesmo tempo em vez de uma esperando a outra, e
  deixaram de ser repetidas dentro da mesma página. No banco, as buscas de
  histórico por contato e por conexão ganharam índices — quem tem muita mensagem
  guardada sente a diferença nas telas de conversa e no expurgo de dados da LGPD.

  O `update.sh` ficou mais cuidadoso com os seus dados. Quando o backup preventivo
  falha, a atualização agora PARA: se você estiver acompanhando pelo terminal, ela
  pergunta e só segue se você digitar `CONTINUAR`; se for o agente do servidor
  atualizando sozinho, ela cancela e avisa. Antes ela esperava oito segundos e
  seguia sem backup. O `restore.sh` passou a devolver também as sessões do
  WhatsApp guardadas no backup, não só o banco — restaurar deixou de exigir parear
  o QR Code de novo.

  E duas portas ficaram mais firmes: subir imagem para cabeçalho de modelo do
  WhatsApp agora confere o conteúdo do arquivo, não o rótulo que o navegador
  mandou (um SVG renomeado para `.png` entrava e agora é recusado), e passou a
  exigir permissão de atendente; as rotas internas de manutenção comparam a senha
  de acesso em tempo constante.

  Contribuição de @maugarciasa.

- **As automações agora enxergam a agenda** O motor de automações já sabia mandar WhatsApp, esperar, checar condição e
  registrar o que fez. O que ele não enxergava era a agenda: nenhum dos gatilhos
  disponíveis vinha de um horário marcado. Quem queria avisar a cliente que o
  horário foi confirmado tinha o motor, tinha o envio, e não tinha o fato.

  Quatro gatilhos novos aparecem no seletor de automações:

  - Quando um horário for marcado
  - Quando um horário pendente for confirmado
  - Quando um horário for remarcado
  - Quando um horário for cancelado

  As condições podem filtrar pelo tipo de atendimento (com "contém", então
  "Manutenção" pega todas as manutenções) e pelas tags do contato. As ações são as
  mesmas de sempre, a de mandar mensagem no WhatsApp inclusive.

  Quem já tem automações não precisa fazer nada: as regras existentes continuam
  como estavam.

- **Outro sistema já pode enviar mensagem pelo seu WhatsApp, usando um token** Até agora, enviar uma mensagem pela API exigia estar logado no navegador. Um
  sistema externo não conseguia, mesmo com um token válido: a porta respondia
  "não autenticado" antes de olhar o token.

  Enviar uma mensagem e abrir uma conversa a partir de um telefone passam a
  aceitar também um token de servidor, o mesmo que já era usado para consultar
  contatos. A organização continua saindo do token, nunca do que foi enviado no
  pedido, então um token de uma empresa não alcança a conversa de outra. Token
  de leitura continua sem poder enviar.

  Quem usa o sistema pela tela não vê diferença nenhuma.

- **O atendimento aberto pelo assistente diz do que trata** Na lista de atendimentos, cada item agora começa dizendo o assunto: horário,
  dúvida, algo deu errado, pagamento, acesso. O assistente classifica ao abrir.

  Serve para quem abre a fila separar antes de ler — "alguém quer marcar horário"
  e "alguém está reclamando" pedem pessoas e pressas diferentes.

  A lista de assuntos é curta de propósito. O detalhe do pedido continua no título
  e no resumo, escritos com as palavras do próprio cliente; o assunto é só para
  triar.

  Atendimentos abertos antes desta versão aparecem como "Outro".

- **O pedido que ninguém confirmou solta o horário** Quando um tipo de atendimento pede confirmação, o pedido do cliente já reserva o
  horário: ele some da lista de horários livres e ninguém mais consegue marcar ali.
  É o que faz o modo "o cliente pede, uma pessoa confirma" funcionar.

  Faltava o outro lado disso. Um pedido que ninguém abriu segurava a agenda para
  sempre, e o efeito era igualzinho ao de agenda cheia: o próximo cliente ouvia
  "não tenho horário" por causa de um pedido esquecido.

  Agora existe um prazo. Passado ele sem decisão, o horário volta a ser oferecido.
  O padrão é 24 horas, e dá para mudar em Agenda, no mesmo lugar dos outros prazos.

  Duas coisas que **não** acontecem quando o prazo vence: o cliente não recebe
  nenhum aviso, e o pedido dele continua na fila para ser atendido. O que expira é
  a reserva do horário, não o pedido.

### Corrigido

- **"Novo agendamento" deixa de vir com o cliente da vez anterior, e a lista de horários volta a rolar** Duas coisas na tela de agendamento, medidas numa instalação real.

  **O compromisso podia nascer no nome da pessoa errada.** Quem abrisse "Marcar compromisso" de dentro de uma conversa e depois fosse à **Agenda pelo menu** encontrava o campo **Quem será atendido** já preenchido com aquele cliente. O campo parece preenchido de propósito; não há o que estranhar na tela. Agora o painel abre com o cliente que a **página** carrega: vindo do menu, ele abre em **"Compromisso pessoal, sem cliente"**; vindo do link da conversa, ele continua abrindo com aquele cliente, mesmo que você feche o painel para navegar o calendário até a semana certa.

  **A lista de horários voltou a rolar.** Numa correção anterior, o painel perdeu o limite de altura para que a janela parasse de **cortar os botões** em telas baixas — e, sem limite, a lista de horários passou a crescer sem fim: um tipo de 45 minutos rende treze horários e uma janela maior que a tela. Agora a lista tem limite próprio, proporcional à altura da janela, e rola dentro de si em telas de computador. No celular nada muda: quem rola continua sendo a janela inteira.

  Nada muda para quem opera: sem passo manual, sem mexer em configuração.

- **A agenda no celular abre no dia, e dá para criar cliente sem sair da marcação** Quem abre a agenda no celular via a semana inteira espremida: sete colunas em
  uma tela de 360 pixels davam cerca de 44 pixels por dia, e errar o toque era o
  normal. Agora o celular abre no dia, com a coluna ocupando a tela toda — o alvo
  do toque ficou quase cinco vezes mais largo. No computador nada muda: a semana
  continua inteira.

  Duas coisas que não funcionavam passam a funcionar:

  Tocar num compromisso abre o detalhe dele. Antes o toque não fazia nada, e só
  dava para abrir vindo do histórico ou do radar.

  Quando você busca um cliente que ainda não está cadastrado, aparece um "Criar"
  com o nome que você digitou. O cadastro abre ali mesmo e o cliente volta já
  escolhido. Antes era preciso abandonar a marcação, ir até Contatos, cadastrar,
  voltar e começar de novo.

- **Token de servidor não alcança mais a conversa de outra empresa** A porta de saída de mensagem do sistema conferia só o número da conversa, nunca
  a empresa dona dela. Para quem envia pela tela isso nunca foi problema: o banco
  já filtra por empresa nesse caminho. Mas quem envia por token de servidor — o
  agente de IA por MCP, e agora as integrações — entra por um caminho em que esse
  filtro do banco não existe, e o único cuidado possível é o do próprio sistema.
  Ele faltava.

  Na prática: um token de uma empresa, com o número de uma conversa de outra,
  gravava e disparava a mensagem pelo WhatsApp da segunda. Agora a conversa de
  outra empresa responde "não encontrada", e nada é gravado.

  Quem usa o sistema pela tela não vê diferença nenhuma.

- **Gravar espera o servidor em vez de dizer "Erro inesperado"** Ação que grava e passava de 10 segundos virava "Erro inesperado" na tela
  enquanto o servidor terminava e gravava. Agora espera 30. Leitura segue em 10.

- **O sistema não fica mais preso em "Algo deu errado" quando o Supabase repete requisições antigas** Uma instalação inteira ficou dois dias mostrando "Algo deu errado" em todas as
  telas. O banco estava saudável; o que travou foi a camada de API do Supabase: o
  gateway dela repetia sem parar oito requisições antigas do motor de follow-up
  que terminavam em erro, e essas repetições ocuparam todas as conexões da API.
  Sem conexão livre, a API não conseguia nem se preparar para atender, e passou a
  responder "indisponível" para tudo, inclusive para a tela inicial.

  Agora o banco reconhece uma requisição que o gateway está repetindo há mais de
  cinco minutos e a recusa de um jeito que o gateway não repete. O loop morre na
  hora e a API volta sozinha. Nada muda para quem usa o sistema, e você não
  precisa fazer nada ao atualizar: a proteção entra com o próprio `update.sh`.

- **Logo escuro/colorido não some mais no tema escuro** Um logo pensado para fundo claro (a maioria do que se sobe em `/admin/marca`
  e `/app/settings/marca`) ficava ilegível no tema escuro: o fundo da barra
  lateral e da tela de entrada é quase preto (`--color-surface` escuro), e um
  logo escuro sobre quase-preto não tem contraste nenhum.

  Agora a barra lateral, a tela de entrada e a prévia da própria tela de marca
  mostram o logo sobre um chip branco arredondado quando o tema é escuro — a
  mesma lógica que já existe para o texto dos botões, aplicada ao logo. No tema
  claro nada muda: o chip só aparece quando o fundo por trás dele é escuro.

  Quem já tinha um logo pensado para fundo escuro (raro, mas possível) passa a
  ver uma moldura branca de sobra em vez de nada — troca aceita, porque o pior
  caso "moldura desnecessária" é sempre melhor que o pior caso "logo invisível".

- **O identificador da conexão de WhatsApp nasce num lugar só e cabe no limite** O botão "Conectar novo WhatsApp", na Central de Conexões, falhava sempre com "Falha na comunicação
  com o WhatsApp (WAHA)". O identificador interno que o sistema manda para o WhatsApp saía com 69
  caracteres, e o WhatsApp recusa acima de 54, então a conexão nem chegava a ser criada do outro lado
  e o card ficava em "Parado" pedindo reparo. O onboarding escapava porque montava o identificador
  curto por conta própria, num segundo lugar do código.

  A versão anterior já corrigiu o identificador no banco e arrumou as conexões paradas que ainda
  tinham o nome longo. Agora o formato curto é um só, usado pelas duas telas — onboarding e
  Conexões —, e o sistema confere o limite antes de falar com o WhatsApp: se o identificador ainda
  estiver longo, ele é trocado na hora **apenas** quando o número nunca chegou a ser pareado; num
  número que já pareou, a conexão para com um aviso próprio em vez de trocar o identificador — trocar
  ali desligaria o sistema do WhatsApp que está no ar e exigiria um QR novo.

  Nada muda para quem já tem número conectado.

## [1.22.0] — 2026-09-14

### Adicionado

- **O atendimento que espera decisão volta a pedir passagem** Quando o assistente precisa que alguém da equipe destrave algo, ele abre um
  atendimento e continua conversando com o cliente. Se ninguém abre esse
  atendimento, ele ficava lá — e nada avisava. O cliente esperava, e a única
  evidência era uma linha numa tela que talvez ninguém tivesse aberto naquele dia.

  Agora, passado um dia sem ninguém encostar, aparece um aviso na Central (e no
  sino) dizendo que um atendimento espera decisão. Clicar no aviso abre o
  atendimento certo, não a lista.

  O aviso não se repete enquanto não for resolvido, e o sistema cobra no máximo
  três vezes: alarme que nunca cala ensina a ignorar o alarme certo.

- **Dá para fechar um dia da agenda** Feriado, férias, viagem: agora existe onde dizer "neste dia não atendo". Fica em
  Configurações › Agenda, e a partir dali o sistema deixa de oferecer horários
  naquele dia — para você, para o cliente que consulta e para o assistente de IA.

  O que já estava marcado **continua marcado**. Fechar o dia impede o novo; o que
  fazer com quem já tinha horário é decisão sua, compromisso por compromisso.

  Até agora a única saída era marcar um compromisso falso de dia inteiro, que
  suja a agenda, conta como atendimento e aparece no histórico do cliente.

### Alterado

- **Criar resposta rápida duas vezes com a mesma chave não cria duas** Quem chama a API pode repetir com segurança uma criação que não chegou a receber resposta: enviando o cabeçalho `Idempotency-Key` num `POST /api/v1/message-templates`, a segunda chamada com o mesmo conteúdo devolve a resposta da primeira em vez de criar outra resposta rápida, e a mesma chave com conteúdo diferente é recusada com `409`. Nada muda na tela e não há nada a fazer na VPS: a garantia alcança os clientes que mandam a chave, que o cliente HTTP do próprio produto já injeta em toda mutation.

  A corrida entre duas chamadas simultâneas com a mesma chave continua aberta — a tabela de recibos só sabe guardar resultado terminal, então fechar essa janela exige mudança de schema, levada como pergunta na issue #778.

### Corrigido

- **O agente para de se apresentar como assistente virtual contra as instruções dele** O texto de base que o sistema coloca antes das instruções de todo agente
  mandava ele "se apresentar como assistente virtual" na primeira interação. Quem
  escrevia na tela do agente um nome próprio e pedia para não usar esse termo via o
  agente repetir "assistente virtual" mesmo assim, porque as duas ordens chegavam
  juntas. A apresentação agora fica com as instruções do agente; continua valendo
  que ele nunca afirma ser humano e responde com honestidade se perguntarem.

  Vale para instalações novas. Em instalação existente o texto de base já gravado
  no banco não é trocado sozinho. Crédito: @rafaelbatistazz.

- **A proteção da agenda passa a valer para o agente que só consulta horários** O produto tem uma garantia dura: o agente não pode dizer "vou verificar o
  horário e te aviso" — nem "está confirmado" — sem ter consultado a agenda de
  fato. Ela estava armada só para agentes que podem MARCAR sozinhos.

  Quem configura o agente para apenas consultar, deixando a confirmação com uma
  pessoa da equipe — o arranjo normal de clínica, salão e consultório —, tinha um
  agente sem essa proteção e sem as instruções de agenda. Ele prometia verificar e
  não verificava, e nada no sistema acusava.

  Agora a proteção vale para qualquer agente com ferramenta de agenda, e o texto
  que corrige o agente nomeia só as ferramentas que ele realmente tem: mandar
  "chame crm_book_appointment" para quem não a tem fazia o modelo tentar uma
  ferramenta inexistente.

  Nada muda para quem já tinha o agente marcando sozinho.

- **O campo de busca do Inbox passa a dizer o que realmente procura** O campo de busca do Inbox dizia "Buscar por nome, telefone ou mensagem", mas
  procura apenas na ÚLTIMA mensagem de cada conversa — não no histórico. Quem
  buscava uma frase dita no meio do atendimento não encontrava nada, sem qualquer
  aviso de que aquela parte da conversa estava fora do alcance.

  O texto do campo agora diz "última mensagem". Nada mudou no que a busca encontra:
  ela continua achando por nome, por telefone (em qualquer formato) e pela última
  mensagem. O que mudou é que a tela parou de prometer o que não entrega.

  Buscar dentro do histórico inteiro está no plano, como melhoria à parte.

  Crédito: @paulolimajr77

- **A busca do Inbox acha o contato mesmo quando o nome é digitado diferente** Procurar um contato pelo nome exigia digitar exatamente como estava gravado. Num
  contato salvo como "Paulo Lima Jr", buscar "Paulo Jr" não achava nada — e
  "Paulo  Lima", com dois espaços por engano, também não. Só achava quem digitasse
  o nome inteiro e na ordem certa.

  Agora espaço, vírgula e ponto e vírgula são tratados igual: "Paulo Jr",
  "Paulo  Lima" e "Paulo, Jr" encontram o mesmo contato. Buscar pelo sobrenome
  primeiro ("Lima Paulo") continua não achando — isso é uma mudança maior, para
  outra versão.

  A busca por telefone não mudou: continua achando com ou sem DDD, com ou sem
  pontuação, e pelos últimos dígitos.

  Você não precisa fazer nada para adotar. Crédito: @paulolimajr77

- **O cabeçalho para de se sobrepor no celular** Em telas estreitas, o nome da organização ficava por baixo do campo de busca, e
  a busca por cima do sino de avisos. Quanto mais longo o nome, pior.

  No celular o seletor de organização passa a mostrar só o ícone da loja. O nome
  completo continua a um toque, dentro do menu que ele já abre, e quem usa leitor
  de tela continua ouvindo o nome normalmente.

  No computador nada muda.

- **Botões que dependem do banco param de travar a instalação inteira quando o atendimento está ocupado** Medido numa instalação real. O botão **Enviar link ao cliente** (do Google Meet) parecia não funcionar: aparecia *"Erro inesperado. Tente novamente."*, sem nenhuma pista, e clicar de novo não resolvia.

  O que acontecia por baixo: a operação pede uma reserva no banco para não atropelar um atendimento em curso — e essa espera **não tinha prazo**. O navegador desistia em 10 segundos e mostrava o erro, mas **o pedido continuava vivo no banco**, segurando a fila. Como o botão voltava a funcionar, cada clique empilhava mais um pedido atrás do anterior.

  Com dez pedidos empilhados, o banco de dados da instalação foi a **357% de processador** — e nada mais respondia bem, inclusive telas que não tinham nada a ver com aquilo.

  Agora toda chamada da aplicação desiste de esperar em 4 segundos e diz o motivo: *"Este atendimento está ocupado neste instante. Aguarde alguns segundos e tente de novo."* Nada fica pendurado, e a frase diz o que fazer.

  O conserto vale para **toda** a aplicação, não só para esse botão: sete operações tinham a mesma forma, incluindo **Aprovar e enviar** (da sugestão de resposta), **mesclar contatos**, **conectar canal** e **anonimizar contato** da LGPD. O trabalho de fundo (filas e agendadores) continua podendo esperar o tempo que precisar — lá não há ninguém olhando a tela.

  Nada muda para quem opera: sem passo manual, sem mexer em configuração.

- **Modelo padrão em IA → Provedores volta a ser salvável quando o catálogo do provedor ainda não sincronizou** O catálogo que alimenta o combo de modelo da tela IA → Provedores nasce de uma sincronização
  que só alguns provedores já têm semeada na instalação: quem escolhia um provedor cujo catálogo
  ainda não tinha sido baixado encontrava a lista vazia. Combo vazio, nada para escolher, e o
  botão de gravar o modelo padrão desabilitado — a tela existia justamente para configurar essa
  escolha, mas não oferecia nenhum caminho para fazê-lo, e não dizia por quê.

  Agora, quando não há nenhum modelo conhecido para o provedor selecionado, o campo deixa de ser
  uma lista e passa a aceitar o identificador digitado, com uma nota explicando que a lista
  completa aparece sozinha depois da primeira sincronização. A gravação avisa que não deu para
  conferir o identificador contra o catálogo, em vez de dizer apenas que salvou: com o catálogo
  presente, um nome de modelo errado continua sendo recusado como antes.

  Para quem opera uma VPS, nada muda: é conserto de tela, sem comando novo, sem variável nova e
  sem migração. Ninguém precisa fazer nada ao atualizar.

- **Os números das abas do Inbox passam a respeitar os filtros, e "Fechadas" ganha número** Os números ao lado das abas do Inbox ignoravam os filtros ligados na barra. Com
  "Não lidos" marcado, a lista podia mostrar nenhuma conversa enquanto a aba
  continuava estampando o total — mandando o atendente procurar um trabalho que
  não estava lá.

  Agora as contagens aplicam os mesmos filtros que a lista: etiqueta, número de
  WhatsApp e não lidos. E a aba "Fechadas", que não tinha número nenhum, passa a
  ter.

  A busca continua fora da conta: sob busca, o número da aba pode ficar maior que
  a lista. Contar a busca exigiria uma segunda maneira de procurar, e duas maneiras
  acabam discordando uma da outra.

  Você não precisa fazer nada para adotar. Crédito: @paulolimajr77

- **Importação de contatos contabiliza repetições sem perder linhas válidas** Ao importar contatos por CSV, cada linha repetida agora aparece no total de
  duplicados do relatório. Uma linha rejeitada na validação ou na gravação não
  impede a importação de outra linha válida com o mesmo telefone ou e-mail. Se
  uma linha é pulada por ter um e-mail já cadastrado, seu telefone ainda não
  gravado continua disponível para as linhas seguintes. Crédito: @Tong-bit-art.

- **Credencial ainda não configurada deixa de derrubar a leitura** Toda credencial que ainda não foi preenchida — o segredo de webhook de uma
  sessão nova, por exemplo — era gravada como um byte de enfeite só para
  satisfazer a coluna. E o CRM, ao ler qualquer credencial, tentava decifrar esse
  byte como se fosse uma cifra de verdade: a leitura estourava toda vez, no mesmo
  registro, sem parar.

  O efeito prático não estava na tela — quem lê uma credencial já tratava o erro
  como "não configurada". Estava no log, que enchia de erro permanente e
  indistinguível de uma chave mestra trocada, que é o único caso em que esse erro
  diz a verdade. Agora a leitura só tenta decifrar o que pode ser uma cifra: valor
  ausente, curto demais ou sem cara de pacote devolve "não configurada". Cifra de
  verdade que não abre continua aparecendo.

  Você não precisa fazer nada para adotar: aplicar a atualização basta, e as
  credenciais já gravadas seguem onde estão.

- **Quem cria uma organização para outra pessoa sai dela quando essa pessoa assume** Ao criar uma organização pelo painel de plataforma, quem cria entra nela como
  administrador. Isso é necessário: sem ninguém dentro, a organização nasceria
  inacessível e nem daria para configurá-la antes de entregar.

  O que faltava era a saída. Nada nunca tirava o criador de lá — a aba "Equipe" do
  painel de plataforma está desativada, a tela da organização recusa que alguém
  revogue o próprio acesso, e a jornada de convite não sabia da existência do
  criador.

  Na prática, quem instala o sistema para clientes ficava dentro da empresa de cada
  um deles, para sempre. O cliente abria Equipe › Membros e encontrava o e-mail
  pessoal de quem instalou listado como se fosse um colega da equipe: ocupando uma
  vaga, aparecendo como responsável possível na Agenda, e podendo ser removido por
  ele — enquanto quem estava lá não tinha como sair.

  Agora, quando a organização é criada para outra pessoa,
  **o vínculo de quem cria nasce marcado como provisório.** Ele existe só para a empresa não nascer vazia, e
  sai sozinho no momento em que a entrega se completa: quando o dono aceita o
  convite. Até lá o criador continua dentro, então a organização nunca fica sem
  ninguém.

  Quem cria uma organização **para si mesmo** não é afetado — nem quem criou
  a sua pelo cadastro normal. O vínculo dessas pessoas não recebe a marca e nada nesta
  versão volta a tocá-lo.

  **Organizações criadas antes desta versão não mudam.** Vínculos antigos não têm a
  marca, e o sistema não tenta adivinhá-la: se numa instalação existe um criador
  que deveria ter saído, a remoção é feita à mão, com alguém olhando o caso. Essa
  escolha é deliberada — uma versão anterior desta correção tentou deduzir quem
  deveria sair e acertou o alvo errado.

  Você não precisa fazer nada para adotar.

- **Excluir contato não destrói mais o histórico quando a ficha não sai** Excluir um contato que tinha compromisso na agenda nunca funcionava — e, na
  tentativa, levava junto as mensagens e as conversas dele. O CRM apagava o
  histórico primeiro e só então esbarrava no vínculo que barra a exclusão da
  ficha: a tela dizia "Erro interno", o contato continuava lá e as conversas
  tinham ido embora sem volta.

  Antes de apagar qualquer coisa, o CRM agora confere os vínculos que barram a
  exclusão e devolve o mesmo aviso de vínculo pendente, com o histórico intacto.
  E toda tentativa que não completa passa a ficar registrada na auditoria, com o
  que chegou a ser apagado antes do erro — "ninguém excluiu" e "tentei e barrou"
  deixam de ser a mesma linha em branco.

  Você não precisa fazer nada para adotar.

- **Excluir nó ou aresta no builder de follow-up agora pede confirmação** O botão de excluir a seleção no builder de follow-up dividia o mesmo assento da barra com o
  botão que apaga o fluxo inteiro: mesmo ícone de lixeira, mesma cor destrutiva, mesma posição.
  Os dois eram confundidos justamente porque só um deles perguntava antes — quem aprendeu que a
  lixeira daquele canto pede confirmação clicava no outro com a mesma confiança e perdia o
  trabalho do canvas sem aviso.

  Agora os dois se comportam igual: clicar em Excluir (nó ou aresta) abre uma confirmação que diz
  o que vai embora. O título nomeia o alvo — "Excluir este nó?" ou "Excluir esta aresta?", conforme
  a seleção — e a frase explica a consequência: apagar um nó leva junto as arestas ligadas a ele,
  e não há como desfazer. A exclusão só acontece no clique de confirmação; cancelar não muda nada.

  Para quem opera uma VPS, nada muda: é conserto de tela, sem comando novo, sem variável nova e
  sem migração. Ninguém precisa fazer nada ao atualizar.

- **O filtro de etiqueta do Inbox passa a oferecer as etiquetas que existem** O seletor de etiqueta do Inbox só listava as etiquetas cadastradas à mão em
  Configurações. Se alguém etiquetava uma conversa com algo fora daquela lista, a
  etiqueta aparecia na conversa mas não havia como filtrar por ela — e numa
  instalação recém-configurada o seletor oferecia oito etiquetas de exemplo,
  nenhuma delas em uso, todas devolvendo lista vazia.

  Agora o seletor mostra as duas coisas juntas: as etiquetas cadastradas e as que
  estão realmente em uso nas conversas. E se você já estiver filtrando por uma
  etiqueta que saiu da lista, o seletor continua na tela mostrando qual é, em vez
  de sumir deixando a lista filtrada sem explicação.

  O histórico de atendimentos encerrados, no painel lateral, passa a mostrar a data
  de cada um ao lado do desfecho.

  Você não precisa fazer nada para adotar. Crédito: @paulolimajr77

- **O gate que exige conferência de organização passa a cobrir todas as funções privilegiadas** Nada muda na tela nem na operação: é proteção do próprio desenvolvimento.

  O banco tem funções privilegiadas que rodam **por cima** das regras de isolamento entre organizações. Quando uma delas recebe a organização como argumento, ela precisa conferir se quem chamou pertence de fato àquela organização — senão um usuário logado numa organização a chama com o identificador de outra.

  O teste que cobrava isso verificava **duas** funções, escritas à mão numa lista. Função nova nascia fora da lista, e nenhum gate a alcançava: em 2026-09-12 uma função escrita nesta mesma semana nasceu exatamente com esse defeito e a suíte inteira ficou verde — só apareceu porque quem a escreveu sabotou o próprio código de propósito.

  Agora a pergunta é feita ao catálogo do Postgres, para **todas** as funções que têm a forma do risco: privilegiada, alcançável por usuário logado e recebendo a organização por argumento. Quem confere por delegação — chamando outra função que confere — é reconhecido, para o gate não acusar quem já faz a coisa certa.

  O mesmo caminho já tinha sido percorrido pela pergunta vizinha ("quem pode executar esta função?"): ela também era lista fixa, virou varredura, e naquele dia 8 de 25 funções estavam expostas com todos os gates obrigatórios verdes.

- **A régua de recuperação para de correr para o contato anonimizado** Quando alguém pedia para ser esquecido (anonimização por LGPD), os dados eram
  redigidos — mas a régua de recuperação de falta continuava correndo por baixo. As
  mensagens de reengajamento seguiam sendo enviadas, e, quando a régua esgotava,
  nascia um aviso novo na Central apontando justamente para o compromisso que a
  anonimização tinha desligado: o aviso ressuscitava o vínculo que a LGPD mandou
  cortar.

  Agora a cascata de anonimização cancela a régua do contato no mesmo movimento em
  que redige os dados — tanto pelo botão da tela quanto pelo varredor diário de
  retenção —, e a porta que abria aquele aviso passou a recusar contato
  anonimizado, como as outras três já faziam.

  Você não precisa fazer nada para adotar. Contatos anonimizados antes desta versão
  que ainda tenham resíduo de redação são alcançados pelo varredor diário, que
  agora corta a régua deles também.

- **O botão "Limpar filtros" agora limpa também a caixa de busca** No Atendimento, "Limpar filtros" desligava os filtros e a lista voltava — mas o texto digitado continuava escrito na caixa de busca. A lista voltava cheia com um termo visível que já não valia, e quem olhasse leria aquela lista como resultado daquela busca.

  Agora o botão limpa as duas coisas: o filtro e o campo.

- **O assistente para de dizer "confirmado" num horário que ainda espera aprovação** Quando um tipo de atendimento exige que alguém da equipe aprove, o horário
  marcado pelo assistente nasce **reservado**, não confirmado: ninguém mais
  consegue pegá-lo, mas ele ainda pode ser recusado.

  O assistente não sabia disso. As instruções que ele recebia mandavam dizer que o
  horário estava confirmado logo depois de marcar — então o cliente ouvia uma
  confirmação que ninguém tinha dado, e podia aparecer num horário que a equipe
  ainda ia recusar.

  Agora o assistente é avisado quando o horário apenas ficou reservado, e diz isso
  ao cliente: que separou o horário e que a equipe confirma.

  Nada muda em atendimentos que não exigem aprovação.

- **O filtro "Não lidos" do Inbox passa a procurar em todas as conversas** O botão "Não lidos" só escondia as conversas já lidas da parte da lista que
  estava carregada na tela — ele não consultava o sistema. Numa caixa com muitas
  conversas, se as primeiras estivessem todas lidas, a tela mostrava "Sem conversas
  por aqui" e nem oferecia carregar o resto, dando a entender que não havia nada
  não lido quando havia.

  Agora o filtro consulta todas as conversas da organização, e o botão passa a
  poder ser combinado com as abas e com os demais filtros.

  Você não precisa fazer nada para adotar. Crédito: @paulolimajr77

- **O painel do Google Meet para de dizer que o envio "não foi autorizado"** Com o link pronto e ainda não enviado, o painel dizia "O envio do link ainda não foi autorizado" — que lê como recusa, quando era só o estado inicial. E logo abaixo estava o botão "Enviar link ao cliente", ativo.

  Agora diz o fato: **"Link não enviado ainda."** O botão continua o mesmo.

  "Autorizar" ficou onde é verdade: quando o atendimento muda de conversa e o sistema precisa de uma nova decisão sua.

- **PDFs recebidos pelo WhatsApp voltam a ser lidos pela IA** Todo PDF recebido falhava na extração de texto com "Extração de PDF
  indisponível: o binário nativo @napi-rs/canvas não foi instalado nesta
  plataforma" — mesmo a dependência estando instalada. O `next build`
  gera o `.next/standalone` copiando só o que o file-tracing consegue seguir
  por `import`/`require` estático, e o `@napi-rs/canvas` resolve seu binário
  nativo com um `require()` computado em runtime (por `process.platform` e
  detecção de musl/glibc); o tracer não segue isso e o binário ficava de fora
  da imagem — o mesmo defeito que já havia sido corrigido para o
  `@swc/helpers`. `next.config.ts` agora inclui o `@napi-rs/canvas` (e suas
  variantes de plataforma) na mesma lista.

  De quebra, o log do cron `attendant-heartbeat` (AT-08) passou a registrar
  `code`/`details`/`hint` do erro do Postgres/PostgREST, não só a mensagem —
  uma falha observada em produção só mostrava "column ... does not exist"
  sem informação suficiente para diagnosticar a causa real.

- **Proteção de envio abre depois de mexer nos canais — e nunca mais em silêncio** Quem criava, reconectava ou excluía uma conexão e logo abria a **Proteção de envio** encontrava o painel sem os dados daquela conexão. A lista de conexões era atualizada, mas a ficha de limites anti-ban (`pacing-knobs`) ficava com o cache velho. As duas andam juntas — agora qualquer mexida nos canais invalida as duas, e o painel abre com os números certos.

  Pior era o outro lado: quando a conexão já não estava mais na lista (excluída em outra aba ou máquina), o painel simplesmente **não aparecia** e o botão morria mudo. Agora a mesma folha abre com uma mensagem honesta — a proteção desta conexão não pôde ser carregada, ela pode ter sido removida ou a lista está desatualizada — e duas saídas: **Tentar de novo**, que recarrega a lista (quando a conexão reaparece, o formulário volta sozinho), e **Fechar**.

  Nada muda para quem abre a proteção de uma conexão que está na lista: o painel é o mesmo de sempre.

- **O indexador RAG para de ativar versão com trechos faltando** Ao reindexar uma fonte de conhecimento (uma FAQ, um documento, o catálogo), cada
  trecho do material é gravado um a um. Quando a gravação de um trecho falhava, o
  erro ia só para o log do servidor e a indexação seguia em frente: bastava que
  algum outro trecho tivesse gravado para a versão nova ser dada como pronta e
  entrar no ar. Quem conversava com o agente passava a receber respostas apoiadas
  num acervo furado, e a versão anterior, completa, saía de cena sem aviso — a
  pessoa só descobria o buraco ao perguntar exatamente o que faltou.

  Agora falha de gravação derruba a indexação inteira. Se qualquer trecho não
  gravar, a versão nova é registrada como falha, com o motivo (quantos trechos
  faltaram e em quais posições), e a versão anterior continua ativa e respondendo.
  O registro da falha também aponta o detalhe `trechos_nao_gravados:N`, para a
  triagem dizer de bate-pronto se o problema foi parcial. Quando nada grava, o
  detalhe segue sendo o `nenhum_trecho_gravado` de sempre.

  Não muda nada quando tudo grava: a versão nova é marcada como pronta e ativada
  como antes, e o caminho de erro de embedding (chave ausente ou provedor
  recusando) continua igual, derrubando a indexação sem ativar. Quem nunca viu um
  buraco no índice não vê diferença nenhuma.

- **O rascunho do agente de IA salva antes de haver WhatsApp conectado** Numa instalação nova, quem escrevia o prompt do atendente e tentava salvar não conseguia: o
  editor exigia escolher "por qual número ele atende" — e, sem nenhum aparelho pareado, o seletor
  abria vazio. Não havia opção a escolher, e o texto recém-escrito não tinha como ser guardado.
  Escrever quem o agente é e conectar o celular são dois dias diferentes na vida de quem instala.

  Agora o número é requisito para PUBLICAR, não para rascunhar. Sem ele o rascunho salva, e o
  botão "Publicar" explica o que falta e para onde ir (Conexões). Publicar sem número continua
  recusado em três camadas independentes — o botão, a função do banco
  (`fn_publish_ai_agent_version`) e o próprio runtime, que só executa versão publicada.

  No mesmo passo, o botão "Publicar" deixa de travar para quem usa a chave de IA da instalação
  (a do `.env`): a régua pedia uma linha na tela de Credenciais, e essa escolha não é uma linha —
  quem instalou pelo kit via o botão desabilitado para sempre, mandando escolher a chave que
  tinha acabado de escolher.

- **O log de eventos para de encher de pendências que ninguém ia atender** O registro de eventos alimenta o painel de diagnóstico. Só que **parte dos eventos nasce só para ficar registrada** — mensagem enviada, lead alterado, sessão de canal mudou de estado — e nenhum consumidor de fila foi feito para eles: ninguém ia atendê-los mesmo.

  Esses eventos nasciam marcados como **pendentes** igual a um pedido que ainda não foi processado, e assim ficavam para sempre. Numa instalação real havia **626 linhas assim, em 8 tipos de evento**, todas com cara de trabalho parado na fila — e nenhuma delas ia sair dali, porque não existia quem as pegasse.

  Agora o evento que é só registro nasce já fechado, e o que era acúmulo antigo foi fechado de uma vez. O que continua aparecendo como pendente é o que realmente **precisa** ser atendido: pedido de envio, pedido de disparo, e qualquer evento de um tipo que espere um consumidor que não exista. A fila volta a significar fila.

  Não há nada a fazer na sua VPS: a correção entra junto com a atualização e o acúmulo antigo é limpo por ela.

- **\"Testar agente\" devolve a resposta, e para de gastar crédito em triplo** Testar um agente gastava crédito e não mostrava nada. O painel de resultado
  ficava em "Nenhum teste executado ainda" mesmo com o modelo tendo respondido.

  A espera do navegador era de 10 segundos, e um teste de agente leva mais que
  isso: ele roda o motor inteiro, com as ferramentas e as verificações. Passados
  os 10 segundos o navegador desistia — mas o servidor não: ele terminava o
  trabalho e devolvia para ninguém.

  Pior, ao desistir o navegador tentava de novo, até três vezes. Cada clique em
  "Executar teste" podia virar três execuções completas do modelo, as três
  cobradas, nenhuma aparecendo na tela.

  Agora o teste espera o tempo que precisa, e a resposta aparece.

  A regra vale para o produto inteiro, não só para essa tela: quando uma operação
  que ESCREVE fica sem resposta, o sistema não a repete mais. Ficar sem resposta
  não quer dizer que não aconteceu — quer dizer que não se sabe, e repetir uma
  escrita nessa dúvida é o que cobra duas vezes. Buscas e listagens continuam
  sendo tentadas de novo normalmente, porque ler de novo não custa nem duplica
  nada.

- **O teste do agente termina de verdade, e quando falha diz por quê** Cada execução da aba Teste de um agente deixava uma linha de execução presa em
  "rodando", para sempre. Numa instalação com 16 testes, eram 16 linhas paradas.
  O motivo era um estado que o banco não reconhecia, gravado sem ninguém conferir
  se a gravação tinha dado certo.

  Agora a execução fecha como concluída ou falhada, com o tempo que levou.

  E quando o teste falha, a causa passa a existir em algum lugar. Antes o erro era
  descartado sem deixar rastro: a tela dizia uma frase genérica sobre modelo e
  credencial, e não havia nada no log nem na execução para dizer o que realmente
  aconteceu. Agora o erro vai para o log do servidor e fica guardado na própria
  execução. A mensagem para quem opera continua a mesma, porque o texto do erro é
  técnico.

  Os contadores de passos e tokens da execução de teste seguem em zero: esse dado
  não chega até ali, e preenchê-lo com um palpite seria pior que o zero.

- **Trocar de aba logo depois de digitar na busca para de voltar à aba anterior** Quem digitava na busca do Inbox e trocava de aba em seguida, rápido, era devolvido
  à aba anterior sem ter pedido. A busca continuava a valer, mas a aba voltava
  sozinha — e quem não sabia do problema não tinha como adivinhar a causa.

  Acontecia porque o envio da busca esperava um instante depois da última tecla, e
  nesse instante ele guardava também qual aba estava aberta na hora da digitação.
  Ao ser enviado, levava a aba velha junto.

  Agora ele envia apenas o que foi digitado.

  Você não precisa fazer nada para adotar. Crédito: @paulolimajr77

## [1.21.0] — 2026-09-14

### Adicionado

- **Quem publica o CRM atrás de um Nginx Proxy Manager sobrevive a atualizações** Instalações que já tinham um Nginx Proxy Manager nas portas 80/443 (em vez do
  Caddy do próprio kit, ou de um Traefik) precisavam plugar o contêiner `app` na
  rede do NPM à mão (`docker network connect`). Isso sumia na primeira
  atualização: `update.sh` recria o `app`, a conexão manual se perde, e o
  domínio volta a responder 502 — foi o que aconteceu numa VPS real em
  2026-09-11.

  Agora `REVERSE_PROXY=npm` no `.env` (junto de `PROXY_NETWORK_NAME` e
  `PROXY_NETWORK_APP_IP`, se a rede ou o IP do seu Proxy Host não forem os
  padrões) mantém o `app` sempre na rede certa, entra automaticamente em toda
  atualização e no cron de auto-update, e nunca sobe o Caddy por engano por
  cima do NPM. Se a rede do NPM sumir (`docker network prune`, por exemplo), a
  atualização para com uma mensagem explicando o que fazer, em vez de travar no
  erro opaco do Docker.

  Configurar pela primeira vez continua sendo manual — o NPM não anuncia sua
  configuração como o Traefik faz por labels — mas está documentado no
  cabeçalho de `docker-compose.npm.yml`.

### Corrigido

- **A foto do contato volta a aparecer nos números com nono dígito** A tarefa que busca as fotos de perfil pedia a imagem pelo telefone. Em número
  de celular brasileiro com nono dígito, o telefone que o CRM guarda e o que o
  WhatsApp usa internamente podem divergir, e a busca voltava vazia — o contato
  ficava sem foto sem que nada indicasse erro. Agora a tarefa pede primeiro pela
  identidade interna do WhatsApp e só recorre ao telefone se ela não existir.

  Achado e corrigido por @HigorLira.

- **A tela de atualização passa a dizer em que pé está, do começo ao fim** Ao clicar em "Atualizar agora", a tela mostrava a lista dos quatro passos com
  todos eles vazios e o título "Atualizando para a versão X" — e ficava assim,
  sem mexer nada, por vários minutos. Não era travamento: o clique só registra o
  pedido, e o servidor confere se há algo a fazer de poucos em poucos minutos. Mas
  não havia como saber disso olhando, e a tela afirmava um trabalho que ainda nem
  tinha começado.

  Agora a espera tem nome próprio ("Pedido enviado — esperando o servidor pegar"),
  diz por que demora, avisa que ficar parada nesse tempo é normal e mostra um
  relógio contando desde o pedido. A lista de passos só aparece quando existe um
  passo de verdade. Você pode fechar a página: o pedido não se perde.

  Do outro lado acontecia o inverso, e era pior. Terminada a atualização, o
  sistema voltava e a tela oferecia de novo o botão "Atualizar agora" para a
  versão que **acabava de ser instalada** — quem clicava refazia tudo, ou concluía
  que não tinha funcionado. Isso durava até o servidor reportar a versão nova, o
  que leva alguns minutos. Agora a tela reconhece o fim na hora e diz "Pronto —
  você está na versão X", sem oferecer nada.

  Você não precisa fazer nada para adotar.

- **Cada tela passa a dizer o próprio nome na aba do navegador** Dezessete telas do aplicativo caíam no título padrão do produto, então quem
  trabalha com várias abas abertas via a mesma legenda em todas elas e só
  descobria qual era qual clicando. Agora cada uma nomeia a si mesma.

  Achado e corrigido por @AnditecDev.

- **O WhatsApp oficial conectado pela tela volta a enviar — sem depender do .env** Uma instalação que conectou o número oficial pela **Central de Conexões** guarda a credencial **cifrada no banco** e não escreve nada no `.env` — e as mensagens ficavam paradas na fila, sem erro, com o canal conectado e funcionando na tela.

  A pergunta "dá para tentar enviar?" era respondida só pelo `.env`, num ponto que não consegue consultar o banco. Agora quem decide é o próprio envio, que resolve a credencial da sessão primeiro — e o `.env` continua valendo como fallback para instalações antigas de número único. Sem credencial nenhuma, a mensagem fica na fila com o motivo nomeado (em vez de nunca ser tentada); falha na consulta da credencial vira erro visível na mensagem, em vez de silêncio.

  Quem já tinha a chave no `.env` não vê diferença nenhuma.

- **A instalação deixa de exigir chave de IA — dá para cadastrar depois pela tela** O instalador exigia uma chave de IA que **passasse numa chamada real** ao
  provedor: sem ela, a instalação morria na Fase 2/4. Só que a documentação
  (`docs/deploy-selfhost`) sempre prometeu outra coisa — *"deixe vazio e cadastre
  a chave depois"* —, e o próprio sistema concorda com a doc: faltar todas as
  chaves é um aviso, não um erro.

  Agora o campo é opcional de verdade: dá para instalar sem abrir conta em
  provedor de IA e cadastrar a chave depois pela tela, em **IA › Credenciais**,
  onde ela fica cifrada no banco. A tela final da instalação lembra quem pulou o
  passo, com o caminho exato.

  Quem digita uma chave continua com ela validada na hora — o que mudou é que
  pular deixou de ser erro.

- **As duas verificações opcionais de segurança agora ligam de verdade** Em Agentes › Confere antes de enviar, ligar "Detectar tentativa de manipular o
  assistente" ou "Conferir promessas em texto livre" não gravava nada: o pedido
  era recusado e o interruptor voltava sozinho, sem explicação na tela. As duas
  verificações ficavam no que o servidor definia, e quem quisesse ligá-las por
  organização não conseguia — em nenhuma instalação.

  Agora o interruptor grava a escolha. Se você tentou ligar alguma das duas e
  achou que o clique não pegava, era isto; tente de novo. Crédito: @rafaelbatistazz.

- **O botão "Reativar" de tipo de agendamento passa a funcionar** Em Configurações › Agenda, um tipo de agendamento desativado mostra o botão
  "Reativar" — e ele **nunca funcionou**, desde que a tela existe. Clicar devolvia
  sempre o mesmo erro: "Nenhum campo para alterar." Quem tinha desativado um tipo
  por engano ficava sem saída pela tela: só criando outro com nome diferente, já
  que o nome original continuava ocupado pelo tipo desligado.

  A causa era um campo que o servidor descartava em silêncio. A tela pedia para
  ligar o tipo de volta usando a mesma porta que altera nome, duração e
  responsável — e essa porta não conhece o campo "ativo", então recebia um pedido
  que, do lado dela, não mudava nada.

  Agora reativar tem porta própria no servidor, com a mesma exigência de papel do
  desativar (gerente ou administrador), e fica registrado na trilha de auditoria
  como "tipo reativado" — separado de uma alteração comum de campo, para que um
  tipo religado não se confunda com um tipo que teve a duração mudada.

  Você não precisa fazer nada para adotar. Desativar continua igual, e nenhum
  compromisso já marcado é afetado.

- **Revogar e devolver acesso aparecem na hora na lista de Equipe** Em Equipe, revogar o acesso de alguém — ou devolvê-lo — deixava a linha da
  pessoa parada até recarregar a página. Quem clicava não via nada acontecer e
  clicava de novo, sem saber se o primeiro clique tinha valido.

  O servidor sempre fez a parte dele; era a tela que só se atualizava depois. E o
  problema só apareceu agora porque antes o membro revogado sumia da lista: some
  ou não some era resposta suficiente. Desde que ele passa a ficar na lista com o
  estado mudado, uma linha que não muda é uma tela que mente sobre o que acabou de
  acontecer.

  Agora a linha muda no clique e, se o servidor recusar, ela volta ao que era e o
  erro aparece — nunca fica dizendo "ativo" para quem não foi reativado. Devolver
  acesso também passou a confirmar que deu certo, como revogar já fazia: é
  justamente a ação que se faz com receio de ter errado.

  Você não precisa fazer nada para adotar.

  Crédito: @paulolimajr77.

- **Sentry para de derrubar um coletor de Web Vitals no console de quem usa o DSN da comunidade** A integração `BrowserTracing` do Sentry instrumenta Web Vitals (CLS/LCP/TTFB) mesmo sem enviar
  nenhum trace — a amostragem decide se o dado é enviado, não se o coletor roda. Numa instalação
  real (2026-09-09), uma extensão do navegador mexendo na Performance API da página derrubava
  esse coletor com um erro no console (`TypeError: Cannot read properties of undefined (reading
  'startTime')`), sem nenhum trace chegando a existir para explicar o motivo. Quem está no DSN da
  comunidade não tinha telemetria nenhuma sendo enviada por essa integração — só o risco do
  crash. Ela deixa de ser carregada para essa população; quem aponta para o próprio Sentry
  mantém o tracing normalmente.

- **A sugestão de resposta diz por que falhou, e a rejeitada sai da tela** Duas coisas na caixa de entrada, medidas numa instalação real.

  **A sugestão rejeitada não saía da tela.** O painel mostrava a sugestão mais recente sem olhar a situação dela — e uma rejeitada continua sendo a mais recente. O texto ficava ali, numa caixa desabilitada, sem botão de fechar (não havia nenhum). Pior no caso comum: quem rejeita costuma pedir outra em seguida; se essa segunda falha, nada substitui a primeira e a tela **trava** naquele texto.

  Agora a sugestão rejeitada — e também a obsoleta e a já enviada — solta o painel, que volta ao botão **Sugerir resposta**. A sugestão que falhou continua aparecendo de propósito: a frase dela é a única pista que sobra.

  **O erro não dizia nada.** Qualquer falha ao gerar virava a mesma frase — "Confira a publicação e a configuração do agente" —, mesmo quando o problema era outro, e **o motivo real era descartado sem ser registrado**. A tela ainda mostrava o identificador da requisição junto, o que fazia a mensagem parecer rastreável: não era, porque não havia nada gravado para procurar.

  Agora a tela diz qual dos motivos foi — nenhum agente publicado atende o canal, ou a conversa não pode receber sugestão (contato que pediu para não receber mensagens, contato anonimizado, histórico ilegível) — e, quando a causa é outra, admite que é outra e **registra** no servidor, onde o identificador finalmente encontra alguma coisa.

  Nada muda para quem opera: sem passo manual, sem mexer em configuração.

## [1.20.0] — 2026-09-12

### Adicionado

- **Falta sem retorno depois da régua de recuperação vira aviso na Central** Quando um cliente falta a um compromisso e a equipe confirma a falta, o sistema já matricula
  esse contato num fluxo de recuperação — as mensagens de reengajamento que tentam remarcar. Até
  agora, se a régua inteira era enviada e o cliente **nunca respondia**, o fluxo simplesmente
  terminava: o card ficava parado na mesma etapa e ninguém era avisado de que a recuperação tinha
  esgotado.

  Agora, quando isso acontece, abre um aviso na Central de avisos apontando para o compromisso —
  "Cliente faltou e não respondeu à recuperação" —, para alguém decidir o próximo passo e mover o
  card no funil. É um aviso por falta (o mesmo compromisso remarcado gera uma falta nova, e um
  aviso novo); reprocessar não duplica.

  O construtor de fluxo não move etapa por conta própria de propósito — faltar a uma visita não é
  o negócio esfriando, e quem decide isso continua sendo uma pessoa.

- **A aba Membros mostra os convites enviados, com status e ações** A tela **Equipe › Membros** ganhou uma seção **Convites**. Antes, um convite pendente só aparecia numa lista efêmera dentro do modal "Convidar membros", que sumia ao fechar — não havia onde ver se um convite foi enviado, se o e-mail saiu, se expirou ou se foi ignorado.

  Agora cada convite mostra e-mail, papel e perfil de interface; o status (**Pendente / Aceito / Expirado / Revogado**); a data de envio e a de expiração; e quem enviou o convite. Quando o e-mail **não saiu** — instalação sem serviço de e-mail configurado, por exemplo — a linha avisa e oferece o link do convite para copiar ali mesmo, em vez de o admin achar que enviou.

  Administradores podem **reenviar**, **copiar o link** e **revogar** cada convite; gerentes veem a lista. Revogar passa a impedir o aceite mesmo com o link ainda dentro da validade.

  Tudo escopado por organização (RLS). Nada muda para quem já roda: a atualização cria a tabela `team_invites` sozinha, sem edição de `.env` nem de compose.

- **O modelo de IA padrão da organização passa a ter tela** O padrão de IA da organização decide o modelo de **todo ponto que não tem escolha própria** — numa instalação nova, 24 dos 25.

  Ele existia no banco e já era usado para decidir cada ponto, mas não aparecia em
  lugar nenhum: não dava para ver qual era, e muito menos trocar sem mexer no
  banco à mão.

  Agora ele aparece em **Agente de IA › Provedores**, junto com os pontos, e pode
  ser trocado ali. A troca confere se o modelo existe no catálogo daquele provedor
  antes de gravar — um erro de digitação viraria o padrão da organização e
  derrubaria todos os pontos que herdam dele de uma vez.

  A escrita preserva o resto das configurações da organização (a marca e a
  política de verificação em duas etapas moram no mesmo lugar) e fica registrada
  no histórico de auditoria.

  Você não precisa fazer nada para adotar. Quem nunca mexeu continua no padrão de
  sempre; o que muda é que agora dá para ver e escolher.

### Corrigido

- **O instalador não para mais em "Ativando as automações" numa VPS nova** Numa VPS recém-criada o root ainda não tem agendamento nenhum, e o instalador parava logo depois de **"chave de cifra ativa no banco"**, sem mensagem de erro, mostrando **"A instalação parou"** — com o CRM já no ar e os contêineres saudáveis. Rodar o instalador de novo contornava, o que fazia o problema parecer fantasma.

  O que acontecia: o comando que lê as tarefas agendadas "reclama" quando não há nenhuma, e essa reclamação derrubava o script inteiro. A ironia é que a tarefa **já tinha sido gravada** nesse ponto — a instalação estava correta e parecia ter quebrado.

  Agora ele agenda as automações e o agente de atualização direto, na primeira rodada. Quem já instalou não precisa fazer nada.

  **Achado por duas pessoas no mesmo dia, sem que uma soubesse da outra: @luiscgc91 e @rafaelbatistazz**, as duas instalando numa VPS limpa. As duas escreveram exatamente a mesma correção. A descrição acima é a do @rafaelbatistazz, que nomeia o que se vê na tela.

- **Áudio, foto, vídeo e documento recebidos pelo WhatsApp oficial agora aparecem** Quem usa o canal **oficial do WhatsApp** (a API da Meta) recebia a mensagem, mas
  **não o arquivo**: o áudio, a foto, o vídeo ou o documento simplesmente não
  apareciam na conversa — e nada na tela dizia que havia algo ali.

  A causa: o aviso que a Meta manda não traz o arquivo, traz um código para
  buscá-lo. O sistema guardava a mensagem e descartava o código, então não havia
  como ir atrás do arquivo depois.

  Agora o código é guardado, o arquivo é baixado em segundo plano e passa a
  aparecer na conversa como qualquer outra mídia. O download só aceita o endereço
  de mídia da própria Meta, por conexão segura.

  Você não precisa fazer nada para adotar. Mensagens novas passam a trazer a mídia
  a partir desta versão; as antigas, que perderam o código, não têm como ser
  recuperadas.

  Achado e corrigido por um contribuidor de fora.

- **O aviso de risco da chamada de voz deixa de ser pulável** A tela de **Configurações › Segurança** pede, com uma caixa obrigatória, que quem administra declare que leu o aviso e **aceita o risco de o WhatsApp bloquear a conta** antes de ligar a chamada de voz.

  Só que dava para pular: quem fosse direto a **Conexões** e escaneasse o código conectava o segundo aparelho **sem passar pelo aviso**. Desligar sempre funcionou de verdade — desconecta o aparelho na hora; o que não existia era a exigência de **ligar**.

  Agora conectar o aparelho e fazer uma ligação exigem que a chamada de voz esteja ligada para a empresa. Quem tentar antes recebe uma mensagem clara dizendo que um administrador precisa ligá-la na tela — e não um erro técnico.

  Quem já tinha ligado pela tela não vê diferença nenhuma.

## [1.19.0] — 2026-09-11

### Adicionado

- **Chamada de voz pelo WhatsApp — desligada por padrão, e com botão de desligar de verdade** O sistema passa a poder fazer e receber **chamadas de voz pelo WhatsApp**, e ela chega
  **desligada**. Atualizar não liga nada: nenhum número seu é conectado a nada, nenhum serviço
  novo sobe na sua VPS, e nada muda na sua tela até você decidir.

  A razão de tanto cuidado está escrita na própria tela, antes do botão: para fazer chamadas, o
  sistema precisa conectar **um segundo aparelho** ao mesmo número de WhatsApp que você já usa
  para atender — e essa conexão não é feita pelo caminho oficial do WhatsApp. Se ele entender
  isso como uso indevido, quem é bloqueada é a **conta**, não só a chamada: você perde também as
  mensagens desse número. Por isso ligar é decisão de quem administra a empresa, exige marcar
  que leu o aviso, e fica registrado quem aceitou e quando.

  E desligar desliga mesmo. Antes, o único botão que existia era o de conectar — não havia
  caminho de volta: apagar a configuração escondia a tela e deixava o aparelho vinculado ao seu
  número para sempre, do lado do WhatsApp. Agora, ao desligar, o sistema **desconecta o aparelho**
  de verdade e só então marca como desligado; se a desconexão falhar, ele avisa e mantém tudo
  como estava, em vez de dizer que acabou com o aparelho ainda lá.

  No servidor, o serviço de chamada de voz também nasce desligado: ele só é criado quando quem
  administra a instalação o liga no arquivo de configuração. Quem não usar a chamada de voz não
  paga por ela — nem em memória da VPS, nem em superfície exposta. O serviço usado é o oficial
  do projeto WaCalls, fixado por versão exata e com login obrigatório; ele não é acessível pela
  internet, apenas pelo próprio sistema.

  Trabalho original de @eudanielhenrique.

- **Os e-mails de acesso passam a funcionar (e a ter marca) num Supabase próprio** Quem roda **Supabase self-hosted** ganha o que só existia na nuvem: e-mail de confirmação de conta e de redefinição de senha com a marca da instalação, e — o que importa mais — com o link que **fecha a sessão**.

  O app passa a servir os dois moldes em `/email-templates/confirmation` e `/email-templates/recovery`. Aponte o GoTrue para eles:

  ```bash
  GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://SEU_DOMINIO/email-templates/confirmation
  GOTRUE_MAILER_TEMPLATES_RECOVERY=https://SEU_DOMINIO/email-templates/recovery
  GOTRUE_MAILER_SUBJECTS_CONFIRMATION="Confirme seu e-mail · SUA MARCA"
  GOTRUE_MAILER_SUBJECTS_RECOVERY="Redefinir sua senha · SUA MARCA"
  ```

  **Nada muda para quem não apontar**, e nada muda na nuvem do Supabase — lá o caminho continua sendo o `marca-emails.sh` pela Management API.

  **O kit ensina e confere, mas não escreve — e o motivo é honesto.** O GoTrue não é serviço deste compose: o kit sobe `app`, `worker`, `scheduler`, `waha`, `redis`, `srh` e `caddy`, e o Supabase próprio é outra stack, que pode nem estar na mesma máquina. Escrever nela seria o instalador editar instalação de terceiro. Então o `install.sh` passa a imprimir as quatro linhas exatas quando a topologia é própria (antes ele mandava o self-hoster para `supabase.com/dashboard`, que ele não tem), e `bash hostgator-setup-kit/healthcheck.sh` ganhou uma seção que **mede o estado**: se o app serve o molde, se algum GoTrue desta máquina aponta para ele, e se o valor configurado é URL — acusando em vermelho o caminho de arquivo que falha calado.

  **Por que isso conserta e não só embeleza.** O modelo padrão do GoTrue linka para `/auth/v1/verify`, que devolve um `code` PKCE. O verificador desse code vive num cookie `SameSite=Strict`, e clique vindo de webmail é navegação cross-site: o cookie não viaja e a sessão nunca fecha. A conta é confirmada, a pessoa entra pela senha, e fica sem organização e sem menu. Os moldes do app linkam com `token_hash`, que não depende de cookie nenhum.

  **A marca passa a seguir o banco.** O `marca-emails.sh` lê o `.env`, então trocar nome ou cor em **Configurações › Marca** não reescrevia os e-mails de acesso. Servindo pelo app, a marca é resolvida a cada busca e o GoTrue re-busca sozinho a cada 10 minutos (`GOTRUE_MAILER_TEMPLATE_MAX_AGE`) — sem reiniciar nada e sem rodar script.

  **Se você seguiu a receita antiga, troque as variáveis.** Até esta versão, `docs/deploy-selfhost/README.md` e o `marca-emails.sh` mandavam apontar `GOTRUE_MAILER_TEMPLATES_*` para um **caminho de arquivo**. Isso não funciona e falha calado: o GoTrue cola o que não começa com `http` no fim do `SITE_URL` e faz um GET, então ele busca `https://SEU_DOMINIO/opt/.../confirmation.html`, recebe o HTML da tela de login e manda **isso** para a caixa de entrada do cliente. Medido em 2026-09-09; o Gmail marcou como phishing.

  Achado instalando numa VPS com Supabase próprio, seguindo a documentação do produto do começo ao fim.

- **Guias do assistente para quem instala, opera e contribui com um CLI de IA** Com o repositório aberto no Claude Code, Codex, Cursor, OpenCode ou Antigravity, cinco guias carregam sozinhos na hora certa: instalar e consertar a instalação, montar um cliente por nicho (agentes, roteadores, follow-ups, base de conhecimento), analisar as métricas sem expor dado pessoal, afinar o prompt de um agente com dados, e contribuir com um PR que passa na triagem de primeira. O roteiro do kit de instalação foi corrigido (a verificação em duas etapas é opcional; três provedores de IA; token do Supabase) e o banner final do instalador passa a refletir a escolha de telemetria.

- **Chamada de voz pelo WhatsApp — ligar e atender de dentro do CRM** O CRM passa a fazer e receber ligações de voz pelo WhatsApp. Quem administra pareia um
  segundo aparelho no mesmo número, em **Configurações › Conexões**, e o botão **Chamar**
  aparece na ficha de todo contato com telefone. Chamada recebida toca para o time inteiro,
  como um telefone de escritório; o painel da ligação em andamento, com mudo e desligar, é só
  de quem está na linha.

  O que o sistema faz por conta própria enquanto isso acontece:

  - **O assistente se cala durante a ligação** naquela conversa e volta a falar quando você
    desliga. Ele não responde por cima de alguém que está ao telefone com o cliente.
  - **Ligação atendida conta como contato feito.** O negócio deixa de aparecer como parado no
    Radar de Risco, e o assistente para de propor "retomar contato" com quem você acabou de
    atender.
  - **Ligação atendida conta como trabalho seu** no relatório de atendentes.
  - **Chamada perdida vira aviso na Central**, com o número de quem ligou, o motivo em
    português e um botão para ligar de volta.
  - **A linha do tempo do negócio diz quem atendeu**, não "Sistema".

  Três recusas deliberadas, porque o certo é não fazer:

  - **Contato que pediu para não ser incomodado não recebe ligação.** Quem mandou "PARAR" já
    não recebia mensagem; agora também não recebe telefonema.
  - **Só quem está na linha desliga.** Ninguém derruba a ligação de um colega.
  - **Apagar o canal não apaga o histórico de ligações** — a exclusão vira arquivamento, e o
    diálogo diz quantas chamadas estão penduradas antes de você confirmar.

  Quem exercer o direito de ser esquecido tem o telefone das chamadas apagado junto com o
  resto; quem pedir seus dados recebe o registro das ligações no relatório.

  Nada muda para quem não parear o recurso: ele é opcional e nasce desligado.

  Trabalho original de @eudanielhenrique.

### Alterado

- **A marca do produto ganha símbolo e logotipo** Instalação que não configurou marca própria passa a mostrar o logotipo do
  Deskcomm no menu lateral, na tela de entrada e no ícone da aba do navegador —
  no lugar do nome em texto e da letra "D" sobre a cor de destaque. Quem já
  definiu nome ou logo próprio em Marca não vê nenhuma diferença: a marca
  configurada continua valendo em todos esses lugares.

- **No editor de follow-up, dá para organizar o fluxo e excluir um nó ou uma aresta** Montar um follow-up no canvas exigia arrastar cada bloco à mão, e o único botão de
  apagar era o do fluxo inteiro. Quem errava uma ligação tinha que desfazer o rascunho
  ou começar de novo.

  Agora, no editor, **Organizar** empilha o fluxo conectado de cima para baixo;
  **Excluir nó** e **Excluir aresta** saem no painel do item selecionado e na barra de
  cima — sem apagar o fluxo. As ligações passam a ser em degrau (não diagonais por
  cima dos blocos), e os botões de zoom do canvas seguem o tema escuro em vez de
  sumirem no fundo branco da biblioteca.

### Corrigido

- **Webhook de captação agora reconhece o formato de lead do RD Station** Ao apontar um webhook do RD Station para uma fonte de captação de leads, os
  envios reais não viravam lead: o RD Station empacota os dados dentro de uma
  lista (`leads: [...]`), e o leitor de campos do webhook só olhava o nível de
  cima, então nome, e-mail e telefone chegavam "em branco" e a captação era
  recusada. O botão interno "Enviar lead de teste" funcionava porque manda os
  campos soltos — o que escondia o problema.

  Agora o webhook reconhece esse formato: extrai o nome, o e-mail e o telefone
  (inclusive quando o telefone vem no campo de celular do RD, e não no campo de
  telefone comercial, que costuma vir vazio) e cria o lead na fonte/funil/etapa
  configurados. Reenvio do mesmo evento pelo RD Station não gera lead duplicado.

  Os formatos que já funcionavam (campos soltos, Respondi) continuam iguais. Você
  não precisa fazer nada para adotar — a partir desta versão os leads do RD
  Station passam a entrar sozinhos.

- **Preferências de aviso param de divergir entre o servidor e o navegador** A tela de configurações de notificação abria com o navegador discordando do HTML que o servidor tinha mandado. Quem havia desligado o push de mensagem via, por um instante, o interruptor ligado — e o React reagia a essa discordância descartando e refazendo a árvore da tela no cliente.

  O valor era lido dentro do inicializador de `useState`, que roda de novo na hidratação. Sem `window`, essa leitura devolve o padrão (tudo ligado); com `window`, devolve o que está no `localStorage`. Os dois lados não tinham como concordar para quem tivesse mudado qualquer preferência — em dez interruptores e no identificador que a tela de alertas procura.

  A tela passou a ler as preferências por `useSyncExternalStore`, o mesmo mecanismo que o seletor de tema já usa desde o #666: existe um valor determinístico para a comparação de hidratação, e só depois do commit o React troca para o valor real. O interruptor continua respondendo na hora, sem recarregar a página.

  Sem mudança de configuração: nada a editar no `.env` e nenhum passo a mais na atualização.

  Achado a partir do relato de que a divergência reaparecia a cada conserto — a leitura do navegador voltava para dentro de um inicializador novo. Junto vem a guarda que reprova esse padrão, para que a terceira instância não nasça igual.

- **Quem é convidado entra na empresa ao confirmar o e-mail, sem mais um clique** Confirmar o e-mail vindo de um convite passa a **criar o vínculo** e abrir o CRM já dentro da empresa. Antes, a confirmação levava a uma tela com um botão "Aceitar convite" — e quem não o apertava terminava autenticado, sem organização e sem menu, num CRM vazio.

  Três consertos, todos no ciclo de vida do vínculo:

  - **O convite é aceito na própria confirmação.** A rota já sabia tudo o que o botão exigia, e com garantia mais forte: o e-mail do convite é comparado com o que o provedor de autenticação acabou de confirmar. Se o vínculo falhar (convite revogado, banco fora), a tela de aceite continua existindo e recebe a pessoa — nada fica sem saída.
  - **Clicar duas vezes no link do e-mail não desloga mais ninguém.** O token é de uso único: o segundo clique falhava e mandava para a tela de login **quem já estava logado pelo primeiro**, com o cookie de sessão intacto. A pessoa reentrava pela senha e perdia o fio do convite. Agora a rota reconhece a sessão que já existe e segue.
  - **Acesso revogado deixa de virar convite para abrir empresa.** Quem tinha o vínculo retirado caía numa tela vazia oferecendo "Configure sua organização" — uma revogação virando criação de tenant. Agora vê uma tela que nomeia o que aconteceu, e a ação de recuperação recusa com o motivo certo, em vez da mensagem sobre convite pendente que aparecia por acaso.

  Nada muda na configuração: não há variável nova, passo de atualização nem mudança de schema.

  Achado instalando numa VPS com Supabase self-hosted, com dois convidados reais que não conseguiram entrar.

- **Conectar um número de WhatsApp voltou a funcionar** Conectar um número de WhatsApp novo — no onboarding ou pela Central de Conexões — e reconectar
  um número que caiu falhavam com "Falha na comunicação com o WhatsApp (WAHA)" (`waha_create_400`),
  e o canal ficava preso em "Parado" pedindo reparo.

  A causa: o identificador interno que o sistema gera para a sessão no WAHA tinha 69 caracteres, e
  a versão do WAHA que o kit usa recusa identificadores com mais de 54 — então nenhuma sessão nova
  chegava a ser criada do outro lado. O identificador passou a ter 45 caracteres.

  Canais que já ficaram presos por causa disso são consertados na atualização (o identificador é
  regravado no formato novo); nenhum número já pareado é tocado. Depois de atualizar, quem estava
  travado é só clicar em Conectar/Reconectar de novo.

- **Revogar um membro deixa de ser uma porta que só abre por fora** Revogar sumia com a pessoa. Ela desaparecia da lista de Equipe, e a única forma de devolver o acesso era emitir um convite novo — um caminho longo, com três becos, todos medidos numa instalação real com alguém de verdade preso neles.

  **O que muda:**

  - **O membro revogado continua na lista**, com o estado `Revogado`, e quem administra devolve o acesso pelo menu da própria linha. Antes ele simplesmente sumia.
  - **Quem já tem conta e clica num convite** deixa de receber *"Não foi possível criar a conta. Tente novamente."* — instrução impossível, porque tentar de novo nunca funciona. Passa a ler que já tem conta, com um botão que entra **e** cai direto no aceite.
  - **A tela de acesso revogado deixa de ser beco:** ela diz que, se chegou convite novo, o link do e-mail funciona mesmo dali.

  **Nada disso mudou o banco.** O comando que aceita convite já sabia reativar quem foi revogado, desde que o convite seja posterior à revogação — e foi exatamente isso que a prova em tela confirmou. O que faltava era caminho até ele.

  **Reativar não promove.** Ela devolve o papel que a pessoa tinha; trocar papel continua sendo outra ação, com outra rota. Juntar as duas faria uma reativação distraída virar promoção silenciosa.

  **Quem devolveu o acesso fica registrado** (`member.reactivated`). A coluna que guarda a revogação volta a ficar vazia e não conta história nenhuma — a trilha é a única resposta para "quem readmitiu esta pessoa, e quando?".

- **Uma requisição que demora demais não vira mais um erro genérico na tela** Quando uma chamada à API não respondia a tempo, o navegador mostrava um erro genérico ("signal is aborted without reason") em vez de dizer que foi um tempo esgotado. Agora o motivo do cancelamento vem explícito, com o mesmo nome que o resto do produto já usa para timeout — quem lida com o erro consegue reconhecê-lo, e quem só vê a tela entende o que aconteceu.

- **A chamada de voz avisa quando não há áudio, em vez de contar o tempo em silêncio** O painel da ligação em andamento mostrava o cronômetro correndo assim que o WhatsApp
  atendia — e o cronômetro continuava correndo mesmo quando o som não chegava ao navegador.
  Uma ligação muda tinha exatamente a mesma aparência de uma ligação perfeita: nenhum aviso,
  nenhum sinal, só o relógio. Quem instalou numa VPS ficava sem saber se o problema era o
  microfone, a rede do escritório ou o produto.

  Agora o painel escuta a conexão de áudio de verdade. Enquanto ela está abrindo, ele diz
  **"Abrindo o áudio…"**. Se ela não abrir, ele diz **"Sem áudio: o canal de voz não abriu"**
  — e o cronômetro continua, porque a ligação existe mesmo e o outro lado está esperando. O
  silêncio deixa de se disfarçar de normalidade.

  Se o servidor de voz demorar demais para responder, o aviso aparece em até 12 segundos, em
  vez de "Abrindo o áudio…" para sempre. E se a conexão se restabelecer depois de um soluço
  de rede, o aviso some sozinho.

  Nada muda para quem não usa chamada de voz.

  Trabalho original da chamada de voz de @eudanielhenrique.

- **O laço rápido do worker volta a montar o admin client** `@react-pdf/hyphenate` é ESM puro e não expunha a condição `require` no seu `exports`. Como o worker roda via `tsx` (CommonJS), qualquer import de `@react-pdf/renderer` (usado pela exportação de dados LGPD) derrubava `carregarDeps()` do drain loop com `ERR_PACKAGE_PATH_NOT_EXPORTED` — e como `register-handlers.ts` registra os 12 handlers do `event_log` num só import chain, isso tirava o laço rápido de TODOS eles, não só do LGPD, caindo pro cron de 1×/min como única rede de segurança.

  Patch (`patches/@react-pdf__hyphenate.patch`) acrescenta a condição `require` ao exports map — Node 22.12+/24 já sabe carregar ESM via `require()` quando o mapa permite. Provado no worker real: o warning "event-log drain OFF" some do log de boot.

## [1.18.1] — 2026-09-11

### Corrigido

- **Campo de múltipla escolha volta a ser editável nas configurações do funil** Um campo do funil do tipo "múltipla escolha" abria em Configurações → Funis com o seletor de tipo em branco e sem a lista de opções, como se estivesse corrompido — não dava para editá-lo, e trocar o tipo para tirar o branco rebaixava a escolha múltipla para escolha única. Agora a tela oferece todos os tipos que o sistema aceita e mostra as opções de qualquer campo de lista fechada.

- **A letra volta a aparecer sobre o destaque colorido da agenda** Na agenda, o que estava selecionado — a aba do histórico, o dia de hoje na grade, o horário escolhido na marcação — pintava o fundo com a cor da marca e deixava a letra na cor do texto da página. Em instalação com marca escura, isso era escuro sobre escuro. A letra agora recebe a cor de contraste que a marca calcula, nos dois temas.

- **O seletor de tema não gera mais erro de hidratação no console** Quem tinha o tema escuro (ou claro) salvo via, no console do navegador, um aviso de "hydration mismatch" ao abrir qualquer tela — o React reclamando que o HTML do servidor e o do navegador não batiam no ícone e no texto do botão de tema. O visual não quebrava, mas o erro aparecia sempre. Agora a primeira renderização do navegador bate com a do servidor, e o tema salvo é aplicado logo em seguida, sem gerar aviso nenhum.

## [1.18.0] — 2026-09-10

### Adicionado

- **A IA espera e mostra "digitando…" antes da primeira resposta** O atendimento automático deixa de responder no mesmo instante em que termina de pensar. Antes da primeira mensagem de cada resposta, ele acende o "digitando…" no WhatsApp do cliente e espera um tempo proporcional ao tamanho do texto — entre 1,2 e 7,5 segundos.

  A pausa acontece uma vez por resposta. O intervalo entre as mensagens seguintes continua sendo o mesmo de sempre, o que protege o número contra bloqueio.

  Nada muda na configuração: não há variável nova para preencher nem passo de atualização.

  Trabalho original de @w4rlockem, a partir do relato de um dono de instalação de que a IA "responde rápido demais, parece robô".

- **Central de avisos ganha o botão "Marcar todos resolvidos"** A Central de avisos (`/app/ai/inbox`) só resolvia aviso por aviso. Com a lista acumulando —
  144 abertos numa instalação real — a única saída era clicar item a item. Agora, na aba
  "Abertos", o botão **Marcar todos resolvidos** fecha todos de uma vez: uma única atualização
  escopada à sua organização, registrada na auditoria com a contagem. Se o lote falhar, a tela
  avisa e pede para conferir a lista — nada é fechado em silêncio.

  No mesmo passe, o título e o texto de cada aviso deixaram de passar pelo tradutor da
  interface. Eles são escritos no momento do evento e carregam nome de cliente, número e o que
  você cadastrou; quem usa o sistema em espanhol passa a ler o aviso exatamente como ele foi
  gravado. Os rótulos da tela seguem traduzidos.

  Trabalho original de @rafaelbatistazz.

- **A IA passa a preencher os campos que você criou no funil** Você pode declarar até 50 campos por funil — prescritor, metragem do imóvel,
  convênio, o que o seu negócio precisa — e a ficha do lead desenha todos eles.
  Só que nenhum agente de IA conseguia escrever num campo desses: ele lia a
  conversa, entendia o dado e não tinha onde guardar.

  Agora tem. Quando o agente descobre uma informação que você declarou como campo
  do funil, ele grava ali — e a mudança aparece na linha do tempo do lead como
  qualquer outra edição, com o autor identificado.

  Nada muda para quem não usa campos personalizados, e nada muda no que os agentes
  já faziam. Quem instrui o agente a preencher um campo passa a ser obedecido; quem
  não instrui, segue igual.

  Contribuição de **@rafaeskytrabalho**.

- **O balão do atendimento mostra de onde saiu cada mensagem** O balão de uma mensagem enviada agora identifica a origem dela: **Celular** para
  a resposta dada pelo WhatsApp do telefone (fora do CRM), **IA** para o agente,
  **Você** para o que você mesmo digitou no CRM e **Atendente** para o que outra
  pessoa da equipe digitou.

  Antes, só a IA era identificada. A resposta dada pelo celular chegava à conversa
  sem rótulo e parecia ter sido digitada no CRM — enquanto o painel de atividade já
  contava esse atendimento como feito por fora. Agora a conversa mostra o que o
  painel sempre soube.

- **O aviso de compromisso ganha quem o dispare — e quem o ligue** O tipo de agendamento sempre teve "avisar o cliente antes" e quantos minutos
  antes avisar. Não havia quem lesse nem quem ligasse: a configuração existia no
  banco, nenhuma parte do sistema olhava para ela, e não havia controle nenhum na
  tela.

  Agora existe o par inteiro. Em **Configurações › Tipos de agendamento**, cada
  tipo tem "Avisar o cliente antes do compromisso, pelo WhatsApp" e quantos
  minutos antes — de 15 minutos a 7 dias. A lista mostra quem está ligado, sem
  precisar abrir nada: quem olha a tela sabe de que tipo vai sair mensagem.

  A cada cinco minutos o sistema procura compromisso confirmado que está chegando,
  cuja antecedência já venceu e que ainda não foi avisado, e manda para a pessoa
  vinculada uma mensagem no WhatsApp com o que é, quando e onde.

  Só chega a quem está vinculado ao compromisso: agendamento sem pessoa vinculada
  continua sendo só uma linha na sua agenda, como era. O aviso respeita a janela
  de envio do canal — ninguém é acordado às seis da manhã por causa de uma
  retirada às dez —, e sai uma vez só por compromisso.

  Quem recusou receber campanha **continua recebendo** o aviso do próprio
  compromisso: dizer a alguém que o pedido dele está pronto não é propaganda.

  **Nada começa a sair sozinho.** O aviso nasce desligado em todo tipo de
  agendamento, e atualizar não liga nada em lugar nenhum: mandar mensagem para o
  telefone de um cliente é irreversível, e ninguém deve ser inscrito nisso por um
  valor padrão. Enquanto ninguém marcar a caixa, nenhuma instalação envia lembrete.

  Desligar o aviso guarda a antecedência escolhida — religar amanhã não faz
  começar de novo.

  Contribuição de **@rafaeskytrabalho**.

### Corrigido

- **A barra lateral volta a acompanhar a página** Em tela com conteúdo longo — a agenda, o kanban cheio, a lista de contatos — a
  barra de navegação rolava junto com a página: você descia, o menu subia e sumia,
  e sobrava uma faixa vazia no lugar dele. Para trocar de tela era preciso voltar
  ao topo.

  Ela agora fica parada enquanto o conteúdo rola, que é como sempre foi a intenção.

  Nada muda no que você faz nem na configuração; é comportamento de tela.

  Contribuição de **@rafaeskytrabalho**.

- **A IA não envia falso aviso de mensagem vazia** Antes de enviar uma resposta, o atendimento automático bloqueia a afirmação de que a mensagem chegou vazia quando o texto recebido está confirmado no CRM.

  Trabalho original de @CristianoFF43, medido na instalação dele.

- **Abrir uma conversa por link direto para de esperar a lista carregar** Quem chega ao Inbox por um link direto para uma conversa — `/app/inbox/<id>`, o clique num
  aviso, o retorno de uma tela de IA — via a coluna do contato (demandas, memória, negócios)
  demorar vários segundos a mais que o resto da tela, sobretudo quando a conversa não aparece na
  aba aberta (por exemplo, uma conversa já encerrada).

  A causa era ordem, não peso: a busca da conversa por id só começava depois de a lista de
  conversas terminar de carregar — e a lista carrega **duas vezes** por abertura de tela, porque
  o filtro da aba Fila muda quando o sistema descobre se a organização tem atendimento automático
  de pé. Eram quatro idas ao servidor em fila indiana antes de o painel do contato poder começar.

  Agora a busca da conversa sai junto com a lista, e não atrás dela.

- **A IA para de perder os horários da noite quando o cliente pede um dia** Quando o cliente nomeava uma data ("pode ser dia 13?"), o atendimento automático
  montava o dia de meia-noite a meia-noite no relógio de Londres. Em quem atende no
  Amazonas, esse dia terminava às 19h59 — e um horário das 21h que o próprio
  atendimento tinha acabado de oferecer sumia da consulta seguinte, como se a agenda
  estivesse cheia. Agora o dia pedido é o dia do fuso da agenda, do começo ao fim.

  Achado e corrigido por @CristianoFF43, na instalação dele, no PR #612.

- **A IA passa a responder à última mensagem recebida** O atendimento automático deixa de tratar como vazia uma mensagem que chegou com texto quando um resumo anterior estiver incorreto.

  Trabalho original de @CristianoFF43, medido na instalação dele.

- **Conectar um número de WhatsApp voltou a funcionar** Conectar um número de WhatsApp novo — no onboarding ou pela Central de Conexões — e reconectar
  um número que caiu falhavam com "Falha na comunicação com o WhatsApp (WAHA)" (`waha_create_400`),
  e o canal ficava preso em "Parado" pedindo reparo.

  A causa: o identificador interno que o sistema gera para a sessão no WAHA tinha 69 caracteres, e
  a versão do WAHA que o kit usa recusa identificadores com mais de 54 — então nenhuma sessão nova
  chegava a ser criada do outro lado. O identificador passou a ter 45 caracteres.

  Canais que já ficaram presos por causa disso são consertados na atualização (o identificador é
  regravado no formato novo); nenhum número já pareado é tocado. Depois de atualizar, quem estava
  travado é só clicar em Conectar/Reconectar de novo.

## [1.17.0] — 2026-09-08

### Adicionado

- **Acompanhar uma organização com acesso temporário de verdade** A administração abre a organização escolhida com a identidade real de quem
  presta suporte. É possível escolher edição ou somente leitura, sem adicionar
  um membro permanente à equipe. O banner identifica a organização e oferece a
  saída; ao encerrar, os dados da organização anterior são carregados novamente.

  O modo somente leitura também impede alterações feitas por chamadas diretas.
  Quando o prazo ou a permissão terminam, a tela pede encerrar o acompanhamento
  antes de continuar.

  As atualizações em tempo real aguardam a autenticação antes de abrir os canais,
  inclusive ao trocar de organização ou acompanhar em mais de uma aba.

- **Crie o Google Meet e acompanhe a entrega do link na conversa** Compromissos com local Google Meet solicitam o link na agenda Google escolhida. O detalhe mostra criação pendente, link pronto ou falha com nova verificação. Quando pronto, você pode abrir e copiar o link.

  O envio na conversa tem autorização e estado próprios. Escolha o atendimento e use “Enviar quando ficar pronto” ou “Enviar link ao cliente”. Marcar pelo assistente no atendimento atual agenda essa entrega. Se o atendimento mudar, a equipe recebe um aviso e pode autorizar uma nova entrega. Criar o link não significa que a mensagem já foi enviada.

  Autorizar somente o link em um atendimento humano não ativa a IA nem muda o responsável ou o silêncio configurado. Bloqueios de mensagens e restrições do canal continuam valendo, com orientação no detalhe.

  Depois de encerrar e reabrir o atendimento, uma nova entrega exige outro clique de autorização. Avisos da Central abrem o compromisso correspondente. O PDF de acesso aos dados também inclui entregas de links e avisos sobre compromissos, com seus estados e datas.

- **Escolha suas agendas e resolva mudanças entre a Agenda e o Google** Em Configurações → Agenda, escolha quais agendas Google ocupam seus horários e um destino gravável para novos compromissos. Os já publicados continuam na agenda original. Mudanças de horário e cancelamento são reconciliadas; quando ambos os lados mudam, o detalhe mostra a comparação e pede uma decisão. Alterar só o horário preserva os campos modificados diretamente no Google.

  A tela informa erro, última sincronização, leitura parcial e retentativa. Comparecimento e falta continuam sendo fatos registrados pela equipe; mudanças no Google preservam o contato, a conversa e o histórico daqui.

  Retentativas conservam a identidade do compromisso. Uma edição concorrente continua pendente até ser reconciliada; corrigir uma série no Google permite retomar a comparação. A anonimização encerra a sincronização daquele titular sem impedir outros compromissos.

- **Confirme presença e acompanhe faltas pela Agenda** Compromissos podem ser ligados ao contato e à conversa. A equipe registra comparecimento, falta ou cancelamento; a Central lembra quando falta confirmar, com prazos ajustáveis em Configurações. A agenda protege o cliente de cobranças de silêncio indevidas. Faltas confirmadas podem iniciar um fluxo configurado, e o compromisso mostra quando outro acompanhamento ou a configuração impedem o início. Resposta do cliente, cancelamento e remarcação interrompem a recuperação antiga.

  As datas do detalhe seguem o idioma escolhido e o fuso do compromisso, inclusive quando ele termina no dia seguinte.

- **Testar o agente e revisar suas respostas antes de enviar** O agente pode preparar sugestões automaticamente para revisão humana. É possível editar,
  aprovar ou rejeitar o texto na conversa, acompanhar o envio e informar o que deve melhorar.
  Uma conversa alterada exige nova revisão. A aprovação do texto não executa mudanças no CRM
  ou na agenda.

  Pausar o atendimento automático preserva a versão publicada e mantém a assistência
  à equipe. O teste usa o motor e o conhecimento do agente, apresenta propostas sem
  aplicá-las ao cliente e fica disponível antes da publicação. Agentes antigos podem
  concluir a configuração pela própria tela, preservando instruções e conhecimento.

- **Abra o contexto dos avisos sem perder o acompanhamento** A Central oferece acesso à conversa, ao contato, ao negócio ou à configuração correspondente quando seu acesso permite. Contextos removidos ou indisponíveis recebem orientação sem link quebrado. Abrir o contexto mantém o aviso aberto; resolver e reabrir continuam sendo escolhas separadas.

- **Encerre a conversa e registre o resultado da demanda separadamente** O atendimento agora diferencia fechar uma conversa de concluir a demanda do cliente. O painel mostra a demanda vigente, permite registrar seu resultado e mantém os fatos duráveis do contato e o histórico encerrado.

  Uma nova mensagem após o fechamento reabre a fila com uma nova demanda. Trabalhos automáticos de um atendimento encerrado deixam de executar ações ou enviar respostas antigas depois da reabertura.

- **Escolha as áreas visíveis para cada pessoa da equipe** Quem administra pode escolher uma interface completa, simplificada ou personalizada por membro, inclusive antes de enviar o convite. A escolha vale em cada organização e atualiza a navegação de quem já está trabalhando sem fechar sua tela.

  A interface simplificada mantém as áreas de trabalho e Conexões quando o papel permite. A seleção muda o menu, a busca e a página inicial; permissões e links das conversas continuam seguindo o papel da pessoa.

- **Criar organizações já entrega acesso e convite ao responsável** Quem administra a instalação encontra Gerenciar organizações no seletor, mesmo
  quando só participa de uma empresa. A nova organização já inclui seu criador
  como administrador e oferece um convite copiável ao responsável, inclusive sem
  e-mail configurado. Falhas de criação não deixam empresas sem administrador.

  A troca de empresa reinicia os dados da tela e aceita somente acessos ativos.
  Reabrir um convite antigo não restaura privilégios removidos.

  Se a resposta da criação se perder, tentar novamente recupera a mesma organização
  e o link. O recibo dessa operação é protegido contra alterações por membros.

- **Escolha quem atende cada número e recupere conexões com segurança** Em Configurações › Atendimento, escolha os responsáveis de cada número. A capacidade da pessoa continua compartilhada entre canais; uma lista vazia deixa as conversas na fila, com aviso e novas tentativas. Conexões mostra o resumo e o caminho para ajustar a equipe.

  Conectar um número preserva a identidade em falhas e permite reparar a tentativa. Conflitos do serviço só contam como sucesso depois da confirmação da sessão correta. A versão padrão mantém a possibilidade de mais de uma sessão sem bloqueio por tier; a prova local cobre duas sessões aguardando QR, sem pairing ou envio real.

### Corrigido

- **A instalação não para mais no passo de criar o primeiro administrador** Instalar numa VPS podia falhar bem no fim, ao criar o primeiro administrador,
  com uma mensagem de erro do banco de dados. Quando acontecia, o banco já estava
  montado e as configurações já estavam gravadas — a instalação parava com tudo
  quase pronto e a tela oferecendo recomeçar do zero.

  O passo foi corrigido e o instalador passa a verificar isso sozinho antes de
  publicar uma versão nova, para que a falha não volte.

- **O endereço responde mesmo quando a hospedagem usa nomes próprios de porta** Em hospedagens com painel próprio (EasyPanel, entre outras), a instalação podia
  terminar com tudo no ar por dentro e o endereço mostrando a página de erro do
  painel: o instalador supunha os nomes que a hospedagem dá às portas 80 e 443, e
  quando eles eram diferentes o roteamento simplesmente não acontecia — sem erro
  em lugar nenhum.

  Agora o instalador lê esses nomes da própria hospedagem e mostra quais
  encontrou. Quem já tinha escolhido os nomes à mão continua com a escolha; quem
  instalou antes e ficou com o endereço mudo pode rodar a instalação de novo para
  que ela os detecte.

## [1.16.1] — 2026-09-07

### Corrigido

- **A conferência de imagens do instalador passa a olhar o registro que a instalação usa** Antes de baixar as imagens, o instalador confere se as três existem e são
  públicas. Essa conferência olhava sempre para o registro do projeto, mesmo em
  instalações configuradas para usar outro — então ela dizia "está tudo publicado"
  depois de conferir pacotes que não eram os que a instalação ia baixar, e o erro
  só aparecia mais tarde, na hora de subir. Agora ela olha o mesmo registro que a
  instalação usa.

  Nada muda para quem não trocou o registro: continua conferindo os mesmos
  pacotes, com o mesmo resultado.

## [1.16.0] — 2026-09-07

### Adicionado

- **Teste a IA no WhatsApp antes de abrir o atendimento ao público** Em Conexões, administradores podem ativar o modo de teste e cadastrar números
  de confiança por canal. Lista vazia bloqueia respostas automáticas; as mensagens
  continuam chegando ao Inbox para atendimento humano. Após validar, a abertura
  ao público exige confirmação e preserva a lista para uma futura rodada de testes.

  Novos canais começam em teste, sem números autorizados. Canais existentes e
  reconexões preservam a configuração atual. A atualização inclui a migration
  0218 no baseline; não é preciso editar variáveis de ambiente.

  Muda também para quem não vai usar o modo de teste: o follow-up automático por
  silêncio passa a usar a mesma regra do atendimento de entrada, e num canal com
  acesso da IA restrito ele deixa de inscrever contato cuja autorização já venceu
  (o prazo é o de sempre, `AI_ALLOWLIST_TTL_DAYS`). Antes bastava ter sido
  autorizado um dia; agora a autorização precisa estar valendo.

### Corrigido

- **A avaliação automática do atendimento volta a rodar em quem não usa Anthropic** A rodada que revisa os atendimentos e sugere melhorias pedia um modelo pelo nome
  fixo `claude-haiku-4-5`. Esse nome só existe no vocabulário da Anthropic, então
  em instalação apontada para outro provedor (OpenRouter, por exemplo) o provedor
  recusava a chamada e a rodada morria a cada disparo, sem sugestão nenhuma
  chegando à tela de Propostas. Agora os dois pontos do flywheel usam o modelo
  escolhido no painel de provedores e, na falta dele, o padrão da organização — o
  mesmo caminho de todos os outros pontos de IA.

- **A chave de IA cadastrada pela organização passa a valer também na medição de clima e na resposta do bot** Dois pontos de IA — "Medir o clima da conversa" e a resposta do bot — só usavam
  a credencial cadastrada em IA › Credenciais quando havia uma escolha explícita
  no painel de provedores. Sem essa escolha, eles iam direto para a chave que veio
  na instalação (`.env`), ignorando a chave que a organização cadastrou e validou
  na tela. Numa instalação cuja chave de `.env` estava revogada, isso aparecia
  como classificação de clima falhando com erro de autenticação enquanto o agente,
  que já usava a credencial da organização, respondia normalmente no mesmo minuto.

  Agora os dois seguem a mesma ordem do resto do produto: a escolha do painel,
  depois a credencial ativa e validada do provedor da organização e, só então, a
  chave da instalação. Nada a fazer — quem já tem credencial cadastrada passa a
  usá-la na próxima chamada.

- **O rodapé volta a mostrar a versão que está no ar, e não a de um rollback antigo** Quando uma atualização pela tela falha e o app volta sozinho para a versão
  anterior, o sistema passa a mostrar essa versão anterior — o que está certo:
  naquele momento o código baixado no servidor já é o novo, mas o app que subiu é
  o velho, e quem sabe qual dos dois está no ar é o registro da tentativa.

  O que faltava era o fim dessa validade. O app troca de versão por outros
  caminhos que não passam por essa tela — um deploy automático, um comando no
  terminal, a atualização feita à mão —, e nenhum deles registra uma tentativa
  nova. Sem isso, a tentativa que falhou continuava sendo a última notícia, para
  sempre: numa instalação real, o rodapé anunciou por oito dias uma versão de 28
  de agosto, atravessando vários deploys, enquanto a versão no ar era outra.

  Agora a tentativa antiga só nomeia a versão no ar enquanto for a notícia mais
  recente. Se o servidor reportou a versão depois de a tentativa ter terminado, é
  o servidor que vale. Isso conserta junto duas coisas que bebiam da mesma fonte:
  o aviso de "atualização disponível", que comparava contra a versão errada, e as
  notas de versão, que começavam a listar de um ponto errado do histórico.

  Nada muda para quem opera: nenhuma configuração nova, nenhum passo de
  atualização, nenhuma mudança no banco.

- **O espanhol cobre mais telas e mais mensagens de erro** Várias telas e mensagens de erro apareciam em português mesmo com a
  organização configurada para espanhol: o badge de status de um agente de
  IA, o painel de Segurança (STOP, LGPD, ritmo de envio…), os avisos de
  provedores de IA, os erros de verificação em duas etapas, os avisos de
  número/conta do WhatsApp na Central, o resumo de impacto ao excluir um
  número, e toda a mensagem de erro do módulo de Tarefas. Numa tela de
  Agenda da organização, o nome que o próprio operador deu a um tipo de
  atendimento chegou a ser traduzido por engano, trocando "Retorno" por
  "Seguimiento". Todos os casos foram corrigidos.

- **O botão de importar planilha volta a funcionar, e os leads entram na primeira etapa aberta do funil** O botão *Importar planilha*, no quadro do funil, estava morto. Quem escolhia o
  funil e mandava a planilha recebia sempre o mesmo aviso de erro — *"Escolha o
  funil e a etapa de destino"* — mesmo tendo escolhido o funil. Nenhum lead era
  criado, e não havia nada que o operador pudesse fazer para contornar: a tela não
  tem, nem deveria ter, um campo de etapa. A capacidade foi anunciada na 1.14.0 e
  seguiu assim nas duas atualizações seguintes — quem instalou a 1.14.0, a 1.15.0
  ou a 1.15.1 nunca conseguiu importar uma planilha.

  A causa era essa incompatibilidade mesmo: a tela pergunta só o funil, porque
  planilha traz gente nova e gente nova entra no começo do funil; o servidor, por
  outro lado, exigia que a etapa viesse junto. Agora o servidor resolve a etapa
  sozinho, que é o que a tela sempre prometeu.

  E ele resolve a etapa **aberta** de menos avançada — pulando as etapas de ganho
  e as de perda. Isso importa para quem reorganizou o próprio funil: numa
  instalação onde uma etapa do tipo *Pago* ou *Cancelado* foi arrastada para a
  primeira coluna, a importação teria feito a planilha inteira nascer como negócio
  já ganho, ou teria recusado todas as linhas devolvendo *"0 leads criados"* sem
  explicar por quê. Quem nunca mexeu na ordem das etapas não estava exposto a
  isso, porque o funil que vem pronto já começa com uma etapa aberta.

  Nada muda no dia a dia de quem opera a instalação: nenhuma configuração nova,
  nenhum passo de atualização, e nenhum lead já importado é tocado.

  O achado é de @JowaniOrantes, que encontrou o problema usando o sistema pela
  tela enquanto conferia a tradução para o espanhol — não lendo código.

## [1.15.1] — 2026-09-05

### Corrigido

- **Quem se cadastra numa instalação que não pede confirmação de e-mail para de ser mandado esperar um e-mail que não chega** Quem administra a instalação pode desligar a confirmação de e-mail no provedor
  de autenticação — é uma escolha comum, e às vezes é o estado em que uma VPS
  recém-montada já vem. Nesse modo, criar a conta **já entra no sistema**: não
  existe link nenhum para clicar, porque e-mail nenhum é enviado.

  A tela do cadastro não sabia disso e dizia assim mesmo: *"Enviamos um link de
  confirmação para o seu e-mail. Abra o e-mail e clique no link para ativar sua
  conta."* A pessoa fazia o que a tela mandou — esperava. O e-mail nunca chegava.
  Ela estava, o tempo todo, do lado de dentro, com a conta pronta e sem empresa
  nenhuma configurada, sem nenhuma razão para descobrir sozinha que bastava
  continuar.

  Agora, quando o sistema percebe que a pessoa já entrou, ele a leva direto ao
  passo seguinte, em vez de mandá-la esperar: quem se cadastrou por conta própria
  vai concluir a configuração da empresa, com o nome que ela mesma digitou no
  cadastro já preenchido; quem se cadastrou a partir de um convite vai aceitar o
  convite, e continua sem ganhar uma empresa própria por engano.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização. Quem já usa o sistema com confirmação de
  e-mail ligada não vê diferença nenhuma — a tela do e-mail continua igual, porque
  nesse caso o e-mail realmente vai chegar.

  O achado é de @KIRAzinx566, que instalou o sistema para um cliente e o encontrou
  parado nessa tela.

## [1.15.0] — 2026-09-05

### Adicionado

- **Meta Ads — o desempenho das campanhas dentro do CRM** Análise ganhou uma tela de Meta Ads: as campanhas da conta de anúncios com
  resultado, custo por resultado, gasto, alcance, CPM, CTR, CPC e mais, lidos da
  plataforma quando se clica em Atualizar.

  Nada é armazenado — só a credencial de leitura, criptografada, conectada em
  Configurações › Meta Ads. A conexão é só de leitura: nada é alterado na conta de
  anúncios.

- **A venda fechada no CRM volta para o anúncio que a trouxe** Quem paga tráfego não tinha como contar à plataforma quais leads viraram
  dinheiro, então o algoritmo otimizava por conversa iniciada, não por venda.

  Agora, marcar um negócio como ganho reporta a venda, com o valor. Configura-se
  em Configurações › Conversões, com token criptografado, botão de pausa e a lista
  do que falhou. Sem credencial, nada muda.

- **O compromisso da agenda agora convida o cliente por e-mail** Não havia onde escrever o e-mail do cliente, então o convite do Google nunca era
  enviado a ninguém.

  O novo agendamento ganhou um campo de convidado: ele recebe o convite e a
  resposta aparece no evento. Em branco, tudo segue como antes.

- **Juntar contatos duplicados** A mesma pessoa cadastrada duas vezes agora vira uma só, pela tela. Em
  **Contatos**, o botão "Duplicados" mostra os cadastros que parecem ser da mesma
  pessoa, lado a lado; você escolhe qual fica e junta.

  O sistema encontra os pares que o cadastro sozinho não vê: o mesmo celular
  escrito de dois jeitos (com e sem o nono dígito), o mesmo e-mail, e o número que
  o WhatsApp encontrou repetido e deixou marcado esperando alguém decidir.

  **Nada de histórico se perde.** Mensagens, negócios do funil, atividades,
  tarefas e anexos passam todos para o cadastro que fica — inclusive o que ainda
  não existia quando isto foi escrito: a lista do que precisa ser movido é lida do
  próprio banco na hora, não de uma lista fixa. O WhatsApp do cadastro antigo passa
  a cair no que ficou, então a mensagem seguinte não recria a duplicata.

  Quando os dois cadastros já conversavam pelo **mesmo número de WhatsApp**, a
  *conversa* do cadastro antigo não pode ser transferida — o sistema guarda uma
  conversa por pessoa em cada número, e o cadastro que fica já tem a dele. As
  mensagens vão todas para quem ficou; a conversa antiga permanece registrada, e
  a tela avisa **quantos** registros ficaram para trás em vez de dizer só
  "pronto".

  O cadastro absorvido **não é apagado** — ele sai da lista de contatos e fica
  como registro da fusão, e é isso que libera o telefone e o e-mail para o
  cadastro que ficou herdar o que faltava nele. Campos que o cadastro vencedor já tinha preenchidos nunca são
  sobrescritos; CPF e consentimento de contato não são herdados de propósito, por
  serem registro legal de uma pessoa específica.

  Junção fica com quem tem papel de **gerente** ou acima, aparece no histórico do
  negócio e é registrada na auditoria. **Não há como desfazer**, então a escolha
  de qual cadastro fica é sempre sua — o sistema apenas sugere o de atividade mais
  recente — e antes de juntar aparece uma confirmação dizendo, pelo nome, qual
  cadastro fica e qual é absorvido. Contato anonimizado por pedido de LGPD nunca entra numa junção.

  Nada muda para quem não usar: sem clicar em "Duplicados", tudo segue como antes.

  Isto veio da contribuição de James, da Clínica Centro do Sorriso
  (**@clinicacentrodosorrisosc-code**), que resolvia o mesmo problema no nível do
  card do funil; aqui a peça é o contato, que é a mesma em todo tipo de negócio.

- **Selecionar vários cards do funil e agir neles de uma vez** Mover trinta negócios de etapa deixou de ser trinta arrastes. No quadro do
  funil, cada card ganhou uma caixa de seleção, e o cabeçalho de cada etapa ganhou
  outra que marca a etapa inteira de uma vez. Segurando **Shift**, um clique
  seleciona tudo entre o card anterior e o que você clicou; **Ctrl** (ou **⌘**)
  continua marcando um a um. O clique simples segue abrindo o negócio, como sempre.

  Com algo selecionado, a barra que aparece no rodapé faz o resto: mover para
  outra etapa, aplicar ou tirar etiqueta, excluir — e agora também
  **trocar o responsável para qualquer atendente da equipe**, não só para você.
  Redistribuir a carteira de quem saiu de férias virou uma operação de dois
  cliques.

  Três detalhes que só se percebe usando:

  - A contagem no alto da etapa mostra quantos você marcou dela ("7/23"), para não
    ser preciso conferir card a card.
  - Seleções grandes não esbarram mais num limite invisível: acima de cinquenta, o
    sistema divide sozinho. Se algo falhar no meio, ele diz **quantos** já haviam
    sido alterados, em vez de só "deu erro".
  - A ordem dos cards movidos é preservada na etapa de destino, e eles entram no
    fim dela. Antes, um lote inteiro caía na mesma posição — o quadro se
    reorganizava sozinho a cada atualização, e o primeiro arraste depois disso
    podia jogar um card para um lugar imprevisível. Isso acabou.

  A barra também passou a falar o vocabulário do funil: quem renomeou "Lead" para
  "Cliente" ou "Pedido" vê a própria palavra.

  Nada precisa ser ligado, e nada muda para quem prefere arrastar um por um.

  Isto veio da contribuição de James, da Clínica Centro do Sorriso
  (**@clinicacentrodosorrisosc-code**).

- **Relatório de atividades — o que aconteceu no período, e quem fez** Uma tela nova, **Atividades**, dentro de Análise: o que aconteceu na operação
  nos últimos 7, 30 ou 90 dias. Até aqui o histórico só existia dentro de cada
  negócio — responder "o que a equipe fez esta semana" obrigava a abrir negócio
  por negócio.

  A tela abre com a resposta em três números: quanto do trabalho foi **da equipe**,
  quanto foi **dos agentes de IA**, e quanto foi **automático** — regra, sistema,
  ou a própria pessoa atendida. Um mês inteiro atendido pela IA e um mês inteiro
  atendido pela equipe têm o mesmo resultado no funil e histórias opostas; esta é
  a tela que separa as duas.

  Abaixo, o período em barras por dia (dia parado aparece como buraco, que é a
  informação), o ranking de quem trabalhou, o ranking do que foi feito, e a lista
  dos acontecimentos mais recentes — cada linha com um atalho para o negócio de
  onde ela veio. Quando a lista é cortada, a tela diz que cortou e quantos houve
  no total: período movimentado não vai parecer calmo.

  O dia é agrupado no fuso de quem lê, não no do servidor: o atendimento das 21h
  conta no dia em que aconteceu.

  Cada pessoa vê o que já podia ver — quem atende em modo "só os meus" continua
  vendo só os próprios negócios, e o relatório de uma organização nunca conta a
  atividade de outra.

  Isto veio da contribuição de James, da Clínica Centro do Sorriso
  (**@clinicacentrodosorrisosc-code**).

- **Tarefas com prazo, no CRM** "Ligar de volta na terça" agora tem onde morar. Uma tela nova, em
  **CRM › Tarefas**, guarda o que o time combinou fazer — com prazo, prioridade
  e a opção de prender a tarefa a um negócio.

  A lista separa o que já venceu do que vence hoje, desta semana e mais tarde. E
  há um calendário do mês para quem prefere ver o prazo no lugar dele: clicar num
  dia abre a tarefa já com aquela data.

  Tarefa presa a um negócio deixa uma linha na história dele. Quem abre o card vê
  que há um retorno combinado, em vez de encontrar uma conversa que parou sem
  explicação — e a conclusão fica registrada também.

  Quem só acompanha (papel "visualizador") enxerga o que o time combinou; criar,
  editar e apagar é a partir do papel de atendente.

  Isto veio da contribuição de James, da Clínica Centro do Sorriso
  (**@clinicacentrodosorrisosc-code**), que usou o sistema numa operação real por
  seis semanas e construiu o módulo do zero.

- **Recomeçar do zero os dados de teste da organização** Quem passou dias experimentando — mandando mensagem para o próprio número,
  criando contato de mentira, arrastando negócio no funil — agora limpa tudo antes
  de atender cliente de verdade.

  Em **Configurações › Organização** há a **Zona de perigo**: ela apaga de vez as
  mensagens, conversas, negócios, contatos, agendamentos e pedidos daquela
  organização. Continuam de pé a equipe, as configurações, os funis, os agentes de
  IA e os canais de WhatsApp — o que deu trabalho para configurar não se refaz.

  Só quem administra enxerga o botão, e ele não dispara no clique: é preciso
  digitar o nome da empresa como está cadastrado. O sistema confere esse nome de
  novo no servidor e registra na auditoria quem apagou, quando e quanto.

  Contribuição de Mauricio Garcia (**@maugarciasa**).

### Alterado

- **Nuvemshop sai do menu lateral** A Nuvemshop saiu do menu, por decisão do dono do produto. Nada é apagado: quem
  tem a loja conectada continua conectado, e a tela segue alcançável pela busca.

- **Análise ganhou uma tela de visão geral, e o menu voltou a caber** Com a chegada de **Atividades**, o grupo Análise da barra lateral passou a ter
  cinco telas — e o menu inteiro deixou de caber num notebook comum, obrigando a
  rolar para ver o fim da lista. Grupo que só aparece se você rolar é grupo que
  ninguém sabe que existe. É a mesma história que o CRM viveu com a chegada de
  Tarefas, e tem a mesma resposta.

  Agora a Análise tem sua própria tela de visão geral, igual à que o CRM e o
  Agente de IA já tinham: **Análise › Ver tudo em Análise**. Ela lista as cinco
  telas do grupo com a frase que explica cada uma, separadas entre os números que
  se olham toda semana e o histórico que se consulta quando alguém pergunta por
  quê.

  No menu ficam **Desempenho**, **Meta Ads** e **Atividades** — as três perguntas
  que se refazem toda semana: como foi o mês, quanto custou trazer quem chegou, e
  o que a equipe e a IA fizeram no período. **Evolução da IA** e **Audit Log**
  passaram a morar dentro da visão geral: são visitas de propósito — revisar o
  agente, ou descobrir quem mexeu em quê depois que algo deu errado —, não telas
  de passagem. As duas continuam alcançáveis pela busca (Ctrl/⌘ + K) pelo nome de
  sempre, e nenhum endereço mudou: link salvo continua funcionando.

  Nada muda para quem opera a instalação: nenhuma configuração nova, nenhum passo
  de atualização.

- **O CRM ganhou uma tela de visão geral, e o menu voltou a caber** Com a chegada de **Tarefas**, o grupo CRM da barra lateral passou a ter cinco
  telas — e o menu inteiro deixou de caber num notebook comum, obrigando a rolar
  para ver os últimos grupos. Grupo que só aparece se você rolar é grupo que
  ninguém sabe que existe.

  Agora o CRM tem sua própria tela de visão geral, igual à que o Agente de IA já
  tinha: **CRM › Ver tudo em CRM**. Ela lista as cinco telas do grupo com a frase
  que explica cada uma, separadas entre o que se usa todo dia e o que se define
  uma vez.

  No menu ficam **Funis**, **Contatos** e **Tarefas** — o que se abre toda manhã.
  **Produtos** e **Etapas do funil** passaram a morar dentro da visão geral: são
  telas de montagem (cadastrar o catálogo, desenhar as colunas do funil), não de
  uso diário. As duas continuam alcançáveis pela busca (Ctrl/⌘ + K) pelo nome de
  sempre, e nenhum endereço mudou — link salvo continua funcionando.

  Nada muda para quem opera a instalação: nenhuma configuração nova, nenhum passo
  de atualização.

### Corrigido

- **O aviso de "canal calado" para de ficar preso aberto na Central** Quando a janela de envio do WhatsApp fechava (fora do horário anti-banimento,
  por padrão 7h–22h), a Central mostrava um aviso avisando que as respostas
  estavam esperando a janela abrir. O aviso deveria desaparecer sozinho assim
  que a janela reabrisse — e não desaparecia. Ele ficava aberto o dia inteiro,
  mesmo com o agente respondendo normalmente, dando a impressão de canal (ou
  loja) fechado quando não estava.

  A causa era uma coluna que o código esperava e o banco não tinha:
  `agent_inbox_items.resolved_at`. Toda tentativa de fechar o aviso falhava
  silenciosamente. Agora a coluna existe, e o aviso fecha sozinho no mesmo
  turno em que a janela é encontrada aberta, como sempre foi a intenção.

## [1.14.0] — 2026-09-04

### Adicionado

- **A organização escolhe a própria moeda** Até aqui, todo catálogo era em reais, sem essa escolha aparecer em lugar
  nenhum — mesmo para quem opera em outro país. Em **Configurações › Organização**,
  ao lado de Idioma e Fuso horário, agora há um campo Moeda com real brasileiro,
  peso mexicano e dólar americano.

  O que você escolher ali passa a valer para todo produto cadastrado a partir de
  agora — pelo formulário ou pela importação por planilha — e o preço aparece na
  tela exatamente como o comerciante daquela moeda espera ler: peso mexicano com
  ponto decimal e cifrão na frente, por exemplo, em vez de sair com vírgula e o
  código da moeda colado no número.

  Produto que já estava cadastrado mantém a moeda com que nasceu.

- **Conta confirmada que ficou sem empresa agora tem como terminar o cadastro** Quando a criação da empresa falhava após a confirmação do e-mail, a conta ficava
  sem saída e só destravava pelo banco. Agora cai numa tela que pede o nome da
  empresa e conclui o cadastro. Tela de @prevprocesso-maker.

- **A IA pode ser limitada a atender só leads de origem conhecida** Num número de WhatsApp que também é usado para falar com clientes, fornecedores
  e contatos pessoais, a IA respondia todo mundo assim que um agente era
  publicado. Agora dá para ligar, por canal, o modo "só atende quem eu autorizei":
  a IA fica em silêncio por padrão e só assume a conversa quando o lead veio de
  uma origem elegível — uma submissão nova de formulário, uma campanha
  identificada, ou uma liberação manual pela tela. Histórico antigo, existência do
  contato, conversa anterior ou reinício de um worker nunca autorizam sozinhos.

  Esse limite vale para TODOS os caminhos de resposta automática — o motor do
  agente, o follow-up, o texto fixo de fluxo, o worker de resposta legado e a
  passagem para humano por sentimento. Não há atalho: nenhum deles envia mensagem
  de IA para uma conversa não autorizada.

  Além disso, e independentemente desse modo: quando você responde um cliente à
  mão pelo próprio WhatsApp (celular, ou outra plataforma na mesma conta), a IA
  para naquela conversa para não responder junto.
  **Essa pausa dura uma hora, e se renova a cada mensagem sua.**
  Enquanto você estiver atendendo, a IA continua calada; quando você para, a hora
  corre e ela volta a atender aquela conversa sozinha. Você não precisa lembrar de
  religar nada.

  Se quiser a IA de volta antes da hora, é o botão "devolver ao automático" na
  conversa. E se quiser que ela fique parada por tempo indeterminado, é o mesmo de
  sempre: assumir a conversa pela tela — aí ela só volta quando você devolver.
  Nenhuma dessas coisas apaga a origem do lead.

  Quem não ligar o modo "só atende quem eu autorizei" mantém o comportamento de
  antes para todo o resto.

- **Importar leads de uma planilha** A lista de clientes que já está no Excel agora entra no funil sem digitação. Em
  **Funis**, o botão "Importar planilha" pede um arquivo CSV e cria um negócio por
  linha, na primeira etapa do funil escolhido.

  O importador reconhece os cabeçalhos usuais — nome, telefone, e-mail, valor,
  origem, tags, observação — em português, com ou sem acento, e aceita o
  ponto-e-vírgula que o Excel brasileiro usa. Valor escrito como "R$ 1.200,00"
  entra certo.

  Quando a planilha traz telefone, o contato é criado junto e ligado ao negócio —
  e o mesmo número repetido em várias linhas vira um contato só, não vários.

  Nada é aceito no escuro: ao terminar, a tela mostra quantos negócios entraram,
  quantos contatos foram criados, quais colunas o importador não reconheceu e
  quais linhas foram recusadas, com o motivo e o número da linha como você a vê na
  planilha. Uma linha com erro não derruba as outras.

  Há uma planilha modelo para baixar, para quem prefere começar do formato certo.

  Isto veio da contribuição de James, da Clínica Centro do Sorriso
  (**@clinicacentrodosorrisosc-code**).

- **O contato ganha campos personalizados do seu nicho** Os campos que você define em Funis › Campos personalizados passam a aparecer em
  Contatos › Editar, e são apagados quando o contato é anonimizado. Campos de
  @prevprocesso-maker.

### Alterado

- **A conferência de código que roda antes de cada versão para de ser interrompida pelo relógio** Nada muda na sua instalação: nenhuma configuração nova, nenhum passo de
  atualização, nenhuma tela diferente. O que mudou fica do nosso lado — e é o
  mesmo tipo de conserto que a conferência de tela já tinha recebido, agora feito
  onde ele ainda faltava.

  Antes de qualquer correção entrar no produto, uma bateria confere o código
  inteiro: tipos, estilo e sete mil verificações automáticas. Ela tem um tempo
  máximo, e vinha sendo **cortada no meio** — não porque a conferência tivesse
  crescido, mas porque o preparo da máquina que a roda ficava esperando um
  servidor de terceiros. Medido em 95 execuções: a conferência em si nunca passou
  de 10 minutos, e a espera do preparo chegou a 7.

  Corte por tempo não distingue "quebrou" de "demorou". Quando ele acontece, a
  correção não é reprovada nem aprovada: ela volta para a fila, e o conserto que
  você espera chega mais tarde sem que nada tivesse dado errado. Pior: quem
  contribui de fora vê a própria proposta marcada como reprovada sem ter feito
  nada errado.

  O preparo passa a guardar o que baixou e não depende mais daquele servidor no
  caminho normal. O limite de tempo continua onde estava — é ele que avisa, da
  próxima vez, que a conferência cresceu de verdade.

- **A conferência de tela que roda antes de cada versão para de ser interrompida pelo relógio** Nada muda na sua instalação: nenhuma configuração nova, nenhum passo de
  atualização, nenhuma tela diferente. O que mudou fica do nosso lado — e vale
  escrever porque é ele que decide quando um conserto chega até você.

  Antes de qualquer versão sair, uma bateria abre o sistema num navegador de
  verdade e refaz as telas uma a uma: login, funil, agenda, atendimento,
  follow-up. Ela roda em duas metades ao mesmo tempo, e as duas metades vinham
  crescendo desequilibradas — uma terminava com folga de sobra e a outra chegava
  ao tempo máximo e era **cortada no meio**.

  Corte por tempo não distingue "quebrou" de "demorou". Quando ele acontece, a
  correção não é reprovada nem aprovada: ela volta para a fila, e o conserto que
  você espera chega mais tarde sem que nada tivesse dado errado.

  As duas metades foram redistribuídas pelo tempo medido de cada teste, e não pelo
  número deles. A folga voltou, e o limite de tempo continua onde estava — é ele
  que avisa, da próxima vez, que a bateria cresceu de novo.

- **O Inbox e a barra lateral ficaram mais fáceis de ler** A coluna da esquerda do Inbox empilhava quatro controles em caixa — busca,
  filtro de número, filtro de tag, abas espremidas num quadro cinza e uma linha
  inteira só para o interruptor "Apenas não lidos". E cada conversa tinha uma
  altura diferente da vizinha, porque o contador de não lidas vivia numa terceira
  linha que às vezes existia e às vezes não.

  Agora a busca é uma pílula com o filtro "Não lidos" ao lado, na mesma linha; as
  abas viraram uma faixa sublinhada que cabe na largura da coluna; e cada conversa
  tem duas linhas fixas — nome e hora em cima, prévia e contador embaixo. A
  conversa não lida vem em negrito, e a que está aberta ganha uma barra lateral na
  cor da marca. Selos de tag, de bloqueado e de número de entrada só ocupam uma
  terceira linha quando existem de fato.

  O ícone de robô na prévia passou a seguir a mesma regra: só aparece quando
  distingue alguma coisa. Na aba "Automático", onde toda conversa já é do robô,
  ele parou de se repetir em cada linha.

  Os rótulos em CAIXA ALTA espalhados pelo Inbox — cabeçalhos do painel do
  contato, remetente na bolha, nota interna, divisor de dia — viraram texto normal
  em negrito. Mesma hierarquia, menos esforço para ler.

  Os filtros de número e de tag agora são pílulas na mesma linguagem da busca, e
  ganham cor de destaque quando estão filtrando alguma coisa. Antes eram duas
  caixas de formulário empilhadas, iguais entre "filtrando" e "sem filtro".

  A tela de quando nenhuma conversa está aberta ganhou um ícone e o lembrete de
  que dá para andar pela lista com as teclas J e K.

  Na barra lateral, cada grupo — Atendimento, CRM, Agente de IA, Canais, Análise —
  agora se recolhe clicando no título, e o navegador lembra quais você fechou.

  Nada muda para quem opera a instalação: nenhuma configuração nova, nenhum passo
  de atualização.

  Isto veio da contribuição de Maurilio Garcia (**@maugarciasa**), no PR #556.

### Corrigido

- **Buscar no Inbox por um nome com vírgula ou parêntese deixa de derrubar a tela** Quem tem clientes cadastrados como "Sobrenome, Nome" — que é como boa parte das
  agendas importadas vem — não conseguia buscá-los: a tela dava erro em vez de
  lista.

  E não era preciso ter a vírgula no cadastro. Bastava o atendente digitá-la na
  busca.

- **Buscar um nome comum no Inbox deixa de derrubar a tela** Numa base com muitos contatos, buscar um nome comum — "ana", "silva" — fazia o
  Inbox **parar de abrir**, com erro de servidor. Buscar por DDD tinha o mesmo
  efeito, porque quatro dígitos casam todos os celulares de uma cidade.

  Não era lentidão nem lista incompleta: era a tela quebrando, e justamente onde
  quem atende passa o dia.

  Agora a lista de contatos que casam é cortada pelo tamanho que cabe na consulta.
  Numa busca muito ampla o resultado pode não trazer todos — mas a tela **abre**,
  e a busca pelo conteúdo da conversa continua rodando ao lado.

- **A chave da OpenRouter passa a ser conferida de verdade antes de a tela dizer que está validada** Ao cadastrar uma chave da OpenRouter em **Agente de IA › Credenciais**, o sistema conferia
  a chave contra o catálogo de modelos do provedor — um endereço que responde a
  qualquer um, com chave errada ou sem chave nenhuma. Na prática, qualquer texto
  colado ali era gravado como credencial validada, e o cartão passava a mostrar
  "Validada" com o final da chave ao lado.

  O erro só aparecia depois, na primeira mensagem que o agente tentava responder,
  e aparecia como "User not found." — um texto que não fala em chave nem em
  credencial. Quem procurava a causa olhava o modelo, o provedor, o próprio
  atendimento; a tela, enquanto isso, afirmava que a peça quebrada estava boa.

  Agora a prova é feita contra o endereço que exige a credencial. O catálogo
  continua sendo lido em seguida, porque é dele que sai a lista de modelos que a
  tela mostra — ali ele é dado, não prova. E catálogo fora do ar não recusa mais
  uma chave que já provou ser válida: seria trocar um erro de credencial por um de
  indisponibilidade, e mandar quem opera caçar defeito na chave certa.

  Uma ressalva sobre em que versão isto entrou: a correção já está no ar desde a
  **1.13.0**. O que chega atrasado é esta nota — a mudança foi publicada sem ela,
  e por isso não apareceu na lista daquela versão.

  Chave boa continua sendo aceita do mesmo jeito, e não há passo de atualização.
  A única coisa que vale conferir é o que foi cadastrado antes: se a sua chave da
  OpenRouter é anterior à 1.13.0 e o atendimento falha sem motivo aparente, abra
  **Agente de IA › Credenciais** e use o botão de revalidar — as setas em círculo, no
  cartão da credencial. A resposta que ele dá agora é real.

  Isto veio da contribuição de **@Elevstudio-Dev**.

- **O aviso de erro da importação de planilha volta ao raio de borda do produto** A caixa de aviso da tela de importar leads estava com o canto arredondado pela
  metade — 4px em vez dos 8px que o resto do produto usa. É pequeno e é visível:
  ela fica ao lado de outros blocos com o raio certo.

  A causa é da migração para o Tailwind 4, que mudou o significado de `rounded`
  puro. Quem escreveu a tela usou o nome que valia antes.

- **O bloco "Ocupado" da agenda do Google sai da lista de próximos, onde os botões não funcionavam** Os horários ocupados na sua agenda pessoal do Google apareciam também na lista
  **Próximos**, com **Remarcar** e **Cancelar** ligados — como se fossem
  compromissos da empresa. Não eram, e os botões não tinham como funcionar:
  clicar em Cancelar dava erro e nada acontecia.

  Agora esses blocos aparecem **só na grade**, que é onde servem: mostram o
  horário tomado, não abrem e não arrastam. A lista de próximos volta a ter só o
  que sua equipe pode remarcar ou cancelar de verdade.

  O nome do compromisso particular continua não aparecendo em lugar nenhum.

- **A troca de senha pela linha de comando volta a encontrar o usuário** Quem perde o acesso a uma instalação sem SMTP — o estado normal de um self-host
  recém-instalado — só tem um caminho de volta: o `reset-password.sh` do kit. Ele
  não funcionava para **ninguém**. Não era intermitente nem dependia do e-mail:
  qualquer endereço, existente ou não, recebia a mesma resposta seca de "usuário
  não encontrado", e a pessoa ficava trancada do lado de fora do próprio sistema.

  A causa era uma consulta escrita na sintaxe errada. O script pedia ao servidor de
  autenticação um filtro no formato do banco (`email.eq.<endereço>`), e esse
  servidor não fala esse formato — ele usa a expressão inteira como texto de busca.
  Como nenhum e-mail contém o pedaço `email.eq.`, a busca não achava nada, sempre.

  Agora a consulta vai no formato que o servidor entende. E, como a busca dele é por
  trecho do endereço, o script passou a exigir o e-mail **inteiro** antes de aceitar
  o resultado: pedir `ana@empresa.com` também traz `mariana@empresa.com`, e entregar
  a pessoa errada a um comando que TROCA SENHA seria pior que não achar ninguém. Na
  dúvida ele não devolve nada — quem chama vê "não encontrado", que é ruim mas se
  resolve; a senha de outra pessoa trocada, não.

  Quem opera uma VPS não precisa fazer nada além de atualizar. Nenhuma configuração
  muda, nenhum arquivo precisa ser editado à mão.

- **O compromisso marcado aqui passa a aparecer na Agenda do Google — e o que está ocupado lá aparece aqui** Quem conectou a Agenda do Google tinha a integração **ligada e sem efeito nenhum**.
  Valia nas duas direções, e nada na tela dizia isso.

  **Nada saía daqui.** O compromisso era marcado, o sistema tentava criá-lo lá a
  cada cinco minutos, e o Google recusava todas as vezes — por um detalhe de
  formato. O erro era registrado só como "HTTP 400", sem o motivo que o Google
  mandava junto. Por isso a falha durou tanto: dava para ver que não funcionava, e
  não dava para saber por quê. Isso nunca funcionou em instalação nenhuma; os
  compromissos já marcados sobem na próxima sincronização.

  **E o que estava ocupado lá não era desenhado aqui.** O horário já era
  respeitado — ninguém conseguia marcar em cima —, mas o bloco não aparecia na
  grade. O dono via a agenda vazia e o horário indisponível ao mesmo tempo. Agora o
  bloco aparece, marcado como *Ocupado*.

  O **nome** do evento particular continua não aparecendo, de propósito: a agenda
  conectada é pessoal de quem atende, e esta tela é vista pela gestão.

  **Quando o Google recusa o acesso**, a tela deixa de mandar "tente de novo" —
  conselho que não funcionaria, porque a causa costuma ser a API do Google Agenda
  desligada no projeto do Google Cloud. Agora ela diz onde ligar.

  Para quem opera, nada muda no dia a dia.

  O conserto é de @Clalber, que diagnosticou os três defeitos e provou a correção
  com tráfego real.

- **Anonimizar um contato retoma de onde parou, em vez de dizer que já foi** A anonimização de um contato remove os dados pessoais em três lugares: o
  cadastro do contato, os títulos dos negócios dele e o histórico de atividades.
  Se a operação era interrompida no meio — o navegador desistindo, o servidor
  reiniciando —, o primeiro lugar ficava pronto e os outros dois não.

  E não havia como terminar: clicar em "Anonimizar" de novo respondia **"já anonimizado"**
  e não fazia mais nada. O contato ficava para sempre com nome de
  cliente visível dentro dos negócios e do histórico — que é exatamente o dado que
  a anonimização existe para remover, e que a lei dá prazo para remover.

  Pior: nesse estado a tela **não mostra botão nenhum** — assim que o contato
  consta como anonimizado, o botão dá lugar a um aviso. Não havia como pedir a
  retomada nem sabendo que ela era necessária.

  Agora a verificação diária do sistema encontra sozinha as anonimizações que
  ficaram pela metade e termina o serviço, sem ninguém precisar procurar contato
  por contato. Como a lei dá prazo, esse conserto não podia depender de alguém
  lembrar de clicar. Rodar de novo num contato já inteiro não escreve nada, e o
  registro de auditoria mostra o que foi realmente feito, em qual contato e em que
  dia — separado da execução original, para a data em que o titular exerceu o
  direito não ser sobrescrita.

- **Configuração de fila malformada deixa de ser confundida com serviço fora do ar** Aspas coladas no endereço da fila eram acusadas como "serviço fora do ar",
  mandando reiniciar um serviço que estava de pé. A página de saúde agora aponta a
  configuração. Achado de @prevprocesso-maker.

- **O agente para de achar que está fechado por causa do fuso** O agente recebia o horário de cada mensagem do histórico em UTC, e não no fuso
  da sua organização — três horas à frente, para quem está no horário de
  Brasília. Uma mensagem enviada às 15:45 chegava até ele como 18:45.

  Isso só doía em agentes instruídos a conferir o relógio antes de responder:
  eles concluíam que já era fora do expediente e respondiam "estamos fechados",
  citando na mesma frase o horário de atendimento dentro do qual o cliente ainda
  estava. O erro passou despercebido porque o resto do agente já mostrava a hora
  certa — só o horário das mensagens do histórico saía errado. Foi visto em
  produção em dois dias diferentes, com clientes reais recebendo "estamos
  fechados" em pleno horário comercial.

  Agora o horário de cada mensagem chega ao agente já no fuso da sua organização,
  o mesmo que ele usa para saber que dia e que horas são.

- **A proteção de envio volta a aceitar a data de hoje** Em **Conexões › Proteção de envio**, informar hoje em "este número é usado
  desde" era recusado durante a manhã inteira: até as 9h no relógio de quem
  opera no Brasil, salvar devolvia *"Campos inválidos."* e não gravava nada — nem
  a janela de horário, nem o intervalo entre envios, nem o teto diário que você
  tinha acabado de mudar na mesma tela.

  O motivo: o campo pergunta um DIA, mas a verificação o comparava com a hora
  exata em Londres. Um dia não tem hora — ele começa em horários diferentes em
  cada parte do mundo —, e por isso "hoje" só era aceito depois do meio-dia
  londrino. Agora a verificação compara dias com dias, e só recusa a data que
  ainda não chegou em canto nenhum do planeta.

  O calendário do campo também parou de oferecer o dia errado: depois das 21h ele
  mostrava amanhã como escolha possível.

  Data futura continua recusada, e data antiga continua sendo o caso normal — é
  informando a data antiga que um número usado há meses deixa de ser tratado como
  recém-criado e sai do teto de 20 envios por dia.

- **A mensagem de erro do WhatsApp deixa de repetir a resposta crua do serviço** Ela vinha com um pedaço da resposta crua do WhatsApp colado no fim — texto de
  outro programa, que pode trazer telefone de cliente ou o endereço do servidor.
  Agora diz só a operação e o código do erro. Achado de @prevprocesso-maker.

- **O painel de IA para de avisar que um modelo não enxerga imagens quando ele enxerga** Duas informações erradas no painel de provedores, e as duas faziam quem opera
  tomar decisão contra o que o sistema realmente faz.

  **A primeira:** o painel avisava que um modelo "não enxerga imagens" e que fotos
  e comprovantes do cliente seriam ignorados — sobre modelos que enxergam, e num
  sistema onde a leitura estava funcionando. Na mesma instalação em que o aviso
  aparecia, o print que o cliente enviou virou descrição correta para o atendente.

  O painel lia uma tabela de catálogo; o atendimento lia outra coisa. Agora os
  dois respondem pela mesma fonte, e o painel não pode mais discordar do que
  acontece de verdade. Onde o sistema não conhece o modelo — o seu, ou um de um
  serviço próprio —, o catálogo continua sendo a resposta, e a falta de informação
  continua sendo dita como falta de informação, não como "não funciona".

  **A segunda:** quem usa a OpenRouter tinha o problema INVERTIDO — e ele é pior,
  porque não tem sintoma. Ali o sistema não sabia dizer se um modelo enxerga: ele
  olhava só o começo do nome. Como `openai/gpt-4o` enxerga e `openai/gpt-3.5-turbo`
  não, e os dois começam igual, um palpite pelo começo do nome erra metade das
  vezes — e a OpenRouter já informa a resposta certa, modelo por modelo, quando o
  catálogo é sincronizado na instalação.

  O efeito prático era duplo. O painel deixava de avisar quando o aviso era
  verdadeiro, então quem opera achava que o comprovante do cliente estava sendo
  lido e não estava. E o atendimento chegava a enviar a imagem para um modelo que
  não a aceita, o que fazia a resposta daquela mensagem falhar. Agora, quando a
  OpenRouter informa a capacidade, é ela que vale — e quando não informa, o
  sistema volta a dizer que não sabe, em vez de afirmar.

  **A terceira:** o ponto "Ouvir o áudio do cliente" mostrava um modelo de
  conversa, com "usando o padrão da organização" — ao lado do próprio texto do
  ponto, que diz que a transcrição usa o padrão da OpenAI. A mesma tela afirmava
  duas coisas incompatíveis, e modelo de conversa não transcreve áudio.

  Agora ele mostra o que de fato transcreve. Trocar o modelo de conversa nunca
  mudou nada ali; o que muda é a tela parar de sugerir que mudaria.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização. O que muda é que o painel volta a descrever
  o sistema que está rodando.

- **Salvar o rascunho de um agente para de escrever por cima de um rascunho antigo** Na tela de um agente, "Salvar rascunho" podia gravar numa versão **diferente**
  da que estava aberta na tela — e apagar, no caminho, um rascunho antigo que a
  própria tela prometia estar guardado.

  O estado que produzia isso é comum e tem um gatilho conhecido: quem tinha
  trabalho em andamento num rascunho e usou o botão **Reverter**, na aba
  Histórico. Reverter cria uma versão nova e a publica na hora; o rascunho que
  existia fica, a partir dali, "atrás" da versão publicada. A tela sabe disso e
  avisa, no selo ao lado do nome do agente: *"o rascunho v5 é anterior a esta
  versão e foi superado por ela — ele continua no Histórico."*

  Só que o servidor não sabia. Ele procurava "o rascunho de maior número" e
  gravava ali. Duas consequências, nenhuma delas com mensagem de erro:

  - **O trabalho parecia sumir.** O aviso verde dizia "Rascunho v5 salvo.", a
    página recarregava, e a tela voltava a mostrar o texto anterior — porque ela
    não reabre um rascunho superado, e o botão de publicar também não o oferece.
    Quem estava editando via "salvo" e nada mudando, sem ter o que fazer a
    respeito.
  - **O Histórico perdia conteúdo, em silêncio.** Aquele rascunho v5 é um
    retrato: a linha dele no Histórico existe para mostrar o que estava escrito
    ali. Regravá-lo trocava esse conteúdo por um texto que ninguém rascunhou
    naquele momento, sem aviso e sem volta.

  Agora o servidor decide em qual versão escrever pela **mesma regra** que a tela
  usa para decidir qual versão abrir. Quando o rascunho existente está superado,
  a gravação nasce numa versão nova — que é a que a tela reabre e o botão publica
  — e o rascunho antigo fica intacto no Histórico, como estava prometido.

  Junto vem um cuidado que não aparece na tela mas decide o resultado: quem é a
  versão publicada passa a ser sempre o **ponteiro que o atendimento executa**, e
  não o rótulo "publicada" gravado na linha da versão. Os dois já se contradizem
  em instalações reais, e a resposta otimista era a errada.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização, nenhuma mudança no banco. O que muda é que
  "salvei" volta a significar "está salvo onde você está vendo".

- **Os e-mails de acesso deixam de apontar para um endereço que não existe** Numa instalação feita pelo caminho documentado, os e-mails de recuperação de
  senha, de confirmação de cadastro e de aceite de convite chegavam com um link
  para `localhost:3000` — um endereço que só existe na máquina de quem programa.
  O e-mail chegava, a pessoa clicava, e o navegador dizia que a página não existe.
  Na prática, **ninguém conseguia redefinir a própria senha.**

  O endereço certo mora no painel do Supabase, e o instalador já sabia configurá-lo
  sozinho — só que precisava de um token que ele nunca pedia. O aviso existia, mas
  saía no meio de um registro de dez minutos, logo antes de uma tela verde dizendo
  "Instalação concluída". Ninguém voltava para ler.

  Agora o instalador pergunta esse token. Ele é opcional e **não fica salvo** —
  abre a conta inteira do Supabase, então é usado uma vez e descartado, e nem
  sequer entra no rascunho que guarda suas respostas para o caso de a instalação
  ser interrompida. Por isso, se você recomeçar uma instalação, ele é a única
  pergunta que volta a ser feita; a tela diz isso na hora, e apertar Enter pula.

  Quem preferir pular continua podendo: a instalação termina repetindo o passo que
  falta, com o seu domínio já preenchido, em vez de deixar a descoberta para o dia
  em que alguém esquecer a senha. E quando o passo automático roda mas o endereço
  não fica como este sistema precisa — porque o seu projeto já tinha outro
  endereço escolhido, por exemplo —, ele passou a dizer isso em vez de terminar
  com um "pronto" verde.

  **Se você já tinha instalado antes desta versão**, a próxima atualização mostra
  esse mesmo passo uma vez, com o seu domínio preenchido, e não repete depois.

- **Sete alertas de segurança em bibliotecas de terceiros foram fechados** O GitHub apontava sete alertas de segurança em bibliotecas que o DeskcommCRM não
  usa diretamente — elas chegam junto com outras que ele usa. São quatro em
  `fast-uri` (confusão de endereço ao normalizar uma URL malformada), dois em `qs`
  (contorno do limite de tamanho de lista e travamento por entrada preparada) e um
  em `browserslist`.

  As três entraram no piso de versão que o projeto já mantém para casos assim, sem
  subir de versão maior: `fast-uri` 3.1.7, `qs` 6.16.0 e `browserslist` 4.28.8.

  Nada muda para quem opera a instalação: são correções de bibliotecas internas,
  sem migration e sem passo de atualização.

  Isto veio da contribuição de Maurilio Garcia (**@maugarciasa**), no PR #556.

- **A quebra de mensagem em bolhas não corta mais um valor em reais no meio** Com "quebrar resposta em várias mensagens" ligado, o agente tratava qualquer "." como fim de
  frase — inclusive o "." que separa milhar num preço em reais ("R$ 10.990"). O valor virava
  duas "frases" ("R$ 10." e "990 no cartão…"), que às vezes iam para bolhas de WhatsApp
  SEPARADAS (o cliente que via só a primeira lia "R$ 10" como o preço fechado de um produto de
  R$ 10.990) e às vezes eram remendadas com um espaço a mais ("R$ 7. 990").

  Agora um "." só conta como fim de frase quando não está entre dois dígitos.

## [1.13.0] — 2026-09-04

> **Esta versão não tem imagens publicadas** — o build da tag foi cancelado, e as três imagens não
> existem no registro. Nada para fazer: quem atualiza chega à 1.14.0 ou superior.

### Alterado

- **O CRM instala em Postgres 15, não só em 17** Até agora a instalação exigia Postgres 17. Quem tentasse usar um banco 15 ou 16
  — o padrão de boa parte dos painéis de VPS e dos templates prontos de Supabase
  — via a montagem do banco parar no meio, e a instalação terminava sem as
  tabelas.

  A exigência nunca foi uma decisão de projeto. O arquivo que monta o banco é
  gerado automaticamente a partir de um servidor de referência, e esse servidor
  rodava a versão 17; ao ser gerado, o arquivo levou junto nove linhas com uma
  permissão que só existe nessa versão. Nenhuma parte do sistema usa essa
  permissão. Bastava o banco não reconhecê-la para o arquivo inteiro ser
  recusado — e um arquivo recusado é um banco vazio, não um banco incompleto.

  As nove linhas saíram. A permissão que sobrou em cada uma é exatamente a mesma
  de antes, então nada muda no comportamento nem na proteção das tabelas de
  auditoria, que continuam não aceitando alteração nem exclusão.

  Quem já roda o CRM não precisa fazer nada: o Postgres 17 segue funcionando
  igual. O que mudou é que 15 e 16 passaram a funcionar também.

### Corrigido

- **A busca do Inbox passa a achar pelo nome e pelo telefone do cliente** Digitar o nome de um cliente na caixa de busca do Inbox não trazia a conversa
  dele — a busca olhava só o texto das mensagens. Na prática, achar uma conversa
  pelo nome só funcionava por acidente: se o nome tivesse sido escrito dentro de
  alguma mensagem.

  Para quem atende, procurar pelo nome é o caso mais comum — bem mais frequente
  que lembrar um trecho exato de mensagem. E com alguns milhares de contatos
  importados, a única alternativa era rolar a lista.

  Agora a busca cobre nome, telefone e o texto das mensagens ao mesmo tempo. O
  campo passa a dizer isso, em vez de prometer só mensagens.

  Contato anonimizado continua fora da busca por nome — anonimizar é definitivo.

- **A inteligência artificial não se cala mais por três horas depois de responder** Sempre que o CRM enviava uma mensagem pelo WhatsApp, o próprio WhatsApp
  devolvia um eco dela de volta. O sistema lia esse eco como se um atendente
  humano tivesse respondido pelo celular, e **desligava a IA por três horas.**

  Ou seja: a IA se calava por ter falado. O cliente ficava sem resposta e a tela
  mostrava **"Automático pausado"** — estado legítimo, que ninguém investiga,
  porque é exatamente o que aparece quando alguém assume a conversa de propósito.

  Atingia qualquer instalação e qualquer conversa, sem depender de configuração.

  Agora o sistema distingue o eco do próprio envio de uma digitação de verdade. E
  a distinção só protege o silêncio: a mensagem continua sendo gravada como
  sempre, porque perder uma mensagem é pior do que registrar uma a mais.

  Quando o atendente responde mesmo pelo celular, a IA continua se calando — essa
  parte não mudou.

- **A proteção de envio volta a salvar sem a data do número** Em **Conexões › Proteção de envio**, ajustar o horário de envio e salvar sem
  preencher "este número é usado desde" devolvia *"Falha ao salvar os knobs."* e
  não gravava nada — nem os campos que você tinha acabado de mudar.

  Isso atingia toda instalação nova, porque essa data começa em branco. E a
  armadilha era dupla: sem os limites salvos, o sistema trata o número como
  recém-criado e libera pouco por dia — exatamente o teto que a pessoa abriu a
  tela para corrigir.

  Agora o campo em branco significa o que a tela sempre prometeu: em número novo,
  ele é tratado como recém-criado. E, se você já tinha informado uma data antes,
  limpar o campo não a apaga — para trocá-la, informe outra. O texto de ajuda da
  tela passa a dizer isso.

  Junto vai um conserto de diagnóstico: quando o banco recusa um campo, o motivo
  passa a viajar junto do erro em vez de virar um "falha ao salvar" sem dono.

- **A atualização volta a chegar quando alguém aprova outra coisa durante o fechamento da versão** Uma versão do sistema é fechada em duas etapas: primeiro o time monta a lista do
  que entrou, depois aprova essa lista. Entre uma coisa e outra, qualquer outra
  melhoria aprovada no meio do caminho fazia o fechamento **desistir em silêncio**
  — a versão aparecia na lista de novidades, mas nunca era publicada de verdade.

  O efeito para quem tem o sistema instalado era o pior tipo: nada de errado
  aparecia em lugar nenhum. O painel não acusava, o histórico de versões mostrava
  a versão nova como se existisse, e a atualização simplesmente nunca chegava. Foi
  o que aconteceu com a versão 1.11.1: ela consta no histórico desde 31 de agosto e
  nunca existiu como pacote — nenhuma instalação a recebeu.

  Agora o fechamento reconhece a si mesmo por outro sinal, que não depende de o
  resto do time parar de trabalhar enquanto a versão fecha. E, se alguma coisa
  estranha acontecer nesse momento, o processo **falha alto** em vez de passar
  batido — que é o que teria feito alguém perceber a 1.11.1 no mesmo dia, e não
  duas semanas depois.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização. O que muda é que "a versão saiu" volta a
  significar que ela saiu.

- **Áudio que demora para transcrever não faz mais o agente dizer "não entendi"** Um cliente mandou um áudio perguntando sobre troca de peça de uma moto elétrica. A
  transcrição terminou certinha — mas 18 segundos tarde demais: o agente já tinha
  respondido "recebi seu áudio, mas não consegui identificar o conteúdo", e o cliente
  teve que digitar a pergunta de novo.

  A causa era um teto fixo de 45 segundos de espera pela transcrição antes de o turno
  seguir sem o texto. Medindo as transcrições reais desta instalação, 45s não é raro
  de estourar em áudios normais — só é curto demais para a cauda longa (minutos, quando
  há retry por falha transitória), que nenhum teto razoável cobre sem o cliente esperando
  minutos pela primeira resposta.

  O teto passou para 120 segundos, o suficiente para cobrir esse tipo de atraso comum sem
  impor uma espera longa em todo áudio. Para quem opera uma instalação, nada muda no dia
  a dia.

- **Uma instabilidade passageira do provedor de IA deixa de matar o atendimento na primeira rajada** Quando o provedor de IA responde "calma, você está mandando rápido demais" — um
  limite temporário que costuma passar sozinho em menos de um minuto —, o sistema
  tenta de novo. Ele tinha direito a cinco tentativas, e usava as cinco no mesmo
  segundo: a conversa voltava para a fila já liberada, era pega outra vez na
  mesma volta, e assim por diante. O limite não teve um instante sequer para
  ceder, e a conversa ia para a lista de casos que precisam de gente com um aviso
  crítico na Central.

  Medido numa instalação real em 31/08: 49 atendimentos descartados em rajadas de
  poucos segundos, todos pelo mesmo motivo passageiro.

  Agora cada nova tentativa espera mais que a anterior — 10 segundos, depois 20,
  depois 40, depois 80 —, o que dá ao provedor tempo de se recuperar antes da
  próxima. Na prática, a instabilidade que antes queimava as cinco chances em um
  segundo agora tem mais de dois minutos para passar, e o atendimento continua
  sozinho quando ela passa.

  Para quem opera, nada muda: não há configuração nova, nenhum passo de
  atualização e nenhum ajuste no arquivo de ambiente. O que muda é a Central
  ficar com os avisos que importam, em vez de encher de casos que se resolveriam
  sozinhos.

- **O endereço interno do seu servidor deixa de aparecer na página pública de saúde** O sistema tem um endereço público que responde se ele está de pé — usado por
  monitoramento e pelo suporte. Ele já era cuidadoso: escondia de quem não tem a
  chave interna o endereço da conexão do WhatsApp e do serviço de fila, porque
  esse endereço é justamente o que alguém precisaria para tentar bater na porta
  deles.

  O cuidado tinha um furo. Quando o arquivo de configuração ficava com o endereço
  numa forma inválida — sem o `https://` na frente, ou com aspas sobrando, que são
  os dois erros mais comuns de quem instala —, a mensagem técnica da falha vinha
  com o endereço dentro, e essa mensagem **saía por inteiro** para qualquer pessoa
  que abrisse a página. O sistema fechava a porta da frente e deixava a mesma
  informação na janela do lado.

  Agora quem não tem a chave interna vê apenas que a consulta falhou, e **por quê**:
  se não achou o servidor, se foi recusado, se demorou demais, se a
  credencial não passou. Isso é o que serve para monitorar. O texto técnico
  completo continua saindo inteiro para quem tem a chave, que é quem precisa dele
  para consertar.

  Para quem opera, nada muda: nenhuma configuração nova, nenhum passo de
  atualização. Se você tinha algum alerta lendo o texto da mensagem de erro, ele
  passa a ler o motivo em vez do texto.

  O achado é de @prevprocesso-maker, que percebeu o furo instalando o sistema para
  um cliente.

- **Instalar pelo canal padrão não mistura mais versões entre os serviços** O DeskcommCRM roda três serviços que saem do mesmo código — o aplicativo, o
  trabalhador de fundo e o agendador. Quem instala pelo canal padrão espera os
  três na mesma versão.

  Até agora cada um deles avançava o canal por conta própria, ao terminar de ser
  publicado, sem saber se os irmãos tinham conseguido. Quando a publicação de um
  falhava por um problema de infraestrutura, os outros dois seguiam em frente — e
  quem instalasse naquela janela recebia uma instalação **misturada**, com peças
  de versões diferentes. Aconteceu de verdade no fechamento da versão anterior.

  Agora o canal só avança depois que as três imagens estão publicadas e o
  aplicativo provou que sobe. Se qualquer uma falhar, o canal fica onde estava —
  uma versão inteira e velha, em vez de uma nova pela metade.

  E o fechamento de cada versão passa a conferir isso antes de dar por concluído:
  não basta as imagens existirem, o canal precisa apontar para elas.

  Nada muda para quem já tem uma instalação funcionando.

- **Loja com catálogo grande volta a achar o próprio produto** Numa loja com muitos produtos cadastrados, o atendente de IA podia responder
  **"não temos"** para um produto que a loja tem. E não havia como perceber: a
  resposta era educada, o sistema não registrava erro nenhum, e o mesmo produto às
  vezes aparecia na busca seguinte.

  A causa é que a busca consultava um lote do catálogo sem definir a ordem. Sem
  ordem, o banco devolve as linhas que quiser — e o produto pedido podia
  simplesmente não estar no lote que veio. O limite real também era metade do que
  o sistema pedia.

  Agora a busca percorre o catálogo em páginas, na ordem do código, até encontrar
  ou terminar. E, se o catálogo for grande demais para varrer inteiro, o atendente
  **para de dizer que a loja não tem**: ele diz que não encontrou no que
  conseguiu consultar e que vai confirmar com a equipe.

  A diferença importa para quem está comprando: "não temos" encerra a conversa,
  "vou confirmar" não.

- **Fechar um negócio parou de avisar duas vezes, e o card não some mais numa coluna arquivada** Toda vez que alguém marcava um negócio como ganho ou perdido, o sistema
  registrava o acontecimento **duas vezes**: uma pelo banco, que já fazia isso
  sozinho, e outra pelo aplicativo, que não sabia que o banco já tinha feito.
  Enquanto ninguém escutava esse registro, a duplicata era só ruído guardado. Ela
  deixou de ser inofensiva quando as notificações no navegador passaram a escutar
  exatamente esse aviso — daí em diante, um único negócio fechado tocava duas
  vezes no celular de quem estava acompanhando.

  Junto vinham duas coisas menores e do mesmo tipo, do jeito silencioso que
  incomoda mais do que erro barulhento:

  - Um funil cujo estágio de fechamento tinha sido **arquivado** continuava sendo
    usado. O negócio era fechado numa coluna que ninguém mais vê, sem aviso
    nenhum. Agora o sistema recusa e diz que falta um estágio de fechamento no
    funil, que é o que de fato está acontecendo.
  - O card fechado caía em **posição aleatória** na coluna final, em vez de ir para
    o fim dela. Quem trabalha olhando o quadro perdia o negócio de vista.

  Para quem opera, nada muda no dia a dia: nenhuma configuração nova, nenhum passo
  de atualização, nenhum dado a corrigir. O que muda é que o aviso passa a sair uma
  vez, e que fechar num funil mal configurado avisa em vez de sumir.

  O achado é de @prevprocesso-maker, que instalou o sistema para um cliente e
  percebeu a emissão em dobro lendo o próprio código.

- **O atendente de IA passa a enxergar os compromissos já marcados do cliente** O atendente de IA marcava uma reunião e, minutos depois, agia como se ela não
  existisse: dizia que o horário estava ocupado por outra pessoa quando o ocupante
  era a reunião do próprio cliente.

  A causa é simples: o contexto que o agente recebe a cada mensagem trazia o
  histórico, as anotações e o estágio do funil — e **nenhuma agenda**. Ele só
  sabia dos compromissos se fosse consultá-los, e não tinha por que desconfiar de
  que precisava.

  Agora o contexto de cada conversa traz os compromissos futuros daquele contato,
  com data, horário e título. Se houver mais do que cabe, ele diz que a lista está
  incompleta em vez de deixar o agente concluir que aquilo é tudo.

  Compromissos cancelados ficam de fora: um compromisso desmarcado nessa lista
  faria o agente confirmar ao cliente uma reunião que não existe mais.

- **O agente para de dizer que o cliente não tem nada marcado quando tem** O atendente de IA podia marcar uma reunião e, minutos depois, dizer ao próprio
  cliente que **ela não existia** — pedindo desculpas por tê-la marcado. Não havia
  erro em lugar nenhum: a consulta era válida e devolvia "nenhum compromisso", que
  é uma resposta legítima.

  A causa é um nome. Dentro do motor, o campo que identifica **a pessoa** da
  conversa se chama `lead_id` — mas nas ferramentas de agenda esse mesmo nome
  significa **o negócio no funil**, que é outra coisa. O agente passava o
  identificador da pessoa no lugar do negócio, a busca não encontrava vínculo
  nenhum e respondia "nada marcado".

  Agora, quando o identificador não corresponde a um negócio do funil, a resposta
  deixa de ser "nada marcado" e passa a ser uma **recusa que ensina o caminho certo**
  — e que instrui o agente a dizer que vai confirmar com a equipe, nunca
  que o cliente não tem nada.

  Um negócio de verdade sem compromissos continua respondendo "nada marcado", que
  é a resposta certa.

- **O agente para de repetir uma pergunta que o cliente já respondeu** Numa conversa real, o agente pediu o e-mail do cliente **quatro vezes** — com o
  cliente respondendo três. Para quem está do outro lado, isso não parece um
  sistema: parece desatenção.

  Eram duas causas somadas.

  A primeira: ao fechar cada turno, o agente anota qual é a "próxima ação". Como
  essa anotação é escrita logo depois de ele perguntar e antes de a resposta
  chegar, ele anotava como próxima ação **a pergunta que acabara de fazer**. No
  turno seguinte essa anotação voltava no topo das instruções, acima do histórico
  — e mandava perguntar de novo o que o histórico logo abaixo já respondia.

  A segunda: o cadastro do contato aparecia com o e-mail em branco, e o agente lia
  isso como um fato ("não tem e-mail"), com mais autoridade do que a mensagem em
  que o cliente tinha acabado de digitá-lo. E como esse campo nunca é preenchido
  sozinho, o pedido se repetia indefinidamente.

  Agora a anotação diz explicitamente que se refere ao **depois** da resposta, o
  bloco avisa que foi escrito antes da última mensagem do cliente — e que, em caso
  de desacordo, vale o histórico —, e o cadastro em branco vem com a ressalva de
  que a informação pode já ter sido dada na conversa.

- **Os avisos coloridos do sistema voltam a ter cor** Boa parte dos avisos do produto — o fundo avermelhado de um erro, o âmbar de uma
  pendência, a borda suave de um cartão — era escrita para aparecer com transparência
  e simplesmente **não pintava**: a regra nunca chegava a ser gerada, em silêncio.
  Eram 62 marcações distintas, em 252 lugares das telas. Agora pintam.

  Junto vem o respiro entre o rótulo e o campo nos formulários, que havia encolhido
  no mesmo mecanismo, e a sombra da aba selecionada, que passara a usar um preto
  fixo em vez do tom do tema — visível para quem usa o sistema no modo escuro.

  Onde a transparência era aplicada ao TEXTO, ela foi retirada em vez de passar a
  valer: em 20 lugares o texto ficaria claro demais para ser lido com conforto — os
  rótulos de grupo do menu lateral, entre outros. Esses continuam exatamente com a
  aparência que sempre tiveram na tela.

  Quem opera uma VPS não precisa fazer nada: é só atualizar. Nenhuma configuração
  muda, nenhum arquivo precisa ser editado à mão.

- **Um fluxo de retorno publicado não abre mais vazio na tela** Um fluxo de retorno que estava **no ar e funcionando** podia abrir **em branco**
  no construtor. A automação rodava normalmente e conversava com os clientes; a
  tela é que não mostrava nada.

  Acontecia quando o fluxo foi publicado por fora do construtor — restauração de
  backup, instalação assistida, importação de outra instalação. Nesses casos o
  sistema guarda a versão publicada mas não guarda uma cópia de trabalho, e a tela
  só sabia abrir a cópia de trabalho.

  **O risco era maior do que a tela vazia.** Quem abrisse, mexesse em qualquer
  coisa e salvasse estaria salvando por cima — com o desenho vazio que a tela
  mostrou. Um "publicar" depois disso trocaria o fluxo que está funcionando por
  esse vazio, sem aviso nenhum.

  Agora, quando não existe cópia de trabalho, a tela abre **exatamente o que está no ar**.
  Quem nunca editou vê o fluxo publicado; quem tem trabalho salvo e não publicado
  continua vendo o seu trabalho, que segue tendo prioridade.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização.

- **O limiar de sentimento passa a vir do agente que atende aquela conversa** Quem opera mais de um agente ajustava o campo "limiar de sentimento" de um deles
  e via o comportamento do outro. Os dois campos existiam, os dois aceitavam
  valor, e só um fazia efeito — o do agente mais antigo da organização, porque a
  conversa que disparou o alerta não entrava na conta.

  Com um agente só, o resultado era certo por acidente. Com dois, o limiar em
  vigor dependia da ordem em que eles foram criados, e não havia nada na tela que
  explicasse por quê.

  E o limiar certo é genuinamente diferente por agente: numa clínica, cliente
  triste é sinal de problema; numa assistência técnica, cliente triste é o cliente
  normal. Um número único para os dois erra nos dois sentidos — escala demais num
  caso, de menos no outro.

  Agora vale o limiar do agente que está atendendo aquela conversa. Quando não dá
  para dizer com certeza qual é — dois agentes e nenhum vínculo com a conversa —,
  vale o padrão do sistema, nunca o número do vizinho.

  O alerta gerado passa a registrar qual agente decidiu e por quê, para que a
  pergunta "por que este alerta saiu?" tenha resposta na própria linha.

- **O nome, a descrição e a ordem do agente passam a ser salvos de verdade** Na tela de um agente, trocar o **Nome** não mudava nada. A pessoa digitava,
  salvava, publicava — e o nome continuava o mesmo, no editor e na lista.
  **Descrição** e **Ordem de preferência** sumiam do mesmo jeito.

  O que tornava isso difícil de perceber é que nada falhava: o campo aceitava a
  digitação, o aviso verde dizia "Rascunho salvo", e a publicação respondia com
  sucesso. Todas essas mensagens eram verdadeiras — a respeito da **versão**, que
  era a única coisa realmente gravada. Recarregar a página não ajudava, porque o
  valor nunca chegou a ser gravado.

  Agora os três são salvos junto com o rascunho, e a lista de agentes reflete o
  nome novo na hora.

  Dois detalhes que vêm junto: apagar a descrição realmente a apaga (antes o campo
  vazio seria interpretado como "não mexi"), e uma ordem de preferência fora de
  0 a 1000 é avisada embaixo do campo, em vez de virar erro genérico depois.

- **"Quero 2 iPhone 15" volta a encontrar o iPhone 15** Quando o cliente escrevia um número que não é característica do produto — a
  quantidade que ele quer, quanto pretende gastar —, o atendente de IA respondia
  que **não encontrou nada**. "Quero 2 iPhone 15" e "tenho 3.000 pra gastar num
  iPhone" voltavam vazias, mesmo com o produto no catálogo.

  É o pior momento para dizer "não encontrei": a pessoa estava comprando.

  A causa era a regra que impede o erro mais caro da busca — quem pergunta do
  128GB não pode receber o preço do 256GB. Para isso, o número que o cliente diz
  precisa bater exatamente. Só que **todo** número era tratado assim, inclusive os
  que não descrevem produto nenhum.

  Agora o próprio catálogo decide: um número só restringe a busca se ele existir
  em algum produto. "128" existe, então continua separando os modelos. "2" não
  existe em produto nenhum, então é quantidade — e quantidade não esconde nada.

  A proteção continua inteira no caso que importa: quem pede uma capacidade que a
  loja não tem continua recebendo "não temos", e nunca o modelo parecido com
  preço diferente.

  Para quem opera uma instalação, nada muda no dia a dia.

- **O prompt que você salva passa a ser o que o agente realmente executa** Editar as instruções de um agente **já publicado** e salvar mostrava o texto novo
  na tela — enquanto o agente continuava atendendo no WhatsApp com o texto
  anterior. Não havia erro, nem aviso: quem editava concluía que a mudança estava
  no ar, e ela não estava.

  A causa é que existem dois lugares onde as instruções podem morar: o cadastro do
  agente e a **versão publicada**. Quem atende o cliente é a versão. A tela mandava
  alguns agentes para o editor antigo, que grava no cadastro — o lugar que o
  atendimento não lê quando há versão publicada.

  Agora quem tem versão publicada é levado direto ao editor de versões, que grava
  onde o atendimento lê. E, se alguma outra ferramenta tentar mudar as instruções
  ou o modelo pelo caminho antigo, a resposta passa a ser um erro que explica o
  caminho certo, em vez de um sucesso que não teve efeito.

  Agente sem versão publicada continua exatamente como estava.

- **Título de novidade com aspas no meio chega inteiro à tela de atualização** O texto que descreve cada novidade é lido por quem opera a instalação, na tela
  de atualização, antes de decidir atualizar. Um título que citasse uma frase
  entre aspas chegava lá **torto**: a aspa de abertura sumia e a do meio ficava
  solta, como se o texto estivesse cortado.

  Num sistema de atendimento, citar o que o cliente escreve é o caso natural de um
  título — não a exceção. O primeiro título que precisou disso já saiu errado.

  Agora aspas no meio do texto são preservadas, e só somem quando envolvem o
  título inteiro — que é como alguém escreveria para "escapar" o texto.

  Nada muda no dia a dia de quem opera: nenhuma configuração nova, nenhum passo de
  atualização.

- **Um WhatsApp fora do ar deixa de pendurar a tela até o navegador desistir** Quando o serviço que conversa com o WhatsApp fica indisponível, o CRM ficava
  esperando por ele sem limite. A tela de conexão girava, o envio não voltava, e o
  único desfecho era o navegador ou o servidor desistirem sozinhos, minutos depois
  e sem explicação.

  O caso ruim não é o serviço recusar a conexão — isso já dava erro na hora. É o
  serviço aceitar e nunca responder, que é o que acontece quando ele está
  sobrecarregado ou travando: dali não vinha erro nenhum, só espera.

  Agora toda conversa com esse serviço tem prazo. Passou do prazo, o CRM desiste e
  diz que foi o tempo — em vez de deixar você olhando para uma tela parada sem
  saber se funcionou.

  Envio de áudio e vídeo tem prazo maior, de propósito: eles são convertidos antes
  de sair, e cortá-los no mesmo tempo de uma mensagem de texto faria mensagem
  legítima deixar de ser enviada.

- **Planilha exportada do Excel com acento entra inteira, sem virar caractere estranho** O Excel em português salva planilha num formato de texto antigo, e é o padrão
  dele — quem exporta a lista de produtos ou de contatos quase sempre manda esse
  arquivo. O sistema lia todos como se fossem do formato moderno, e o resultado
  dependia de onde estava o acento.

  Quando o acento estava nos **dados**, era o pior caso: a importação dizia
  "pronto, N produtos importados" e o catálogo ficava com nomes como
  `A��o C�nica` — sem um erro sequer. É esse nome corrompido que o atendente de IA
  lia em voz alta para o cliente, e ninguém confere linha a linha numa lista de
  300 itens.

  Quando o acento estava no **cabeçalho**, o arquivo inteiro era recusado com uma
  mensagem ilegível.

  Agora o sistema identifica o formato pelo próprio conteúdo do arquivo e lê os
  dois corretamente — sem você precisar reexportar nada. Vale para a importação de
  produtos e para a de contatos.

  E um arquivo que não é planilha de texto (um `.xlsx` renomeado, por exemplo)
  passa a ser recusado com a instrução do que fazer, em vez de virar centenas de
  linhas ilegíveis no seu catálogo.

- **Quem não é administrador volta a ver a lista de credenciais de IA** Um membro da equipe que não é administrador abria **IA › Provedores** e via a
  lista **vazia** — concluindo que a organização não tinha nenhuma chave
  cadastrada, quando tinha.

  Não havia erro nem aviso: a tela respondia normalmente, só que sem nenhuma
  linha. É a pior forma de falhar, porque parece uma informação verdadeira.

  A causa foi um ajuste de segurança anterior, que fechou a **escrita** dessas
  credenciais para quem não é administrador — e, sem querer, fechou a **leitura**
  junto. A tela de provedores é somente-leitura para esses papéis e nunca deveria
  ter sido afetada.

  Agora a leitura volta a valer para todo membro da organização, e a escrita
  continua restrita a administrador, como estava.

  A chave em si segue protegida: ela nunca foi exposta por essa tela, e continua
  inalcançável para qualquer papel — inclusive para quem passou a enxergar a
  lista.

- **A tela de chaves de IA explica o que deu errado e mostra quantos modelos a chave alcança** Quem colava uma chave de IA e errava via um código (`auth_failed_401`) no
  lugar de uma explicação, e quem acertava via a lista de modelos inteira colada
  por vírgula onde deveria haver um número. Se o servidor reiniciasse no meio da
  validação, o cartão dizia "Validando…" para sempre.

  Agora o cartão diz em português o que aconteceu ("O provedor recusou a chave.
  Confira se copiou inteira ou gere uma nova."), com o link para gerar outra;
  mostra a contagem de modelos; e, passados dois minutos sem resposta, troca
  "Validando…" por "Não validada" com a dica de revalidar. O diálogo de adicionar
  passa a dizer quando usar cada provedor, onde a chave mora e como ela começa.
  O botão de excluir só fica bloqueado quando a chave está de fato numa versão
  publicada de agente — a mesma regra que a API já usava.

  Nenhuma configuração nova, nenhum passo de atualização.

## [1.12.0] — 2026-09-02

### Adicionado

- **Catálogo de produtos próprio — com o preço que a IA responde ao cliente** Quem vende produto agora tem onde cadastrar o que vende. Antes, o único catálogo
  do sistema era o espelho de uma loja Nuvemshop: quem não usa Nuvemshop — a loja
  de rua, o showroom, quem vende pelo WhatsApp e só — não tinha lugar nenhum para
  pôr preço, e o agente de IA respondia "vou confirmar com a equipe" para a
  pergunta mais comum que existe, que é "quanto custa".

  Há uma tela nova em **Produtos**, no menu do CRM. Dá para cadastrar um a um, e dá
  para **importar a planilha que a loja já tem** — o arquivo do Excel, com os
  nomes de coluna que ela já usa (`código` ou `sku`, `preço` ou `valor`,
  `estoque` ou `qtd`). Reimportar a mesma planilha com preços novos **atualiza** os
  produtos em vez de duplicar, que é o gesto real de quando o custo muda.

  A importação recusa em vez de adivinhar. Uma linha com preço que não dá para ler
  não entra, e o relatório diz qual linha e qual foi o texto encontrado — um chute
  aqui vira preço errado dito a um cliente três dias depois. As linhas boas entram
  mesmo assim: uma planilha de 300 itens não morre inteira por causa da linha 7.

  Para a IA, a diferença é maior do que parece. A busca dela entende o cliente que
  escreve "ifone 15 128" e devolve exatamente o modelo de 128GB — nunca o de
  256GB, mesmo sendo quase o mesmo texto, porque é aí que o preço sai errado. E
  quando dois produtos casam igualmente bem, ela **pergunta** em vez de escolher.

  Só quem é gerente ou administrador altera preço; quem atende lê. Nada muda para
  quem já usa a integração com Nuvemshop — aquele catálogo continua onde estava.

### Corrigido

- **O segundo material que você ensina ao agente volta a funcionar** Ensinar mais de um documento ao mesmo assistente não funcionava, e **não havia como perceber**:
  o primeiro material era lido normalmente, e do segundo em
  diante a tela mostrava "pronto" enquanto o conteúdo nunca ficava disponível para
  a busca. O assistente respondia "não encontrei isso" sobre uma coisa que estava
  escrita num arquivo que você subiu — e nenhum aviso aparecia em lugar nenhum.

  Medido numa instalação real: cinco documentos enviados para o mesmo assistente,
  um funcionou, quatro ficaram parados. Os cinco apareciam como concluídos.

  A causa era interna: a numeração das versões do acervo passou a contar por
  documento, mas a regra do banco continuava contando por assistente — então o
  segundo documento sempre esbarrava no primeiro. Não era intermitente; nunca
  funcionava.

  Agora cada material tem a própria contagem, e os materiais antigos continuam
  válidos como estavam. Se você já subiu documentos que ficaram parados, basta
  reenviá-los depois de atualizar.

  Para quem opera uma instalação, nada muda no dia a dia: nenhuma configuração
  nova, nenhum passo de atualização.

- **O preço da planilha deixa de entrar dez vezes maior no catálogo** O catálogo de produtos aceita uma planilha para a loja não ter de cadastrar item
  por item. A leitura do preço tinha um erro de escala nas duas formas mais comuns
  de uma planilha brasileira chegar.

  **Um centavo escrito com um dígito só.** Quando a célula está formatada como
  número e mostra `1.299,90`, o Excel grava `1299,9` no arquivo — ele corta o zero
  do fim. O sistema lia esse único dígito como separador de milhar e gravava
  **R$ 12.999,00** no lugar de R$ 1.299,90. Dez vezes o preço, sem recusar a linha
  e sem avisar ninguém — e é esse preço que o atendimento automático responderia ao
  cliente.

  **Uma observação escrita ao lado do preço.** Quem escreve `R$ 5.499,00 (promo até
  10)` na mesma célula via os dígitos da observação grudarem no valor, e o produto
  entrava a R$ 54.990.010,00.

  Agora um ou dois dígitos depois da vírgula são sempre centavos — grupo de milhar
  tem sempre três, então um grupo menor não pode ser outra coisa. E célula com
  qualquer texto junto do número passa a ser **recusada**, com a linha apontada no
  relatório e a instrução de como escrever, em vez de virar um número plausível que
  ninguém confere numa lista de 300 itens.

  Para quem opera, nada muda: nenhuma configuração nova, nenhum passo de
  atualização. E nenhum catálogo precisa ser corrigido — o conserto sai na mesma
  versão que traz a importação de planilha, então nenhuma loja chegou a importar
  com o preço errado.

- **O atendimento automático não responde mais por cima de uma conversa entregue a uma pessoa** Quando a IA decide que um caso precisa de gente — cliente irritado, suspeita de
  pedido de descadastro, termo delicado —, ela entrega a conversa e silencia o
  atendimento automático até alguém resolver. A tela mostrava esse estado
  corretamente ("Automático pausado"), mas um segundo motor de resposta, que ainda
  atende instalações sem agente publicado, continuava respondendo assim mesmo.

  O resultado aparecia como o pior tipo de contradição: o painel dizia que uma
  pessoa ia assumir, o cliente recebia mensagem de robô, e ninguém do time ficava
  sabendo. A causa era uma comparação de datas que nunca dava certo para o valor
  "para sempre" que o produto usa nesses casos — a proteção existia no código e
  nunca chegava a agir.

  Agora os dois motores usam a mesma regra, a mesma que move a tela. Para quem
  opera, nada muda no dia a dia: nenhuma configuração nova, nenhum passo de
  atualização. O que muda é que "entreguei para uma pessoa" passa a valer de fato.

## [1.11.1] — 2026-08-31

> **Não publicada** — a tag `v1.11.1` nunca existiu: o corte não publicou imagens, e o que está abaixo chegou na 1.12.0.

### Corrigido

- **A Fila mostra quem realmente espera uma pessoa, e a aba do automático deixa de ficar vazia** A Inbox dizia quem estava no comando de cada conversa olhando um campo que o
  atendimento automático nunca consulta. O efeito era grande e silencioso: a aba
  **Fila** listava como "aguardando atendente" conversas que o robô estava
  respondendo naquele instante, e a aba do automático ficava quase vazia mesmo com
  ele atendendo a maior parte da caixa. Numa instalação real, medido: a Fila
  mostrava 83 conversas, a aba do automático mostrava 2, e o robô atendia 47.

  Quem via isso concluía a coisa errada em qualquer direção — ou que havia uma
  montanha de gente esperando, ou que a IA tinha parado de trabalhar.

  Agora as duas abas perguntam a mesma coisa que o motor: quem responde a próxima
  mensagem deste cliente. A Fila passa a listar só o que precisa de uma pessoa de
  verdade — conversas que a IA escalou, contatos travados para atendimento humano —
  e a aba do automático mostra o que ele está de fato conduzindo.

  **O número da Fila vai encolher bastante no primeiro acesso depois de atualizar.**
  Isso é o número certo aparecendo, não trabalho sumindo.

  A mesma correção alcança o "você é o Nº da fila" que o cliente ouve pelo WhatsApp,
  a numeração na tela e o painel de espera do gerente — os três passam a contar a
  mesma fila. Antes eles podiam divergir entre si.

  Para quem opera: nada a fazer. Nenhuma configuração nova, nenhum passo de
  atualização, nenhum dado alterado — só a leitura de quem está no comando.

- **Reclamar de cobrança errada não bloqueia mais o cliente** Quem escrevia "não me mande mais boletos" — ou "no me manden más cobros
  duplicados" — era tratado como se tivesse pedido para sair, e parava de ser
  atendido. É o oposto do que a pessoa quis dizer: ela está reclamando de uma
  cobrança e quer continuar falando com você.

  A regra olhava só o verbo ("mandar"), que é o mesmo de "não me mande mais
  mensagens". Agora ela olha também o que vem depois: quando o objeto é uma
  cobrança, uma fatura, um pedido ou um produto, deixa de ser pedido de saída.

  Pedir para sair de verdade continua funcionando igual, nas duas línguas.

- **O atendente de IA volta a achar horário quando consulta a agenda** Numa clínica, o atendente de IA tentou marcar um procedimento e não conseguiu —
  duas vezes seguidas. Ele fez tudo certo: descobriu o tipo de atendimento,
  resolveu a data que a pessoa pediu e foi consultar os horários. Mesmo assim
  respondeu que a equipe precisava confirmar, e abriu um chamado interno.

  A causa não era a agenda nem o atendente. Quando a IA não tem um dado opcional
  para preencher — no caso, qual profissional atenderia —, alguns modelos escrevem
  um código vazio em vez de simplesmente não mandar o campo. O sistema aceitava
  esse código como se fosse um profissional de verdade, procurava a agenda de
  alguém que não existe, e concluía que não havia horário publicado. Nenhum erro
  aparecia em lugar nenhum: a consulta era registrada como bem-sucedida.

  O sistema agora reconhece esses códigos vazios e os ignora, voltando a usar o
  profissional configurado no tipo de atendimento. Isso valia para dezenas de
  lugares além da agenda — inclusive a busca no acervo de conhecimento, em que o
  efeito era o atendente responder "não sei" com o material publicado ao lado, e o
  cadastro de negócios, em que um responsável inexistente ficava gravado e sumia
  dos filtros por dono.

## [1.11.0] — 2026-08-31

### Adicionado

- **Marcar ou confirmar um agendamento move o lead no funil sozinho** Antes, marcar ou confirmar um horário na agenda não mexia no card do negócio: a
  equipe precisava arrastar o lead manualmente para "Agendamento solicitado" ou
  "Agendado" (ou como quer que a organização tenha nomeado essas etapas).

  Agora, quando um agendamento nasce pendente de confirmação, o lead se move para
  a etapa do funil marcada com o slug `agendamento-solicitado`; quando o
  agendamento é confirmado, ele se move para a etapa `agendado`. É opt-in: quem
  não criou essas etapas no funil não vê nenhuma mudança de comportamento. Cancelar
  ou faltar a um compromisso não move o lead — o negócio pode ter outro horário
  remarcado, e quem decide que ele esfriou continua sendo o agente de IA ou uma
  pessoa da equipe.

- **O atendente de IA passa a marcar consulta pela conversa** Quem instalou e ligou a agenda tinha um atendente de IA que consultava horário e
  não fechava nada: o paciente pedia "quinta às 14h" e a resposta era sempre "vou
  confirmar com a equipe". Faltavam duas coisas, e nenhuma delas era o modelo.

  A primeira: ele não sabia que dia era hoje. Nenhuma informação sobre a data
  chegava até ele, então não tinha como transformar "quinta que vem" ou "amanhã de
  manhã" num horário de verdade. Agora todo atendimento começa sabendo a data, a
  hora e o dia da semana, no fuso que você escolheu nas configurações da empresa.

  A segunda: ele não tinha como descobrir o que a sua empresa atende. Consulta,
  retorno, avaliação, procedimento — a lista está no sistema, e ele não conseguia
  lê-la; tinha que adivinhar o nome exato e errava. Agora existe uma capacidade
  nova, "Ver o que a empresa atende", que mostra a ele os tipos de atendimento com
  a duração de cada um.

  Junto vieram outras duas: confirmar um horário quando a pessoa avisa que vem, e
  registrar depois se ela foi atendida ou não apareceu. E a lista de horários
  livres passou a sair em português — "sexta-feira 04/09 às 14:00" em vez de um
  código de data —, com um número menor de opções por vez, o que também deixa a
  resposta mais rápida.

  O sistema também passou a recusar um registro que antes aceitava calado: marcar
  "faltou" num compromisso que ainda nem começou. Isso devolvia o horário para
  outra pessoa enquanto o cliente original ainda estava contando com ele.

  **As capacidades novas não entram sozinhas nos agentes que já existem.** Para o
  seu atendente usá-las, abra *O que o agente pode fazer*, ligue o pacote
  **Vender** de novo e publique. Agente criado a partir de agora já nasce com elas.

### Corrigido

- **O canal Zernio volta a enviar em quem configurou a partir do arquivo de exemplo** Quem conectou o canal Zernio numa instalação montada a partir do arquivo de
  exemplo não conseguia enviar mensagem nenhuma por ele. As duas credenciais
  estavam certas, o canal aparecia configurado, e o envio falhava assim mesmo —
  tanto para quem deixou as credenciais na configuração quanto para quem as
  cadastrou pela tela.

  A causa estava no endereço do provedor. O arquivo de exemplo traz essa linha
  vazia, e o comentário ao lado dela promete que vazio usa o endereço de produção
  do provedor — a linha só existe para quem precisa apontar o sistema a um
  ambiente de homologação. Não era o que acontecia: o vazio era tratado como se
  fosse um endereço de verdade, e o sistema tentava falar com um lugar que não
  existe.

  Agora vazio significa o que o arquivo sempre disse que significava. Quem
  preencheu a linha para apontar para homologação continua sendo respeitado, e
  espaço sobrando em volta do endereço deixa de atrapalhar.

  Ninguém precisa mexer em nada. Instalações que já enviavam seguem iguais, e as
  que estavam com esse envio quebrado voltam a funcionar sozinhas.

- **Quem pede para sair em espanhol passa a ser atendido** Pedir para sair em espanhol só funcionava numa forma: a palavra sozinha, ou
  "no quiero recibir". As formas que as pessoas realmente escrevem — "deja de
  escribirme", "no quiero más mensajes", "dame de baja" — não casavam padrão
  nenhum, e o pedido se perdia em silêncio.

  O sinal que faz o robô parar de responder e chamar uma pessoa (o nível
  "ambíguo", usado quando o pedido não é claro o bastante para bloquear
  sozinho) também não existia em espanhol: nenhuma frase daquele idioma
  chegava a ativá-lo, então esse cliente nunca era escalado.

  De passagem, corrige um caso em português que só apareceu ao testar os dois
  idiomas juntos: "pare de mandar o pedido nesse endereço" bloqueava um
  cliente que só queria mudar a entrega.

- **O relógio interno do assistente deixa de depender da versão do banco** Quando uma conexão de WhatsApp entra em espera, o sistema marca a fila com uma
  data "infinita" — é assim que ele segura o atendimento até alguém resolver o
  aviso. O cálculo de quanto falta para a próxima tarefa fazia uma conta com essa
  data que **só funciona no Postgres 17**; em Postgres 15 ou 16 o banco recusa a
  conta e o relógio do assistente para.

  Isso nunca afetou quem seguiu a versão recomendada. Passa a importar agora que a
  instalação aceita bancos mais antigos — e é exatamente onde apareceria: numa
  máquina nova, com uma conexão em espera, sem nada na tela explicando.

  A proteção já existia, mas na ordem errada: ela limitava o resultado da conta,
  e a conta estourava antes. Agora limita a data antes de calcular.

## [1.10.2] — 2026-08-30

### Corrigido

- **Quando a IA fica calada, agora dá para ver por quê** Três consertos que atacam o mesmo problema: o sistema fazia a coisa certa em
  silêncio, e de fora parecia quebrado.

  **A ficha de proteção de envio parou de congelar o padrão do dia.** O botão
  "Enviar aos domingos" era o único controle daquela ficha que não sabia dizer
  "não mexi": ele gravava sempre o valor que estava na tela, e o valor na tela,
  sem escolha própria, era o padrão vigente. Quem abriu a ficha para declarar o
  aquecimento do número acabou congelando o padrão daquele dia — e, quando o
  produto passou a liberar domingo, essa instalação ficou para trás com uma
  escolha que ninguém fez. Agora só um valor DIFERENTE do padrão vira escolha.
  Quem desligou o domingo de propósito continua com ele desligado.

  **A espera pela janela de envio virou aviso na Central.** Quando o número está
  fora do horário de envio, as respostas ficam na fila e saem na abertura — isso
  não mudou. O que mudou é que agora existe um aviso dizendo que estão esperando,
  a partir de quando saem e o que fazer. Um aviso por número, e ele se resolve
  sozinho quando o horário reabre.

  **A aba "Execuções" de um agente mostra o que ele realmente fez.** Ela lia uma
  tabela que nenhum motor em uso escreve, e por isso dizia "Nenhuma execução
  ainda" mesmo com o agente respondendo. Passou a ler o registro vivo. Execuções
  anteriores a esta versão não aparecem ali — para o histórico completo, use
  IA › Execuções.

## [1.10.1] — 2026-08-28

### Corrigido

- **A Central de atendimento abre mais rápido quando a equipe é grande** Cada vez que a Central era aberta, o sistema perguntava o nome de cada pessoa
  da equipe que aparecia na página — uma pergunta separada para cada uma, toda
  vez, mesmo quando o nome nem ia ser mostrado na tela.

  Numa equipe pequena isso passava despercebido. Numa equipe grande, não: o
  tempo medido era de cerca de 350 milissegundos com dez pessoas atendendo, e de
  mais de um segundo com cinquenta — só para descobrir nomes que o sistema já
  poderia ter guardado.

  Agora o nome de quem atende fica guardado junto com a conversa, e é atualizado
  sozinho sempre que o atendimento troca de mãos. A Central abre no mesmo tempo
  com uma pessoa ou com cinquenta.

  Nada a fazer: a atualização do banco acontece sozinha quando você roda a
  atualização normal, e os nomes de quem já estava atendendo são preenchidos na
  hora.

- **Quem administra duas empresas entra sempre na mesma** Quem participa de mais de uma empresa na mesma instalação podia entrar numa ou na
  outra sem critério, ao acessar o sistema sem uma escolha anterior guardada — no
  primeiro acesso, numa sessão nova ou depois de a preferência expirar. O sistema
  não tinha regra para decidir qual delas abrir. Agora abre sempre a mais antiga, e
  a escolha feita no seletor de empresa continua valendo por cima disso. Quem tem
  uma empresa só não vê diferença.

- **Agenda sem responsável configurado: o aviso agora diz onde resolver** Numa instalação nova, ou quando um novo tipo de agendamento aponta para alguém
  que ainda não cadastrou horário de atendimento, tentar ver ou marcar um horário
  mostrava "Invalid input: expected object, received undefined" — frase correta
  para quem lê o código e inútil para quem opera a clínica.

  Agora a mensagem diz o que realmente falta e onde resolver: "A disponibilidade
  deste responsável ainda não foi configurada. Configure em Equipe →
  Atendimento." Continua sendo a mesma recusa de antes (nenhum horário é
  oferecido enquanto isso não for configurado) — só a explicação ficou legível.

  Quem já tinha disponibilidade cadastrada não percebe nenhuma diferença.

- **Quem publica o sistema com a própria marca passa a checar a atualização no lugar certo** Se você mantém uma cópia própria do projeto e publica as imagens do sistema com
  o seu próprio endereço, o comando de atualização olhava para o endereço do
  projeto original — e não para o seu — quando a configuração do servidor não
  dizia explicitamente qual imagem usar. Ele então comparava a versão instalada
  com a de outra pessoa, e podia anunciar que havia atualização quando não havia,
  ou o contrário.

  O endereço agora é lido de um ponto único do próprio kit, o mesmo que o resto
  da instalação usa. Quem opera com o projeto original não percebe diferença: o
  endereço lido é exatamente o que já estava escrito antes.

- **Quatro consertos que a versão anterior anunciou e não trouxe chegam agora** A lista de mudanças da versão 1.10.0 anunciou quatro consertos que não estavam
  dentro dela. Foi um erro nosso de ordem: os textos que descrevem os consertos
  entraram no projeto antes do código deles, e a versão foi fechada no meio.

  Se você atualizou para a 1.10.0 esperando alguma destas quatro coisas, elas
  chegam agora:

  - **A instalação nova não obriga mais a verificação em duas etapas.**
    Quem instalava pelo instalador automático era parado por uma tela de
    verificação em duas etapas logo depois do primeiro acesso, sem nunca ter
    sido avisado disso.
  - **Quando a inteligência artificial falha ao responder, o erro deixa de sumir.**
    A falha ficava só no registro técnico do servidor e não chegava a ninguém.
  - **O instalador para de confundir comentário com valor de configuração.**
    No arquivo de exemplo da VPS, um comentário escrito na mesma linha do valor
    era lido como parte do valor.
  - **Uma rede a mais contra vazamento entre empresas.**
    Esta é sobre as próximas versões, não sobre a sua instalação de hoje: uma
    tabela nova que seja criada sem a proteção que separa os dados de cada
    empresa passa a ser recusada na nossa conferência, antes de virar uma
    atualização que chega até você.

  Nada a fazer além de atualizar normalmente. Quem instalar do zero a partir
  desta versão nunca viu o problema.

- **O que você marca no Google passa a aparecer na agenda do CRM** Compromissos criados direto no Google Agenda já bloqueavam o horário — ninguém
  conseguia marcar por cima —, mas não apareciam na tela: a agenda parecia vazia e
  o horário indisponível ao mesmo tempo. Agora eles aparecem como faixa de
  ocupação, com visual próprio e sem clique, porque não são compromissos do CRM:
  não têm cliente, tipo nem responsável, e remarcá-los teria de ser feito no
  Google.

  A faixa mostra apenas o horário ocupado, **não o nome do evento**. A agenda
  conectada é pessoal de quem atende, e esta tela é vista por outras pessoas da
  empresa — o título de um compromisso particular não deve aparecer aí.

- **Os compromissos do CRM voltam a aparecer no Google Agenda** Quem conectou o Google Agenda não via os compromissos marcados no CRM chegarem
  lá — nenhum, nunca. O sistema tentava a cada cinco minutos e o Google recusava
  todas as vezes, porque o pedido usava a operação de "alterar um evento
  existente" para criar um evento que ainda não existia. Agora ele cria com a
  operação certa e só altera o que já está lá. Os compromissos pendentes sobem na
  primeira rodada após a atualização, sem duplicar os que porventura já existam.

  A falha também deixou de ser silenciosa: quando o Google recusar, o motivo passa
  a aparecer no registro do sistema, e não só numa coluna interna que ninguém abre.

## [1.10.0] — 2026-08-28

### Adicionado

- **O sistema inteiro em espanhol, com o idioma trocável em três lugares** Quem instala na América Latina agora escolhe o idioma **na própria instalação**,
  e o sistema abre em espanhol para todo mundo da empresa — inclusive para quem
  for convidado depois e nunca abriu o próprio perfil.

  Antes, o espanhol existia pela metade: só as telas do dia a dia estavam
  traduzidas, e o resto aparecia em português para quem tinha escolhido espanhol.
  Agora a tradução cobre Agenda, Desempenho, Radar, Respostas rápidas, IA e o
  painel de administração, com um teste automático que reprova qualquer texto novo
  que apareça sem tradução.

  O idioma se troca em três lugares, na ordem em que se costuma precisar deles:

  - **No topo de qualquer tela** — o botão `PT`/`ES` ao lado do controle de tema.
    Um clique, sem procurar nada. É onde recorre quem abriu o sistema num idioma
    que não lê.
  - **Na instalação** — o `install.sh` pergunta, e a resposta define o idioma da
    empresa inteira.
  - **Em Configurações** — no seu perfil (só para você) ou em Organização (para
    todo mundo que entrar sem preferência própria).

  Também está consertado um controle que não fazia nada: o seletor de Idioma em
  Configurações › Organização era gravado no banco e nunca era lido. Quem o
  mudasse não via diferença nenhuma. Agora ele vale para toda pessoa da empresa
  que não tenha escolhido um idioma seu.

  **As datas também acompanham o idioma.** "quinta-feira, 3 de março" vira
  "jueves, 3 de marzo" — não sobrou aquele meio-termo em que a tela fala espanhol
  e a data insiste no português.

  Duas exceções, de propósito: os **e-mails** que o sistema envia seguem em
  português (quem recebe um convite ainda não tem conta, então não há preferência
  de idioma para consultar), e o **relatório de LGPD** também — ele responde a uma
  lei brasileira, e mudar a forma dele conforme quem apertou o botão seria errado.

  ---

  A tradução para espanhol é, em boa parte, contribuição de **@JowaniOrantes**, que
  abriu três frentes de trabalho por conta própria: as áreas de IA e administração
  (#352), o módulo de Agenda (#379) e as correções que vieram do QA visual dele.
  São 57 commits e mais de 460 entradas de dicionário que este release não teria
  sem esse trabalho.

### Corrigido

- **Pausar um agente de IA agora o cala de verdade** Pausar o único agente publicado da organização fazia um agente que a tela
  chamava de "Rascunho" voltar a responder no WhatsApp pelo caminho antigo de
  resposta — com o texto do cadastro, sem as ferramentas nem os limites da versão
  publicada.

  Junto disso, a tela passou a dizer a mesma coisa que o motor faz: o seletor de
  dono de negócio deixou de esconder agentes publicados (e de oferecer os
  pausados), e o selo da Inbox só diz "Automático" quando existe mesmo alguém para
  atender.

- **Instalação nova não obriga mais a verificação em duas etapas logo de cara** Quem instalava pelo instalador automático caía, logo depois do primeiro acesso,
  numa tela obrigatória pedindo para cadastrar a verificação em duas etapas — um
  passo que o assistente de instalação nunca anunciou. A verificação é opcional
  desde a versão 1.0 e se liga em Configurações › Segurança, mas o instalador não
  acompanhou essa decisão e deixava o valor obrigatório.

  Quem já instalou e já configurou a verificação não é afetado: nada é desligado
  de quem já tem. A mudança vale só para instalações novas, que passam a nascer
  como sempre foi a intenção — com a escolha nas mãos de quem administra.

- **O mesmo celular escrito das duas formas passa a cair sempre no mesmo cadastro** Quando um celular ainda existia gravado nas duas formas — com e sem o nono
  dígito —, o sistema podia escolher qualquer uma das duas ao reencontrar a
  pessoa. Na prática isso aparecia no pior momento: a resposta do cliente entrava
  no cadastro errado, o follow-up não a reconhecia como resposta, e a mesma
  pergunta era enviada de novo.

  Agora a escolha é sempre a mesma e é sempre a forma com o nono dígito, que é a
  que o CRM guarda e mostra. Você não precisa fazer nada.

- **Quando a IA falha ao responder, o erro deixa de sumir** A peça que faz a IA responder às conversas registrava as próprias falhas apenas
  num log que ninguém lê. Se ela parava de responder por um erro, não havia sinal
  em lugar nenhum — só o silêncio no WhatsApp do cliente. Agora esse erro é
  enviado ao serviço de monitoramento, o mesmo que o resto do sistema já usava.

  Quem opera não precisa fazer nada, e nenhum dado de conversa é enviado: o
  sistema já limpa o conteúdo antes de mandar.

- **O instalador para de confundir comentário com valor de configuração** No arquivo de exemplo que serve de base para a configuração da VPS, as
  explicações ficavam na mesma linha dos valores. O instalador lê esse arquivo
  linha a linha e tratava a explicação como parte do valor — então uma senha, um
  endereço ou uma chave podiam chegar ao servidor com um texto extra colado no
  fim, e o erro só aparecia depois, num lugar sem relação com a causa.

  As explicações passaram para a linha de cima. Quem já tem o servidor rodando não
  precisa refazer nada; a mudança protege quem instala do zero a partir de agora.

- **Quem baixa o projeto no Windows consegue rodar os testes** Isto é do nosso processo de desenvolvimento, não do sistema que você usa. Quem
  baixava o projeto no Windows não conseguia rodar a bateria de testes do banco:
  o sistema operacional alterava os arquivos de banco de dados na cópia, e uma
  conferência de integridade recusava tudo antes de o primeiro teste rodar.

  Para quem opera uma VPS nada muda — o servidor sempre rodou em Linux, onde a
  alteração não acontece.

- **O relógio externo do follow-up passou a ser testado de ponta a ponta** Quem roda o sistema numa hospedagem sem agendador próprio — o plano gratuito da
  Vercel é o caso comum — depende de um serviço de cron externo bater de tempos em
  tempos para os follow-ups andarem. Esse caminho tinha runbook e nunca tinha sido
  exercitado: se ele parasse de funcionar, ninguém receberia erro, e os follow-ups
  simplesmente ficariam parados.

  Agora um teste automático dispara a batida de fora, como o cron real faz, e
  confere que o follow-up de fato anda — e que uma batida sem a chave certa é
  recusada sem mexer em nada. Você não precisa fazer nada: nada mudou no
  comportamento, só passou a existir uma rede que avisa se ele quebrar.

- **Uma rede a mais contra vazamento entre empresas** O sistema separa os dados de cada empresa por uma regra no banco, e essa regra
  precisa ser ligada tabela por tabela. Faltava uma verificação automática que
  recusasse uma tabela nova sem essa proteção — a conferência dependia de alguém
  lembrar. Agora ela é feita a cada mudança, e o que já existe está registrado
  como dívida conhecida, para a lista só diminuir.

  Nada muda para quem opera: é uma proteção contra um erro futuro, não a correção
  de um vazamento existente.

## [1.9.1] — 2026-08-28

### Corrigido

- **O Google Agenda conectado passa a aparecer como conectado** Quem conectava o Google Agenda continuava vendo o botão "Conectar Google" na
  tela, como se nada tivesse acontecido — e ao clicar em desconectar recebia um
  erro dizendo que não havia agenda conectada. Os compromissos marcados no CRM
  também nunca chegavam ao Google Agenda, em silêncio.

  A conexão sempre foi gravada corretamente; o que estava errado era o nome pelo
  qual três partes do sistema a procuravam, e por isso nenhuma delas a encontrava.
  Agora a tela mostra a conta conectada, desconectar funciona, e os compromissos
  sobem para o Google na primeira rodada seguinte. Quem já conectou não precisa
  reconectar: a conexão está lá e passa a ser vista.

- **A lista de horários volta a rolar ao marcar um compromisso** Ao escolher o dia, os últimos horários ficavam abaixo da borda da tela sem
  nenhuma forma de alcançá-los — nem rolando a página, nem a própria lista. Quem
  precisava de um horário do fim da tarde não conseguia marcar. Agora a lista rola
  sozinha, com o calendário e os dados do atendimento parados ao lado, e em telas
  menores o painel inteiro rola.

- **As verificações automáticas do projeto voltaram a caber no tempo** Isto é do nosso processo de desenvolvimento, não do sistema que você usa: a
  bateria de testes que roda antes de cada mudança tinha crescido a ponto de
  estourar o tempo limite e ser cancelada no meio. Ela passou a rodar em duas
  frentes ao mesmo tempo, o que a devolveu para dentro do limite com folga. Para
  quem opera uma VPS nada muda — só a chance de uma correção demorar mais a sair
  porque a verificação foi cancelada por tempo.

- **Áreas de administração passam a exigir a verificação em duas etapas** Quatorze telas e ações de administração conferiam apenas o papel de quem
  acessava, sem cobrar a verificação em duas etapas de quem a tem ativada. Entre
  elas estavam as que conectam o número oficial do WhatsApp, as que trocam a
  credencial do provedor de inteligência artificial e as que alteram os limites de
  segurança do agente — justamente as que mais importam.

  Quem já usa o sistema não precisa fazer nada, e quem não ativou a verificação
  continua entrando como antes. A mudança é que, para quem a tem ativada, ela
  passa a valer também nesses lugares.

- **Trocar para uma organização ainda não configurada deixava você preso** Quem participa de mais de uma organização podia trocar pelo seletor no topo e
  cair no assistente de configuração da organização nova — o que está certo, ela
  não foi configurada ainda. **O que estava errado é que não havia como sair de lá.**
  O seletor de organização some junto com o resto do sistema nessa tela, e sobravam
  só os links de Termos e Privacidade e um botão "Continuar" desabilitado. A saída
  era fechar o navegador e limpar os dados do site.

  Agora o assistente mostra, no topo, o caminho de volta para as outras
  organizações de que você participa — um clique e você está de volta onde estava
  trabalhando.

  Nada muda para quem administra uma organização só: o botão não aparece, porque
  não há para onde voltar.

- **Voltar da autorização do Google não pede login de novo** Ao conectar o Google Agenda, o navegador voltava e caía na tela de login — o que
  se lia como "o sistema me deslogou". A sessão nunca foi encerrada: o navegador é
  que, por segurança, não apresenta a credencial numa página aberta a partir de
  outro site, e a volta do Google era exatamente isso. Agora o retorno passa por
  uma página intermediária do próprio sistema, e a pessoa cai direto na Agenda,
  ainda conectada. Quem já usava não precisa fazer nada.

## [1.9.0] — 2026-08-28

### Adicionado

- **A agenda virou agenda — clicar num horário marca, arrastar um card remarca** A grade da Agenda mostrava a semana e não aceitava nada: clicar num espaço vazio
  não fazia nada, e arrastar um compromisso não fazia nada. Para marcar era preciso
  sair da grade, abrir "Novo agendamento" e escolher a data de novo no
  mini-calendário — mesmo tendo acabado de apontar para o horário na tela.

  Agora a grade responde:

  - **Clicar num horário livre abre a marcação já naquele horário.** Os horários
    que aceitam clique são exatamente os que você publicou em Equipe › Atendimento
    — os mesmos que o agente de IA oferece ao cliente. A tela não inventa horário:
    se não está publicado, não é clicável.
  - **Horário que não aceita marcação diz por quê**, em vez de ficar apagado sem
    explicação: "você ainda não publicou seus horários", "já há um compromisso
    neste horário", "fora dos horários que você publicou".
  - **Arrastar um compromisso para outro horário remarca**, com uma confirmação
    antes — quem foi atendido recebe aviso da mudança, então o gesto não consuma
    sozinho. Soltar fora dos horários publicados é recusado com o motivo, e o
    compromisso volta para onde estava; se o servidor recusar, ele volta também.
  - **Quem usa teclado remarca do mesmo jeito**: com o compromisso em foco,
    `Alt + ↑/↓` salta de vaga em vaga, `Alt + ←/→` muda de dia, `Enter` confirma e
    `Esc` desfaz.

  Nada muda no que já estava marcado, e nada precisa ser configurado para isto
  funcionar — se a sua equipe já publicou os horários de atendimento, a grade já
  está clicável.

### Corrigido

- **Conectar a agenda do Google passa a concluir de verdade** Quem clicava em conectar a conta do Google era levado à tela de autorização,
  autorizava, e voltava para uma página de erro — a conexão nunca se completava.
  Não era problema da conta nem da instalação: a volta da tela de autorização era
  recusada pelo sistema antes de chegar ao lugar certo, em qualquer instalação.
  Se você tentou conectar e desistiu, tente de novo: agora vai até o fim.

  A mesma recusa acontecia na volta da conexão com a Nuvemshop, e também foi
  corrigida.

  Para conectar o Google, quem administra a instalação continua precisando
  cadastrar as credenciais em Administração › Google e registrar o endereço de
  retorno no console do Google — exatamente o endereço que a própria tela mostra,
  terminando em /api/v1/agenda/google/callback. Sem esse endereço registrado, o
  Google recusa a autorização antes de o sistema ser chamado.

- **A coluna de horários volta a caber na tela ao marcar um compromisso** Ao escolher o dia, a lista de horários aparecia cortada pela borda direita e
  saía da tela — não dava para escolher horário nenhum, e nem diminuir o zoom nem
  rolar a página resolvia. As três colunas do painel somavam mais largura do que a
  janela onde ele abre, e o excedente era cortado sem barra de rolagem. Agora o
  painel abre mais largo quando a tela permite, e em telas menores a lista de
  horários aparece embaixo do calendário em vez de ao lado.

- **O botão "Ver na agenda" passa a levar até o compromisso marcado** Depois de marcar, o botão "Ver na agenda" da confirmação não fazia nada: o clique
  caía no vazio. Agora ele fecha o painel e leva a agenda até o dia do compromisso
  — inclusive quando ele foi marcado para outra semana, que era o caso em que
  mesmo fechar o painel não teria adiantado, porque a agenda continuaria mostrando
  a semana atual.

## [1.8.0] — 2026-08-27

### Adicionado

- **A tela diz quem consulta cada material** Um documento que nenhum assistente lê aparece marcado como tal: acervo que ninguém consulta
  é dinheiro gasto sem efeito, e isso era invisível.

- **Avisos de mensagem e de CRM chegam com a aba fechada** Antes, quem minimizava ou fechava a aba parava de ver aviso de mensagem nova e
  de movimento no funil — voltava e descobria tudo de uma vez. Agora o navegador
  mostra o aviso na bandeja do sistema mesmo com o site fechado, e clicar nele
  abre a conversa certa.

  Cada pessoa liga isso em Configurações › Notificações, e o navegador pede
  permissão uma vez. **Nada muda para quem não ligar.**

  Para a instalação inteira poder mandar esses avisos, quem administra a VPS
  gera um par de chaves uma única vez (`npx web-push generate-vapid-keys`) e o
  coloca no `.env`, em `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.
  **Sem essas chaves o produto continua funcionando exatamente como antes**, com
  os avisos aparecendo só enquanto o site está aberto.

- **As credenciais do Google Agenda passam a ser cadastradas pela tela** Para ligar a sincronização com o Google Agenda era preciso acessar o servidor por
  linha de comando, editar um arquivo de configuração e reiniciar o sistema. Quem
  administra a instalação agora faz isso em Admin › Google Agenda: cola o ID e a
  chave do aplicativo, e o endereço de retorno já vem pronto para copiar no painel
  do Google.

  A chave é guardada cifrada e nunca mais aparece na tela — só é possível
  substituí-la. Quem já tem as credenciais no arquivo de configuração não precisa
  fazer nada: elas continuam valendo, e o que for salvo pela tela passa a valer no
  lugar delas. Ao trocar uma credencial já em uso, quem tinha conectado a agenda
  precisa conectar de novo — é o Google que invalida as autorizações antigas, e a
  tela avisa antes.

- **Dá para ver o que o agente aprendeu de cada material** O botão "Ver o que ele aprendeu" mostra os trechos exatos que ele procura antes de
  responder. Quando ele erra sobre um assunto, é ali que se descobre o porquê — antes a tela
  mostrava só um número.

- **Enviar arquivo passou a funcionar** PDF, Markdown ou texto, até 20 MB — ou cole o texto direto na tela, se preferir. Antes só
  existia o formato pergunta/resposta; quem tentava subir um PDF não tinha por onde.

- **O material do seu negócio agora é da empresa, e cada assistente escolhe o que lê** Antes, o que o agente sabia pertencia a UM assistente: dois times com o mesmo manual de
  trocas precisavam cadastrá-lo duas vezes, indexá-lo duas vezes e pagar por ele duas vezes.
  Agora o acervo é da organização — em **IA › Conhecimento** — e na tela de cada assistente há
  uma seção **"O que ele consulta antes de responder"**, onde você marca o que aquele
  assistente pode ler. O mesmo documento serve a quantos assistentes você quiser.

- **O follow-up anda mesmo em hospedagem sem agendador** Em ambientes que não têm agendador de verdade — o plano gratuito da Vercel é o
  caso comum — os follow-ups e as tarefas de bastidor só andavam quando alguém
  abria o sistema. Um lead que respondia de madrugada ficava esperando.

  Agora existe uma batida de relógio que pode vir de fora: um serviço gratuito de
  cron chama uma vez a cada poucos minutos e o sistema faz o que estava pendente.
  O passo a passo está no runbook do relógio.

  **Quem roda numa VPS com o agendador normal não precisa fazer nada** — ali o
  relógio já existia e continua igual.

### Alterado

- **O agente de IA passa a caber 25 capacidades, e alcança as de agenda** Quem já tinha o agente com a lista cheia lia "20 de 20 capacidades ligadas.
  Limite atingido." e não conseguia ligar as capacidades de agenda — ver horários
  livres, marcar, remarcar, desmarcar —, que aparecem na lista mas ficavam
  desabilitadas. O limite passou de 20 para 25.

  Isso não muda nada no que já está configurado: nenhum agente perde capacidade, e
  quem não estava no limite não vê diferença. Quem estava agora consegue ligar mais
  uma jornada. Agentes criados antes da Agenda não recebem as capacidades novas
  sozinhos — a lista de cada versão é uma foto congelada; é preciso abrir
  "O que o agente pode fazer" e ligá-las.

### Corrigido

- **A Agenda passa a dizer por que os dias estão travados** O calendário abria com o mês inteiro sem clique e nada explicando. Havia estados
  em que nem o aviso aparecia: numa instalação nova, em que ninguém publicou a
  jornada de atendimento, a consulta falhava e a tela concluía que estava tudo
  certo; e avançar dois meses levava a um período que a busca nunca cobriu, também
  em silêncio. Agora o bloco de aviso e os dias apagados saem da mesma conta,
  cada dia diz a causa ao passar o mouse e para quem usa leitor de tela, e o botão
  de avançar mês não leva mais a um período vazio por construção.

- **A tela de marcar mostra o local e o fuso reais, e dá para registrar o desfecho** Ao marcar um horário, o painel dizia "Presencial · Sala 2" e "horários no fuso
  America/Sao_Paulo" para todo mundo — texto de exemplo que nunca era trocado pelo
  que estava configurado no tipo de agendamento. Quem atende em outro fuso via a
  hora errada anunciada. Agora ele mostra o local que você cadastrou e o fuso de
  verdade, e some com a linha quando não há o que mostrar, em vez de inventar.

  No histórico, os botões "Realizado" e "Faltou" ficavam sempre cinzas, dizendo que
  estariam disponíveis quando a agenda estivesse conectada ao Google — o que nunca
  teve relação. Agora funcionam. Marcar "Faltou" devolve o horário para outra
  pessoa poder pegar.

- **Compromissos marcados no CRM passam a aparecer no Google Agenda** Quem conectou o Google Agenda não via os compromissos do CRM chegarem lá — nunca,
  em instalação nenhuma. A tarefa que faz esse envio pedia os pendentes ao banco de
  um jeito que o banco recusava, e ela falhava a cada cinco minutos desde que o
  módulo saiu, deixando só um aviso no registro técnico. Agora ela pede certo, e o
  que já está marcado sobe na primeira rodada depois da atualização. Não é preciso
  reconectar nada nem mexer em arquivo: a atualização já traz a mudança do banco.

- **A tela de Notificações passa a dizer o que falta para o aviso chegar com a aba fechada** A tela dizia que o aviso por Push "já funciona", sem conferir se esta instalação
  tinha como enviá-lo. Quem ligava a opção via o navegador pedir permissão,
  concedia, e depois não recebia nada com a aba fechada — sem nenhuma pista do
  motivo, e sem como descobrir o que fazer.

  Agora, quando faltam as chaves do Web Push, a própria tela avisa que os avisos
  só aparecem com o site aberto e mostra o comando para gerar o par de chaves e
  onde colocá-lo. Quando as chaves já estão no lugar, ela anuncia que o aviso
  chega também com a aba fechada e para de pedir configuração.

  **Você não precisa fazer nada.** A opção de Push continua podendo ser ligada dos
  dois jeitos: mesmo sem as chaves, o aviso na bandeja do sistema já funciona
  enquanto o DeskcommCRM está aberto numa aba.

- **A Agenda passa a mostrar só a organização que está selecionada** Quem administra mais de uma empresa na mesma instalação via a Agenda somando as
  duas: os tipos de agendamento apareciam repetidos, e clicar em metade deles
  respondia que o tipo não foi encontrado. Nada estava duplicado no banco — a tela
  é que mostrava as duas empresas juntas. Agora ela mostra só a que está
  selecionada no alto da página, e trocar de empresa troca a lista. O mesmo valia
  ao abrir um contato, um lead ou um funil pelo endereço direto. Para quem tem uma
  empresa só, nada muda.

- **Arquivar um material não liberava o espaço** Arquivada, a fonte continuava ocupando o lugar e não dava para criar outra do mesmo tipo —
  nunca mais, sem mensagem que explicasse.

- **Cadastrar a chave da OpenAI pela tela não ligava a base de conhecimento** O produto dizia, em duas telas, que a OpenAI é necessária "para indexar o seu material" — e
  o motor só olhava para a chave do arquivo de configuração da instalação. Quem cadastrou a
  chave em IA › Credenciais e viu o material parado estava vendo esse defeito. Agora a chave
  sai da sua organização, e a tela de conhecimento **diz qual está valendo**.

- **O mesmo celular com e sem o nono dígito deixa de virar dois contatos** `+55 32 8479-3302` e `+55 32 98479-3302` são a mesma pessoa, e o CRM tratava as
  duas grafias como contatos diferentes. O efeito aparecia no pior momento: a
  resposta do cliente entrava no cadastro errado, o follow-up não a reconhecia
  como resposta, e a mesma pergunta era enviada de novo.

  Agora o CRM guarda e mostra sempre a forma com o nono dígito, encontra a pessoa
  pelas duas grafias na entrada, e **junta os pares duplicados que já existiam**
  na sua base ao atualizar. Fixo e número estrangeiro não mudam. O envio ao
  WhatsApp continua tentando as duas grafias, como antes.

  E a resposta do lead passa a acordar o follow-up: quem responde antes do prazo
  não fica esperando o relógio para seguir no fluxo.

- **Conversas marcadas como aproveitáveis eram perdidas** A rotina que as prepara gravava zero trechos por um erro de configuração do banco, e mesmo
  assim as marcava como aproveitadas — o que as tirava da fila para sempre.

- **Duplicar um assistente perdia o escopo dele** A cópia nascia sem os funis em que o original mexia — e teria nascido sem os materiais
  também. Criar assistente pela API tinha o mesmo problema: o pedido era aceito e metade dos
  campos, descartada.

- **O botão de aviso na tela de Notificações não aparece mais ligável para depois se desligar sozinho** Quem tem as notificações bloqueadas no próprio navegador via, por um instante,
  o botão de Push disponível — e ele se desabilitava sozinho logo em seguida. Um
  clique naquele intervalo não fazia nada, porque a resposta do navegador já
  estava dada.

  A tela passa a consultar o navegador antes de desenhar o botão, em vez de
  desenhá-lo primeiro e corrigir depois. Você não precisa fazer nada.

- **O agente descartava paráfrases** O corte de semelhança usado no atendimento era mais rígido do que o calibrado com medição:
  "posso trocar se não servir?" era jogado fora mesmo com a resposta escrita no seu material.
  Agora os três lugares que decidiam isso usam o mesmo valor.

- **O aviso de "publique seus horários" agora leva até onde se publica** Quem abria a Agenda numa instalação nova encontrava o aviso de que ainda não
  havia horários publicados — e nenhuma indicação de onde publicá-los. A tela
  sempre existiu, em Equipe › Atendimento, mas se anunciava como "status, carga e
  capacidade" e nada ali dizia "horários". Agora o aviso é um link direto para ela,
  já com a aba certa aberta, e a seção diz para que serve. Nada precisa ser
  reconfigurado: quem já publicou a jornada continua com ela.

- **O conhecimento cadastrado ia parar no assistente errado** Se a sua organização tem mais de um assistente, todo material cadastrado era preparado
  para o *primeiro* deles — sempre. O segundo assistente nunca aprendia nada, sem erro, sem
  aviso, sem nada na tela. E a tela de conhecimento só existia para o assistente que veio
  com a instalação: qualquer assistente criado por você era invisível ali.
  Depois de atualizar, o que cada assistente já lia continua valendo. Mas o material que
  você tinha cadastrado para um assistente que não é o da instalação nunca chegou a ser
  aprendido de verdade — ele aparece no acervo e precisa de um "Preparar de novo" para
  virar consulta. Vale conferir, em cada assistente, o que ele consulta.

- **Preparar um material derrubava o outro** Enquanto havia um único índice por assistente, a rotina de conversas e a de perguntas
  frequentes competiam: a que rodasse por último apagava o acervo da outra, em silêncio. Cada
  material passa a ter o índice dele.

- **A página do projeto passa a anunciar a versão certa sozinha** Quem chega pelo GitHub via a versão anterior anunciada como a mais recente,
  mesmo depois de a nova sair, porque só a etiqueta da versão era criada
  automaticamente e o anúncio na página dependia de alguém publicar à mão. Agora
  os dois saem juntos. Para quem já roda numa VPS nada muda: a atualização sempre
  usou a etiqueta, não o anúncio.

- **Segurança: qualquer pessoa da equipe podia apagar a base de conhecimento** As quatro tabelas do acervo aceitavam escrita de qualquer papel, inclusive o mais restrito,
  por fora das telas do produto. Agora exigem gerente ou administrador, como as telas sempre
  exigiram.

- **Sem chave, o material ficava parado para sempre e ninguém era avisado** Ele nascia como "pronto", nada acontecia, e cadastrar a chave depois não recuperava o que
  ficou para trás. Agora o material mostra **"Esperando a chave"**, um aviso abre na Central,
  a própria tela de conhecimento oferece cadastrar a chave ali mesmo — e a preparação recomeça
  sozinha quando ela chega. Nada do que você enviou é perdido.

- **Tipo de agendamento novo já nasce com um responsável** Quem criava um tipo de agendamento — "Call Estratégica", "Retorno de 15 minutos"
  — recebia de volta o aviso "sem responsável, não aparece para marcar", sem ter
  deixado de preencher nada: a tela é que criava o tipo sem dono. Agora ele nasce
  com quem está criando, e continua sendo possível escolher "Definir depois" de
  propósito. Nesse caso o aviso virou um atalho: clicar nele abre onde se define o
  responsável. O seletor também passou a mostrar o nome das pessoas em vez de um
  pedaço do identificador, e agora é possível remover o responsável depois de
  definido — o que a tela já oferecia e o sistema ignorava.

## [1.7.0] — 2026-08-27

### Adicionado

- **Agenda: marcar, remarcar e cancelar compromissos pela tela** O sistema ganhou uma Agenda. Dá para criar tipos de compromisso, ver a grade da
  semana, marcar um horário e remarcar ou cancelar pela própria tela, com o motivo
  registrado. A IA também consegue consultar os horários livres e marcar durante o
  atendimento, sem ninguém sair da conversa.

  Quem usa Google Agenda pode conectar a sua conta em Configurações, e os
  compromissos passam a aparecer nos dois lados. Isso é opcional: sem conectar, a
  Agenda funciona igual, e quem não mexer em nada não precisa fazer coisa alguma
  depois de atualizar.

### Corrigido

- **A versão só é publicada pelo caminho da release** Uma correção no nosso próprio processo de publicação, feita antes de causar
  problema: o sistema que cria a versão decidia apenas por haver um número novo
  escrito no histórico de mudanças. Bastava alguém escrever esse número junto de
  outra alteração para a versão sair sozinha, sem passar pela aprovação. Agora ele
  exige também a marca de que aquilo foi de fato um fechamento de versão.

- **A tela de atualização mostra tudo o que mudou desde a sua versão** Antes ela mostrava só o texto da versão mais nova. Quem pulava versões — por
  exemplo, quem estava na 1.4.0 e atualizava direto para a 1.6.0 — nunca via o que
  tinha mudado no meio do caminho, e isso incluía os avisos de coisas que exigiam
  a sua ação. Agora a tela lista todas as versões entre a sua e a nova, com os
  avisos reunidos no topo e cada um dizendo de que versão veio.

## [1.6.0] — 2026-08-26

### Adicionado

- **Formulários do Respondi entram como lead, com as respostas na ficha.** Antes, quem ligava
  um formulário do Respondi ao CRM recebia um erro e **nenhum lead era criado** — o webhook
  chegava com as respostas dentro de uma estrutura que o CRM não sabia ler, e a captação era
  recusada inteira. Agora o nome, o telefone, o e-mail e cada pergunta respondida chegam na
  ficha do contato, e o lead nasce no funil como qualquer outro. **Telefone sem código de
  país é lido como brasileiro** (`(11) 99999-8888` vira `+5511999998888`, a mesma regra que o
  WhatsApp já usava); número de fora do Brasil precisa vir com o `+` e o código do país.
- **Quem recusa contato no formulário aparece na linha do tempo.** Se a pessoa marcou que
  **não** aceita receber mensagens, isso vira um evento visível na ficha dela — em vez de a
  equipe descobrir o silêncio depois, sem saber por quê. Recusa é informação, não ausência
  de informação.
- **Todo lead que chega pelo formulário do Respondi já entra triado.** Cada envio é lido na
  hora e ganha, na ficha, uma classe (A, B, C ou D) calculada a partir da pontuação do próprio
  formulário — e, quando falta a pontuação, o valor honesto **"não avaliado"**, nunca uma
  classe chutada. Quem não tem telefone utilizável ou recusou o contato entra marcado como
  **desqualificado**, com o motivo. E o que **precisa de olho humano** — nome que parece spam,
  o mesmo telefone chegando com outro nome, ou um valor de investimento que contradiz o outro —
  fica sinalizado como **aguardando revisão**, sem travar nada: o lead entra no funil do mesmo
  jeito e continua elegível para o primeiro contato. Tudo isso aparece na linha do tempo da
  ficha, então dá para ver **por que** um lead foi parar onde foi parar.

### Corrigido

- **A IA avisa o cliente antes de chamar uma pessoa — antes ela saía de campo calada.**
  Quando o atendimento automático parava e a conversa ia para a fila humana, o cliente
  não recebia mensagem nenhuma: ele falava, e ninguém respondia. Acontecia nos dois
  caminhos que param a IA, e o pior deles era o silencioso — a IA tinha acabado de
  **perguntar o e-mail do cliente**, o sistema detectou insatisfação na mensagem dele e
  desligou o automático; o cliente respondeu a pergunta e ela caiu no vazio. Agora, em
  qualquer um dos caminhos, sai uma mensagem antes do silêncio, e ela é honesta com o
  estado da sua equipe: com gente disponível ela convida a aguardar; sem ninguém livre
  no momento, diz que o pedido ficou registrado; e numa instalação que ainda não
  configurou atendente nenhum, **não promete contato**. Quem pediu para **parar** de
  receber mensagens recebe a confirmação da parada, não uma oferta de atendente.
- **Quem vai assumir a conversa agora sabe se o cliente foi avisado.** O aviso na Central
  passou a dizer, em uma linha, se a pessoa do outro lado já sabe que alguém está vindo —
  é o que muda a primeira frase que o atendente digita.
- **Conversa parada por insatisfação detectada agora abre aviso na Central.** Esse caminho
  devolvia a conversa à fila e calava a IA sem avisar ninguém: o cliente sem resposta e a
  equipe sem sinal de que havia alguém esperando. Agora ele abre o mesmo aviso que os
  outros caminhos já abriam, e sem duplicar quando dois motivos disparam na mesma conversa.
- **O agente voltou a ouvir os áudios que chegam.** Quem mandava um áudio ouvia de volta
  "não consigo ouvir mensagens de voz" — e a transcrição ficava pronta no sistema meio
  minuto depois, sem ninguém para usá-la. A causa era de ritmo: as tarefas de bastidor
  (baixar o áudio, transcrever, tratar mídia) só eram acordadas uma vez por minuto, e a
  resposta ao cliente não espera tanto. Medido numa instalação real: a cadeia levava de
  103 a 188 segundos, e passou a levar 18. A transcrição em si sempre levou 4 segundos —
  o resto era fila. Nada para você fazer: vale assim que atualizar.
- **A caixa de conversas voltou a se atualizar sozinha — antes só recarregando a página.**
  A mensagem do cliente chegava, ficava guardada certinho, e a tela continuava parada: quem
  estava com a conversa aberta, olhando, não via nada até apertar F5. Valia também para o
  funil, o histórico do contato e as telas da IA. A causa veio de fora — uma peça de terceiros
  que o sistema usa mudou de comportamento numa atualização, e o aviso de "chegou coisa nova"
  passou a ser recusado em silêncio, sem erro em lugar nenhum. Agora a tela recebe de novo na
  hora, e ela também se recupera sozinha: se a conexão em tempo real cair, a lista e a
  conversa voltam a se sincronizar em pouco tempo em vez de ficar congeladas num passado que
  parece presente. Nada para você fazer — vale assim que atualizar.
- **A automação parou de dizer "Sucesso" para mensagem que ela nem tentou mandar.** Quando o
  envio era pulado — contato sem telefone, contato bloqueado, contato que recusou receber
  mensagens — a execução aparecia na aba Atividade como bem-sucedida. Pior que o defeito que a
  versão passada corrigiu: aquele pelo menos tinha tentado. Agora aparece como **Falhou**, com
  a razão.
- **Quem recusa receber mensagens no formulário para de receber automação.** A recusa já ficava
  visível na linha do tempo, mas nada no motor a lia — as automações de WhatsApp saíam do
  mesmo jeito. Agora a recusa fica registrada na ficha da pessoa e as duas ações de envio
  automático (mensagem escrita por você e mensagem escrita pela IA) a respeitam. Vale também
  quando a pessoa **já era seu contato** e mudou de ideia num envio novo. **Quem nunca
  respondeu à pergunta continua recebendo normalmente** — não perguntar não é a mesma coisa
  que ouvir "não".

### Alterado

**O Tailwind passou da versão 3 para a 4.** Para quem roda numa VPS, não muda nada:
nenhuma variável nova, nenhum passo manual, o `update.sh` segue igual. O que muda é a
aparência de algumas telas — e para melhor, na maioria dos casos:

- **Avisos e destaques que não apareciam passam a aparecer.** O jeito antigo de escrever
  "esta cor com 10% de opacidade" era descartado em silêncio quando a cor vinha do tema —
  então o fundo rosado do aviso de erro, a borda avermelhada do campo inválido e vários
  realces de seleção simplesmente não pintavam. São 62 marcações assim, em 252 lugares,
  que agora mostram o que sempre deveriam ter mostrado.
- **O respiro entre o rótulo e o campo do formulário foi mantido.** A nova versão mudou de
  que lado o espaço é aplicado, e isso colava o rótulo no campo em todo formulário do
  sistema. Corrigido antes de sair.

### Corrigido

- A lista de opções de um `<select>` nativo perdeu 2px de recuo interno. Efeito visual
  não confirmado — o menu é desenhado pelo sistema operacional, não pelo navegador.

## [1.5.0] — 2026-08-25

O histórico de quem chega pelos seus formulários agora existe — inclusive de quem **não**
entrou. As automações passam a poder responder com uma mensagem escrita pela IA a partir do
que a pessoa preencheu. E a automação parou de marcar "Sucesso" para mensagem que nunca
chegou ao cliente.

O Inbox passa a dizer **quem manda em cada conversa** — e o conserto principal não é de tela:
clicar "Assumir" não parava o atendimento automático, então os dois respondiam o mesmo cliente.

### ⚠️ Requer atenção

**O horário em que as automações mandam mensagem passa a ser o seu, e não o do servidor.**
A proteção de horário da automação era medida pelo relógio da máquina, que roda em UTC —
então a faixa "7h às 22h" era, na prática, **4h às 19h de Brasília**. Duas consequências
que você talvez tenha visto sem saber a causa: uma automação disparada às 19h30 não saía e
ficava esperando até as 4h da manhã seguinte; e uma disparada de madrugada saía, mandando
mensagem para o cliente às 5h. Agora vale o seu fuso, e **vale a faixa que você configurou
em Conexões › Proteção de envio** — a mesma que a IA já respeitava. Se você apertou ou
ampliou esse horário achando que só mexia com a IA, confira: agora ele também rege as
automações. Quem nunca mexeu fica com 7h às 22h no **horário de Brasília**. Se o seu negócio fica em outro
fuso, escolha o seu em **Conexões › Proteção de envio**, no campo "Fuso horário da janela" — e
confira conexão por conexão, porque essa escolha é de cada número, não da instalação inteira.

**Assumir uma conversa agora PARA o atendimento automático nela. Antes não parava, e os dois
respondiam o mesmo cliente.** Quem clicava "Assumir" no Inbox ganhava a conversa na tela, mas o
automático continuava respondendo por baixo — ele só ficava quieto por 5 minutos depois que o
atendente mandava uma mensagem, e voltava a falar sozinho em seguida. Agora assumir e transferir
silenciam o automático naquela conversa, e **"Liberar" ou "Fechar" desfazem o silêncio que a
pessoa pôs**. Há uma exceção que importa: quando foi o próprio automático que passou o caso
para uma pessoa, "Liberar" e "Fechar" **não** o trazem de volta — ali quem devolve é o botão
**"Devolver ao automático"**, no topo da conversa. É justamente o caso das conversas que
aparecem na aba "Fila" (veja o aviso abaixo). Se a sua
equipe se acostumou a assumir a conversa e deixar a IA responder junto, esse hábito muda aqui.

**A distribuição por rodízio NÃO cala o automático** — distribuir é escolher quem cuida se precisar,
não tomar a conversa. Só o clique de uma pessoa silencia.

**A aba "Fila" vai mostrar mais conversas do que mostrava, e o número do badge pode subir de uma
vez.** Não é conversa nova: são as que a IA já tinha passado para uma pessoa e que não apareciam em
aba nenhuma. Se o número saltar depois de atualizar, é isso — e vale olhar, porque são pessoas
esperando resposta há mais tempo do que você imaginava.

Esta versão **mexe no banco de dados**. O `update.sh` aplica sozinho; não há passo
manual — são tabelas e estados novos: o histórico de captação, o estado de espera das
automações e o registro de quem está no comando de cada conversa.

**Se você está vindo da 1.4.0, os dois avisos abaixo são da 1.4.1 e valem para você.** A tela de
atualização mostra só a seção da versão que você está instalando, então eles vão repetidos aqui
para não passarem em branco. Se você já atualizou para a 1.4.1, já os leu — pule.

- **A IA passa a atender aos domingos, e antes não atendia.** O padrão de fábrica da janela
  anti-banimento mudou na 1.4.0: domingo era dia mudo e passou a ser dia normal (a faixa de
  horário continua a mesma). Se o seu negócio depende de silêncio no domingo, desligue em
  **Conexões › Proteção de envio**, na chave "Enviar aos domingos", por canal. Quem já tinha
  mexido ali teve a escolha respeitada. **Novidade desta versão:** essa chave passou a valer
  também para as automações — desligá-la faz o lead que preencher seu formulário no domingo
  só ser abordado na segunda de manhã.
- **Duas conexões oficiais do WhatsApp com a mesma conta da Meta: fica com o identificador a
  conexão MAIS RECENTE**, e a mais antiga recebe o sufixo `-conflito-`. Nada foi apagado. A 1.4.0
  disse o contrário — se você apagou a conexão SEM o sufixo por causa daquela frase, era a que
  estava funcionando; reconecte o número em Conexões.

### Adicionado

- **"Leads recebidos", em Webhooks: quem chegou pelo formulário, com o que preencheu.**
  Até aqui, o formulário do seu site entregava o lead e não sobrava registro nenhum de como
  ele chegou. Agora há uma aba com a lista: nome, data e hora, de qual formulário veio, a
  página em que a pessoa estava, o endereço de internet dela e as etiquetas de campanha
  (`utm_source` e companhia). Clicando na linha, todos os campos do formulário como ela
  preencheu, e um atalho para o lead no funil. Dá para filtrar por busca, por origem, por
  resultado e por período.
  **E aparece também quem NÃO entrou.** Um formulário cujos campos o CRM não reconhece era
  recusado em silêncio: quem colou o endereço no site só sabia que "não chegou nada", sem
  ter onde olhar. Agora a tentativa aparece na lista como *Não entrou*, com o motivo escrito
  em português e os campos crus do jeito que vieram — que é o que permite consertar o
  formulário em vez de adivinhar.
- **Nas automações, no "então": "Mensagem escrita pela IA".**
  Antes só dava para mandar um texto pronto com `{{nome}}` e `{{telefone}}`. Se o seu
  formulário pergunta o segmento, o tamanho da equipe e a maior dificuldade de hoje, quem
  tem 3 funcionários e quem tem 300 recebiam a mesma frase. Agora você escolhe um agente já
  **publicado**, escolhe o número, e escreve no campo *"O que a IA deve fazer com esses
  dados"* — por exemplo, "cite a dificuldade que ela citou e ofereça uma conversa de 15
  minutos". A IA recebe as respostas do formulário e essa sua instrução, e sabe que é a
  primeira mensagem de alguém que acabou de preencher e não está esperando resposta. É o
  mesmo desenho da instrução de um passo de follow-up.
  Quem envia continua sendo a automação — com horário de envio, descadastro e espaçamento
  entre mensagens valendo igual. A IA escreve o texto; ela não fala com ninguém por conta
  própria.

### Corrigido

- **A automação dizia "Sucesso" para mensagem que não chegou ao cliente.** Era o relato que
  originou boa parte desta entrega: automação ligada, lead entrando pelo formulário, a aba
  Atividade mostrando um "Sucesso" verde — e nenhuma mensagem no celular de ninguém. A
  automação só sabia perguntar se tinha dado erro de programa; ela não olhava se a mensagem
  de fato saiu. Agora ela olha: quando o envio falha, o resultado aparece como falha, com o
  motivo em português ("Não conseguimos falar com o serviço de WhatsApp. Confira se ele está
  no ar."), e um aviso é aberto na **Central de avisos** — o menu "Alertas", dentro de IA › Acompanhar o
  agente — **nomeando a regra que falhou**,
  porque um erro que só existe numa aba que ninguém abre é um erro invisível.
- **A automação que estava só esperando o horário parecia não ter rodado.** Ao adiar um
  envio, ela não gravava nada: "não apareceu nada na Atividade" e "a automação não funcionou"
  eram a mesma tela. Agora a espera é um estado visível na aba Atividade — **Aguardando envio** —, com o motivo ao
  lado. Nem sempre é o relógio: o mesmo estado aparece quando o número de WhatsApp está
  desconectado, e aí o que resolve é reconectar em Conexões, não esperar.
- **O agente ficava mudo quando o provedor dele era diferente do provedor padrão da
  organização.** Quem publicou o agente numa IA (por exemplo OpenAI) enquanto a organização
  continuava configurada em outra (Anthropic) tinha TODA mensagem de WhatsApp engolida: a
  conversa ficava sem resposta, sem erro visível na tela do agente. Por baixo, um verificador
  interno saía com o endereço de uma IA e o nome de modelo da outra, tomava "modelo inexistente"
  e derrubava o atendimento inteiro antes de o agente falar. Não era preciso mexer em nada para
  cair nisso — bastava a combinação. O rastro sempre esteve em **IA › Execuções** e o aviso em
  **Central de avisos** ("Job descartado após esgotar tentativas"); o que faltava era o
  atendimento acontecer.
- **O papel Operador mandava o modelo escolhido para o provedor errado**, pela mesma razão, e
  o campo "Modelo do Operador" deixado em branco não fazia o que a tela prometia: ele diz *"A
  mesma que conversa"* e usava o modelo padrão da organização. Agora vazio herda de verdade o
  modelo do Conversador.
- **O painel de Provedores de IA mostrava o modelo errado** nos pontos que herdam do agente
  (classificador de etapa, detector de manipulação, verificador de promessa, resumo de
  conversa, checkpoint, sugestão de resposta e a mensagem escrita pela IA nas automações):
  anunciava o padrão da organização enquanto o sistema usava o do agente. A coluna passa a
  mostrar o que de fato roda, e diz de quem herdou. **A "Mensagem escrita pela IA" desta
  mesma versão caía no primeiro item desta lista** — nas instalações com agente num provedor
  diferente do padrão da organização, ela não sairia.

- **A promessa da 1.4.0 sobre o limite de gasto agora é verdade.** Aquela versão disse que, quando o
  limite para a IA, "as conversas que estavam sendo atendidas vão para a fila de atendimento
  humano". Elas iam — mas a fila na tela não as mostrava: a aba, o contador e o painel do gerente
  procuravam um estado e a conversa escalada ficava em outro. Quem confiou no aviso e foi olhar a
  fila não encontrou nada lá. Vale para toda passagem para humano, não só a do limite.
- **O número da fila que o cliente ouve e o que a equipe vê eram contados de formas diferentes.** O
  "você é o Nº da fila" enviado pelo WhatsApp incluía as conversas escaladas; o número mostrado ao
  atendente não. Agora é a mesma conta dos dois lados.
- **Dava para saber quem atende uma conversa pela IA, mas não pela tela.** O nome do atendente
  chegava ao agente e não ao Inbox, que só tinha o código interno. O cabeçalho e a lista passam a
  mostrar **quem está no comando** — pessoa (com nome e iniciais) ou automático —, e o selo diz o
  **motivo** quando o automático está parado: alguém assumiu, está pausado para aquele cliente, ou
  volta sozinho em instantes.
- **Faltava o botão de desligar.** Havia "Devolver ao automático" e nada para pausá-lo — ele só
  parava por conta própria. Agora o mesmo lugar tem os dois lados.
- **Assumir, transferir e liberar não apareciam no histórico da conversa.** Passavam sem deixar
  rastro no painel lateral; o motivo escrito ao transferir ficava só no registro de auditoria, que
  o atendente não abre. Agora as quatro ações viram linha na atividade, **com o nome de quem fez** —
  antes toda ação humana aparecia como "Você/time".
- **Conversa encerrada deixava de dizer quem a atendeu**, justamente na aba "Fechadas".
- **Numa instalação sem nenhuma IA configurada, a tela dizia "Automático atendendo".** Não havia
  automático nenhum: eram conversas sem ninguém.
- **Quem não enxerga uma conversa conseguia ler o histórico de quem a atendeu.** Com a visibilidade
  restrita por atendente, o registro de troca de responsável não respeitava esse limite.

## [1.4.1] — 2026-08-25

O primeiro acesso passa a **perguntar como você já usa o seu número**, em vez de supor que
todo mundo conecta lendo um código no celular. Instalar numa máquina que já tem o CRM no ar
deixou de derrubar a instalação existente. E a seção da 1.4.0 descreveu errado duas mudanças
que chegam a todo mundo — uma delas invertida: como a tela de atualização lê o texto congelado
na versão, o conserto do texto só alcança você pela publicação de uma versão nova, que é esta.

### Adicionado

- **O primeiro acesso pergunta como você já usa o seu número, em vez de supor.** Existe mais
  de um jeito de ter WhatsApp para empresa, e cada um conecta de um jeito — mas o passo do
  telefone só sabia um: ele mostrava o código para ler no celular e pronto. Quem tem conta
  oficial na Meta, ou contrata o WhatsApp por uma empresa parceira, passava por ali sem nunca
  ser perguntado; o número entrava cadastrado do jeito errado e a pessoa só descobria depois,
  em outra tela, com o funcionário já montado por cima. Agora o passo abre com a pergunta e
  três respostas: **ler um código com o celular** (que é como quase todo mundo faz e segue
  sendo o caminho mais curto), **conta oficial na Meta**, ou **provedor parceiro** — e cada
  uma leva ao formulário certo, ali mesmo, sem sair do passo a passo. Escolher errado não
  tranca nada: dá para voltar e trocar. E nada é criado enquanto você não escolhe — antes, o
  número era cadastrado como "por código" só de você chegar na tela.
- **Quem escolhe a conta oficial é avisado ANTES de ir buscar as credenciais.** Esse caminho
  precisa de duas configurações no servidor que a instalação não cria sozinha, e sem elas o
  número **envia mas nunca recebe** — sem erro em lugar nenhum, que é o pior jeito de falhar.
  A tela diz isso antes de você abrir o painel da Meta, e aponta o caminho que funciona hoje.

### ⚠️ Requer atenção

**A IA passa a atender aos domingos, e antes não atendia. A 1.4.0 fez essa mudança e não
avisou.** O padrão de fábrica da janela anti-banimento mudou: domingo era dia mudo e passou a
ser dia normal (a faixa de horário continua a mesma). Quem nunca mexeu nessa configuração —
que é a maioria — recebeu a mudança na atualização, sem escolher. Se o seu negócio depende de
silêncio no domingo, desligue em **Conexões › Proteção de envio › "Enviar aos domingos"**, por
canal. Se você já tinha mexido ali, a sua escolha foi respeitada e nada mudou.

**Se você tem duas conexões oficiais do WhatsApp com a mesma conta da Meta, a 1.4.0 disse o
contrário do que acontece — confira antes de apagar qualquer uma.** O texto dizia que a
atualização "mantém a mais antiga". É o inverso: **fica com o identificador a conexão MAIS
RECENTE** (criá-la exigiu provar posse da conta na tela), e é a **mais antiga** que recebe o
sufixo `-conflito-`. Nada foi apagado. A conexão com o identificador limpo é a que continua
recebendo; a marcada como conflito aparece como falha na verificação de saúde, e isso é
esperado. **Se você apagou a conexão sem o sufixo por causa daquela frase, é a que estava
funcionando** — reconecte o número pela tela de Conexões.

Fora isso, nada exige ação sua. Não há mudança de banco de dados nesta versão.

### Corrigido

- **Instalar numa VPS que já tem o CRM no ar não derruba mais a instalação existente.**
  O instalador confundia a instalação de outra pasta com ele mesmo sendo rodado de novo e
  subia por cima: o site seguia no ar, mas passando a usar o banco da pasta nova — e o
  primeiro sintoma era a senha "parar de funcionar". Agora ele para antes de tocar em
  nada, diz em que pasta está a instalação que já existe e ensina como atualizá-la. Isso
  vale em qualquer arranjo de servidor — inclusive nas VPS em que o painel da hospedagem
  (Hostinger, Coolify, Dokploy) é quem atende as portas, e nas pastas que já tinham
  concluído uma instalação antes, onde a checagem anterior se desligava sozinha.
- **`salir` sozinho não descadastrava.** A 1.4.0 anunciou que "`baja`, `salir` e
  `no quiero recibir` descadastram"; medido com a função real, `baja` e `no quiero recibir`
  funcionavam e `salir` não — a palavra estava fora da lista. `salir` é o `sair` em espanhol,
  que já estava lá desde sempre. Continua valendo só a palavra **sozinha**: "voy a salir
  ahora" tem três palavras e não bloqueia ninguém.
- **A importação de planilha assume Brasil, e isso não estava escrito em lugar nenhum.**
  Telefone sem código de país entra como brasileiro: `(11) 99999-8888` vira
  `+5511999998888` — a mesma regra que o WhatsApp já usava ao receber mensagem. Se a sua
  planilha tem números de fora do Brasil, escreva-os com o `+` e o código do país (`+351…`),
  que aí são respeitados como estão. O comportamento não mudou; o que faltava era a frase.
- **Um controle citado pelo nome errado.** A 1.4.0 mandava procurar "Parar a IA no limite" na
  tela de orçamento de IA. O rótulo real mostra o seu número: "Parar a IA ao chegar em
  US$ 50,00". Nada mudou na tela — mudou a descrição.

## [1.4.0] — 2026-08-24

Esta versão muda o primeiro acesso. Instalar deixou de ser "configurar uma IA" e passou a ser **montar um funcionário e vê-lo atender antes de terminar**: você diz como ele se chama, o jeito dele falar e as regras da casa, monta o quadro de clientes do **seu** ramo — não o de loja virtual que todo mundo ganhava igual — e, no último passo, conversa com ele como se fosse um cliente. Nada sai pelo WhatsApp; você só confere que ele funciona antes de confiar nele. Junto disso, seis causas diferentes que deixavam uma IA publicada **muda** foram medidas num servidor real e consertadas uma a uma; o sistema passou a ser usável no celular; e você pode pôr o seu nome, o seu logo e a sua cor em tudo — pela tela, sem linha de comando.

### ⚠️ Requer atenção

**Desta vez, rodar o `update.sh` UMA vez basta — a instrução da 1.3.0 não vale mais.** A
versão anterior pedia duas execuções porque a primeira deixava o processo que faz a IA
atender "solto": acompanhando o desenvolvimento em vez de ficar parado na sua versão, como o
resto do sistema. Isso acabou. A atualização agora fixa as três partes do sistema na mesma
versão de uma vez só, e se ainda assim alguma ficar solta — é o caso de quem está vindo de
uma versão anterior à 1.3.0 — o próprio sistema fecha essa ponta sozinho em até 5 minutos,
sem você fazer nada. Rodar duas vezes por hábito não estraga nada: a segunda vez responde
"você já está na versão mais recente" e não toca em nada.

**Antes de ligar a parada automática da IA, confira o número do seu limite.** Ele sempre foi
em dólar, e a tela dizia real (está explicado acima). Quem escreveu "50" pensando em reais
tem, na verdade, um limite de US$ 50 — cerca de cinco vezes maior do que imaginava. Seu
limite não foi alterado; o que mudou é a tela finalmente dizer a verdade. Como a parada
automática nasce desligada em todo mundo, dá tempo de olhar o número com calma antes de
armá-la.

Fora isso, nada exige ação sua. O arquivo de configuração criado na sua instalação continua
valendo como está: tudo que é novo nesta versão já vem com um valor padrão, e a própria
atualização acrescenta o que faltar. O banco de dados também passa a se limpar sozinho a
partir daqui, jogando fora registro técnico velho que ninguém lê — conversa, contato,
mensagem e histórico de atendimento não são tocados, e não há nada para você configurar.

**Se você tem DUAS conexões oficiais do WhatsApp com a mesma conta da Meta, uma delas vai
mudar de nome.** Era possível cadastrar a mesma conta duas vezes — numa agência com dois
clientes, ou num número que trocou de empresa — e, enquanto isso durou, as mensagens
recebidas eram descartadas em silêncio para as **duas**. A atualização mantém a mais antiga e
marca a outra como conflito, acrescentando `-conflito-` ao identificador dela. **Nada é
apagado**: se você encontrar uma conexão com esse nome, é essa a razão — confira qual das duas
deve continuar e apague a que sobra.

**Se você usou o botão "Configurar Catálogo" na tela de conhecimento, confira o que ficou
gravado.** Ele salvava o que você escrevia como se fosse uma pergunta e resposta, não um
catálogo — então o conteúdo está lá, mas na gaveta errada. Vale reabrir e refazer.

**Se o seu sistema ainda chama a sua empresa de "Minha Empresa", troque em Configurações.** A
instalação cria a empresa com esse nome provisório, e o primeiro acesso trazia esse texto já
escrito no campo — quem seguiu adiante sem apagar ficou com ele. Agora o campo vem vazio, mas
quem já passou por ali precisa corrigir à mão.

### Adicionado

- **Instalar deixou de ser "configurar um sistema": agora você monta um funcionário e o vê
  atender antes de terminar.** O passo a passo do primeiro acesso foi de 4 para 6 etapas e
  mudou de assunto. Ele abre mostrando o que a sua instalação já trouxe pronta — servidor e
  banco de pé, qual inteligência artificial foi contratada, se o WhatsApp está pronto para
  parear —, em vez de um formulário em branco. O antigo "Configurar IA" virou **"Treine seu
  funcionário"**: como ele se chama, o jeito dele falar e — o campo que faltava — as regras
  da casa (horário de atendimento, o que nunca prometer, como chamar o cliente). Ali mesmo a
  chave da inteligência artificial é testada de verdade: não "a chave foi aceita", que um
  provedor responde até com a conta zerada, mas uma resposta real, que é a única coisa que
  prova que há crédito. Se a instalação veio sem chave, o campo para colar a sua está nessa
  tela, um clique antes de o funcionário nascer com ela. Entrou o passo **"Onde ele
  organiza"**, que monta o quadro de clientes do **seu ramo**: uma clínica termina com "Quer
  agendar" e "Consulta marcada", em vez do quadro de loja virtual — "Carrinho abandonado",
  "Em separação", "Enviado" — que toda instalação ganhava igual, sem nunca ter sido
  perguntada em que ramo entrou. Você pode renomear, remover e acrescentar colunas antes de
  gravar. E entrou o passo **"Ver ele atender"**: você escreve como se fosse um cliente e lê
  a resposta dele antes de terminar, sem nada sair pelo WhatsApp e sem criar conversa nenhuma
  — antes, o último clique despejava você numa caixa de conversas vazia, depois de montar um
  funcionário que você nunca tinha visto fazer nada. O funcionário que nasce dali também é
  outro: deixou de ser um respondedor de perguntas e já vem sabendo mexer no CRM sozinho —
  procurar o cliente, anotar o que ele informou, criar a oportunidade no funil e mover o
  cliente de etapa —, apontado para o funil certo e sabendo dizer o que o seu negócio faz. E,
  no fim, em vez de te largar numa tela vazia, o sistema se apresenta: as seis partes
  principais, cada uma com uma frase sobre o que ela faz por você.
- **Ponha o seu nome, o seu logo e a sua cor no sistema — pela tela, sem linha de comando e
  sem reiniciar nada.** Em *Administração › Marca*, quem é dono da instalação troca o nome do
  sistema, escolhe a cor da marca e sobe o arquivo do logo (PNG ou JPG, até 512 KB). Salvou,
  recarregou: a barra lateral, os botões, o destaque que aparece ao redor do campo em que você
  está digitando, o título da aba e o ícone do navegador já estão repintados. Até esta versão,
  a única forma de trocar a marca era editar um arquivo no servidor por linha de comando e
  reiniciar o sistema inteiro — e quem editava o código para conseguir isso perdia a mudança
  na atualização seguinte, quase sempre sem perceber. A cor não é aplicada crua: o sistema
  deriva onze tons dela e mostra onde cada coisa vai pousar antes de você salvar; se a cor
  escolhida deixaria o texto do botão ilegível no tema escuro, ele anda os degraus necessários
  sozinho. Nada de escolher amarelo e descobrir depois que o botão ficou branco no branco. E
  cada empresa dentro da mesma instalação pode ter a própria marca, em *Configurações ›
  Marca*, sem depender de quem instalou o sistema: o que ela deixa em branco é herdado da
  instalação.
- **A sua marca sai da tela e alcança o resto do produto.** O ícone da aba do navegador (que
  simplesmente não existia — a aba ficava sem ícone nenhum), o nome que aparece no aplicativo
  autenticador de quem liga a verificação em duas etapas, o nome do remetente dos e-mails e,
  principalmente, os e-mails de confirmação de conta e de recuperação de senha — que até aqui
  chegavam ao seu cliente com o nome do nosso produto, no primeiro contato dele com o sistema.
  O instalador também passou a perguntar a cor da marca: antes ele perguntava só o nome e
  entregava o verde do nosso produto em toda tela e em todo e-mail de acesso, então quem
  instalava para um cliente entregava a marca dele pintada com a cor de outro. Uma ressalva
  que vale conhecer: os e-mails de acesso são lidos de fora do CRM, então trocar a cor pela
  tela depois **não** reescreve esses e-mails — é a resposta dada ao instalador que faz as
  duas pontas nascerem iguais. Uma exceção é deliberada: **o relatório de dados pessoais em
  PDF nunca leva a sua marca.** Ele nomeia a empresa que responde legalmente pelos dados,
  porque é um documento que atende a um direito do titular — pôr ali o nome de quem só
  hospeda inverteria quem responde pelo quê.
- **Dá para usar o sistema pelo celular.** A barra lateral fixa era a única navegação
  existente e nunca sumia: num celular comum ela empurrava o conteúdo para fora da tela, e não
  havia botão nenhum para escondê-la. Agora ela vira uma gaveta que abre pelo topo e fecha
  sozinha ao trocar de tela, e todo botão ganha um alvo de toque de dedo no celular, voltando
  ao tamanho compacto no computador, onde quem aciona é o mouse. Junto veio uma varredura por
  todo o sistema atrás do que empurrava a tela para o lado: os cabeçalhos das páginas, a lista
  de funis, a barra de seleção em massa do quadro de vendas, campos de busca de largura fixa,
  tabelas soltas e os rodapés de "Pular/Continuar" do cadastro inicial. E a página inteira
  nunca mais desliza de lado: quando algo é largo demais — uma tabela, o quadro de vendas —, é
  só aquela parte que rola, e o resto da tela fica parado.
- **A verificação em duas etapas virou escolha, e não uma porta trancada na primeira tela.**
  O botão "Começar a usar" entregava o dono da instalação num bloqueador de tela cheia
  pedindo um aplicativo autenticador — um passo extra que o próprio wizard nunca anunciou,
  bem na hora de finalmente ver o produto funcionando. Agora quem administra decide se ela é
  obrigatória, em Configurações › Segurança, e o padrão é não exigir. Quem já usa a
  verificação continua protegido exatamente como está.
- **O produto passou a falar a sua língua: "Pipeline" e "Kanban" saíram da tela.** Eram cinco
  nomes para a mesma coisa, e três apareciam juntos na mesma tela. Agora o menu tem **Funis**
  (onde você abre o funil) e **Etapas do funil** (onde você configura o que cada coluna
  significa). Nas telas do primeiro acesso, o mesmo: o passo do WhatsApp parou de mostrar
  códigos internos como "Sessão: org_f3d61bc0" e "Status: INIT", e o passo do time deixou de
  listar "viewer, agent, manager, admin" em inglês.
- **Dá para responder "em cima" de uma mensagem, e enviar o contato de alguém, como no
  WhatsApp.** Passe o mouse (ou toque, no celular) sobre a mensagem, escolha *Responder*, e
  ela aparece citada logo acima do campo de texto — com um × para desistir. O cliente recebe a
  sua resposta pendurada na mensagem original, do jeito que ele já conversa no WhatsApp.
  Funciona nas duas formas de conectar o número, e o botão aparece também no celular — antes
  de sair, ele só existia para quem tem mouse, ou seja, sumia justamente onde a maior parte do
  atendimento acontece. Trocar de conversa limpa a citação sozinho, para nenhuma frase sair
  citando a mensagem de outro cliente. E no "+" ao lado do campo de mensagem existe agora a
  opção *Contato*: escolha alguém da sua base ou digite nome e telefone na hora, e chega no
  WhatsApp do cliente como cartão de contato de verdade — ele salva ou chama a pessoa com um
  toque. Quando um cartão de contato chega para você, ele fica clicável dentro do CRM: um
  toque abre a conversa com aquela pessoa, criando o contato se ainda não existir. O telefone
  é conferido antes de sair, para o cartão não levar um número que não existe no WhatsApp (o
  caso clássico do nono dígito).
- **Importar contatos de uma planilha.** Botão *Importar* na tela de Contatos: você sobe um
  arquivo CSV — o que qualquer Excel ou Google Planilhas exporta — e ele entra com nome,
  telefone, e-mail, CPF, aniversário e etiquetas. Os títulos das colunas podem estar em
  português (`nome`, `telefone`, `celular`, `aniversário`, `etiquetas`), e o separador pode
  ser vírgula ou ponto-e-vírgula, que é o que o Excel em português usa. Cada linha tem
  desfecho próprio na tela: importada, já existia, ou recusada com o motivo escrito — uma
  linha errada não derruba a planilha inteira. Até 500 linhas por vez. Arquivo `.xlsx` é
  recusado com a instrução de exportar como CSV, em vez de importar pela metade.
- **De qual anúncio o contato veio.** Quando alguém chega pelo botão "Enviar mensagem" de um
  anúncio do Facebook ou do Instagram, o CRM guarda a campanha e o anúncio na ficha do
  contato, e o negócio nasce etiquetado como vindo de anúncio. É gravado no primeiro contato e
  nunca reescrito depois — o primeiro toque é o que conta. Compartilhar um post normal, sem
  impulsão, não é confundido com anúncio pago. Anúncios do Google ainda não são identificados.
- **O atendimento automático volta a funcionar no domingo.** Até agora a IA ficava calada o
  domingo inteiro, e quem escrevia no domingo só era respondido na segunda-feira. A regra
  existia para reduzir risco de bloqueio, mas o que protege disso é o ritmo de envio, não o
  dia da semana — o custo caía sobre o seu cliente, à toa. Agora o domingo é liberado por
  padrão. A janela da noite continua valendo (nada sai entre 22h e 7h) e, se você faz
  prospecção ativa e prefere não incomodar no fim de semana, dá para desligar o domingo em
  Conexões › **Proteção de envio**, número por número — a chave se chama "Enviar aos
  domingos".
- **O limite de gasto com IA passa a valer de verdade — e nasce desligado.** Até agora a tela
  de Uso de IA › Orçamento deixava você escrever um limite mensal, mas quem barrava a chamada
  olhava para outro lugar: nenhuma instalação estava protegida, e a tela dizia que estava.
  Agora o número que você digita é o número que decide. Para que ligar isso não corte o
  atendimento de ninguém por engano, a proteção **começa desligada em todo mundo** e só liga
  em três passos, na tela: *Só acompanhar* → *Me avisar* → *Parar a IA no limite*. Não dá para
  pular direto para a parada, e quando você a arma ela **só começa a valer 72 horas depois**
  (dá para renunciar a essa espera marcando a caixa). **Você não precisa fazer nada** — quem
  não abrir essa tela continua exatamente como está hoje.
- **Quando o limite para a IA, ninguém fica sem resposta.** As conversas que estavam sendo
  atendidas vão para a fila de atendimento humano, com um aviso na Central de avisos
  explicando o que aconteceu. Cada uma volta ao automático pelo botão "Devolver ao automático"
  no cabeçalho da conversa. Aumentar o limite evita paradas novas, mas não devolve sozinho as
  conversas que já pararam. E, antes de qualquer parada, um aviso na Central de avisos aparece
  quando o gasto passa do ponto que você escolheu — ele se apaga sozinho quando o gasto volta
  para baixo do limite ou o mês vira.
- **O banco de dados passou a se limpar sozinho, todo dia.** Três arquivos internos cresciam
  para sempre e nunca eram podados: o arquivo bruto de tudo o que o WhatsApp envia, a fila de
  tarefas da IA e o registro de auditoria. Numa instalação real, o arquivo do WhatsApp sozinho
  era **86% do banco inteiro** — 468 MB de um total de 545 MB, contra menos de 10 MB de
  mensagens, contatos e leads somados. E o plano gratuito do Supabase acaba em 500 MB, que é
  onde vive a maior parte de quem instala. Agora, a cada dia: o conteúdo pesado dos eventos do
  WhatsApp é esvaziado depois de 7 dias e a linha some depois de 90 (o resumo continua lá,
  para investigar problema antigo); a fila de tarefas já concluídas é apagada depois de 90
  dias; e a auditoria segue a validade definida no arquivo de configuração da sua instalação,
  com 5 anos de padrão e um piso de 90 dias que não dá para furar. Nada que ainda tem dono é
  tocado: tarefa esperando, tarefa rodando agora e tarefa que falhou e virou aviso na Central
  de avisos ficam onde estão. **Você não precisa configurar nada** — já vem ligado com esses
  valores.
- **O agente de atualização passa a fixar sozinho a versão que ficou solta**, em até 5
  minutos, sem você fazer nada — ele grava a versão que já está rodando. O que ele **nunca**
  faz é mexer numa configuração que você escreveu à mão: se você escolheu acompanhar um canal
  de propósito, ele respeita e só avisa.

  Se você veio da 1.3.0 e rodou o `update.sh` uma vez só, é ele que termina o serviço a partir
  desta versão — a instrução de "rodar duas vezes" deixa de ser necessária daqui em diante.
- **Da lista de Contatos direto para a conversa.** Na lista de Contatos e na ficha de cada
  pessoa há agora um botão que leva direto para a conversa dela no Inbox, sem precisar
  procurá-la na lista de conversas.
- **Dá para instalar numa VPS que já tem painel (CloudPanel e similares).** Antes, o
  instalador tentava subir o próprio servidor web nas portas 80 e 443, que já estavam
  ocupadas pelo painel, e a instalação parava ali. Agora existe um passo a passo oficial para
  esse caso, na documentação do projeto, em `docs/runbooks/cloudpanel.md` — contribuição de um
  usuário da comunidade.
- **Quem usa a OpenRouter parou de ter o próprio consumo creditado ao site de outra pessoa.**
  Uma versão anterior levava, fixo dentro do sistema, o endereço de um site de terceiro — e o
  consumo de todo mundo ficava atribuído a um lugar que não é seu. Isso saiu. Se você quiser
  aparecer com o seu próprio nome no painel da OpenRouter, há dois campos no arquivo de
  configuração da instalação (`OPENROUTER_APP_URL` e `OPENROUTER_APP_TITLE`), os dois
  opcionais e vazios por padrão: deixando em branco, nada é enviado junto com as chamadas.

### Corrigido

- **Seis causas diferentes deixavam uma IA publicada muda — e nenhuma aparecia como erro.** Medidas
  uma a uma num servidor real, com o dono dizendo "a IA não responde": em todas, a tela dizia "IA
  atendendo" e a mensagem não chegava.
- **Número de WhatsApp recém-conectado: a IA não respondia a ninguém.** Todo número novo entra com
  uma trava de segurança nos primeiros dias, para não ser banido — e a trava segurava também as
  RESPOSTAS a quem escrevia para você. O cliente mandava "Oi" e passavam horas. Agora ela segura só
  o que o sistema começa sozinho; responder quem escreveu nunca é retido, e as conversas paradas por
  essa causa voltam à fila sozinhas.
- **Uma regra de distribuição vazia sequestrava o atendimento inteiro.** Dá para ligar uma regra em
  dois cliques e não colocar ninguém nela — e aí toda conversa ia para um atendente genérico, sem as
  suas instruções, morrendo em silêncio enquanto o agente certo esperava do outro lado. Agora isso
  não tira a conversa de quem já atendia.
- **Quem escrevia depois das 22h nunca era respondido — nem no dia seguinte.** Fora da faixa em que
  o sistema pode enviar (7h às 22h), a resposta era perdida: o atendimento era dado como concluído e
  nada saía. Agora ela é adiada e entregue quando o horário abre. No mesmo caminho, o **horário de
  funcionamento que você configurava não era lido por ninguém** (medido: 8h às 18h, de segunda a
  sexta, com o agente respondendo às 21:55 de uma terça), e a **retomada de quem sumiu morria em 25
  minutos**, dando o contato como perdido antes das 23h. Agora a espera aguenta a noite inteira e a
  mensagem sai pela manhã.
- **A tela do agente anunciava uma coisa e o motor rodava outra.** O cartão mostrava a inteligência
  escolhida no dia da criação, não a publicada; a mesma tela dizia "Publicado" e "Rascunho" ao mesmo
  tempo, e a resposta tranquilizadora era a errada; e **arquivar um agente antigo não arquivava
  nada** — ele seguia recebendo conversas. Agora as telas mostram quem realmente atende.
- **O que você configurava no agente não chegava ao atendimento.** "Abri o agente e o prompt sumiu"
  era comum: um rascunho antigo vencia a versão publicada, e a tela deixava publicar texto vazio por
  cima do texto bom. O editor **cortava o fim das instruções coladas, sem avisar** — um agente
  atendeu clientes de verdade com as instruções cortadas no meio de uma frase. O **tamanho de
  histórico que você escolhia não valia** (a tela oferecia até 8.000 e o motor usava 1.000), e
  **nada limitava mensagens seguidas**: o funcionário disparava até 8 sem o cliente responder. Agora
  vale o que você configurou, e há um teto por atendimento (3 por padrão).
- **Quem instalou escolhendo a OpenRouter tinha um funcionário que morria em toda mensagem.** Ela é
  a primeira opção do instalador e estava quebrada em quatro pontos: a chave sumia; o agente do
  primeiro acesso nascia pedindo uma chave da Anthropic que você nunca teve; o botão de testar
  recusava justamente o provedor em uso; e o seletor de inteligência abria em branco, trocando o seu
  provedor no primeiro salvamento. Junto, **"sem saldo" aparecia como erro sem nome nem conserto** —
  a chave estava sem crédito e o dono caçou defeito por horas no sistema para um problema de fatura.
  Agora a tela nomeia falta de saldo ou de limite, e quando falta chave ou modelo o agente fica em
  **rascunho honesto** em vez de nascer com selo de "Publicado" e ficar mudo.
- **"Tem como parar a dor?" bloqueava o paciente para sempre — e quem respondia "BAJA" em espanhol
  continuava recebendo.** A regra que reconhece pedido de sair da lista caçava a palavra em qualquer
  posição da frase. Medido numa clínica em uso real: "tem como parar a dor?" e "posso sair antes das
  15h?" bloqueavam o contato, que sumia sem ninguém saber — e o mesmo erro deixava passar "não quero
  mais receber", que é pedido claro. Do outro lado, os modelos em espanhol terminam com "Respondé
  BAJA para no recibir más" e o CRM só entendia português e inglês: o caminho mais curto para uma
  denúncia de spam. Agora só bloqueia a palavra sozinha ou o pedido inequívoco, e `baja`, `salir` e
  `no quiero recibir` descadastram.
- **Tropeços do primeiro acesso.** O aceite de termos era obrigatório e apontava para duas páginas
  que não existiam; elas agora existem e nomeiam **quem instalou** como responsável pelos dados. O
  sistema chamava sua empresa de "Minha Empresa" até você recarregar a página. E a tela do WhatsApp
  mandava escanear "o código abaixo" quando **não havia código nenhum**, ou dizia "Preparando o
  código…" para sempre; agora o código aparece e cada situação responde "e agora?", com botão de
  tentar de novo.
- **A caixa de conversas contava história errada.** O contador de pendentes só subia — responder não
  abaixava nada — e uma conversa com **uma** mensagem nova podia mostrar 6. Agora responder zera,
  abrir marca como lida, e os contadores errados são recalculados na atualização. A coluna *Última
  atividade* dos Contatos ficava parada, e mensagens novas só apareciam recarregando a página —
  agora a tela se reconecta sozinha e recupera o que entrou nesse meio-tempo.
- **A conexão do WhatsApp não voltava sozinha depois de um reinício.** Reiniciar o servidor ou uma
  falta de memória deixava o número parado — nada entrava, nada saía — até alguém abrir Conexões e
  clicar em *Reconectar*, às vezes só no dia seguinte. Agora o sistema religa sozinho o número que
  apenas parou — mas não quando o WhatsApp recusou a conta nem quando o QR Code espera alguém com o
  celular na mão, porque aí insistir piora.
- **O WhatsApp ficou três dias fora do ar dizendo apenas "Não foi possível verificar a conexão".**
  Quando o WhatsApp recusa a credencial, nada entra e nada sai — mas o aviso era a mesma frase
  morna, em amarelo, de uma oscilação de rede. Foram três dias sem uma única mensagem, e o dono só
  descobriu ao tentar conectar um número novo. Agora credencial recusada abre aviso próprio, em
  vermelho, que diz o que fazer — e avisa que escanear o QR Code de novo **não** resolve. A causa
  daqueles três dias também foi consertada: **duas cópias da pasta de instalação na mesma máquina**
  trocavam as credenciais uma da outra; agora a atualização automática percebe isso e para antes de
  estragar. E os **avisos nomeavam o número errado** — o telefone era gravado no primeiro pareamento
  e nunca mais corrigido —, mandando o dono pegar o celular errado.
- **Seu número podia aparecer como conectado enquanto não entregava mais nada.** No caminho oficial
  do WhatsApp, bastava desconectar o aparelho do outro lado: o CRM seguia dizendo "conectado" e o
  atendimento morria calado. Agora a conferência pergunta se dá para enviar por aquele número AGORA
  — e "não consegui verificar" segue sendo tratado como não sei, nunca como queda.
- **O sistema parado gastava mais cota de banco de dados do que o plano gratuito permite.** Uma
  instalação sem nenhum contato e nenhuma conversa consumia **8,09 GB por mês contra uma cota de 5
  GB**, só porque o processo que faz a IA atender perguntava à fila quatro vezes por segundo se
  havia serviço. Agora ele pergunta quando falta pouco para a próxima tarefa vencer e dorme até lá,
  sem deixar o atendimento mais lento. No mesmo esforço: o WhatsApp parou de mandar avisos que o CRM
  já jogava fora, e as tarefas automáticas deixaram de registrar na auditoria quando não fizeram
  nada — num servidor real, **95% da auditoria** era rotina vazia, enterrando o que importa.
- **A versão publicada subia e morria em seguida, num ciclo sem fim.** Faltavam peças dentro do
  pacote pronto e o sistema não mostrava uma única tela — enquanto o painel do servidor dizia que
  estava tudo de pé, porque só conferia se ele atendia o telefone, não se havia alguém do outro
  lado. Agora cada versão é ligada e testada antes de ser publicada.
- **A atualização do banco podia falhar em silêncio e você nunca saber.** Partes de uma mudança não
  chegavam ao seu servidor, o erro era tratado como inofensivo e a tela dizia "atualização
  concluída". Agora, se falhar, você fica sabendo. O instalador também **acusava a sua chave quando
  o problema era a internet**, prendendo você num laço do qual não se saía digitando certo. E **quem
  tem Supabase próprio travava na primeira instalação**, tendo que editar arquivo à mão: agora
  existe um segundo endereço, **opcional**, só para a estrutura do banco — quem não preencher
  continua exatamente como está hoje.
- **Uma leva de correções que você não vai notar — e esse é o ponto.** Uma mensagem preparada de
  propósito podia congelar o sistema inteiro por segundos; agora é recusada na entrada. Falhas de
  segurança em programas de terceiros foram fechadas, e um diagnóstico interno que imprimia a chave
  do seu WhatsApp em texto puro agora mostra só um pedaço. Aviso do WhatsApp fora do formato
  esperado era descartado em silêncio, com a mensagem se perdendo enquanto o WhatsApp achava que
  tinha entregue. Telas apertadas ganharam espaço: a barra lateral não cobre mais a lista de
  conversas, no celular a lista e a conversa não brigam pelo mesmo pedaço de tela, e textos cortados
  sem jeito de ler o resto — eventos do contato, erros de integração, dados de LGPD — abrem por
  inteiro. PDFs da base de conhecimento perdiam os parágrafos e agora chegam como no original. E o
  logo, que demorava meio minuto para aparecer e **aparecia quebrado em toda instalação em Docker**,
  aparece na hora e no lugar.
- **⚠️ Requer atenção — o valor do orçamento de IA sempre foi em DÓLAR, e a tela dizia real.** Quem
  lia "R$ 50,00" tinha, na verdade, um limite de **US$ 50,00** — cerca de cinco vezes maior do que
  imaginava. Nada mudou no seu gasto nem no seu limite: mudou o que a tela confessa. O rótulo agora
  diz US$ nas telas de Uso de IA, Execuções, Evolução e nos painéis de administração. **Confira o
  número antes de ligar a parada automática**: se você escolheu "50" pensando em reais, o que está
  armado é cinco vezes isso.
- **O gasto exibido era o acumulado desde a instalação, não o do mês.** O contador nunca zerava, e
  com alguns meses de uso a tela comparava meses de gasto contra um limite mensal. Agora o número é
  o do mês corrente, e é o mesmo que decide se a IA para. Junto: o seletor "Ação ao atingir 100%"
  oferecia "Pausar" e "Desabilitar" sem que nada os distinguisse, e a escolha não tinha efeito
  nenhum — saiu da tela (quem quiser que a IA pare no limite usa "Parar a IA no limite"). E o alerta
  de "limite atingido" ficava aceso depois de o mês virar ou de você aumentar o limite; agora se
  apaga sozinho.

## [1.3.0] — 2026-08-13

Esta versão mexe em como o sistema **chega e se atualiza** no seu servidor. Em uso, três
coisas mudam para melhor: a instalação deixa de ter uma etapa que podia falhar por falta de
memória no meio (o servidor não compila mais nada — tudo vem pronto), fica bem mais rápida, e
o agente de IA passa a receber as correções de cada versão. A recomendação de servidor
**continua exatamente a mesma**: o que consome memória é operar o sistema no dia a dia — 7
serviços e cerca de 150 MB por número de WhatsApp conectado —, e isso não mudou nem um pouco.

### Corrigido

- **O agente de IA nunca recebia atualização.** O worker — o processo que faz o agente
  atender 24 horas por dia — era compilado dentro do seu servidor no dia da instalação, e
  nenhuma atualização o reconstruía. Na prática: você atualizava o CRM, o site mudava, e o
  agente continuava rodando exatamente o código do dia em que você instalou, para sempre.
  Correções e melhorias do agente não chegavam. Agora ele é uma imagem pronta, publicada
  junto com o resto, e o `update.sh` a traz como traz o app.
- **Duas instalações "na mesma versão" rodavam código diferente.** Uma instalação nova ficava
  apontada para o canal `latest`, que — apesar do nome — acompanha o desenvolvimento em
  andamento, não a última versão lançada. Quem instalou em semanas diferentes tinha software
  diferente, e não havia como dizer qual. Agora o instalador grava o **número da versão**
  (ex.: `1.2.1`), e é essa versão que fica no seu servidor até você decidir atualizar.
- **O CRM podia não subir por causa de um serviço externo fora do ar.** A configuração pedia
  ao Docker que verificasse o registro de imagens a cada subida; se ele não respondesse, o
  contêiner não subia — mesmo com a imagem já baixada no seu disco. Agora que o seu servidor
  fica numa versão fixa, essa verificação deixa de ser feita **na sua instalação** (quem
  acompanha um canal móvel continua com ela, que é onde ela serve para alguma coisa).
- **O agendador de tarefas dependia da internet para voltar.** A cada reinício ele baixava
  dois programas antes de começar. Sem internet no momento do reboot — justo quando a máquina
  está se recuperando de alguma coisa —, as tarefas automáticas não voltavam. Agora já vêm
  dentro da imagem.
- **A versão mostrada em `/api/v1/health` era sempre `0.1.0`**, em qualquer instalação. Agora
  é a versão de verdade.
- O WhatsApp (WAHA) e o serviço de limites deixaram de acompanhar automaticamente qualquer
  versão nova publicada por terceiros. Passam a mudar só quando nós testamos e lançamos.

### ⚠️ Requer atenção

**Se o seu servidor foi instalado antes desta versão, rode o `update.sh` DUAS vezes.**

> **As duas execuções são necessárias nesta versão.** O agente que corrige isso sozinho entrou
> **depois** da 1.3.0 (está em *Não lançado*) — se você está atualizando para a 1.3.0, ele não
> existe no que você vai instalar. Esta nota já disse o contrário, e a frase teria feito você
> esperar cinco minutos por algo que nunca ia acontecer.
Medido em ensaio numa VPS: a primeira execução traz o agente novo, mas deixa a versão dele
"solta" — acompanhando o canal em vez de ficar fixa, como o resto do sistema. Isso faria o
agente saltar sozinho para a versão seguinte num reinício futuro, enquanto o resto do
servidor continuaria onde está. A segunda execução fixa tudo na mesma versão.

Para saber em que pé você está, sem mexer em nada:

```bash
curl -fsSL https://raw.githubusercontent.com/melgarafael/DeskcommCRM/main/hostgator-setup-kit/diagnostico.sh | bash
```

Ele só lê e explica — não escreve, não reinicia, não atualiza. Se disser que está afetada,
o passo a passo (com como voltar atrás) está em `docs/runbooks/remediar-worker-congelado.md`.

Fora isso, nada exige ação sua. Um `.env` antigo continua funcionando: as configurações
novas têm valor padrão e o próprio `update.sh` as acrescenta.

## [1.2.1] — 2026-08-12

**Versão de segurança. Se você roda o DeskcommCRM numa VPS, atualize.**

Um usuário da comunidade auditou o código e mandou um relatório. Parte do que ele apontou já
tinha sido corrigida nas versões seguintes à que ele analisou — mas **seis** problemas estavam
de pé, e um deles deixava dados de uma empresa visíveis para outra. Todos foram corrigidos,
cada um com um teste automático que impede o problema de voltar.

### Corrigido

- **Uma empresa conseguia ler a base de conhecimento de outra, e escrever no histórico dela.**
  Duas funções internas aceitavam o identificador da empresa como se fosse confiável, sem
  conferir se quem pediu era mesmo de lá. O isolamento entre empresas estava de pé em todo o
  resto — o furo era só nessas duas portas, e elas agora conferem.
- **Quem tinha permissão de apenas visualizar conseguia mudar configurações importantes.** Um
  usuário "visualizador" podia reescrever as instruções do agente de IA (o texto que ele fala
  com o seu cliente), desligar o canal de WhatsApp, mexer no limite de gastos e apagar a chave
  do provedor de IA — bastava falar direto com o banco de dados, sem passar pelas telas. Agora
  essas mudanças exigem administrador, como as telas já exigiam.
- **A verificação em duas etapas do administrador valia só na tela.** Quem tinha a senha de um
  administrador, mas não o segundo fator, ficava barrado na interface e mesmo assim alcançava
  as funções sensíveis por fora dela — criar chave de API, convidar gente para a equipe, pedir
  exportação de dados. Agora o servidor confere o segundo fator em todas elas.
- **Link de login podia levar para um site estranho.** Um endereço preparado por terceiros
  fazia você digitar a senha no site certo e, logo depois de entrar, ser jogado para outro
  lugar — o momento em que se confia mais na próxima tela.
- **Envio de arquivo na conversa não conferia permissão.** Era a única ação de escrita da
  conversa sem essa checagem; um usuário "visualizador" podia enviar arquivos de até 50 MB.
- **Automação de webhook podia alcançar a rede interna do servidor.** A checagem olhava só o
  texto do endereço; um domínio preparado para apontar "para dentro" passava, e alcançava
  serviços internos e a área de credenciais do provedor de nuvem. Agora o endereço é resolvido
  de verdade antes de qualquer envio.

### ⚠️ Requer atenção

- **Administradores vão precisar entrar de novo, com o código do aplicativo.** Se você já tem a
  verificação em duas etapas cadastrada e está com a sessão aberta, as ações de administrador
  passam a pedir o segundo fator. Sair e entrar novamente resolve. Quem ainda **não** cadastrou
  o segundo fator não é afetado e continua conseguindo cadastrá-lo normalmente.
- **Usuários "visualizador" e "gerente" perdem a escrita em configuração de IA e canais.** Se
  alguém do seu time mexia nessas telas sem ser administrador, promova a pessoa a
  administrador antes de atualizar — ou ela vai encontrar as ações bloqueadas.
- **Nenhuma ação manual no banco é necessária.** O `update.sh` aplica tudo sozinho.

## [1.2.0] — 2026-08-11

A maior versão até aqui: **126 novidades e 205 correções** desde a 1.1.0 (contadas por commit).
Dois temas.

O primeiro é o **agente de IA deixar de ser um respondedor e virar parte da operação**: ele
ganha papéis separados, capacidades declaradas, um follow-up que não deixa conversa morrer no
silêncio, e um painel onde você escolhe qual inteligência atende cada parte do sistema.

O segundo é o **sistema parar de mentir quando algo dá errado**: falha de IA deixa rastro em
vez de sumir, botão que não controlava nada foi ligado (ou removido), e erro de rede diz onde
mexer em vez de mandar reiniciar o que nunca caiu.

### Adicionado

**O agente ganha papéis**

- **Três papéis em vez de um** — Conversador, Operador e Segurança. Quem fala não é quem
  executa, e o disparo de ação passou a ser imposto pelo sistema, não decidido pelo modelo.
  Efeito medido: a taxa de resposta em que dado interno vazava para o cliente (URL de sistema,
  UUID, jargão de CRM) caiu de **3 em 10 turnos para 1 em 10** — mesmos cenários, ferramentas
  executadas contra dados reais, controle calibrado contra a linha de base.
- **O agente publicado tem lugar próprio**, entre atendente e gerente: assume o lead, devolve
  para uma pessoa quando precisa, e a volta aparece na linha do tempo em vez de sumir.
- **Capacidades declaradas.** Você escolhe o que ele pode fazer, vê quantas vezes usou cada
  uma, e ele avisa quando falta uma capacidade em vez de falhar calado.
- **Roteador de intenção por número** — um WhatsApp só passa a atender vários assuntos — agora
  com escolha do modelo (e do provedor) que identifica a intenção.

**Follow-up: nenhuma conversa morre no silêncio**

- **O follow-up nasce sozinho** quando o negócio entra numa etapa do funil, ou quando o agente
  abre um caso pedindo ajuda — e morre quando o caso fecha.
- **Ramos nomeados no canvas:** cada regra é uma bolinha com nome, e publicar exige cobertura
  por ramo, dizendo qual ramo ficou descoberto.
- **Pausar, retomar, adiar e pular** um follow-up sem matá-lo.
- **Tempo adaptativo** — a IA escolhe o intervalo e a tela mostra qual foi, e se bateu no seu
  limite.
- **Dossiê do follow-up:** o que já foi tentado, com o que o motor realmente fez.
- O painel inteiro fala **português** — UUID saiu da tela.

**Escolher a sua IA**

- **Painel de Provedores** (Agente de IA → Provedores): a tela onde se vê e se escolhe qual
  inteligência atende **cada uma das 23 partes do sistema** que usam IA — conversar, classificar
  sentimento, indexar conhecimento, ouvir áudio. Antes disso a escolha existia só no `.env`.
- **OpenRouter completa** — uma chave só, com catálogo que se atualiza sozinho contra a origem
  (cerca de 400 modelos na sincronização de referência; o número acompanha o que eles publicam).
- **O instalador pergunta qual IA vai atender** (OpenRouter, Anthropic ou OpenAI) e valida a
  chave na hora, em vez de assumir uma e falhar semanas depois.
- **Catálogo de modelos atualizado** nos provedores — quem instala não escolhe mais entre
  modelos de duas gerações atrás, pagando mais caro por pior.

**Ver o que a IA fez**

- **Tela de Execuções** (Agente de IA → Execuções): o que a IA fez e, quando falhou, o que
  aconteceu e o que fazer a respeito.
- **Falha de IA deixa rastro.** Antes, um erro no meio do caminho sumia — o log mentia por
  omissão e a operação não tinha como saber que algo não rodou.

**A conversa vira CRM sozinha**

- **A conversa vira lead** sem alguém transcrever nada à mão.
- **A IA propõe o dado que o cliente disse** — telefone, e-mail, nome — e **não grava nada**:
  o dado espera numa fila até uma pessoa confirmar na tela.
- **Demandas viram entidade de primeira classe:** nascem no ponto de entrada, aparecem no painel
  de quem atende, e o Radar mostra as que estão **sem próximo passo** — o que corre risco de
  morrer sem resposta.
- **Escopo de funil do agente:** você marca em quais funis ele mexe, e ele só escreve nesses.

**Medir a operação**

- **Índice de Atrito** (Desempenho) — o sistema passa a medir o próprio propósito.
- **Abandono, repergunta e espera calada** — as perdas de que ninguém reclama, agora contadas.

**Atendimento**

- **Fila de leads por atendente, com rodízio.** A distribuição deixa de ser combinada por fora
  e vira porta na tela.
- **Colar imagem no composer com Ctrl+V.**
- **Declarar desde quando o número é usado** e poder pular o aquecimento — um número antigo
  não precisa ser tratado como recém-nascido.
- **Aviso de mensagem presa.** Uma tarefa automática detecta mensagem que ficou "enviando" e
  abre um aviso na Central, em vez de deixar o cliente sem resposta em silêncio.

### Corrigido

- **Duas partes do sistema respondiam à mesma mensagem do cliente.** Agora há um dono só.
- **"O WhatsApp está fora do ar" quando o serviço estava de pé.** Toda falha de rede caía na
  mesma frase, mandando reiniciar um container que nunca havia caído. Agora a mensagem
  distingue endereço errado de serviço parado e diz onde mexer.
- **Escolher OpenRouter ou OpenAI no instalador tornava a instalação impossível** — e, num
  segundo defeito, a escolha era decorativa: aceita na pergunta e ignorada depois.
- **O instalador perdia a chave que você tinha configurado à mão** no `.env`, e a segunda
  execução desfazia a entrevista já respondida.
- **O papel Operador escrevia no CRM depois de o humano assumir a conversa** — era o único
  turno sem a guarda.
- **A telemetria da IA voltou a dizer a verdade** (5 defeitos de uma unificação anterior), e a
  troca de modelo voltou a ser auditada — o registro era engolido em silêncio.
- **Duas mutações perdiam a auditoria caladas** por chave natural gravada em coluna `uuid`.
- **A aba "Minhas" mostrava tudo que o atendente já tinha fechado.**
- **O filtro por tag da tela não filtrava** — a rota ignorava o parâmetro.
- **O menu passava da dobra em telas de 900px** depois que as telas novas entraram.
- **O roteador recusava um número que existia**, com a mensagem "não encontrado nesta
  organização", quando na verdade a consulta é que havia falhado.
- **A tela de funis misturava organizações** do mesmo usuário.
- **Excluir um canal** apagava o roteador junto, sem avisar, e deixava a Meta ainda entregando
  mensagens. Reconectar dizia "conectado" com a linha ainda arquivada.
- **Erro ao publicar o agente no onboarding criava um agente novo a cada clique.**
- **O custo de IA sem agente dono sumia da auditoria** — as telas de consumo mostravam zero
  numa instalação com tráfego real e provedor pago.
- **Mover um lead pelo assistente** deixou de pular o que mover pela mão aciona.
- **Telefone descoberto depois estourava a restrição de unicidade** e a mensagem do cliente
  sumia.
- **O `update.sh` inventava gasto de IA** e podia pausar o agente de quem estava atualizando.
- **Uma migration anterior apagou três tipos de aviso da Central** — corrigido, e agora há um
  gate que compara.

### Segurança

- **8 de 25 funções internas do banco estavam executáveis pela chave pública** que vai para o
  navegador, incluindo uma que escreve recebendo a organização por parâmetro, sem checar se
  você pertence a ela. Todas fechadas, com uma varredura que reprova a próxima.
- **Desligar uma camada de proteção do agente era escrita de qualquer membro** da organização —
  agora exige papel de gestão.
- **Expressão regular vulnerável a ReDoS** na leitura do telefone dentro da conversa.
- **O limitador de requisições vazava uma chave por janela** em memória.
- **O Sentry da comunidade recebia sessão além de erro** — agora recebe só o relatório de erro,
  como o README sempre descreveu.

**⚠️ Requer atenção**

Esta versão traz **51 mudanças de banco** (migrations 0087 a 0148). O `update.sh` aplica tudo
sozinho e **faz backup antes** — você não precisa rodar nada à mão. Se a sua instalação está há
muito tempo sem atualizar, é normal a etapa do banco demorar mais e imprimir vários avisos de
"já existe": eles são esperados, e o script só destaca o que não for.

Se você instalou entre 30/07 e hoje, seu servidor já roda este código (a instalação acompanha a
`main`) — esta tag existe para que a atualização pela tela e o `update.sh` voltem a ter um alvo
publicado para comparar.

## [1.1.0] — 2026-07-30

### Adicionado

- **Atualização pela própria tela.** O dono da instalação vê a versão instalada no rodapé do menu
  e, quando há versão nova, atualiza com um clique — sem abrir terminal. A tela mostra o que muda,
  avisa quanto tempo o sistema fica fora do ar e faz uma cópia de segurança antes.

### Alterado

- **A atualização passa a instalar a última versão publicada, não o topo do código em
  desenvolvimento.** O `update.sh` recusa instalar uma versão anterior à que já está no servidor
  (voltar no tempo continua possível com `--force`) e grava a imagem escolhida no `.env` — assim um
  `docker compose up -d` rodado depois não traz o app de volta para a `latest`.

**⚠️ Requer atenção**

Quem já tem o CRM instalado precisa rodar `bash hostgator-setup-kit/update.sh` **duas vezes** pelo
terminal para ativar o botão. Não é engano: a primeira execução ainda é a do programa antigo, que
baixa o novo mas não sabe ligar o agente da tela; a segunda já roda o programa atualizado e liga.
Depois disso, nunca mais é preciso o terminal.

## [1.0.0] — 2026-07-27

Primeira versão marcada do DeskcommCRM. O projeto vinha sendo desenvolvido publicamente desde abril de 2026 sem tags; esta release estabelece o ponto a partir do qual toda mudança passa a ser versionada e descrita — porque quem hospeda o próprio sistema precisa saber o que muda antes de atualizar.

### Plataforma

- Multi-tenancy com RLS em toda tabela tenant-aware, resolvida por `fn_user_org_ids()`.
- RBAC de 4 papéis (`viewer` < `agent` < `manager` < `admin`), aplicado no servidor.
- Autenticação via Supabase Auth com MFA TOTP obrigatório para administradores.
- Log de auditoria append-only com retenção de 5 anos.
- Onboarding de organização e ciclo completo de convite de membros.

### Atendimento WhatsApp

- Inbox de 3 painéis em tempo real, com múltiplos números via WAHA.
- Mídia servida por Storage com URLs assinadas; transcrição de áudio.
- Proteção anti-banimento: ritmo com variação, teto por número, janela de horário, aquecimento gradual e variação de texto.
- Detecção de pedido de descadastro (STOP) no inbound, com bloqueio automático.

### CRM

- Funil kanban com indexação fracionária de posição.
- Vocabulário configurável por funil — o mesmo núcleo atende e-commerce, clínica, imobiliária, infoproduto e serviços.
- Customer 360, contatos, etiquetas e linha do tempo unificada.
- Integração com Nuvemshop para a vertical de e-commerce.

### Agentes de IA

- Agentes com RAG por organização (pgvector), análise de sentimento e controle de orçamento por organização.
- IA como responsável de primeira classe, sujeita às mesmas regras de governança de um humano.
- Handoff IA→humano auditado, entregando resumo contextual (não a conversa crua).
- Cadeia de 7 verificações antes de cada envio, em ordem fixa: descadastro, LGPD, anti-banimento, variação de texto, promessa determinística, promessa semântica e disclosure. Cada avaliação vira registro durável e auditável — inclusive as que barram o envio.
- Servidor MCP interno.

### Governança de atendimento

- Atribuição e transferência auditadas, fila com posição e roteamento automático.
- Escopo de visualização por papel, aplicado via RLS.
- Métricas por atendente.

### Automação

- Fontes de captação: endpoint público por organização que recebe leads de landing pages, formulários e ferramentas externas.
- Regras QUANDO/SE/ENTÃO, que nascem pausadas até revisão.
- Webhooks de saída com proteção contra SSRF.
- Nenhum trigger de banco faz HTTP: eventos vão para `event_log` e são drenados por rota agendada.

### LGPD

- Exportação e anonimização em cascata via workers, com anonimização preferida sobre exclusão.
- Consentimento auditado.

### Self-host

- `hostgator-setup-kit`: instalação completa (app + WAHA + banco) com um comando.
- `baseline.sql` idempotente e auto-curativo — atualização não quebra clone com dados legados.
- 8 scripts de operação: `install`, `update`, `backup`, `restore`, `reset-password`, `reset-mfa`, `healthcheck` e o assistente de instalação em IA.
- Imagem publicada em `ghcr.io/melgarafael/deskcommcrm` — a VPS não compila nada.

### Qualidade

- CI com dois portões obrigatórios: `verify` (typecheck, lint, testes unitários) e `invariants`.
- O portão `invariants` sobe um Postgres limpo, aplica o `baseline.sql` em modo install e update, e roda **364 testes de invariante** em 56 arquivos — incluindo o teste de isolamento entre organizações, que prova que um usuário de uma organização não enxerga nenhuma linha de outra.
- Suíte end-to-end em Playwright dirigindo o frontend.

### ⚠️ Requer atenção

- **Node 22 é obrigatório para desenvolvimento.** A suíte de invariantes instancia o cliente do Supabase, que exige o `WebSocket` global — nativo apenas a partir do Node 22. Isso não afeta quem apenas hospeda: a VPS roda a imagem pronta.

[Não lançado]: https://github.com/melgarafael/DeskcommCRM/compare/v1.86.0...HEAD
[1.86.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.85.0...v1.86.0
[1.85.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.84.0...v1.85.0
[1.84.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.83.0...v1.84.0
[1.83.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.82.0...v1.83.0
[1.82.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.81.0...v1.82.0
[1.81.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.80.0...v1.81.0
[1.80.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.79.0...v1.80.0
[1.79.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.78.0...v1.79.0
[1.78.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.77.0...v1.78.0
[1.77.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.76.0...v1.77.0
[1.76.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.75.0...v1.76.0
[1.75.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.74.0...v1.75.0
[1.74.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.73.0...v1.74.0
[1.73.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.72.0...v1.73.0
[1.72.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.71.0...v1.72.0
[1.71.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.70.0...v1.71.0
[1.70.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.69.0...v1.70.0
[1.69.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.68.0...v1.69.0
[1.68.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.67.0...v1.68.0
[1.67.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.66.1...v1.67.0
[1.66.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.66.0...v1.66.1
[1.66.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.65.0...v1.66.0
[1.65.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.64.1...v1.65.0
[1.64.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.64.0...v1.64.1
[1.64.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.6...v1.64.0
[1.63.6]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.5...v1.63.6
[1.63.5]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.4...v1.63.5
[1.63.4]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.3...v1.63.4
[1.63.3]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.2...v1.63.3
[1.63.2]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.1...v1.63.2
[1.63.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.63.0...v1.63.1
[1.63.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.62.0...v1.63.0
[1.62.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.61.0...v1.62.0
[1.61.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.60.0...v1.61.0
[1.60.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.59.0...v1.60.0
[1.59.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.58.1...v1.59.0
[1.58.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.58.0...v1.58.1
[1.58.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.57.0...v1.58.0
[1.57.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.56.1...v1.57.0
[1.56.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.56.0...v1.56.1
[1.56.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.55.0...v1.56.0
[1.55.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.54.0...v1.55.0
[1.54.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.53.0...v1.54.0
[1.53.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.52.0...v1.53.0
[1.52.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.51.0...v1.52.0
[1.51.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.50.0...v1.51.0
[1.50.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.49.0...v1.50.0
[1.49.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.48.0...v1.49.0
[1.48.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.47.0...v1.48.0
[1.47.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.46.0...v1.47.0
[1.46.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.45.0...v1.46.0
[1.45.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.44.0...v1.45.0
[1.44.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.43.0...v1.44.0
[1.43.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.42.0...v1.43.0
[1.42.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.41.0...v1.42.0
[1.41.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.40.0...v1.41.0
[1.40.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.39.0...v1.40.0
[1.39.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.38.0...v1.39.0
[1.38.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.37.0...v1.38.0
[1.37.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.36.0...v1.37.0
[1.36.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.35.1...v1.36.0
[1.35.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.35.0...v1.35.1
[1.35.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.34.0...v1.35.0
[1.34.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.33.0...v1.34.0
[1.33.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.32.1...v1.33.0
[1.32.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.32.0...v1.32.1
[1.32.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.31.1...v1.32.0
[1.31.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.31.0...v1.31.1
[1.31.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.30.0...v1.31.0
[1.30.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.29.0...v1.30.0
[1.29.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.28.0...v1.29.0
[1.28.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.27.3...v1.28.0
[1.27.3]: https://github.com/melgarafael/DeskcommCRM/compare/v1.27.2...v1.27.3
[1.27.2]: https://github.com/melgarafael/DeskcommCRM/compare/v1.27.1...v1.27.2
[1.27.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.27.0...v1.27.1
[1.27.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.26.0...v1.27.0
[1.26.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.25.1...v1.26.0
[1.25.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.25.0...v1.25.1
[1.25.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.24.0...v1.25.0
[1.24.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.23.0...v1.24.0
[1.23.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.22.0...v1.23.0
[1.22.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.21.0...v1.22.0
[1.21.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.20.0...v1.21.0
[1.20.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.19.0...v1.20.0
[1.19.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.18.1...v1.19.0
[1.18.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.17.0...v1.18.0
[1.17.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.16.1...v1.17.0
[1.16.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.15.1...v1.16.0
[1.15.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.11.0...v1.12.0
[1.11.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.10.2...v1.11.0
[1.10.2]: https://github.com/melgarafael/DeskcommCRM/compare/v1.10.1...v1.10.2
[1.10.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.10.0...v1.10.1
[1.10.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.9.1...v1.10.0
[1.9.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.6.0...v1.7.0
[1.5.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/melgarafael/DeskcommCRM/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/melgarafael/DeskcommCRM/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/melgarafael/DeskcommCRM/releases/tag/v1.0.0
