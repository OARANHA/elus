import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(new URL("../../supabase/baseline.sql", import.meta.url));

function gitBlobSha(content: Buffer): string {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash("sha1").update(header).update(content).digest("hex");
}

describe("integridade da baseline ELUS v1.89.0 candidata", () => {
  it("preserva o blob reconstruído e falha em truncagem ou edição acidental", () => {
    expect(gitBlobSha(baseline)).toBe("0269eee11299e0492f489ab6d690eb88b91e30b1");
  });

  it("não aceita a baseline truncada de 478 linhas", () => {
    expect(baseline.length).toBeGreaterThan(3_000_000);
    expect(baseline.toString("utf8").split("\n").length).toBeGreaterThan(58_000);
  });

  it("espelha integralmente a migration ELUS 0765 ANTES da varredura anon", () => {
    const migration = readFileSync(
      new URL("../../supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql", import.meta.url),
      "utf8",
    );
    const texto = baseline.toString("utf8");
    const inicio = texto.indexOf(migration);
    const hardening = texto.indexOf("-- ---- VARREDURA anon:");
    expect(inicio).toBeGreaterThan(-1);
    expect(hardening).toBeGreaterThan(inicio);
    expect(texto.indexOf(migration, inicio + 1)).toBe(-1);
    expect(texto.match(/CREATE OR REPLACE FUNCTION public\.fn_elus_rotacionar_codigos_recuperacao\(/g)).toHaveLength(1);
  });
});
