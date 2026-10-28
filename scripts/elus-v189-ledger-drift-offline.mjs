#!/usr/bin/env node
/**
 * ELUS v1.89 — reconciliação OFFLINE de versões do ledger Supabase.
 * Entrada: JSON sanitizado em stdin ({ versions: string[], publicTables?: number }).
 * Não abre conexões, não lê dados de clientes e nunca autoriza replay.
 * Recibo registrado NÃO é prova de execução de SQL nem de objetos efetivos.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(import.meta.url);
const ROOT = join(dirname(FILE), "..");
const EXTRA_0765 = "20261026010000";
const VERSION = /^\d{14}$/;

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
  if (allExpected.some((v) => typeof v !== "string" || !VERSION.test(v)) ||
      new Set(allExpected).size !== 50 ||
      matrix.ledger_snapshot.cutoff !== historical.at(-1) ||
      destructive.length !== 1 ||
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
      additional0765Present: missingAdditional.length === 0,
      publicTablesReported: snapshot.publicTables ?? null,
    },
    receiptPattern: exactReceiptSet ? "EXPECTED_SET_RECORDED_UNVERIFIED" :
      !importPrefix ? "NONPREFIX_IMPORT_RECEIPTS" : "PARTIAL_OR_UNKNOWN_RECEIPTS",
    differences: {
      historicalMissing: missingHistorical,
      importedMissing: missingImports,
      additionalMissing: missingAdditional,
      unexpected: unknown,
      duplicateVersions: duplicates,
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
    const matrix = JSON.parse(readFileSync(join(ROOT,
      "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8"));
    const snapshot = JSON.parse(readFileSync(0, "utf8"));
    process.stdout.write(JSON.stringify(reconcileLedgerSnapshot(snapshot, matrix), null, 2) + "\n");
  } catch (error) {
    const allowed = ["INSPECT_ONLY", "MATRIX_CONTRACT_DRIFT", "SANITIZED_SNAPSHOT_REQUIRED"];
    const message = error instanceof Error && allowed.includes(error.message)
      ? error.message : "OFFLINE_AUDIT_FAILED";
    process.stderr.write("GATE_RED=" + message + "\n");
    process.exitCode = 1;
  }
}
