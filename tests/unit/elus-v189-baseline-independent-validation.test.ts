/**
 * ELUS v1.89 — validação estrutural separada da reconstrução da baseline.
 * Não executa SQL nem autoriza replay; o catálogo real e a ACL/RLS exigem
 * provas funcionais e reconciliação de ledger independentes.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const OWN_FILES = [
  "20261019120000_0689_integracoes_erp_vendaerp.sql",
  "20261020120000_0690_org_ai_autonomy_protected.sql",
  "20261020120001_0691_chutes_chat_catalog.sql",
  "20261020230000_0692_chutes_catalog_sync.sql",
  "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
] as const;

const baseline = readFileSync(new URL("../../supabase/baseline.sql", import.meta.url), "utf8");
const hardeningMarker = "-- ---- VARREDURA anon:";

function ownSql(file: string): string {
  return readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
}

describe("ELUS v1.89: validação estrutural da baseline (separada do rebuild)", () => {
  it("inclui cada migration local uma única vez e antes do hardening anon", () => {
    const hardening = baseline.indexOf(hardeningMarker);
    expect(hardening).toBeGreaterThan(3_000_000);
    expect(baseline.indexOf(hardeningMarker, hardening + 1)).toBe(-1);
    const positions = OWN_FILES.map((file) => {
      const sql = ownSql(file);
      const at = baseline.indexOf(sql);
      expect(at, file).toBeGreaterThan(-1);
      expect(baseline.indexOf(sql, at + 1), file).toBe(-1);
      expect(at, file).toBeLessThan(hardening);
      return at;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(Buffer.byteLength(baseline, "utf8")).toBe(3_393_613);
    expect(baseline.split("\n").length).toBeGreaterThan(58_000);
  });

  it("não deixa declaração ativa CREATE FUNCTION depois da varredura anon", () => {
    const tail = baseline.slice(baseline.indexOf(hardeningMarker));
    // Guarda lexical conservadora; não substitui parser SQL ou teste de ACL.
    const uncommented = tail
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/--[^\r\n]*/g, "");
    expect(uncommented).not.toMatch(/\bcreate\s+(?:or\s+replace\s+)?function\b/i);
  });

  it("mantém visível a divergência 0690/9037 e não a trata como paridade", () => {
    const guard0690 = ownSql(OWN_FILES[1]);
    expect(baseline).toContain(guard0690);
    expect(guard0690).toMatch(/auth\.role\(\)\s*=\s*'service_role'/i);
    expect(guard0690).not.toMatch(
      /current_user\s*=\s*'service_role'\s+and\s+auth\.role\(\)/i,
    );
  });
});
