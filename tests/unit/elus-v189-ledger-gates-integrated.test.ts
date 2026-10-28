import { describe, expect, it } from "vitest";
import { LEDGER_HISTORICO_V185, conferirLedgerHistorico } from "../../scripts/elus-v189-ledger-historico.mjs";
import { fingerprintLedgerMetadados } from "../../scripts/elus-v189-ledger-metadata.mjs";

const versions = LEDGER_HISTORICO_V185.map((item) => item.version);
const sample = () => LEDGER_HISTORICO_V185.map(({ version, name }) => ({
  version, name, statements_count: 1, statements_sha256: "a".repeat(64),
  rollback_count: -1, rollback_sha256: null as string | null,
}));

describe("ELUS v1.89 — integração dos gates históricos sem banco", () => {
  it("aceita identidades observadas e gera fingerprint estável", () => {
    const rows = sample();
    expect(conferirLedgerHistorico(rows)).toBe(true);
    expect(fingerprintLedgerMetadados(rows, versions)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("rejeita nome alterado mesmo com versão e metadados válidos", () => {
    const rows = sample();
    rows[7]!.name = "nome_alterado";
    expect(() => conferirLedgerHistorico(rows)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });
  it("rejeita omissão, reordenação e drift de versão", () => {
    const rows = sample();
    expect(() => conferirLedgerHistorico(rows.slice(1))).toThrow("HISTORICAL_LEDGER_MISMATCH");
    expect(() => conferirLedgerHistorico([...rows].reverse())).toThrow("HISTORICAL_LEDGER_MISMATCH");
    rows[0]!.version = "20261018200432";
    expect(() => conferirLedgerHistorico(rows)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });
});
