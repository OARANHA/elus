-- manifest: **O rótulo de anonimizado deixa de derivar do id do contato, o `external_id` do titular sai das mensagens que sobram, e o pedido de exclusão AVISA o titular depois de apagar (issue #2342).** Três achados da triagem, no mesmo pedido de exclusão: (1) `v_anon_label := 'Cliente Anonimizado #' || substring(p_contact_id::text from 1 for 8)` gravava nos 8 primeiros caracteres do uuid do contato um sufixo que qualquer pessoa com o banco casava com a linha `contacts` — rótulo derivado do id é pseudonimização, e dado pseudonimizado segue sendo dado pessoal (RGPD considerando 26; LGPD art. 12 e art. 13 §4); (2) o passo 3 da cascata redigia o corpo, a mídia e o metadata de `messages`, mas deixava `external_id` — o TELEFONE do titular — legível na linha que resta; (3) a cascata não informava o titular de nada depois de apagar (art. 12.º n.º 3 do RGPD). Este arquivo conserta (1) e (2); (3) entra no worker (`workers/lgpd-redact-worker.ts`) e na rota de aviso do art. 12.º, e vale só para organização FORA do Brasil (decisão de produto de 2026-10-16): no Brasil o aviso não existe, e o texto brasileiro fica para uma revisão própria.
-- 0657: rótulo opaco de anonimizado, `messages.external_id` zerado na cascata.
--
-- ─── O defeito ──────────────────────────────────────────────────────────────────────────────
--
-- O sufixo do rótulo era a CAUDA do id:
--
--   v_anon_label := 'Cliente Anonimizado #' || substring(p_contact_id::text from 1 for 8);
--
-- O contato continua com o MESMO id depois da anonimização, então quem tem o
-- banco não precisa de nada mais: `select id, name from contacts where
-- is_anonymized` devolve a parelinha pronta. Reidentificar é olhar, não
-- calcular — e é exatamente o que o considerando 26 do RGPD diz que dado
-- pseudonimizado ainda é.
--
-- ─── O conserto, e por que um token aleatório ───────────────────────────────────────────────
--
-- Hash com sal parece o remédio, e não é: quem tem o banco tem também o sal,
-- e aí basta recalcular o hash de cada `contacts.id` para reencontrar a linha.
-- O sufixo tem de NÃO SER FUNÇÃO do id — 32 bits de aleatoriedade, gerados uma
-- vez, gravados no `name` do contato no passo 1. Nada no banco permite ir do
-- rótulo de volta ao titular.
--
-- O rótulo precisa continuar MESMO em todas as tabelas (é assim que a tela
-- reconhece um contato anonimizado em lead, caso, proposta e mídia de voz), e a
-- geração é centralizada numa função só — `fn_lgpd_rotulo_anonimizado`, que
-- reusa o que já está no contato quando existe. O gatilho de seções de módulo
-- (0485) roda ANTES do commit do passo 1, então ele lê `new.name`, que nesse
-- ponto já é o rótulo novo.
--
-- O FORMATO (`Cliente Anonimizado #` + 8 dígitos hexadecimais) não muda: o
-- prefixo é o que `lib/escalacao/texto-do-aviso.ts` usa para não cortar o rótulo
-- no primeiro token, e o regex de 8 hex casava com o sufixo novo também.
--
-- ─── `messages.external_id` ─────────────────────────────────────────────────────────────────
--
-- A coluna guarda o telefone do titular no inbound e o id do provider no
-- outbound. O passo 3 já redigia o corpo, apagava a mídia e limpava o metadata,
-- e a coluna sobrava inteira — a última PII viva das linhas que RESTAM depois
-- do pedido de exclusão. Zerar não quebra o que existe: `messages_org_external_id_unique`
-- trata NULL como distinto de todo NULL, a citação (`reply_to_message_id`,
-- migration 0168) aponta para o id da linha, e o dedup por eco do provider só
-- alcança mensagem ainda em voo — pedido de exclusão não manda mensagem nenhuma.
-- Linhas exportadas antes (PDF/data.json do titular) não mudam: nada aqui
-- reescreve o que já foi entregue, e a contagem por tabela (`counts`) segue a
-- mesma.
--
-- ─── FORWARD-FIX ────────────────────────────────────────────────────────────────────────────
--
-- A cascata já foi reescrita seis vezes — 0019 nasceu, 0477/0482/0483/0497/0620
-- cresceram — e todas já estão aplicadas: o conserto é `create or replace` numa
-- migration NOVA (a mesma porta de sempre), com o apêndice idêntico no
-- `baseline.sql`, ANTES do bloco da VARREDURA anon (0116), que proíbe
-- `create function` depois dela.
--
-- Evidência: `tests/invariants/lgpd-rotulo-opaco-e-external-id.test.ts` (efeito
-- no banco: rótulo não deriva do id, mesmo valor em todas as tabelas,
-- `external_id` zerado e a linha de pé) e
-- `tests/unit/cascata-lgpd-rotulo-opaco-e-external-id.test.ts` (a última
-- definição do baseline e da cadeia são as que mudam).

create or replace function public.fn_lgpd_rotulo_anonimizado(p_contact_id uuid)
returns text
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_rotulo text;
begin
  if p_contact_id is null then
    return null;
  end if;

  -- Quem escreve DEPOIS do passo 1 reusa o rótulo que já está no contato: o
  -- sufixo é gerado UMA vez por anonimização, e todas as tabelas alcançadas
  -- ficam com o MESMO rótulo — é o que faz o rótulo servir de ponteiro.
  select name into v_rotulo from public.contacts where id = p_contact_id;
  if v_rotulo ~ '^Cliente Anonimizado #[0-9a-f]{8}$' then
    return v_rotulo;
  end if;

  -- Sufixo OPACO: 32 bits de aleatoriedade, nenhum pedaço do id. Diferente do
  -- `substring(id::text from 1 for 8)` anterior, o valor NÃO é função do id —
  -- nem olhando o rótulo nem enumerando os ids do banco se recupera o titular.
  return 'Cliente Anonimizado #' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
end $$;

revoke execute on function public.fn_lgpd_rotulo_anonimizado(uuid) from public, anon, authenticated;
grant execute on function public.fn_lgpd_rotulo_anonimizado(uuid) to service_role;

create or replace function public.fn_lgpd_cascade_redact_contact(p_organization_id uuid, p_contact_id uuid, p_request_id uuid) returns jsonb
    language plpgsql security definer
    set search_path to 'public', 'extensions', 'pg_temp'
    as $$
declare
  v_already bool;
  v_counts jsonb := '{}'::jsonb;
  v_media_paths text[] := '{}';
  v_anon_label text;
  v_count int;
  v_variantes text[] := '{}';
  v_secao record;
  v_secoes jsonb := '{}'::jsonb;
begin
  perform public.fn_service_lock(p_organization_id,p_contact_id);
  select is_anonymized into v_already
    from contacts
    where id = p_contact_id and organization_id = p_organization_id;

  if not found then
    raise exception 'contact not found' using errcode = 'P0002';
  end if;

  if v_already then
    return jsonb_build_object('already_anonymized', true, 'counts', v_counts, 'media_paths', v_media_paths);
  end if;

  -- O rótulo NÃO deriva mais do id (issue #2342): `fn_lgpd_rotulo_anonimizado`
  -- gera um sufixo OPACO (aleatório, gravado no passo 1 abaixo). Antes, o
  -- sufixo eram os 8 primeiros caracteres do uuid do contato — quem tem o
  -- banco casava `Cliente Anonimizado #7a5f0011` com a linha `7a5f0011-…` e
  -- reidentificava o titular pelo próprio rótulo (pseudonimização, não
  -- anonimização: RGPD considerando 26, LGPD art. 12 e art. 13 §4).
  v_anon_label := public.fn_lgpd_rotulo_anonimizado(p_contact_id);

  -- Seções de módulo (D8, 0485): a redação delas é do gatilho
  -- `trg_lgpd_secoes_de_modulo`, que não devolve contagem — mas a contagem é
  -- EVIDÊNCIA (vai para `cascaded_to` no audit e no retorno). Uma chave por
  -- seção declarada, com o nome da tabela, contando pela MESMA `ligacao` do
  -- gatilho ($1 = organização, $2 = contato). Conta ANTES do passo 1 (que
  -- dispara o gatilho): a seção que soltar a própria ligação seguiria contada.
  -- Sem o módulo a tabela não existe e a chave não aparece. Seção com ligação
  -- vazia não é contada: o erro nomeado (`modulo_secao_invalida`) é do gatilho.
  for v_secao in
    select tabela, ligacao from public.modulo_secoes_lgpd order by modulo, tabela
  loop
    if to_regclass(format('public.%I', v_secao.tabela)) is not null
       and btrim(v_secao.ligacao) <> '' then
      execute format('select count(*) from public.%I where (%s)', v_secao.tabela, v_secao.ligacao)
        into v_count using p_organization_id, p_contact_id;
      v_secoes := v_secoes || jsonb_build_object(v_secao.tabela, v_count);
    end if;
  end loop;

  select coalesce(public.fn_telefone_variantes(phone_number), '{}')
    into v_variantes
    from contacts
    where id = p_contact_id and organization_id = p_organization_id;

  select coalesce(array_agg(distinct media_storage_path) filter (where media_storage_path is not null), '{}')
    into v_media_paths
    from messages
    where organization_id = p_organization_id
      and conversation_id in (
        select id from conversations
          where contact_id = p_contact_id and organization_id = p_organization_id
      );

  -- 1. contacts (irreversible)
  update contacts set
    name = v_anon_label,
    display_name = v_anon_label,
    email = null,
    phone_number = null,
    cpf_encrypted = null,
    cpf_hash = null,
    birthdate = null,
    is_anonymized = true,
    anonymized_at = now(),
    consent = '{}'::jsonb,
    source_metadata = '{}'::jsonb,
    tags = '{}'::text[],
    updated_at = now()
  where id = p_contact_id and organization_id = p_organization_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('contacts', v_count);

  -- 2. conversations metadata + preview strip
  update conversations set
    metadata = '{}'::jsonb,
    last_message_preview = null,
    last_handoff_reason = null,
    updated_at = now()
  where contact_id = p_contact_id and organization_id = p_organization_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('conversations', v_count);

  -- 3. messages: redact body + null media + strip metadata (preserve status/timestamps/conversation_id)
  update messages set
    body = '[mensagem anonimizada]',
    media_url = null,
    media_mime = null,
    media_size_bytes = null,
    media_storage_path = null,
    media_derived_text = null,
    -- `external_id` guarda o TELEFONE do titular (número no inbound, id do
    -- provider no outbound) e sobrevivia legível na linha que RESTA da
    -- anonimização — a última PII viva do pedido de exclusão. Zerar não quebra
    -- nada que dependa da coluna: o unique (organization_id, external_id)
    -- trata NULL como distinto de todo NULL, a citação (`reply_to_message_id`)
    -- aponta para o id da linha e não para o `external_id`, e o eco do provider
    -- só deduplica mensagem ainda em voo — pedido de exclusão não manda nada.
    external_id = null,
    metadata = '{}'::jsonb,
    updated_at = now()
  where organization_id = p_organization_id
    and conversation_id in (
      select id from conversations
        where contact_id = p_contact_id and organization_id = p_organization_id
    );
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('messages', v_count);

  -- 4. crm_lead_activities — strip payload, metadata E reason (migration 0071).
  update crm_lead_activities set
    payload = '{}'::jsonb,
    metadata = '{}'::jsonb,
    reason = null
  where organization_id = p_organization_id
    and (
      contact_id = p_contact_id
      or lead_id in (
        select lead_id from crm_lead_links
          where target_kind = 'contact'
            and target_id = p_contact_id
            and organization_id = p_organization_id
      )
      or lead_id in (
        select id from crm_leads
          where contact_id = p_contact_id and organization_id = p_organization_id
      )
    );
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('activities', v_count);

  -- 5. crm_leads — strip title/description/custom_fields/source_metadata/tags but PRESERVE pipeline/stage/value
  update crm_leads set
    title = v_anon_label,
    description = null,
    custom_fields = '{}'::jsonb,
    source_metadata = '{}'::jsonb,
    tags = '{}'::text[],
    updated_at = now()
  where organization_id = p_organization_id
    and (
      contact_id = p_contact_id
      or id in (
        select lead_id from crm_lead_links
          where target_kind = 'contact'
            and target_id = p_contact_id
            and organization_id = p_organization_id
      )
    );
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('leads', v_count);

  -- 6. orders — PRESERVE values + status + timestamps. Strip personal fields from payload jsonb
  --    and replace customer_external_id with null (FK-safe; soft de-link). Keep contact_id null.
  update orders set
    payload = (coalesce(payload, '{}'::jsonb))
      - 'customer'
      - 'customer_name'
      - 'customer_email'
      - 'customer_phone'
      - 'shipping_address'
      - 'billing_address'
      - 'contact_identification',
    customer_external_id = null,
    contact_id = null,
    is_anonymized = true,
    updated_at = now()
  where organization_id = p_organization_id
    and contact_id = p_contact_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('orders', v_count);

  -- 6b. crm_proposals (migration 0477, #1504) — PRESERVA número, valores,
  -- itens, datas e status; redige só o que identifica a PESSOA. Ver o
  -- cabeçalho desta migration para o porquê de cada coluna.
  -- O PDF que o cliente recebeu (bucket `propostas`, `<org>/<proposta>.pdf`)
  -- tem o nome dele impresso: redigir as colunas e deixar o arquivo seria
  -- anonimizar a linha e manter o documento. Vai para a mesma fila de expurgo
  -- da mídia (passo 7), com o bucket CERTO — a mensagem que levou o PDF
  -- aponta para o mesmo caminho, mas o passo 7 só enfileira `whatsapp-media`.
  -- Lido ANTES de o passo seguinte zerar `pdf_path`.
  insert into storage_redaction_queue (organization_id, request_id, bucket, object_path)
  select p_organization_id, p_request_id, 'propostas', pdf_path
    from crm_proposals
   where organization_id = p_organization_id
     and contact_id = p_contact_id
     and pdf_path is not null and length(pdf_path) > 0
     -- só arquivo DESTA organização: o expurgo nunca alcança o PDF de outra
     and pdf_path like p_organization_id::text || '/%'
  on conflict (bucket, object_path) do nothing;
  update crm_proposals set
    destinatario_nome = v_anon_label,
    briefing_json = '{}'::jsonb,
    resumo_comercial = null,
    -- o texto do documento como foi montado e como foi editado à mão: é o
    -- conteúdo do PDF, com o mesmo nome dentro.
    rendered_snapshot = null,
    secoes_editadas = null,
    pdf_path = null,
    updated_at = now()
  where organization_id = p_organization_id
    and contact_id = p_contact_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('crm_proposals', v_count);

  -- CAMPANHAS: o que foi DITO à pessoa e o endereço para onde foi.
  update campaign_recipients set
    rendered_body = null,
    recipient_address = null,
    variables = '{}'::jsonb,
    last_error_detail = null,
    updated_at = now()
  where organization_id = p_organization_id
    and contact_id = p_contact_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('campaign_recipients', v_count);

  -- LISTA DE EXCLUSÃO: solta o vínculo e apaga a cauda do telefone.
  update campaign_