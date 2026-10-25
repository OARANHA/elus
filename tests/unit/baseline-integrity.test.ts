import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(new URL("../../supabase/baseline.sql", import.meta.url));

function gitBlobSha(content: Buffer): string {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash("sha1").update(header).update(content).digest("hex");
}

describe("integridade da baseline ELUS restaurada da PR #40", () => {
  it("preserva o blob integral e falha em truncagem ou edição acidental", () => {
    expect(gitBlobSha(baseline)).toBe("96147866db19c4e6a22a8bed5214c7ea85d0cb3d");
  });
});
