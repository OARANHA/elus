-- manifest: Sincroniza atomicamente o catálogo público Chutes com ownership explícito dos dois seeds 0691, preservando curadoria manual e rejeitando lotes suspeitos; sem alterar tenants, embeddings ou histórico.
-- Não executar em produção nesta tarefa. Catálogo global, não tenant-aware.

-- ---- Chutes: ownership explícito e sincronização atômica (migration 0692) ----
do $$
declare
  s record;
  atual public.ai_models%rowtype;
begin
  lock table public.ai_models in share row exclusive mode;
  for s in select * from (values
    ('Qwen/Qwen3-32B-TEE', 'Qwen3 32B (Chutes TEE)',
     'Conversação e chamadas de ferramentas via Chutes; texto.', 40960, 10.4::numeric, 41.6::numeric),
    ('google/gemma-4-31B-turbo-TEE', 'Gemma 4 31B Turbo (Chutes TEE)',
     'Conversação e chamadas de ferramentas via Chutes.', 131072, 12::numeric, 37::numeric)
  ) as seeds(model_id, display_name, description, context_window, entrada, saida)
  loop
    select * into atual from public.ai_models where provider = 'chutes' and model_id = s.model_id;
    if not found then raise exception 'chutes_seed_ausente: %', s.model_id; end if;
    if atual.source = 'chutes' then continue; end if; -- reexecução idempotente.
    if atual.source <> 'manual'
       or atual.display_name is distinct from s.display_name
       or atual.description is distinct from s.description
       or atual.context_window is distinct from s.context_window
       or atual.input_price_per_million_cents is distinct from s.entrada
       or atual.output_price_per_million_cents is distinct from s.saida
       or atual.supports_tools is distinct from true
       or atual.supports_vision is distinct from false
       or atual.supports_embedding is distinct from false
       or atual.is_default_for_provider is distinct from false
       or atual.deprecated_at is not null
       or atual.synced_at is not null
       or atual.metadata is distinct from '{}'::jsonb
       or atual.released_at is not null
       or atual.embedding_dims is not null then
      raise exception 'chutes_seed_modificado: % — revisão manual necessária', s.model_id;
    end if;
    update public.ai_models set source = 'chutes' where provider = 'chutes' and model_id = s.model_id and source = 'manual';
  end loop;
end $$;

create or replace function public.fn_sincronizar_catalogo_chutes(p_modelos jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  recebidos integer;
  conhecidos integer;
  gravados integer;
  depreciados integer;
  ressuscitados integer;
  agora timestamptz := now();
begin
  if jsonb_typeof(p_modelos) is distinct from 'array' then
    raise exception 'chutes_catalogo_invalido';
  end if;
  recebidos := jsonb_array_length(p_modelos);
  if recebidos < 1 or recebidos > 10000 then raise exception 'chutes_catalogo_tamanho_invalido'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_modelos) m
    where jsonb_typeof(m) is distinct from 'object'
      or m->>'provider' is distinct from 'chutes' or m->>'source' is distinct from 'chutes'
      or jsonb_typeof(m->'model_id') is distinct from 'string'
      or length(btrim(m->>'model_id')) not between 1 and 512
      or m->>'model_id' <> btrim(m->>'model_id')
      or jsonb_typeof(m->'display_name') is distinct from 'string'
      or length(btrim(m->>'display_name')) = 0
      or jsonb_typeof(m->'supports_tools') is distinct from 'boolean'
      or jsonb_typeof(m->'supports_vision') is distinct from 'boolean'
      or jsonb_typeof(m->'input_price_per_million_cents') is distinct from 'number'
      or jsonb_typeof(m->'output_price_per_million_cents') is distinct from 'number'
      or jsonb_typeof(m->'context_window') not in ('number', 'null')
      or not (m ? 'context_window')
      or jsonb_typeof(m->'description') not in ('string', 'null')
      or not (m ? 'description')
  ) then raise exception 'chutes_catalogo_campos_invalidos'; end if;
  if (select count(distinct m->>'model_id') from jsonb_array_elements(p_modelos) m) <> recebidos then
    raise exception 'chutes_catalogo_id_duplicado';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_modelos) as m(input_price_per_million_cents numeric, output_price_per_million_cents numeric, context_window numeric)
    where input_price_per_million_cents not between 0 and 999999.9999
      or output_price_per_million_cents not between 0 and 999999.9999
      or input_price_per_million_cents <> ceil(input_price_per_million_cents * 10000) / 10000
      or output_price_per_million_cents <> ceil(output_price_per_million_cents * 10000) / 10000
      or (context_window is not null and (context_window not between 1 and 2147483647 or context_window <> trunc(context_window)))
  ) then raise exception 'chutes_catalogo_valores_invalidos'; end if;

  -- Serializa as rodadas e também edições manuais: ON CONFLICT nunca transfere ownership.
  lock table public.ai_models in share row exclusive mode;
  select count(*) into conhecidos from public.ai_models
    where provider = 'chutes' and source = 'chutes' and deprecated_at is null;
  if recebidos * 2 < conhecidos then raise exception 'chutes_catalogo_abaixo_do_piso'; end if;
  select count(*) into ressuscitados from public.ai_models a
    where a.provider = 'chutes' and a.source = 'chutes' and a.deprecated_at is not null
      and exists (select 1 from jsonb_array_elements(p_modelos) m where m->>'model_id' = a.model_id);

  insert into public.ai_models
    (provider, source, model_id, display_name, description, context_window,
     input_price_per_million_cents, output_price_per_million_cents,
     supports_tools, supports_vision, supports_embedding, synced_at, deprecated_at)
  select 'chutes', 'chutes', m.model_id, m.display_name, m.description, m.context_window,
    m.input_price_per_million_cents, m.output_price_per_million_cents,
    m.supports_tools, m.supports_vision, false, agora, null
  from jsonb_to_recordset(p_modelos) as m(model_id text, display_name text, description text,
    context_window integer, input_price_per_million_cents numeric, output_price_per_million_cents numeric,
    supports_tools boolean, supports_vision boolean)
  on conflict (provider, model_id) do update set
    display_name = excluded.display_name, description = excluded.description,
    context_window = excluded.context_window,
    input_price_per_million_cents = excluded.input_price_per_million_cents,
    output_price_per_million_cents = excluded.output_price_per_million_cents,
    supports_tools = excluded.supports_tools, supports_vision = excluded.supports_vision,
    supports_embedding = false, synced_at = agora, deprecated_at = null
  where public.ai_models.provider = 'chutes' and public.ai_models.source = 'chutes';
  get diagnostics gravados = row_count;

  update public.ai_models a set deprecated_at = agora
    where a.provider = 'chutes' and a.source = 'chutes' and a.deprecated_at is null
      and not exists (select 1 from jsonb_array_elements(p_modelos) m where m->>'model_id' = a.model_id);
  get diagnostics depreciados = row_count;
  return jsonb_build_object('fonte', 'chutes', 'recebidos', recebidos, 'gravados', gravados,
    'depreciados', depreciados, 'ressuscitados', ressuscitados);
end $$;
revoke all on function public.fn_sincronizar_catalogo_chutes(jsonb) from public, anon, authenticated;
grant execute on function public.fn_sincronizar_catalogo_chutes(jsonb) to service_role;
