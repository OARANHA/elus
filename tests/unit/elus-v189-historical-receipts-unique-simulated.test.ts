import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercita a funcao real sem banco nem statements privados.
// Os 11 recibos, os hashes e os textos SQL desta fixture sao sinteticos.
type Receipt = {
  version: string;
  name: string;
  statement_count: number;
  first_statement_bytes: number;
  md5: string;
};
type DiagnosticResult = {
  historicalReceiptsMatched: number;
  historicalReceiptsExpected: number;
  historicalReceiptsExact: boolean;
};
type Diagnostic = (client: {
  query: (sql: string, params: string[][]) => Promise<{ rows: Receipt[] }>;
}) => Promise<DiagnosticResult>;

const md5 = (value: string | Buffer) =>
  createHash("md5").update(value).digest("hex");

function fixture() {
  const history: [string, string][] = Array.from({ length: 11 }, (_, i) => [
    String(20261018000000 + i),
    "recibo_sintetico_" + i,
  ]);
  const privateFingerprints = new Map<string, [number, string]>();
  const elusFingerprints = new Map<string, [number, string]>();
  const rows: Receipt[] = history.map(([version, name], index) => {
    const sql = "SELECT " + index + "; -- sintetico";
    const bytes = Buffer.byteLength(sql);
    if (index < 7) {
      // Contrato historico: MD5(MD5(statement)) no ledger original.
      privateFingerprints.set(version, [bytes, md5(md5(sql))]);
    } else {
      // Contrato das quatro migrations ELUS: MD5(statement).
      elusFingerprints.set(version, [bytes, md5(sql)]);
    }
    return { version, name, statement_count: 1, first_statement_bytes: bytes, md5: md5(sql) };
  });

  const source = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
  const start = source.indexOf("async function historicalReceiptDiagnostic(c){");
  const end = source.indexOf("// Diagnóstico independente do gate de upgrade", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const diagnostic = runInNewContext(source.slice(start, end) + "\nhistoricalReceiptDiagnostic", {
    HISTORY: history,
    HISTORICAL_FINGERPRINTS: privateFingerprints,
    ELUS_HISTORICAL_FINGERPRINTS: elusFingerprints,
    Buffer,
    digest: (value: Buffer, algorithm: string) =>
      createHash(algorithm).update(value).digest("hex"),
  }, { timeout: 1000 }) as Diagnostic;

  async function evaluate(input: Receipt[]) {
    let calls = 0;
    const result = await diagnostic({
      query: async (sql, params) => {
        calls++;
        expect(sql.trimStart()).toMatch(/^SELECT\b/i);
        expect(sql).toContain("supabase_migrations.schema_migrations");
        expect(params).toEqual([history.map(([version]) => version)]);
        return { rows: input };
      },
    });
    expect(calls).toBe(1);
    return result;
  }
  return { rows, evaluate };
}

describe("ELUS v1.89: diagnostico historico com versoes unicas", () => {
  it("confere 7 fingerprints privados duplos e 4 ELUS simples", async () => {
    const { rows, evaluate } = fixture();
    expect(await evaluate(rows)).toEqual({
      historicalReceiptsMatched: 11,
      historicalReceiptsExpected: 11,
      historicalReceiptsExact: true,
    });
  });

  it("rejeita hash alterado em lote privado ou migration ELUS", async () => {
    const { rows, evaluate } = fixture();
    for (const index of [2, 9]) {
      const changed = rows.map((row, i) =>
        i === index ? { ...row, md5: "0".repeat(32) } : row);
      const result = await evaluate(changed);
      expect(result.historicalReceiptsMatched).toBe(10);
      expect(result.historicalReceiptsExact).toBe(false);
    }
  });

  it("nao confunde duplicata de um recibo com a versao historica ausente", async () => {
    const { rows, evaluate } = fixture();
    const duplicated = [...rows.slice(0, 10), { ...rows[0]! }];
    const result = await evaluate(duplicated);
    expect(result.historicalReceiptsMatched).toBe(10);
    expect(result.historicalReceiptsExpected).toBe(11);
    expect(result.historicalReceiptsExact).toBe(false);
  });

  it("rejeita recibos incompletos, nomes alterados e cardinalidade divergente", async () => {
    const { rows, evaluate } = fixture();
    const cases = [
      rows.slice(0, 10),
      rows.map((row, i) => i === 5 ? { ...row, name: "outro_nome" } : row),
      rows.map((row, i) => i === 8 ? { ...row, statement_count: 2 } : row),
      rows.map((row, i) => i === 1 ? { ...row, first_statement_bytes: row.first_statement_bytes + 1 } : row),
    ];
    for (const candidate of cases) {
      expect((await evaluate(candidate)).historicalReceiptsExact).toBe(false);
    }
  });
});
