-- manifest: Habilita catálogo precificado de modelos Chutes para conversação, isolado do embedding já operacional; sem alterar padrão de empresas nem publicar credenciais.
-- Fonte: https://chutes.ai/pricing e https://chutes.ai/agents (20/10/2026).
-- Valores em centavos de USD por MILHÃO de tokens; a tarifa do fornecedor
-- poderá mudar, por isso reconciliar catálogo antes do canário/ativação.
-- Chutes nativo só aceita modelos com preço comprovado na linha provider=chutes.
-- Centavos fracionários comprovados pelo Chutes exigem a mesma precisão do
-- ai_pricing (numeric(10,4)); integer arredondava 10.4/41.6 para 10/42.
-- Ampliação de precisão sem arredondar tarifas e sem trocar unidade monetária.
alter table public.ai_models
  alter column input_price_per_million_cents type numeric(10,4),
  alter column output_price_per_million_cents type numeric(10,4);

insert into public.ai_models
  (provider, model_id, display_name, description, context_window,
   input_price_per_million_cents, output_price_per_million_cents, supports_tools)
values
  ('chutes', 'Qwen/Qwen3-32B-TEE', 'Qwen3 32B (Chutes TEE)',
   'Conversação e chamadas de ferramentas via Chutes; texto.',
   40960, 10.4, 41.6, true),
  ('chutes', 'google/gemma-4-31B-turbo-TEE', 'Gemma 4 31B Turbo (Chutes TEE)',
   'Conversação e chamadas de ferramentas via Chutes.',
   131072, 12, 37, true)
on conflict (provider, model_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  context_window = excluded.context_window,
  input_price_per_million_cents = excluded.input_price_per_million_cents,
  output_price_per_million_cents = excluded.output_price_per_million_cents,
  supports_tools = excluded.supports_tools,
  deprecated_at = null;

-- A tabela ai_pricing é compartilhada por id de modelo entre provedores.
-- Estes ids são próprios do gateway Chutes; são preços distintos de fornecedores originais.
insert into public.ai_pricing
  (model, prompt_cents_per_million_tokens, completion_cents_per_million_tokens, notes)
values
  ('Qwen/Qwen3-32B-TEE', 10.4, 41.6, 'catálogo 0691 — Chutes 20/10/2026'),
  ('google/gemma-4-31B-turbo-TEE', 12, 37, 'catálogo 0691 — Chutes 20/10/2026')
on conflict (model) do update set
  prompt_cents_per_million_tokens = excluded.prompt_cents_per_million_tokens,
  completion_cents_per_million_tokens = excluded.completion_cents_per_million_tokens,
  notes = excluded.notes,
  superseded_at = null;
