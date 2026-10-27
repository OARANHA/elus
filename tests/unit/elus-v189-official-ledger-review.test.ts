import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const script = "scripts/elus-v189-official-ledger-review.mjs";

describe("ledger v189: revisão offline, nunca executor", () => {
  it("enumera 39 unidades com registro oficial bloqueado", () => {
    const raw = execFileSync(process.execPath,[script,"inspect"],{
      cwd:process.cwd(),encoding:"utf8",timeout:15000,
      env:{PATH:process.env.PATH,NODE_ENV:"test"},
    });
    const plan=JSON.parse(raw);
    expect(plan.mode).toBe("offline-inspection-only");
    expect(plan.status).toBe("NO_GO");
    expect(plan.executeAllowed).toBe(false);
    expect(plan.historicalLedgerEntries).toBe(11);
    expect(plan.count).toBe(39);
    expect(plan.units).toHaveLength(39);
    expect(plan.units.map((u:{name:string})=>u.name)).toEqual(
      [...plan.units.map((u:{name:string})=>u.name)].sort());
    for(const u of plan.units){
      expect(u.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(u.ledgerRegistration).toBe("BLOCKED_OFFICIAL_LEDGER_CONTRACT_UNVERIFIED");
    }
  });
  it("recusa comandos com semântica de escrita", () => {
    for(const command of ["apply","run","commit","repair","preflight"]){
      expect(()=>execFileSync(process.execPath,[script,command],{
        cwd:process.cwd(),encoding:"utf8",timeout:15000,
        env:{PATH:process.env.PATH,NODE_ENV:"test"},stdio:["ignore","pipe","pipe"],
      })).toThrow();
    }
  });
  it("rejeita drift de cutoff, classificação, blob, versão e revisão antes de emitir plano", () => {
    const root = process.cwd();
    const original = JSON.parse(readFileSync(
      join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8",
    ));
    const cases: Array<[string, (matrix: typeof original) => void, string]> = [
      ["cutoff", m => { m.ledger_snapshot.cutoff = "20261021025612"; }, "HISTORICAL_LEDGER_SNAPSHOT_DRIFT"],
      ["historical versions", m => { m.ledger_snapshot.versions[0] = "20261018200430"; }, "HISTORICAL_LEDGER_SNAPSHOT_DRIFT"],
      ["group swap", m => {
        const before = m.migrations.find((x: { cutoff_group: string }) => x.cutoff_group === "AT_OR_BEFORE_LEDGER_CUTOFF");
        const after = m.migrations.find((x: { cutoff_group: string }) => x.cutoff_group === "AFTER_LEDGER_CUTOFF");
        if (!before || !after) throw new Error("TEST_FIXTURE_INVALID");
        before.cutoff_group = "AFTER_LEDGER_CUTOFF";
        after.cutoff_group = "AT_OR_BEFORE_LEDGER_CUTOFF";
      }, "MATRIX_RECONCILIATION_DRIFT"],
      ["blob", m => { m.migrations[0].git_blob_sha1 = "0".repeat(40); }, "MATRIX_RECONCILIATION_DRIFT"],
      ["version", m => { m.migrations[0].version = "19000101000000"; }, "MATRIX_RECONCILIATION_DRIFT"],
      ["review", m => { m.migrations[0].review_state = "APPROVED"; }, "MATRIX_RECONCILIATION_DRIFT"],
    ];
    const temp = mkdtempSync(join(tmpdir(), "elus-v189-official-review-"));
    try {
      mkdirSync(join(temp, "docs/integracao"), { recursive: true });
      mkdirSync(join(temp, "tests/unit"), { recursive: true });
      mkdirSync(join(temp, "supabase"), { recursive: true });
      writeFileSync(
        join(temp, "tests/unit/elus-v189-import-ledger-integrity.test.ts"),
        readFileSync(join(root, "tests/unit/elus-v189-import-ledger-integrity.test.ts")),
      );
      symlinkSync(join(root, "supabase/migrations"), join(temp, "supabase/migrations"), "dir");
      for (const [label, mutate, error] of cases) {
        const matrix = structuredClone(original);
        mutate(matrix);
        writeFileSync(
          join(temp, "docs/integracao/elus-v189-ledger-replay-matrix.json"),
          JSON.stringify(matrix),
        );
        const result = spawnSync(process.execPath, [join(root, script), "inspect"], {
          cwd: temp, encoding: "utf8", timeout: 15000,
          env: { PATH: process.env.PATH, NODE_ENV: "test" },
        });
        expect(result.status, label).not.toBe(0);
        expect(result.stderr, label).toContain(error);
        expect(result.stdout, label).toBe("");
      }
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

});
