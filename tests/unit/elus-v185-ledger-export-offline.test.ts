import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  LEDGER_V185,
  verificarLedgerV185,
} from "../../scripts/verificar-ledger-v185-offline.mjs";

const expected = [
  {
    version: "100",
    bytes: 3,
    md5: createHash("md5").update("abc").digest("hex"),
  },
  {
    version: "101",
    bytes: 3,
    md5: createHash("md5").update("xyz").digest("hex"),
  },
];
const exportacao = () => ({
  rows: [
    { version: "100", statements: ["abc"] },
    { version: "101", statements: ["xyz"] },
  ],
});

describe("ELUS v1.85 — conferência offline dos lotes históricos", () => {
  it("fixa os sete registros históricos, sem carregar SQL no repositório", () => {
    expect(LEDGER_V185.map((r) => r.version)).toEqual([
      "20261018200431",
      "20261018204508",
      "20261018204837",
      "20261018204851",
      "20261018204924",
      "20261018204939",
      "20261018204955",
    ]);
    expect(LEDGER_V185).toHaveLength(7);
    expect(LEDGER_V185.every((r) => /^[a-f0-9]{32}$/.test(r.md5))).toBe(
      true,
    );
  });

  it("aceita somente ordem, tamanho e fingerprint exatos", () => {
    expect(verificarLedgerV185(exportacao(), expected)).toEqual({
      validado: true,
      registros: 2,
    });
  });

  it("rejeita versões faltantes, extras ou fora de ordem", () => {
    expect(() =>
      verificarLedgerV185({ rows: exportacao().rows.slice(0, 1) }, expected),
    ).toThrow();
    expect(() =>
      verificarLedgerV185(
        { rows: [...exportacao().rows, exportacao().rows[0]] },
        expected,
      ),
    ).toThrow();
    expect(() =>
      verificarLedgerV185({ rows: exportacao().rows.reverse() }, expected),
    ).toThrow();
  });

  it("rejeita múltiplos statements, mudança de bytes e alteração do SQL", () => {
    const varios = exportacao();
    varios.rows[0]!.statements.push("extra");
    expect(() => verificarLedgerV185(varios, expected)).toThrow();
    const alterado = exportacao();
    alterado.rows[0]!.statements[0] = "abd";
    expect(() => verificarLedgerV185(alterado, expected)).toThrow();
    const tamanho = exportacao();
    tamanho.rows[0]!.statements[0] = "abcd";
    expect(() => verificarLedgerV185(tamanho, expected)).toThrow();
  });

  it("não inclui conteúdo de SQL nos erros de validação", () => {
    const entrada = exportacao();
    entrada.rows[0]!.statements[0] = "SEGREDO_NAO_IMPRIMIR";
    expect(() => verificarLedgerV185(entrada, expected)).toThrowError(
      /^Fingerprint histórica divergente na posição 1$/,
    );
  });
});
