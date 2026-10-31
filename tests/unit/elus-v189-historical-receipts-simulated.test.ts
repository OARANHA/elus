import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercita a funcao real com SQL e recibos 100% sinteticos.
// O MD5 historico privado e agregado: md5(md5(statement)), nao md5(statement).
// Nenhum statement de producao e carregado, impresso ou executado.
type Receipt = {
  version: string;
  name: string;
  statement_count: number;
  first_statement_bytes: number;
  md5: string;
};
type Result = {
  historicalReceiptsMatched: number;
  historicalReceiptsExpected: number;
  historicalReceiptsExact: boolean;
};

const md5 = (value: string | Buffer) => createHash("md5").update(value).digest("hex");

function fixture() {
  const history: [string, string][] = Array.from({ length: 11 }, (_, index) => [
    String(20261018000000 + index),
    `synthetic_migration_${index + 1}`,
  ]);
  const privateFingerprints = new Map<string, [number, string]>();
  const elusFingerprints = new Map<string, [number, string]>();
  const rows: Receipt[] = history.map(([version, name], index) => {
    const sql = `SELECT ${index + 1}; -- somente dados sinteticos`;
    const bytes = Buffer.byteLength(sql, "utf8");
    const statementMd5 = md5(sql);
    if (index < 7) {
      privateFingerprints.set(version, [bytes, md5(statementMd5)]);
    } else {
      elusFingerprints.set(version, [bytes, statementMd5]);
    }
    return {
      version,
      name,
      statement_count: 1,
      first_statement_bytes: bytes,
      md5: statementMd5,
    };
  });

  const source = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
  const start = source.indexOf("async function historicalReceiptDiagnostic(c){");
  const end = source.indexOf("// Diagnóstico independente do gate de upgrade:", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const diagnostic = runInNewContext(
    `${source.slice(start, end)}\nhistoricalReceiptDiagnostic`,
    {
      HISTORY: history,
      HISTORICAL_FINGERPRINTS: privateFingerprints,
      ELUS_HISTORICAL_FINGERPRINTS: elusFingerprints,
      digest: (value: Buffer, algorithm: string) =>
        createHash(algorithm).update(value).digest("hex"),
      Buffer,
    },
    { timeout: 1000 },
  ) as (client: {
    query: (sql: string, params: string[][]) => Promise<{ rows: Receipt[] }>;
  }) => Promise<Result>;

  async function evaluate(input: Receipt[]) {
    let queries = 0;
    const result = await diagnostic({
      query: async (sql, params) => {
        queries++;
        expect(sql.trimStart()).toMatch(/^SELECT\b/i);
        expect(sql).toContain("WHERE version = ANY($1::text[])");
        expect(params).toEqual([history.map(([version]) => version)]);
        return { rows: input };
      },
    });
    expect(queries).toBe(1);
    expect(result.historicalReceiptsExpected).toBe(11);
    return result;
  }

  return { rows, evaluate };
}

describe("ELUS v1.89: recibos historicos simulados, somente leitura", () => {
  it("aceita os sete fingerprints agregados e os quatro ELUS sinteticos", async () => {
    const { rows, evaluate } = fixture();
    const result = await evaluate(rows);
    expect(result.historicalReceiptsMatched).toBe(11);
    expect(result.historicalReceiptsExact).toBe(true);
  });

  it("reprova alteracao de hash, bytes, cardinalidade, nome, falta e duplicacao", async () => {
    const { rows, evaluate } = fixture();
    const variants: Receipt[][] = [
      rows.map((row, i) => i === 0 ? { ...row, md5: "0".repeat(32) } : row),
      rows.map((row, i) => i === 7 ? { ...row, md5: "0".repeat(32) } : row),
      rows.map((row, i) => i === 1 ? { ...row, first_statement_bytes: row.first_statement_bytes + 1 } : row),
      rows.map((row, i) => i === 8 ? { ...row, statement_count: 2 } : row),
      rows.map((row, i) => i === 2 ? { ...row, name: "outro_nome" } : row),
      rows.slice(1),
      [...rows, { ...rows[0]! }],
    ];
    for (const variant of variants) {
      const result = await evaluate(variant);
      expect(result.historicalReceiptsExact).toBe(false);
    }
  });
});
