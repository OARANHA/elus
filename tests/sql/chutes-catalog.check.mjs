/** PostgreSQL em memória (PGlite), sem serviço, credencial ou migration real.
 * Uso: node tests/sql/chutes-catalog.check.mjs /caminho/para/pglite/dist/index.js
 * A ferramenta opcional fica fora do checkout; não é dependência da aplicação.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { test as nodeTest } from "node:test";
let falhas = 0;
const test = (nome, executar) =>
  nodeTest(nome, async () => {
    try {
      await executar();
    } catch (erro) {
      falhas++;
      throw erro;
    }
  });
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const migrationPath = "supabase/migrations/20261020230000_0692_chutes_catalog_sync.sql";
const migration = readFileSync(migrationPath, "utf8");
const db = new PGlite();
const original = readFileSync(
  "supabase/migrations/20260505140000_0023_ai_agents_module.sql",
  "utf8",
);
const table = original.slice(
  original.indexOf("create table if not exists public.ai_models ("),
  original.indexOf("alter table public.ai_models enable row level security;"),
);
await db.exec(`create role anon; create role authenticated; create role service_role; ${table}
 alter table ai_models drop constraint ai_models_provider_check;
 alter table ai_models add column source text not null default 'manual', add column synced_at timestamptz,
 add column supports_vision boolean not null default false, add column supports_embedding boolean not null default false, add column embedding_dims integer;
 create table ai_pricing(model text primary key, prompt_cents_per_million_tokens numeric, completion_cents_per_million_tokens numeric, notes text, superseded_at timestamptz);`);
const seed = readFileSync(
  "supabase/migrations/20261020120001_0691_chutes_chat_catalog.sql",
  "utf8",
);
await db.exec(seed);
const fixture = JSON.parse(readFileSync("tests/fixtures/chutes-models-2026-10-20.json", "utf8"));
const linha = (id) => ({
  provider: "chutes",
  source: "chutes",
  model_id: id,
  display_name: id,
  description: null,
  context_window: null,
  input_price_per_million_cents: 10.4,
  output_price_per_million_cents: 41.6,
  supports_tools: true,
  supports_vision: false,
});
const sync = async (linhas) =>
  (
    await db.query("select fn_sincronizar_catalogo_chutes($1::jsonb) as resultado", [
      JSON.stringify(linhas),
    ])
  ).rows[0].resultado;
const snapshot = async () =>
  (await db.query("select to_jsonb(a) as row from ai_models a order by provider,model_id")).rows;

await test("migration transfere somente seeds esperados e pode ser reaplicada", async () => {
  await db.exec(migration);
  assert.deepEqual((await db.query("select distinct source from ai_models")).rows, [
    { source: "chutes" },
  ]);
  await db.exec(migration);
});
await test("baseline contém exatamente o bloco forward-only", () => {
  assert.ok(readFileSync("supabase/baseline.sql", "utf8").includes(migration));
});
await test("ownership manual, mesmo ID em outro provider, configuração e histórico permanecem intactos", async () => {
  await db.exec(
    "insert into ai_models(provider,model_id,display_name,metadata) values ('chutes','manual','Curadoria','{\"preservar\":true}'), ('openrouter','novo','Outra fonte','{}'); create table organizations(id integer, settings jsonb); insert into organizations values (1,'{\"llm\":\"manual\"}'),(2,'{\"llm\":\"outro\"}'); create table llm_calls(cost_cents numeric); insert into llm_calls values(123.45);",
  );
  const antes = (
    await db.query(
      "select to_jsonb(a) row from ai_models a where source='manual' order by provider",
    )
  ).rows;
  const resultado = await sync([
    linha("manual"),
    linha("novo"),
    ...fixture.data.slice(0, 2).map((m) => linha(m.id)),
  ]);
  assert.equal(resultado.gravados, 3);
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(a) row from ai_models a where source='manual' order by provider",
      )
    ).rows,
    antes,
  );
  assert.deepEqual((await db.query("select settings from organizations order by id")).rows, [
    { settings: { llm: "manual" } },
    { settings: { llm: "outro" } },
  ]);
  assert.deepEqual((await db.query("select cost_cents from llm_calls")).rows, [
    { cost_cents: "123.45" },
  ]);
});
await test("deprecia sem DELETE e ressuscita sem mudar default/metadata", async () => {
  const linhas = [
    linha("novo"),
    linha("Qwen/Qwen3-32B-TEE"),
    linha("google/gemma-4-31B-turbo-TEE"),
  ];
  await sync(linhas);
  const antes = (
    await db.query("select id from ai_models where provider='chutes' and model_id='novo'")
  ).rows[0].id;
  const r = await sync(linhas.slice(1));
  assert.ok(r.depreciados >= 1);
  assert.notEqual(
    (
      await db.query(
        "select deprecated_at from ai_models where provider='chutes' and model_id='novo'",
      )
    ).rows[0].deprecated_at,
    null,
  );
  const volta = await sync(linhas);
  assert.ok(volta.ressuscitados >= 1);
  assert.equal(
    (await db.query("select id from ai_models where provider='chutes' and model_id='novo'")).rows[0]
      .id,
    antes,
  );
});
await test("piso é revalidado no banco sem nenhuma gravação parcial", async () => {
  const antes = await snapshot();
  await assert.rejects(sync([linha("só-um")]), /abaixo_do_piso/);
  assert.deepEqual(await snapshot(), antes);
});
await test("modelo inválido no final aborta também os modelos válidos", async () => {
  const antes = await snapshot();
  for (const invalido of [
    { ...linha("bad"), source: "manual" },
    { ...linha("bad"), input_price_per_million_cents: null },
    { ...linha("bad"), output_price_per_million_cents: -1 },
    { ...linha("bad"), context_window: 1.5 },
  ]) {
    await assert.rejects(sync([linha("novo"), invalido]));
    assert.deepEqual(await snapshot(), antes);
  }
  await assert.rejects(sync([linha("novo"), linha("novo")]));
  assert.deepEqual(await snapshot(), antes);
});
await test("falha durante depreciação desfaz o upsert anterior", async () => {
  await db.exec(
    "create function recusar_depreciacao() returns trigger language plpgsql as $$ begin if new.deprecated_at is not null then raise exception 'falha_injetada'; end if; return new; end $$; create trigger recusar before update on ai_models for each row execute function recusar_depreciacao();",
  );
  const antes = await snapshot();
  await assert.rejects(
    sync([linha("Qwen/Qwen3-32B-TEE"), linha("google/gemma-4-31B-turbo-TEE")]),
    /falha_injetada/,
  );
  assert.deepEqual(await snapshot(), antes);
  await db.exec("drop trigger recusar on ai_models");
});
await test("anon e authenticated não executam a função", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(sync([linha("novo")]), /permission denied/);
    } finally {
      await db.exec("reset role");
    }
  }
});
await test("seed com apenas metadados manuais não pode ser apropriado", async () => {
  await db.exec(seed);
  await db.exec(
    "update ai_models set synced_at=null,supports_vision=false where provider='chutes' and model_id='Qwen/Qwen3-32B-TEE'",
  );
  await db.exec(
    "update ai_models set source='manual',metadata='{\"curadoria\":true}' where provider='chutes' and model_id='Qwen/Qwen3-32B-TEE'",
  );
  try {
    await assert.rejects(db.exec(migration), /chutes_seed_modificado/);
  } finally {
    await db.exec(
      "update ai_models set source='chutes',metadata='{}' where provider='chutes' and model_id='Qwen/Qwen3-32B-TEE'",
    );
  }
});
await test("seed manual modificado falha fechado e não é apropriado", async () => {
  await db.exec(
    "update ai_models set source='manual',display_name='Editado' where provider='chutes' and model_id='Qwen/Qwen3-32B-TEE'",
  );
  const antes = await snapshot();
  await assert.rejects(db.exec(migration), /chutes_seed_modificado/);
  assert.deepEqual(await snapshot(), antes);
});
const baseline = readFileSync("supabase/baseline.sql", "utf8");
const inicioSeed = baseline.indexOf("-- Catálogo de conversação Chutes para instalações novas");
const fimSeed = baseline.indexOf(
  "-- manifest: Sincroniza atomicamente o catálogo público Chutes",
  inicioSeed,
);
const seedDoBaseline = baseline.slice(inicioSeed, fimSeed);
await test("upgrade do baseline preserva seed manual modificado e 0692 falha fechado", async () => {
  await db.exec(seed);
  await db.exec(
    "update ai_models set source='manual',display_name='Curadoria manual',input_price_per_million_cents=77.7 where provider='chutes' and model_id='Qwen/Qwen3-32B-TEE'",
  );
  const antes = await snapshot();
  await db.exec(seedDoBaseline);
  assert.deepEqual(await snapshot(), antes);
  await assert.rejects(db.exec(migration), /chutes_seed_modificado/);
  assert.deepEqual(await snapshot(), antes);
});
await test("upgrade do baseline não sobrescreve ai_pricing já existente", async () => {
  await db.exec(
    "update ai_pricing set prompt_cents_per_million_tokens=77.7,notes='curadoria preservada' where model='Qwen/Qwen3-32B-TEE'",
  );
  const antes = (await db.query("select * from ai_pricing order by model")).rows;
  await db.exec(seedDoBaseline);
  assert.deepEqual((await db.query("select * from ai_pricing order by model")).rows, antes);
});
await test("nova instalação pelo seed protegido continua habilitando ownership dos dois seeds", async () => {
  await db.exec("begin; delete from ai_models; delete from ai_pricing;");
  try {
    await db.exec(seedDoBaseline);
    await db.exec(migration);
    assert.deepEqual((await db.query("select source from ai_models order by model_id")).rows, [
      { source: "chutes" },
      { source: "chutes" },
    ]);
  } finally {
    await db.exec("rollback");
  }
});
await db.close();
// O teardown WASM pode redefinir exitCode. Preservar falhas da bancada.
if (falhas > 0) process.exitCode = 1;
