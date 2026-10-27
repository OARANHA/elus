/**
 * Exercita realmente o manifesto do preflight sem conectar ao Supabase.
 * Fail closed se a convenção do teste/manifesto mudar.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEDGER_HISTORICO_V185, conferirLedgerHistorico } from "../../scripts/elus-v189-ledger-historico.mjs";

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
    expect(LEDGER_HISTORICO_V185.map((row) => row.name)).toEqual(expectedNames);
    expect(source).toContain("conferirLedgerHistorico(q.rows)");

    const altered = LEDGER_HISTORICO_V185.map((row) => ({ ...row }));
    altered[0]!.name = "nome_historico_alterado";
    expect(() => conferirLedgerHistorico(altered)).toThrow("HISTORICAL_LEDGER_MISMATCH");
  });
});
