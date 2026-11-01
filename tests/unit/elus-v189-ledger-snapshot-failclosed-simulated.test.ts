import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercita o snapshot real com recibos e SQL 100% sinteticos.
// Nenhum banco, statement historico privado ou credencial e acessado.
type Receipt = {
  version: string;
  name: string;
  md5: string;
  statement_count: number;
  first_statement_bytes: number;
};
type Item = { version: string; name: string; sql: string };
type Snapshot = (client: {
  query: (sql: string) => Promise<{ rows: Array<Receipt | { n: string }> }>;
}, items: Item[]) => Promise<{ applied: number; publicTables: number }>;

const md5 = (value: string) => createHash("md5").update(value).digest("hex");

function fixture() {
  const history: [string, string][] = Array.from({ length: 11 }, (_, i) => [
    String(20261018000000 + i),
    "historico_sintetico_" + i,
  ]);
  const fingerprints = new Map<string, [number, string]>();
  const historical: Receipt[] = history.map(([version, name], i) => {
    const sql = "SELECT " + i + "; -- recibo historico sintetico";
    fingerprints.set(version, [Buffer.byteLength(sql), md5(sql)]);
    return {
      version, name, md5: md5(sql), statement_count: 1,
      first_statement_bytes: Buffer.byteLength(sql),
    };
  });
  const items: Item[] = Array.from({ length: 39 }, (_, i) => ({
    version: String(20261023000000 + i),
    name: "migration_sintetica_" + i,
    sql: "SELECT " + (100 + i) + ";",
  }));
  const imported: Receipt[] = items.map((item) => ({
    version: item.version,
    name: item.name,
    md5: md5(item.sql),
    statement_count: 1,
    first_statement_bytes: Buffer.byteLength(item.sql),
  }));

  const source = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
  const start = source.indexOf("async function snapshot(c,items){");
  const end = source.indexOf("// Atestacao isolada dos 11 recibos historicos", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const snapshot = runInNewContext(
    source.slice(start, end) + "\nsnapshot",
    {
      HISTORY: history,
      HISTORICAL_FINGERPRINTS: new Map(),
      ELUS_HISTORICAL_FINGERPRINTS: fingerprints,
      digest: (data: Buffer, algorithm: string) =>
        createHash(algorithm).update(data).digest("hex"),
      need: (ok: boolean, reason: string) => {
        if (!ok) throw Error(reason);
      },
      Buffer,
    },
    { timeout: 1000 },
  ) as Snapshot;

  function evaluate(records: Receipt[], expectedQueries: number, publicTables = 208) {
    let queries = 0;
    const result = snapshot({
      query: async (sql) => {
        queries++;
        expect(sql.trimStart()).toMatch(/^SELECT\b/i);
        if (sql.includes("supabase_migrations.schema_migrations")) {
          return { rows: records };
        }
        if (sql.includes("pg_tables")) {
          return { rows: [{ n: String(publicTables) }] };
        }
        throw Error("UNEXPECTED_QUERY");
      },
    }, items);
    return {
      result,
      assertQueries: () => expect(queries).toBe(expectedQueries),
    };
  }

  return { historical, imported, evaluate };
}

describe("ELUS v1.89: snapshot fail-closed com ledger sintetico", () => {
  it("aceita somente os 11 historicos e 39 recibos conhecidos e integrais", async () => {
    const { historical, imported, evaluate } = fixture();
    const check = evaluate([...historical, ...imported], 2);
    expect(await check.result).toEqual({ applied: 39, publicTables: 208 });
    check.assertQueries();
  });

  it("bloqueia 51 recibos antes de consultar qualquer objeto do schema", async () => {
    const { historical, imported, evaluate } = fixture();
    const external: Receipt = {
      version: "20261029000000",
      name: "externa_9037_sintetica",
      md5: md5("SELECT 9037;"),
      statement_count: 1,
      first_statement_bytes: Buffer.byteLength("SELECT 9037;"),
    };
    const check = evaluate([...historical, ...imported, external], 1);
    await expect(check.result).rejects.toThrow("LEDGER_COUNT_DRIFT");
    check.assertQueries();
  });

  it("nao aceita um recibo externo mesmo com cardinalidade total 50", async () => {
    const { historical, imported, evaluate } = fixture();
    const external = { ...imported[38]!, version: "20261029000000" };
    const check = evaluate([...historical, ...imported.slice(0, 38), external], 1);
    await expect(check.result).rejects.toThrow("UNKNOWN_RECEIPT");
    check.assertQueries();
  });

  it("recusa lacuna no prefixo, hash alterado e statement fragmentado", async () => {
    const { historical, imported, evaluate } = fixture();
    const scenarios: Array<[Receipt[], string]> = [
      [[...historical, ...imported.filter((_, i) => i !== 17)], "NONPREFIX_LEDGER"],
      [[...historical, ...imported.map((r, i) =>
        i === 10 ? { ...r, md5: "0".repeat(32) } : r)], "RECEIPT_HASH_DRIFT"],
      [[...historical, ...imported.map((r, i) =>
        i === 10 ? { ...r, statement_count: 2 } : r)], "RECEIPT_STATEMENT_CARDINALITY_DRIFT"],
      [[...historical.map((r, i) =>
        i === 2 ? { ...r, md5: "0".repeat(32) } : r), ...imported], "ELUS_HISTORY_STATEMENT_DRIFT"],
    ];
    for (const [rows, error] of scenarios) {
      const check = evaluate(rows, 1);
      await expect(check.result).rejects.toThrow(error);
      check.assertQueries();
    }

  it("rejeita catalogo inicial e final com numero incorreto de tabelas", async () => {
    const { historical, imported, evaluate } = fixture();
    const initial = evaluate(historical, 2, 190);
    await expect(initial.result).rejects.toThrow("INITIAL_SCHEMA_DRIFT");
    initial.assertQueries();

    const final = evaluate([...historical, ...imported], 2, 207);
    await expect(final.result).rejects.toThrow("FINAL_SCHEMA_DRIFT");
    final.assertQueries();
  });

  it("recusa nomes incorretos, historico incompleto e recibo importado duplicado", async () => {
    const { historical, imported, evaluate } = fixture();
    const cases: Array<[Receipt[], string]> = [
      [[...historical.slice(0, 10), ...imported], "HISTORY_DRIFT"],
      [[...historical.map((r, i) => i === 4 ? { ...r, name: "outro_nome" } : r), ...imported], "HISTORY_DRIFT"],
      [[...historical, ...imported.map((r, i) => i === 5 ? { ...r, name: "outro_nome" } : r)], "UNKNOWN_RECEIPT"],
      [[...historical, ...imported.map((r, i) => i === 7 ? { ...r, ...imported[6] } : r)], "RECEIPT_DUPLICATE"],
    ];
    for (const [rows, error] of cases) {
      const check = evaluate(rows, 1);
      await expect(check.result).rejects.toThrow(error);
      check.assertQueries();
    }
  });

  it("recusa tamanho de SQL divergente antes da consulta de catalogo", async () => {
    const { historical, imported, evaluate } = fixture();
    const rows = [...historical, ...imported.map((r, i) =>
      i === 3 ? { ...r, first_statement_bytes: r.first_statement_bytes + 1 } : r)];
    const check = evaluate(rows, 1);
    await expect(check.result).rejects.toThrow("RECEIPT_STATEMENT_LENGTH_DRIFT");
    check.assertQueries();
  });
  });
});
