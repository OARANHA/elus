/**
 * Atestação do ledger histórico: somente metadados derivados no PostgreSQL.
 * Nenhum valor de statements/rollback sai do servidor.
 * O fingerprint não é autorização para aplicar migrations.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;
const VERSAO = /^\d{14}$/;

export const LEDGER_METADATA_SQL = `
SELECT
  version,
  name,
  COALESCE(cardinality(statements), -1)::integer AS statements_count,
  CASE WHEN statements IS NULL THEN NULL
    ELSE encode(sha256(convert_to(array_to_json(statements)::text, 'UTF8')), 'hex')
  END AS statements_sha256,
  COALESCE(cardinality(rollback), -1)::integer AS rollback_count,
  CASE WHEN rollback IS NULL THEN NULL
    ELSE encode(sha256(convert_to(array_to_json(rollback)::text, 'UTF8')), 'hex')
  END AS rollback_sha256
FROM supabase_migrations.schema_migrations
ORDER BY version
`;

export function fingerprintLedgerMetadados(rows, expectedVersions) {
  if (!Array.isArray(expectedVersions) || expectedVersions.length !== 11 ||
      new Set(expectedVersions).size !== 11 ||
      expectedVersions.some((v) => typeof v !== "string" || !VERSAO.test(v)) ||
      !Array.isArray(rows) || rows.length !== expectedVersions.length) {
    throw new Error("LEDGER_METADATA_SHAPE_MISMATCH");
  }

  const normalized = rows.map((row, index) => {
    if (!row || row.version !== expectedVersions[index] ||
        typeof row.name !== "string" || !/^[a-z0-9_]+$/.test(row.name)) {
      throw new Error("LEDGER_METADATA_SHAPE_MISMATCH");
    }
    for (const field of ["statements", "rollback"]) {
      const count = row[field + "_count"];
      const digest = row[field + "_sha256"];
      if (!Number.isSafeInteger(count) || count < -1 ||
          (count === -1 ? digest !== null : typeof digest !== "string" || !SHA256.test(digest))) {
        throw new Error("LEDGER_METADATA_SHAPE_MISMATCH");
      }
    }
    return [
      row.version, row.name,
      row.statements_count, row.statements_sha256,
      row.rollback_count, row.rollback_sha256,
    ];
  });

  return createHash("sha256")
    .update("elus-v189-ledger-metadata-v1\n")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

export function conferirFingerprintLedgerMetadados(rows, expectedVersions, approvedSha256) {
  if (typeof approvedSha256 !== "string" || !SHA256.test(approvedSha256)) {
    throw new Error("LEDGER_METADATA_APPROVAL_REQUIRED");
  }
  const observed = fingerprintLedgerMetadados(rows, expectedVersions);
  if (!timingSafeEqual(Buffer.from(observed, "hex"), Buffer.from(approvedSha256, "hex"))) {
    throw new Error("LEDGER_METADATA_MISMATCH");
  }
  return true;
}
