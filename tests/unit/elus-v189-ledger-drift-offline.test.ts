import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const script = join(root, "scripts/elus-v189-ledger-drift-offline.mjs");
const matrix = JSON.parse(readFileSync(
  join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8",
)) as {
  ledger_snapshot: { versions: string[] };
  migrations: Array<{ version: string; logical_number: string }>;
};
const historical = matrix.ledger_snapshot.versions;
const all = [...historical, ...matrix.migrations.map((m) => m.version), "20261026010000"];

function inspect(input: unknown, mode = "inspect") {
  const run = spawnSync(process.execPath, [script, mode], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
    input: JSON.stringify(input),
    env: { PATH: process.env.PATH, NODE_ENV: "test" },
  });
  return { ...run, data: run.status === 0 ? JSON.parse(run.stdout) : null };
}

describe("ELUS v1.89 — comparação offline de recibos não comprova DDL", () => {
  it("classifica as 11 versões históricas sem confundir imports ausentes com executados", () => {
    const result = inspect({ versions: historical, publicTables: 191 });
    expect(result.status).toBe(0);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.counts.importedPresent).toBe(0);
    expect(result.data.differences.importedMissing).toHaveLength(38);
    expect(result.data.differences.additionalMissing).toEqual(["20261026010000"]);
    expect(result.data.signals.sqlExecutionProven).toBe(false);
  });

  it("não declara prontidão mesmo com 50 recibos e 208 tabelas reportadas", () => {
    const result = inspect({ versions: [...all].reverse(), publicTables: 208 });
    expect(result.status).toBe(0);
    expect(result.data.receiptPattern).toBe("EXPECTED_SET_RECORDED_UNVERIFIED");
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.counts).toMatchObject({ expected: 50, observedRows: 50, observedUnique: 50 });
    expect(result.data.signals.receipt0759Recorded).toBe(true);
    expect(result.data.signals.receipt0765Recorded).toBe(true);
    expect(result.data.signals.schemaObjectsProven).toBe(false);
    expect(result.data.signals.destructive0759Approved).toBe(false);
    expect(result.data.remainingGates).toContain("READONLY_SCHEMA_AND_0765_FUNCTION_ATTESTATION");
  });

  it("expõe lacunas, duplicatas e versões desconhecidas sem inferir replay", () => {
    const skipped = matrix.migrations[0]!.version;
    const result = inspect({ versions: [...all.filter((v) => v !== skipped), all[0], "20990101000000"] });
    expect(result.status).toBe(0);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.differences.importedMissing).toContain(skipped);
    expect(result.data.differences.duplicateVersions).toEqual([all[0]]);
    expect(result.data.differences.unexpected).toEqual(["20990101000000"]);
    expect(result.data.receiptPattern).not.toBe("EXPECTED_SET_RECORDED_UNVERIFIED");
  });

  it("recusa entradas com campos não sanitizados, versões inválidas e modo mutante", () => {
    for (const input of [
      { versions: all, statements: ["SELECT 1"] },
      { versions: ["invalid"] },
      { versions: all, publicTables: -1 },
      { versions: "20261026010000" },
    ]) {
      const result = inspect(input);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("GATE_RED=SANITIZED_SNAPSHOT_REQUIRED");
      expect(result.stdout).toBe("");
    }
    const apply = inspect({ versions: all }, "apply");
    expect(apply.status).not.toBe(0);
    expect(apply.stderr).toContain("GATE_RED=INSPECT_ONLY");
  });

  it("não contém cliente de banco, conexão de rede ou escrita de migrations", () => {
    const source = readFileSync(script, "utf8");
    expect(source).not.toMatch(/from ["']pg["']|new pg\.Client|fetch\(|https?:\/\/|execFile|spawnSync/);
    expect(source).not.toMatch(/INSERT INTO|UPDATE supabase_migrations|DELETE FROM|db push/);
    expect(source).toContain('decision: "NO_GO"');
  });
});
