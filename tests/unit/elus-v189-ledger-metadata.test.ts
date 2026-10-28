import { describe, expect, it } from "vitest";
import {
  LEDGER_METADATA_SQL,
  fingerprintLedgerMetadados,
  conferirFingerprintLedgerMetadados,
} from "../../scripts/elus-v189-ledger-metadata.mjs";

const versions = [
  "20261018200431", "20261018204508", "20261018204837",
  "20261018204851", "20261018204924", "20261018204939",
  "20261018204955", "20261019204449", "20261021025530",
  "20261021025551", "20261021025613",
];
const rows = () => versions.map((version, i) => ({
  version,
  name: `historico_${i}`,
  statements_count: 1,
  statements_sha256: "a".repeat(64),
  rollback_count: -1,
  rollback_sha256: null as string | null,
}));

describe("ELUS v1.89 — atestação somente de metadados do ledger", () => {
  it("produz fingerprint estável, sem retornar SQL bruto", () => {
    const snapshot = rows();
    const fingerprint = fingerprintLedgerMetadados(snapshot, versions);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintLedgerMetadados(rows(), versions)).toBe(fingerprint);
    expect(conferirFingerprintLedgerMetadados(snapshot, versions, fingerprint)).toBe(true);
    expect(LEDGER_METADATA_SQL).toContain("ORDER BY version");
    expect(LEDGER_METADATA_SQL).toContain("sha256(convert_to(array_to_json(statements)");
    expect(LEDGER_METADATA_SQL).toContain("sha256(convert_to(array_to_json(rollback)");
    expect(LEDGER_METADATA_SQL).not.toMatch(/SELECT\s+\*/i);
    expect(LEDGER_METADATA_SQL).not.toMatch(/AS\s+(statements|rollback)\s*[,\n]/i);
  });

  it("recusa aprovação ausente, inválida ou divergente", () => {
    const snapshot = rows();
    const valid = fingerprintLedgerMetadados(snapshot, versions);
    expect(() => conferirFingerprintLedgerMetadados(snapshot, versions, undefined))
      .toThrow("LEDGER_METADATA_APPROVAL_REQUIRED");
    expect(() => conferirFingerprintLedgerMetadados(snapshot, versions, "a"))
      .toThrow("LEDGER_METADATA_APPROVAL_REQUIRED");
    expect(() => conferirFingerprintLedgerMetadados(snapshot, versions, "0".repeat(64)))
      .toThrow("LEDGER_METADATA_MISMATCH");
    const altered = rows();
    altered[0]!.statements_sha256 = "b".repeat(64);
    expect(() => conferirFingerprintLedgerMetadados(altered, versions, valid))
      .toThrow("LEDGER_METADATA_MISMATCH");
  });

  it("detecta mudança de nome, cardinalidade, nulo e ordem", () => {
    const original = fingerprintLedgerMetadados(rows(), versions);
    const renamed = rows();
    renamed[7]!.name = "outro_nome";
    expect(fingerprintLedgerMetadados(renamed, versions)).not.toBe(original);
    const resized = rows();
    resized[2]!.statements_count = 2;
    expect(fingerprintLedgerMetadados(resized, versions)).not.toBe(original);
    const nulls = rows();
    nulls[3]!.rollback_count = 0;
    nulls[3]!.rollback_sha256 = "c".repeat(64);
    expect(fingerprintLedgerMetadados(nulls, versions)).not.toBe(original);
    const reordered = rows().reverse();
    expect(() => fingerprintLedgerMetadados(reordered, versions))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
  });

  it("falha fechado com resposta incompleta ou metadados inconsistentes", () => {
    expect(() => fingerprintLedgerMetadados(rows().slice(1), versions))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
    const invalid = rows();
    invalid[0]!.statements_sha256 = "not-a-hash";
    expect(() => fingerprintLedgerMetadados(invalid, versions))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
    const mismatch = rows();
    mismatch[1]!.rollback_count = 0;
    expect(() => fingerprintLedgerMetadados(mismatch, versions))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
    const badName = rows();
    badName[0]!.name = "";
    expect(() => fingerprintLedgerMetadados(badName, versions))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
    expect(() => fingerprintLedgerMetadados(rows(), [...versions.slice(0, 10), versions[0]!]))
      .toThrow("LEDGER_METADATA_SHAPE_MISMATCH");
  });
});
