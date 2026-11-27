#!/usr/bin/env node
/**
 * ELUS v1.89 production gate — READ ONLY.
 * This is NOT the migration executor. It deliberately has no mutation mode.
 * Run only after privileged approval using a strictly read-only database role.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";

const EXPECTED = [
  "20261018200431","20261018204508","20261018204837",
  "20261018204851","20261018204924","20261018204939",
  "20261018204955","20261019204449","20261021025530",
  "20261021025551","20261021025613",
];
const EXPECTED_NAMES = [
  "elus_v185_preparar_extensoes_92d37f6",
  "elus_v185_baseline_92d37f6_p01_of_06",
  "elus_v185_baseline_92d37f6_p02_of_06",
  "elus_v185_baseline_92d37f6_p03_of_06",
  "elus_v185_baseline_92d37f6_p04_of_06",
  "elus_v185_baseline_92d37f6_p05_of_06",
  "elus_v185_baseline_92d37f6_p06_of_06",
  "integracoes_erp_vendaerp_0689",
  "elus_0690_org_ai_autonomy_protected",
  "elus_0691_chutes_chat_catalog",
  "elus_0692_chutes_catalog_sync",
];
const EXTRA = "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql";
const matrix = JSON.parse(readFileSync("docs/integracao/elus-v189-ledger-replay-matrix.json", "utf8"));
if(matrix.status !== "BLOCKED_FOR_REPLAY" || matrix.migrations?.length !== 38 ||
   matrix.ledger_snapshot?.versions?.join("|") !== EXPECTED.join("|"))
  throw new Error("REPLAY_MATRIX_MISMATCH");
// Counts alone are insufficient: swapping cutoff groups can preserve 11/27 while
// changing which migrations require pre-cutoff reconciliation.
const cutoff = EXPECTED.at(-1);
if (matrix.ledger_snapshot?.cutoff !== cutoff ||
    matrix.migrations.some(m =>
      !/^\d{14}_[^/]+\.sql$/.test(m.file) ||
      m.version !== m.file.slice(0, 14) ||
      m.cutoff_group !== (m.version <= cutoff
        ? "AT_OR_BEFORE_LEDGER_CUTOFF" : "AFTER_LEDGER_CUTOFF")))
  throw new Error("REPLAY_CUTOFF_DRIFT");
const atOrBefore = matrix.migrations.filter(m => m.cutoff_group === "AT_OR_BEFORE_LEDGER_CUTOFF");
const after = matrix.migrations.filter(m => m.cutoff_group === "AFTER_LEDGER_CUTOFF");
if(atOrBefore.length !== 11 || after.length !== 27 ||
   matrix.migrations.some(m => m.review_state !== "REQUIRES_MANUAL_REVIEW"))
  throw new Error("REPLAY_REVIEW_REQUIRED");
const PREFIX = "supabase/migrations/";
const registry = readFileSync("tests/unit/elus-v189-import-ledger-integrity.test.ts","utf8");
const section = registry.split("const IMPORTADAS:",2)[1]?.split("const ELUS_PROPRIAS:",1)[0];
if (!section) throw new Error("MANIFEST_NOT_FOUND");
const files = Array.from(section.matchAll(/"(\d{14}_[^"]+\.sql)":\s*"([a-f0-9]{40})"/g), m => [m[1],m[2]]);
if (files.length !== 38 || new Set(files.map(([n])=>n)).size !== 38) throw new Error("MANIFEST_COUNT_INVALID");
files.push([EXTRA,"a05333f5b12b78c334181887f089b39398d9aa50"]);
files.sort(([a],[b])=>a.localeCompare(b));
const hashes=files.map(([name,expected])=>{
  const contents=readFileSync(resolve(PREFIX,name));
  const blob=createHash("sha1").update("blob "+contents.length+"\0").update(contents).digest("hex");
  if (expected!==blob) throw new Error("MIGRATION_BLOB_MISMATCH");
  return {version:name.slice(0,14),name,sha256:createHash("sha256").update(contents).digest("hex")};
});
if(new Set(hashes.map(x=>x.version)).size!==39)throw new Error("DUPLICATE_MIGRATION_VERSION");
const mapped = new Map(matrix.migrations.map(m => [m.file, m.git_blob_sha1]));
if (mapped.size !== 38 || files.slice(0, -1).some(([name,blob]) => mapped.get(name)!==blob))
  throw new Error("REPLAY_MATRIX_BLOB_MISMATCH");
const reconciliation = { historicalEntries: EXPECTED.length, beforeOrAtCutoff: 11,
  afterCutoff: 27, additional: 1, replayAllowed: false };
if(process.argv[2]==="manifest"){
  console.log(JSON.stringify({mode:"read-only",count:39,reconciliation,manifest:hashes},null,2));
  process.exit(0);
}
if(process.argv[2]!=="preflight")throw new Error("USAGE_manifest_or_preflight");
if(!process.env.ELUS_V189_PREFLIGHT_READONLY_URL)throw new Error("READONLY_URL_REQUIRED");
if(!process.env.ELUS_V189_PG_CA_FILE)throw new Error("EXPLICIT_CA_REQUIRED");
if(process.env.ELUS_V189_PREFLIGHT_ACK!=="inspect-only")throw new Error("READONLY_ACK_REQUIRED");
const client=new pg.Client({
 connectionString:process.env.ELUS_V189_PREFLIGHT_READONLY_URL,
 ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.ELUS_V189_PG_CA_FILE,"utf8")},
 connectionTimeoutMillis:8000,query_timeout:10000,
});
try{
 await client.connect();
 await client.query("BEGIN READ ONLY");
 // Transaction READ ONLY is not a substitute for an actually restricted login.
 // Reject elevated roles and any effective DDL/DML privileges before inspecting data.
 const roleCheck=await client.query(`
   SELECT current_setting('transaction_read_only') = 'on' AS read_only,
     (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls) AS elevated,
     pg_has_role(current_user,'pg_write_all_data','MEMBER') AS write_member,
     has_database_privilege(current_user,current_database(),'CREATE') AS db_create,
     EXISTS (
       SELECT 1 FROM pg_namespace n
       WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
         AND has_schema_privilege(current_user,n.oid,'CREATE')
     ) AS schema_create,
     EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
         AND c.relkind IN ('r','p','v','m','f')
         AND (has_table_privilege(current_user,c.oid,'INSERT')
           OR has_table_privilege(current_user,c.oid,'UPDATE')
           OR has_table_privilege(current_user,c.oid,'DELETE')
           OR has_table_privilege(current_user,c.oid,'TRUNCATE'))
     ) AS table_write
   FROM pg_roles r WHERE r.rolname=current_user
 `);
 const role=roleCheck.rows[0];
 if(roleCheck.rows.length!==1 || !role.read_only || role.elevated ||
    role.write_member || role.db_create || role.schema_create || role.table_write)
   throw new Error("READONLY_ROLE_REQUIRED");
 const q=await client.query("SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version");
 const cols=await client.query("SELECT column_name,data_type,udt_name,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position",["supabase_migrations","schema_migrations"]);
 // The official Supabase ledger stores SQL and rollback as text[].
 // Column presence alone is insufficient: a changed type invalidates replay assumptions.
 const requiredTypes = [
   ["version", ["text", "varchar"], null],
   ["name", ["text", "varchar"], null],
   ["statements", ["_text"], "ARRAY"],
   ["rollback", ["_text"], "ARRAY"],
 ];
 for (const [field, acceptedUdt, requiredDataType] of requiredTypes) {
   const matches = cols.rows.filter(c => c.column_name === field);
   if (matches.length !== 1 ||
       !acceptedUdt.includes(matches[0].udt_name) ||
       (requiredDataType !== null && matches[0].data_type !== requiredDataType))
     throw new Error("OFFICIAL_LEDGER_SCHEMA_DRIFT");
 }
 const ledgerShape = cols.rows.map(c=>({name:c.column_name,dataType:c.data_type,udtName:c.udt_name,nullable:c.is_nullable}));
 // Ledger registration is not proof that its DDL is currently effective.
 // On the observed 50-row ledger the ELUS 0765 version is registered, but
 // the rotation function is absent from pg_proc. Check catalog metadata only:
 // never read recovery hashes or attempt to replay the migration here.
 const rotacaoRegistrada = q.rows.some(row => row.version === "20261026010000");
 if (rotacaoRegistrada) {
   // Existence alone is insufficient: the 0765 function is SECURITY DEFINER
   // and must never be executable by browser roles. Inspect catalog only.
   const provaRotacao = await client.query(`
     SELECT p.oid IS NOT NULL AS existe,
       COALESCE(p.prosecdef, false) AS security_definer,
       COALESCE('search_path=' = ANY(p.proconfig), false) AS search_path_fechado,
       CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
       CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute,
       CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_execute
     FROM (SELECT to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])') AS oid) alvo
     LEFT JOIN pg_catalog.pg_proc p ON p.oid = alvo.oid
   `);
   const funcao = provaRotacao.rows[0];
   if (provaRotacao.rows.length !== 1 || funcao?.existe !== true)
     throw new Error("LEDGER_0765_FUNCTION_ABSENT");
   if (!funcao.security_definer || !funcao.search_path_fechado ||
       funcao.anon_execute || funcao.authenticated_execute || !funcao.service_execute)
     throw new Error("LEDGER_0765_FUNCTION_UNSAFE");
 }
 const versions=q.rows.map(x=>x.version);
 if(JSON.stringify(versions)!==JSON.stringify(EXPECTED))throw new Error("HISTORICAL_LEDGER_MISMATCH");
 if(q.rows.some((row,i)=>row.name!==EXPECTED_NAMES[i]))throw new Error("HISTORICAL_LEDGER_NAME_MISMATCH");
 const schema=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'");
 if(schema.rows[0].n!==191)throw new Error("SCHEMA_PRECONDITION_CHANGED");
 const newer=await client.query("SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations WHERE version=ANY($1::text[])",[hashes.map(x=>x.version)]);
 if(newer.rows[0].n!==0)throw new Error("MIGRATION_VERSION_COLLISION");
 console.log("PRODUCTION_PREFLIGHT_READONLY_GREEN");
 console.log("HISTORICAL_LEDGER=11");
 console.log("PUBLIC_TABLES=191");
 console.log("MANIFEST=39");
 console.log("REPLAY_ALLOWED=NO");
 console.log("PRE_CUTOFF_IMPORTS_REQUIRE_REVIEW=11");
 console.log("OFFICIAL_LEDGER_SCHEMA="+JSON.stringify(ledgerShape));
} catch(e){
 console.error("GATE_RED="+(/HISTORICAL_LEDGER_MISMATCH|HISTORICAL_LEDGER_NAME_MISMATCH|SCHEMA_PRECONDITION_CHANGED|MIGRATION_VERSION_COLLISION|OFFICIAL_LEDGER_SCHEMA_DRIFT|LEDGER_0765_FUNCTION_ABSENT|LEDGER_0765_FUNCTION_UNSAFE|READONLY_ROLE_REQUIRED/.test(e.message)?e.message:"PREFLIGHT_FAILED"));
 process.exitCode=1;
} finally{
 await client.query("ROLLBACK").catch(()=>{});
 await client.end().catch(()=>{});
}
