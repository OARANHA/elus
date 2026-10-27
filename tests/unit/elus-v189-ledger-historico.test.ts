import { describe, expect, it } from "vitest";
import {
  conferirLedgerHistorico,
  LEDGER_HISTORICO_V185,
} from "../../scripts/elus-v189-ledger-historico.mjs";

const copia = () => LEDGER_HISTORICO_V185.map((item) => ({ ...item }));

describe("ELUS v1.89 — pré-voo do ledger v1.85 (sem banco)", () => {
  it("aceita apenas as 11 identidades históricas observadas, na ordem", () => {
    expect(LEDGER_HISTORICO_V185).toHaveLength(11);
    expect(conferirLedgerHistorico(copia())).toBe(true);
  });

  it("recusa substituição silenciosa de nome com a mesma versão", () => {
    const rows = copia();
    rows[7].name = "outro_nome_com_mesma_versao";
    expect(() => conferirLedgerHistorico(rows)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });

  it("recusa troca de versão mesmo com nome preservado", () => {
    const rows = copia();
    rows[0].version = "20261018200432";
    expect(() => conferirLedgerHistorico(rows)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });

  it("recusa reordenação, duplicidade, omissão e entrada adicional", () => {
    const invertida = copia();
    [invertida[0], invertida[1]] = [invertida[1], invertida[0]];
    expect(() => conferirLedgerHistorico(invertida)).toThrow("HISTORICAL_LEDGER_MISMATCH");

    const duplicada = copia();
    duplicada[1] = { ...duplicada[0] };
    expect(() => conferirLedgerHistorico(duplicada)).toThrow("HISTORICAL_LEDGER_MISMATCH");

    expect(() => conferirLedgerHistorico(copia().slice(1))).toThrow("HISTORICAL_LEDGER_MISMATCH");
    expect(() => conferirLedgerHistorico([...copia(), { version: "99999999999999", name: "extra" }]))
      .toThrow("HISTORICAL_LEDGER_MISMATCH");
  });

  it("falha fechado com resposta nula ou incompleta", () => {
    expect(() => conferirLedgerHistorico(null)).toThrow("HISTORICAL_LEDGER_MISMATCH");
    expect(() => conferirLedgerHistorico([])).toThrow("HISTORICAL_LEDGER_MISMATCH");
    const rows = copia();
    rows[0] = { version: rows[0].version, name: "" };
    expect(() => conferirLedgerHistorico(rows)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });
});
