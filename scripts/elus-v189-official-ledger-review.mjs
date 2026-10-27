#!/usr/bin/env node
/**
 * ELUS v1.89 — montagem OFFLINE de unidades transacionais para revisão.
 * NÃO conecta ao banco; NÃO executa SQL; NÃO emite plano executável automaticamente.
 * As operações seguem bloqueadas pela matriz BLOCKED_FOR_REPLAY.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();
const matrix = JSON.parse(readFileSync(join(root,"docs/integracao/elus-v189-ledger-replay-matrix.json"),"utf8"));
const pin = readFileSync(join(root,"tests/unit/elus-v189-import-ledger-integrity.test.ts"),"utf8");
const imported = pin.split("const IMPORTADAS:",2)[1]?.split("const ELUS_PROPRIAS:",1)[0];
const match = [...(imported??"").matchAll(/"(\d{14}_[^"]+\.sql)":\s*"([a-f0-9]{40})"/g)];
const extra="20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql";
const expected=new Map(match.map(m=>[m[1],m[2]]));
expected.set(extra,"a05333f5b12b78c334181887f089b39398d9aa50");
if(matrix.status!=="BLOCKED_FOR_REPLAY" || matrix.migrations?.length!==38 || match.length!==38)
  throw new Error("GATE_RED=MATRIX_NOT_APPROVED");
const named = new Set(matrix.migrations.map(x=>x.file));
if(named.size!==38 || [...named].some(name=>expected.get(name)===undefined))
  throw new Error("GATE_RED=MATRIX_MANIFEST_DRIFT");

// Independently reconcile the official-ledger snapshot and every row of the
// review matrix before emitting any per-migration cutoff classification.
const HISTORICAL_VERSIONS = [
  "20261018200431","20261018204508","20261018204837",
  "20261018204851","20261018204924","20261018204939",
  "20261018204955","20261019204449","20261021025530",
  "20261021025551","20261021025613",
];
const cutoff = HISTORICAL_VERSIONS.at(-1);
if(matrix.ledger_snapshot?.cutoff!==cutoff ||
   JSON.stringify(matrix.ledger_snapshot?.versions)!==JSON.stringify(HISTORICAL_VERSIONS))
  throw new Error("GATE_RED=HISTORICAL_LEDGER_SNAPSHOT_DRIFT");
const before = matrix.migrations.filter(m=>m.cutoff_group==="AT_OR_BEFORE_LEDGER_CUTOFF");
const after = matrix.migrations.filter(m=>m.cutoff_group==="AFTER_LEDGER_CUTOFF");
if(before.length!==11 || after.length!==27 || matrix.migrations.some(m=>
  m.version!==m.file.slice(0,14) ||
  m.git_blob_sha1!==expected.get(m.file) ||
  m.cutoff_group!==(m.version<=cutoff
    ? "AT_OR_BEFORE_LEDGER_CUTOFF" : "AFTER_LEDGER_CUTOFF") ||
  m.review_state!=="REQUIRES_MANUAL_REVIEW"))
  throw new Error("GATE_RED=MATRIX_RECONCILIATION_DRIFT");
const units=[...expected].sort(([a],[b])=>a.localeCompare(b)).map(([name,blob])=>{
  const bytes=readFileSync(join(root,"supabase/migrations",name));
  const gitBlob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
  if(gitBlob!==blob)throw new Error("GATE_RED=BLOB_MISMATCH");
  const text=bytes.toString("utf8");
  // Conservative lexical screen; actual parse and DBA review still required.
  const forbidden = /^\s*(?:BEGIN\s*;|COMMIT\s*;|ROLLBACK\s*;|START\s+TRANSACTION\b|VACUUM\b|CREATE\s+DATABASE\b|ALTER\s+SYSTEM\b)/im.test(text);
  return {name,version:name.slice(0,14),sha256:createHash("sha256").update(bytes).digest("hex"),
    cutoffGroup:name===extra?"ADDITIONAL":matrix.migrations.find(m=>m.file===name)?.cutoff_group,
    sqlTransactionReview:forbidden?"BLOCKED_NONTRANSACTIONAL":"PENDING_MANUAL_SQL_REVIEW",
    ledgerRegistration:"BLOCKED_OFFICIAL_LEDGER_CONTRACT_UNVERIFIED"};
});
if(units.length!==39 || new Set(units.map(x=>x.version)).size!==39)
  throw new Error("GATE_RED=VERSION_COLLISION");
if(process.argv.length!==3 || process.argv[2]!=="inspect")
  throw new Error("GATE_RED=INSPECT_ONLY");
process.stdout.write(JSON.stringify({mode:"offline-inspection-only",status:"NO_GO",
  count:units.length, historicalLedgerEntries:11, executeAllowed:false,
  reasons:["MATRIX_BLOCKED_FOR_REPLAY","OFFICIAL_LEDGER_CONTRACT_UNVERIFIED",
    "PRE_CUTOFF_IMPORTS_NEED_INDIVIDUAL_REVIEW","MFA_0759_REQUIRES_APPROVAL"],
  units},null,2)+"\n");
