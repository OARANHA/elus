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
    expect(gitBlobSha(baseline)).toBe("f9c5de4cdab40c1f73ee4e63f53886c93671e5c2");
  });

  it("não aceita a baseline truncada de 478 linhas", () => {
    expect(baseline.length).toBeGreaterThan(3_000_000);
    expect(baseline.toString("utf8").split("\n").length).toBeGreaterThan(58_000);
  });
});
