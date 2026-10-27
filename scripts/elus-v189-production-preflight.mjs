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
const EXTRA = "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql";
const PREFIX = "supabase/migrations/";
const registry = readFileSync("tests/unit/elus-v189-import-ledger-integrity.test.ts","utf8");
const section = registry.split("const IMPORTADAS:",2)[1]?.split("const ELUS_PROPRIAS:",1)[0];
if (!section) throw new Error("MANIFEST_NOT_FOUND");
const files = Array.from(section.matchAll(/"(\d{14}_[^"]+\.sql)":\s*"([a-f0-9]{40})"/g), m => [m[1],m[2]]);
if (files.length !== 38 || new Set(files.map(([n])=>n)).size !== 38) throw new Error("MANIFEST_COUNT_INVALID");
files.push([EXTRA,null]);
files.sort(([a],[b])=>a.localeCompare(b));
const hashes=files.map(([name,expected])=>{
  const contents=readFileSync(resolve(PREFIX,name));
  const blob=createHash("sha1").update("blob "+contents.length+"\0").update(contents).digest("hex");
  if (expected && expected!==blob) throw new Error("MIGRATION_BLOB_MISMATCH");
  return {version:name.slice(0,14),name,sha256:createHash("sha256").update(contents).digest("hex")};
});
if(new Set(hashes.map(x=>x.version)).size!==39)throw new Error("DUPLICATE_MIGRATION_VERSION");
if(process.argv[2]==="manifest"){
  console.log(JSON.stringify({mode:"read-only",count:39,manifest:hashes},null,2));
  process.exit(0);
}
if(process.argv[2]!=="preflight")throw new Error("USAGE_manifest_or_preflight");
if(!process.env.ELUS_V189_PREFLIGHT_READONLY_URL)throw new Error("READONLY_URL_REQUIRED");
if(process.env.ELUS_V189_PREFLIGHT_ACK!=="inspect-only")throw new Error("READONLY_ACK_REQUIRED");
const client=new pg.Client({
 connectionString:process.env.ELUS_V189_PREFLIGHT_READONLY_URL,
 ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.ELUS_V189_PG_CA_FILE || "/root/.postgresql/root.crt","utf8")},
 connectionTimeoutMillis:8000,query_timeout:10000,
});
try{
 await client.connect();
 await client.query("BEGIN READ ONLY");
 const q=await client.query("SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version");
 const versions=q.rows.map(x=>x.version);
 if(JSON.stringify(versions)!==JSON.stringify(EXPECTED))throw new Error("HISTORICAL_LEDGER_MISMATCH");
 const schema=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'");
 if(schema.rows[0].n!==191)throw new Error("SCHEMA_PRECONDITION_CHANGED");
 const newer=await client.query("SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations WHERE version=ANY($1::text[])",[hashes.map(x=>x.version)]);
 if(newer.rows[0].n!==0)throw new Error("MIGRATION_VERSION_COLLISION");
 console.log("PRODUCTION_PREFLIGHT_READONLY_GREEN");
 console.log("HISTORICAL_LEDGER=11");
 console.log("PUBLIC_TABLES=191");
 console.log("MANIFEST=39");
} catch(e){
 console.error("GATE_RED="+(/HISTORICAL_LEDGER_MISMATCH|SCHEMA_PRECONDITION_CHANGED|MIGRATION_VERSION_COLLISION/.test(e.message)?e.message:"PREFLIGHT_FAILED"));
 process.exitCode=1;
} finally{
 await client.query("ROLLBACK").catch(()=>{});
 await client.end().catch(()=>{});
}
