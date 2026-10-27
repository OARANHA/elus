#!/usr/bin/env node
/**
 * ELUS v1.89 — atestação read-only de statements/rollback do ledger Supabase.
 * Inspeção gera candidato de fingerprint; verificação exige digest aprovado.
 * Nunca executa SQL de escrita nem imprime conteúdo de migrations.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import {
  LEDGER_METADATA_SQL,
  fingerprintLedgerMetadados,
  conferirFingerprintLedgerMetadados,
} from "./elus-v189-ledger-metadata.mjs";

async function main() {
  const mode = process.argv[2];
  if (!["inspect", "verify"].includes(mode) || process.argv.length !== 3) {
    throw new Error("USAGE_INSPECT_OR_VERIFY");
  }
  if (process.env.ELUS_V189_METADATA_ACK !== "inspect-only" ||
      !process.env.ELUS_V189_METADATA_READONLY_URL ||
      !process.env.ELUS_V189_METADATA_CA_FILE) {
    throw new Error("READONLY_GATE_REQUIRED");
  }
  if (mode === "verify" && !/^[0-9a-f]{64}$/.test(process.env.ELUS_V189_LEDGER_APPROVED_SHA256 || "")) {
    throw new Error("LEDGER_METADATA_APPROVAL_REQUIRED");
  }

  const matrix = JSON.parse(readFileSync("docs/integracao/elus-v189-ledger-replay-matrix.json", "utf8"));
  const expected = matrix.ledger_snapshot?.versions;
  if (matrix.status !== "BLOCKED_FOR_REPLAY" || !Array.isArray(expected) || expected.length !== 11) {
    throw new Error("REPLAY_MATRIX_MISMATCH");
  }
  const ca = readFileSync(process.env.ELUS_V189_METADATA_CA_FILE, "utf8");
  const client = new pg.Client({
    connectionString: process.env.ELUS_V189_METADATA_READONLY_URL,
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const transaction = await client.query("SHOW transaction_read_only");
    if (transaction.rows[0]?.transaction_read_only !== "on") {
      throw new Error("READONLY_TRANSACTION_REQUIRED");
    }
    const columns = await client.query(
      "SELECT column_name,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2",
      ["supabase_migrations", "schema_migrations"],
    );
    const types = new Map(columns.rows.map((c) => [c.column_name, c.udt_name]));
    if (!["text", "varchar"].includes(types.get("version")) ||
        !["text", "varchar"].includes(types.get("name")) ||
        types.get("statements") !== "_text" ||
        types.get("rollback") !== "_text") {
      throw new Error("OFFICIAL_LEDGER_SCHEMA_DRIFT");
    }
    const result = await client.query(LEDGER_METADATA_SQL);
    const observed = fingerprintLedgerMetadados(result.rows, expected);
    if (mode === "verify") {
      conferirFingerprintLedgerMetadados(result.rows, expected, process.env.ELUS_V189_LEDGER_APPROVED_SHA256);
      console.log("LEDGER_METADATA_READONLY_GREEN");
    } else {
      console.log("LEDGER_METADATA_CANDIDATE_SHA256=" + observed);
      console.log("LEDGER_METADATA_STATE=UNAPPROVED");
    }
    console.log("LEDGER_METADATA_ROWS=11");
    console.log("REPLAY_ALLOWED=NO");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  const known = new Set([
    "USAGE_INSPECT_OR_VERIFY", "READONLY_GATE_REQUIRED",
    "LEDGER_METADATA_APPROVAL_REQUIRED", "REPLAY_MATRIX_MISMATCH",
    "READONLY_TRANSACTION_REQUIRED", "OFFICIAL_LEDGER_SCHEMA_DRIFT",
    "LEDGER_METADATA_SHAPE_MISMATCH", "LEDGER_METADATA_MISMATCH",
  ]);
  console.error("GATE_RED=" + (known.has(error?.message) ? error.message : "LEDGER_METADATA_PREFLIGHT_FAILED"));
  process.exitCode = 1;
});
