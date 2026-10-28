#!/usr/bin/env node
/**
 * ELUS v1.89 — reconciliação OFFLINE de versões do ledger Supabase.
 * Entrada: JSON sanitizado em stdin ({ versions: string[], publicTables?: number }).
 * Não abre conexões, não lê dados de clientes e nunca autoriza replay.
 * Recibo registrado NÃO é prova de execução de SQL nem de objetos efetivos.
 */
import { createHash } from "node:crypto";
import { readFileSync, readSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(import.meta.url);
const ROOT = join(dirname(FILE), "..");
const EXTRA_0765 = "20261026010000";
const VERSION = /^\d{14}$/;
const MAX_SNAPSHOT_BYTES = 64 * 1024;
// Âncora de revisão: impede alterar matriz e hashes SQL juntos sem revisão do código.
const REQUIRED_MATRIX_SOURCE_BLOB_SHA1 = "afecc6eb2364e0c41a4f38e607692558a83390b3";
const REQUIRED_DEPENDENCY_EDGES = [
  "0716->0717", "0717->0753", "0687->0753", "0763->0706",
  "0684->0760", "0747->0757", "0755->0759",
];

// Colisões e migrations próprias não podem ser reclassificadas por uma matriz editada.
const REQUIRED_COLLISION_RENAMES = {
  "supabase/migrations/20261020000006_0689_aviso_da_central_com_destinatario.sql":
    "supabase/migrations/20261020000006_0762_aviso_da_central_com_destinatario.sql",
  "supabase/migrations/20261020120000_0691_banco_externo_db_type_e_aviso.sql":
    "supabase/migrations/20261020120002_0763_banco_externo_db_type_e_aviso.sql",
  "supabase/migrations/20261020130000_0692_rodizio_na_acao_atribuir.sql":
    "supabase/migrations/20261020130000_0764_rodizio_na_acao_atribuir.sql",
};
const REQUIRED_PROTECTED_ELUS_MIGRATIONS = {
  "20261019120000_0689_integracoes_erp_vendaerp.sql": "e46f99c1cbbda48b952ac9fa9273f5a181c03bbd",
  "20261020120000_0690_org_ai_autonomy_protected.sql": "4ad880adf0a8e294e20a1b50dae1fb9dbed1db65",
  "20261020120001_0691_chutes_chat_catalog.sql": "f9a74e1505c550196643bacae86ff016dbafca2b",
  "20261020230000_0692_chutes_catalog_sync.sql": "20a38af9bd51e7f3d37d9601d9392613a2700f68",
};

// Limite antes do JSON.parse: o teto de 500 versões sozinho não limita stdin.
function readSanitizedSnapshot() {
  const chunks = [];
  const buffer = Buffer.allocUnsafe(4096);
  let totalBytes = 0;
  while (true) {
    const count = readSync(0, buffer, 0, buffer.length, null);
    if (count === 0) break;
    totalBytes += count;
    if (totalBytes > MAX_SNAPSHOT_BYTES) throw new Error("SNAPSHOT_TOO_LARGE");
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Exige a matriz aprovada byte a byte; não atesta aplicação ou origem upstream. */
export function verifyMatrixSourceBlob(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error("MATRIX_SOURCE_BLOB_DRIFT");
  const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  if (actual !== REQUIRED_MATRIX_SOURCE_BLOB_SHA1) throw new Error("MATRIX_SOURCE_BLOB_DRIFT");
}

// Compara o conteúdo físico dos quatro SQLs próprios com o hash Git blob fixado.
// A matriz isolada não basta: seus hashes poderiam permanecer intactos enquanto
// os arquivos de migrations fossem alterados.
export function verifyProtectedElusMigrationBlobs(matrix, readMigration = (file) =>
  readFileSync(join(ROOT, "supabase/migrations", file))) {
  const protectedFiles = matrix?.protected_elus_migrations;
  if (!Array.isArray(protectedFiles) || protectedFiles.length !== 4 ||
      new Set(protectedFiles.map((m) => m.file)).size !== 4) {
    throw new Error("PROTECTED_ELUS_BLOB_DRIFT");
  }
  for (const { file, git_blob_sha1: expected } of protectedFiles) {
    if (!Object.hasOwn(REQUIRED_PROTECTED_ELUS_MIGRATIONS, file) ||
        REQUIRED_PROTECTED_ELUS_MIGRATIONS[file] !== expected) {
      throw new Error("PROTECTED_ELUS_BLOB_DRIFT");
    }
    let content;
    try {
      content = readMigration(file);
    } catch {
      throw new Error("PROTECTED_ELUS_BLOB_DRIFT");
    }
    if (!Buffer.isBuffer(content)) throw new Error("PROTECTED_ELUS_BLOB_DRIFT");
    const actual = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
    if (actual !== expected) throw new Error("PROTECTED_ELUS_BLOB_DRIFT");
  }
}


/**
 * Verifica os 38 SQLs importados contra os hashes Git blob registrados na matriz.
 * A matriz é a referência desta verificação; isto NÃO atesta a origem oficial,
 * execução de DDL, objetos produtivos nem autoriza replay.
 */
export function verifyImportedMigrationBlobs(matrix, readMigration = (file) =>
  readFileSync(join(ROOT, "supabase/migrations", file))) {
  const imported = matrix?.migrations;
  if (!Array.isArray(imported) || imported.length !== 38 ||
      new Set(imported.map((m) => m.file)).size !== 38) {
    throw new Error("IMPORTED_SQL_BLOB_DRIFT");
  }
  for (const { file, git_blob_sha1: expected } of imported) {
    // Restringe a leitura ao diretório local de migrations, sem traversal.
    if (typeof file !== "string" || !/^\d{14}_[a-z0-9_]+\.sql$/.test(file) ||
        typeof expected !== "string" || !/^[0-9a-f]{40}$/.test(expected)) {
      throw new Error("IMPORTED_SQL_BLOB_DRIFT");
    }
    let content;
    try {
      content = readMigration(file);
    } catch {
      throw new Error("IMPORTED_SQL_BLOB_DRIFT");
    }
    if (!Buffer.isBuffer(content)) throw new Error("IMPORTED_SQL_BLOB_DRIFT");
    const actual = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
    if (actual !== expected) throw new Error("IMPORTED_SQL_BLOB_DRIFT");
  }
}

export function reconcileLedgerSnapshot(snapshot, matrix) {
  if (matrix?.status !== "BLOCKED_FOR_REPLAY" ||
      matrix?.migrations?.length !== 38 ||
      matrix?.ledger_snapshot?.versions?.length !== 11) {
    throw new Error("MATRIX_CONTRACT_DRIFT");
  }
  const historical = matrix.ledger_snapshot.versions;
  const imported = matrix.migrations.map((m) => m.version);
  const destructive = matrix.migrations.filter((m) => m.logical_number === "0759");
  const allExpected = [...historical, ...imported, EXTRA_0765];
  const byLogical = new Map(matrix.migrations.map((m) => [m.logical_number, m]));
  const preCutoff = matrix.migrations.filter((m) => m.version <= matrix.ledger_snapshot.cutoff);
  const postCutoff = matrix.migrations.filter((m) => m.version > matrix.ledger_snapshot.cutoff);
  const dependencies = matrix.known_dependency_edges;
  if (allExpected.some((v) => typeof v !== "string" || !VERSION.test(v)) ||
      new Set(allExpected).size !== 50 ||
      matrix.ledger_snapshot.cutoff !== historical.at(-1) ||
      destructive.length !== 1 ||
      byLogical.size !== 38 || preCutoff.length !== 11 || postCutoff.length !== 27 ||
      matrix.migrations.some((m) => m.cutoff_group !== (m.version <= matrix.ledger_snapshot.cutoff
        ? "AT_OR_BEFORE_LEDGER_CUTOFF" : "AFTER_LEDGER_CUTOFF")) ||
      !Array.isArray(dependencies) || dependencies.length !== REQUIRED_DEPENDENCY_EDGES.length ||
      new Set(dependencies.map((e) => `${e.before}->${e.after}`)).size !== REQUIRED_DEPENDENCY_EDGES.length ||
      !matrix.collision_renames ||
      typeof matrix.collision_renames !== "object" ||
      Array.isArray(matrix.collision_renames) ||
      Object.keys(matrix.collision_renames).length !== 3 ||
      Object.entries(REQUIRED_COLLISION_RENAMES).some(([from, to]) =>
        matrix.collision_renames[from] !== to ||
        !matrix.migrations.some((m) => `supabase/migrations/${m.file}` === to)) ||
      !Array.isArray(matrix.protected_elus_migrations) ||
      matrix.protected_elus_migrations.length !== 4 ||
      new Set(matrix.protected_elus_migrations.map((m) => m.file)).size !== 4 ||
      matrix.protected_elus_migrations.some((m) =>
        REQUIRED_PROTECTED_ELUS_MIGRATIONS[m.file] !== m.git_blob_sha1) ||
      REQUIRED_DEPENDENCY_EDGES.some((edge) =>
        !dependencies.some((e) => `${e.before}->${e.after}` === edge)) ||
      dependencies.some((e) => !byLogical.has(e.before) || !byLogical.has(e.after) ||
        byLogical.get(e.before).version >= byLogical.get(e.after).version) ||
      !destructive[0].risk_flags?.includes("destructive_delete") ||
      matrix.migrations.some((m) => m.version !== m.file?.slice(0, 14) ||
        m.review_state !== "REQUIRES_MANUAL_REVIEW")) {
    throw new Error("MATRIX_CONTRACT_DRIFT");
  }
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
      Object.keys(snapshot).some((key) => !["versions", "publicTables"].includes(key)) ||
      !Array.isArray(snapshot.versions) || snapshot.versions.length > 500 ||
      snapshot.versions.some((v) => typeof v !== "string" || !VERSION.test(v)) ||
      (snapshot.publicTables !== undefined &&
        (!Number.isSafeInteger(snapshot.publicTables) || snapshot.publicTables < 0))) {
    throw new Error("SANITIZED_SNAPSHOT_REQUIRED");
  }

  const observed = new Set(snapshot.versions);
  const duplicates = [...new Set(snapshot.versions.filter((v, i) => snapshot.versions.indexOf(v) !== i))].sort();
  const expected = new Set(allExpected);
  const missing = (versions) => versions.filter((v) => !observed.has(v)).sort();
  const unknown = [...observed].filter((v) => !expected.has(v)).sort();
  const knownImports = imported.filter((v) => observed.has(v)).sort();
  const sortedImports = [...imported].sort();
  const importPrefix = knownImports.every((v, i) => v === sortedImports[i]);
  const dependencyReceiptGaps = dependencies
    .filter(({ before, after }) => observed.has(byLogical.get(after).version) &&
      !observed.has(byLogical.get(before).version))
    .map(({ before, after }) => ({ before, after }));
  const missingHistorical = missing(historical);
  const missingImports = missing(imported);
  const missingAdditional = missing([EXTRA_0765]);
  const exactReceiptSet = missingHistorical.length === 0 && missingImports.length === 0 &&
    missingAdditional.length === 0 && unknown.length === 0 && duplicates.length === 0;

  return {
    mode: "offline-ledger-drift-review",
    decision: "NO_GO",
    evidenceLevel: "VERSION_RECEIPTS_ONLY",
    counts: {
      expected: 50,
      observedRows: snapshot.versions.length,
      observedUnique: observed.size,
      historicalPresent: historical.length - missingHistorical.length,
      importedPresent: imported.length - missingImports.length,
      preCutoffImportsPresent: preCutoff.filter((m) => observed.has(m.version)).length,
      postCutoffImportsPresent: postCutoff.filter((m) => observed.has(m.version)).length,
      additional0765Present: missingAdditional.length === 0,
      publicTablesReported: snapshot.publicTables ?? null,
    },
    receiptPattern: exactReceiptSet ? "EXPECTED_SET_RECORDED_UNVERIFIED" :
      dependencyReceiptGaps.length > 0 ? "DEPENDENCY_RECEIPT_GAPS" :
        !importPrefix ? "NONPREFIX_IMPORT_RECEIPTS" : "PARTIAL_OR_UNKNOWN_RECEIPTS",
    differences: {
      historicalMissing: missingHistorical,
      importedMissing: missingImports,
      additionalMissing: missingAdditional,
      unexpected: unknown,
      duplicateVersions: duplicates,
      dependencyReceiptGaps,
    },
    signals: {
      receipt0759Recorded: observed.has(destructive[0].version),
      receipt0765Recorded: observed.has(EXTRA_0765),
      sqlExecutionProven: false,
      schemaObjectsProven: false,
      aclRlsProven: false,
      backupRestoreProven: false,
      destructive0759Approved: false,
    },
    remainingGates: [
      "READONLY_SCHEMA_AND_0765_FUNCTION_ATTESTATION",
      "ACL_RLS_AND_ROLE_REVIEW",
      "ISOLATED_PG15_PG17_REPLAY_AND_RESTORE",
      "0759_EXPLICIT_IMPACT_AND_ROLLBACK_APPROVAL",
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === FILE) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== "inspect") {
      throw new Error("INSPECT_ONLY");
    }
    const matrixBytes = readFileSync(join(ROOT,
      "docs/integracao/elus-v189-ledger-replay-matrix.json"));
    verifyMatrixSourceBlob(matrixBytes);
    const matrix = JSON.parse(matrixBytes.toString("utf8"));
    const snapshot = readSanitizedSnapshot();
    const result = reconcileLedgerSnapshot(snapshot, matrix);
    verifyProtectedElusMigrationBlobs(matrix);
    verifyImportedMigrationBlobs(matrix);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    const allowed = ["INSPECT_ONLY", "MATRIX_CONTRACT_DRIFT", "MATRIX_SOURCE_BLOB_DRIFT", "PROTECTED_ELUS_BLOB_DRIFT",
      "IMPORTED_SQL_BLOB_DRIFT",
      "SANITIZED_SNAPSHOT_REQUIRED", "SNAPSHOT_TOO_LARGE"];
    const message = error instanceof Error && allowed.includes(error.message)
      ? error.message : "OFFLINE_AUDIT_FAILED";
    process.stderr.write("GATE_RED=" + message + "\n");
    process.exitCode = 1;
  }
}
