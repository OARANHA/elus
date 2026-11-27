/**
 * Exercita realmente o manifesto do preflight sem conectar ao Supabase.
 * Fail closed se a convenção do teste/manifesto mudar.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const script = join(root, "scripts/elus-v189-production-preflight.mjs");
const extra = "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql";

describe("preflight v189: manifesto offline e cercas produtivas", () => {
  it("materializa 39 migrations verificadas sem rede/banco", () => {
    const stdout = execFileSync(process.execPath, [script, "manifest"], {
      cwd: root,
      encoding: "utf8",
      timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    const result = JSON.parse(stdout);
    expect(result.mode).toBe("read-only");
    expect(result.count).toBe(39);
    expect(result.reconciliation).toEqual({
      historicalEntries: 11,
      beforeOrAtCutoff: 11,
      afterCutoff: 27,
      additional: 1,
      replayAllowed: false,
    });
    expect(result.manifest).toHaveLength(39);
    const names = result.manifest.map((m: { name: string }) => m.name);
    const versions = result.manifest.map((m: { version: string }) => m.version);
    expect(new Set(names).size).toBe(39);
    expect(new Set(versions).size).toBe(39);
    expect(names).toEqual([...names].sort());
    for (const m of result.manifest) {
      expect(m.name.startsWith(m.version + "_")).toBe(true);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    const expectedExtra = createHash("sha256")
      .update(readFileSync(join(root, "supabase/migrations", extra)))
      .digest("hex");
    expect(result.manifest.find((m: { name: string }) => m.name === extra)?.sha256).toBe(expectedExtra);
  });

  it("não aceita modo de escrita nem preflight sem autorização explícita", () => {
    for (const mode of ["apply", "repair", "deploy", "preflight"]) {
      expect(() => execFileSync(process.execPath, [script, mode], {
        cwd: root, encoding: "utf8", timeout: 15000,
        env: { PATH: process.env.PATH, NODE_ENV: "test" },
        stdio: ["ignore", "pipe", "pipe"],
      })).toThrow();
    }
  });

  it("exige role de banco sem privilégios efetivos de escrita", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain('await client.query("BEGIN READ ONLY")');
    expect(source).toContain("current_setting('transaction_read_only') = 'on'");
    for (const guard of [
      "rolsuper", "rolcreaterole", "rolcreatedb", "rolreplication", "rolbypassrls",
      "pg_write_all_data", "has_database_privilege", "has_schema_privilege",
      "has_table_privilege", "'INSERT'", "'UPDATE'", "'DELETE'", "'TRUNCATE'",
      "roleCheck.rows.length!==1", "READONLY_ROLE_REQUIRED",
    ]) {
      expect(source).toContain(guard);
    }
    expect(source).toContain("READONLY_ROLE_REQUIRED/.test(e.message)");
  });

  it("rejeita drift dos tipos reais do ledger oficial sem conectar ao banco", () => {
    const source = readFileSync(script, "utf8");
    const start = source.indexOf(" const requiredTypes = [");
    const end = source.indexOf(" const ledgerShape =", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    // Execute the exact production guard against synthetic catalog rows.
    const guard = source.slice(start, end);
    const valid = [
      { column_name: "version", udt_name: "varchar", data_type: "character varying" },
      { column_name: "name", udt_name: "text", data_type: "text" },
      { column_name: "statements", udt_name: "_text", data_type: "ARRAY" },
      { column_name: "rollback", udt_name: "_text", data_type: "ARRAY" },
    ];
    const run = (rows: typeof valid) => runInNewContext(guard, { cols: { rows } }, { timeout: 1000 });
    expect(() => run(valid)).not.toThrow();
    const changed = (index: number, patch: Partial<(typeof valid)[number]>) =>
      valid.map((row, i) => i === index ? { ...row, ...patch } : { ...row });
    for (const rows of [
      changed(0, { udt_name: "int8" }),
      changed(1, { udt_name: "jsonb" }),
      changed(2, { udt_name: "text" }),
      changed(3, { udt_name: "_varchar" }),
      changed(2, { data_type: "USER-DEFINED" }),
      valid.slice(0, 3),
      [...valid, { ...valid[0]! }],
    ]) {
      expect(() => run(rows)).toThrow("OFFICIAL_LEDGER_SCHEMA_DRIFT");
    }
  });

  it("bloqueia drift dos nomes associados às 11 versões históricas", () => {
    const source = readFileSync(script, "utf8");
    const expectedNames = [
      "elus_v185_preparar_extensoes_92d37f6",
      ...Array.from({ length: 6 }, (_, i) =>
        `elus_v185_baseline_92d37f6_p0${i + 1}_of_06`),
      "integracoes_erp_vendaerp_0689",
      "elus_0690_org_ai_autonomy_protected",
      "elus_0691_chutes_chat_catalog",
      "elus_0692_chutes_catalog_sync",
    ];
    expect(expectedNames).toHaveLength(11);
    for (const name of expectedNames) {
      expect(source).toContain(`"${name}"`);
    }
    expect(source).toContain("row.name!==EXPECTED_NAMES[i]");
    expect(source).toContain("HISTORICAL_LEDGER_NAME_MISMATCH");
  });
  it("rejeita cutoff adulterado, troca de grupos e versão incoerente sem acessar banco", () => {
    const original = JSON.parse(readFileSync(
      join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8",
    ));
    const wrongCutoff = structuredClone(original);
    wrongCutoff.ledger_snapshot.cutoff = "20261021025612";

    const swapped = structuredClone(original);
    const before = swapped.migrations.find(
      (m: { cutoff_group: string }) => m.cutoff_group === "AT_OR_BEFORE_LEDGER_CUTOFF",
    );
    const after = swapped.migrations.find(
      (m: { cutoff_group: string }) => m.cutoff_group === "AFTER_LEDGER_CUTOFF",
    );
    if (!before || !after) throw new Error("TEST_FIXTURE_INVALID");
    before.cutoff_group = "AFTER_LEDGER_CUTOFF";
    after.cutoff_group = "AT_OR_BEFORE_LEDGER_CUTOFF";

    const wrongVersion = structuredClone(original);
    wrongVersion.migrations[0].version = "19000101000000";

    for (const drift of [wrongCutoff, swapped, wrongVersion]) {
      const temp = mkdtempSync(join(tmpdir(), "elus-v189-cutoff-"));
      try {
        mkdirSync(join(temp, "docs/integracao"), { recursive: true });
        writeFileSync(
          join(temp, "docs/integracao/elus-v189-ledger-replay-matrix.json"),
          JSON.stringify(drift),
        );
        const result = spawnSync(process.execPath, [script, "manifest"], {
          cwd: temp, encoding: "utf8", timeout: 15000,
          env: { PATH: process.env.PATH, NODE_ENV: "test" },
        });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("REPLAY_CUTOFF_DRIFT");
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    }
  });

  it("bloqueia 0765 ausente ou com privilégios inseguros, sem banco", async () => {
    const source = readFileSync(script, "utf8");
    const start = source.indexOf(" const rotacaoRegistrada =");
    const end = source.indexOf(" const versions=", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("LEDGER_0765_FUNCTION_ABSENT|LEDGER_0765_FUNCTION_UNSAFE|READONLY_ROLE_REQUIRED");
    const guard = source.slice(start, end);
    expect(guard).toContain("pg_catalog.pg_proc");
    expect(guard).toContain("to_regprocedure");
    const segura = {
      existe: true, security_definer: true, search_path_fechado: true,
      anon_execute: false, authenticated_execute: false, service_execute: true,
    };
    const run = (registered: boolean, row: Record<string, boolean>) => {
      let consultas = 0;
      const resultado = runInNewContext(`(async () => {${guard}})()`, {
        q: { rows: registered ? [{ version: "20261026010000" }] : [] },
        client: { query: async () => { consultas++; return { rows: [row] }; } },
      }, { timeout: 1000 }) as Promise<void>;
      return { resultado, consultas: () => consultas };
    };

    await expect(run(true, { ...segura, existe: false }).resultado)
      .rejects.toThrow("LEDGER_0765_FUNCTION_ABSENT");
    await expect(run(true, segura).resultado).resolves.toBeUndefined();
    for (const alteracao of [
      { security_definer: false }, { search_path_fechado: false },
      { anon_execute: true }, { authenticated_execute: true },
      { service_execute: false },
    ]) {
      await expect(run(true, { ...segura, ...alteracao }).resultado)
        .rejects.toThrow("LEDGER_0765_FUNCTION_UNSAFE");
    }
    const naoRegistrada = run(false, { ...segura, existe: false });
    await expect(naoRegistrada.resultado).resolves.toBeUndefined();
    expect(naoRegistrada.consultas()).toBe(0);
  });

});
