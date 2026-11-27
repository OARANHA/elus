import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");

describe("CI verify: quatro shards unitários e kit isolado", () => {
  it("distribui a suíte em quatro shards sem deixar parte ausente ou duplicada", () => {
    const matrix = ci.match(/^\s+parte: \[([^\]]+)\]$/m);
    expect(matrix, "matrix verify-parte não encontrada").not.toBeNull();
    const parts = matrix![1]!.split(",").map((n) => Number(n.trim()));
    expect(parts).toEqual([1, 2, 3, 4, 5]);
    expect(ci.match(/--shard=\$\{\{ matrix\.parte \}\}\/4/g)).toHaveLength(1);
    expect(ci).toContain("if: matrix.parte != 5");
    expect(ci).toContain("Unit tests (parte ${{ matrix.parte }}/4)");
  });

  it("reserva a quinta parte às cercas e ao kit bash", () => {
    expect(ci).toMatch(/- name: Cercas estruturais\n\s+if: matrix\.parte == 5\n\s+run: pnpm cercas/);
    expect(ci).toMatch(/- name: Kit self-host \(bash\)\n\s+if: matrix\.parte == 5\n\s+run: pnpm test:shell/);
    expect(ci).not.toContain("if: matrix.parte == 4");
  });

  it("não aumenta orçamento nem teto do verify-parte", () => {
    expect(ci).toMatch(/verify-parte:\n[\s\S]*?timeout-minutes: 15/);
    expect(ci).toContain('ORCAMENTO_MIN: "12"');
    expect(ci).toContain("if: always()");
  });
});
