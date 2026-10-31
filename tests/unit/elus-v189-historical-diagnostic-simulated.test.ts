import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Testa a FUNÇÃO real de diagnose, não uma reimplementação do algoritmo.
// Os SQLs históricos privados nunca são carregados ou impressos neste teste.
type Receipt = {
  version: string;
  name: string;
  statement_count: number;
  first_statement_bytes: number;
  md5: string;
};
type Diagnostic = {
  historicalReceiptsMatched: number;
  historicalReceiptsExpected: number;
  historicalReceiptsExact: boolean;
};
type HistoricalContext = {
  HISTORY: [string, string][];
  HISTORICAL_FINGERPRINTS: Map<string, [number, string]>;
  ELUS_HISTORICAL_FINGERPRINTS: Map<string, [number, string]>;
  historicalReceiptDiagnostic: (client: {
    query: (sql: string, args: unknown[]) => Promise<{ rows: Receipt[] }>;
  }) => Promise<Diagnostic>;
};

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  expect(from, "Bloco esperado ausente do executor").toBeGreaterThanOrEqual(0);
  const to = source.indexOf(end, from + start.length);
  expect(to, "Delimitador do bloco esperado ausente").toBeGreaterThan(from);
  return source.slice(from, to);
}

function loadHistoricalDiagnostic(): HistoricalContext {
  const source = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
  const history = section(source, "const HISTORY=[", "const EXTRA=");
  const privateFingerprints = section(
    source,
    "const HISTORICAL_FINGERPRINTS=new Map([",
    "const ELUS_HISTORICAL_FINGERPRINTS=",
  );
  const ownFingerprints = section(
    source,
    "const ELUS_HISTORICAL_FINGERPRINTS=new Map([",
    "const digest=",
  );
  const helper = section(
    source,
    "async function historicalReceiptDiagnostic(c){",
    "// Diagnóstico independente do gate de upgrade:",
  );
  // A identidade dos fingerprints privados já é fixada em outro teste.
  // Aqui só simulamos o retorno do digest para testar o fluxo de decisão.
  const fakeDigest = `
    const digest = (bytes, algorithm) => {
      if (algorithm !== 'md5') throw Error('UNEXPECTED_DIGEST');
      const token = bytes.toString('ascii');
      if (!token.startsWith('fixture-md5:')) return 'INVALID_FIXTURE';
      return HISTORICAL_FINGERPRINTS.get(token.slice('fixture-md5:'.length))?.[1] ?? 'INVALID_FIXTURE';
    };
  `;
  return runInNewContext(
    [
      history,
      privateFingerprints,
      ownFingerprints,
      fakeDigest,
      helper,
      "({HISTORY,HISTORICAL_FINGERPRINTS,ELUS_HISTORICAL_FINGERPRINTS,historicalReceiptDiagnostic})",
    ].join("\n"),
    { Buffer },
    { timeout: 1000 },
  ) as HistoricalContext;
}

describe("ELUS v1.89: diagnóstico histórico com recibos simulados", () => {
  it("distingue 11/11 íntegros de ausência, duplicação e deriva de bytes/nome/hash", async () => {
    const context = loadHistoricalDiagnostic();
    expect(context.HISTORY).toHaveLength(11);
    expect(context.HISTORICAL_FINGERPRINTS.size).toBe(7);
    expect(context.ELUS_HISTORICAL_FINGERPRINTS.size).toBe(4);

    const receipts: Receipt[] = context.HISTORY.map(([version, name]) => {
      const privateFingerprint = context.HISTORICAL_FINGERPRINTS.get(version);
      const ownFingerprint = context.ELUS_HISTORICAL_FINGERPRINTS.get(version);
      const fingerprint = privateFingerprint ?? ownFingerprint;
      if (!fingerprint) throw Error("HISTORICAL_FIXTURE_MISSING");
      return {
        version,
        name,
        statement_count: 1,
        first_statement_bytes: fingerprint[0],
        md5: privateFingerprint ? "fixture-md5:" + version : fingerprint[1],
      };
    });

    const evaluate = (rows: Receipt[]) =>
      context.historicalReceiptDiagnostic({
        query: async (sql, args) => {
          expect(sql.trimStart().startsWith("SELECT")).toBe(true);
          expect(sql).toContain("WHERE version = ANY($1::text[])");
          expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/i);
          expect(args[0]).toEqual(context.HISTORY.map(([version]) => version));
          return { rows };
        },
      });

    expect(await evaluate(receipts)).toEqual({
      historicalReceiptsMatched: 11,
      historicalReceiptsExpected: 11,
      historicalReceiptsExact: true,
    });

    const mutations: Receipt[][] = [
      receipts.slice(1),
      [...receipts, { ...receipts[0]!, version: "20990101000000" }],
      receipts.map((r, i) => (i === 0 ? { ...r, name: "alterado" } : r)),
      receipts.map((r, i) => (i === 0 ? { ...r, statement_count: 2 } : r)),
      receipts.map((r, i) => (i === 0 ? { ...r, first_statement_bytes: r.first_statement_bytes + 1 } : r)),
      receipts.map((r, i) => (i === 0 ? { ...r, md5: "corrompido" } : r)),
      receipts.map((r, i) => (i === 7 ? { ...r, md5: "corrompido" } : r)),
    ];
    for (const rows of mutations) {
      const result = await evaluate(rows);
      expect(result.historicalReceiptsExact).toBe(false);
      expect(result.historicalReceiptsExpected).toBe(11);
    }
  });
});
