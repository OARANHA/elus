import { describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { custoChutesCents, resolverTarifaChutes } from "@/lib/agent-engine/edge/llm/preco-chutes";

function bancoComLinhas(rows: unknown[]) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  } as unknown as Pick<pg.Pool, "query">;
}

describe("precificação Chutes por par provedor/modelo", () => {
  it("usa apenas a linha Chutes e preserva centavos fracionários", async () => {
    const db = bancoComLinhas([{
      input_price_per_million_cents: "10.4",
      output_price_per_million_cents: "41.6",
    }]);
    const tarifa = await resolverTarifaChutes(db, "Qwen/Qwen3-32B-TEE");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("provider = 'chutes'"),
      ["Qwen/Qwen3-32B-TEE"],
    );
    expect(custoChutesCents(tarifa, {
      inputTokens: 10_000,
      outputTokens: 2_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })).toBeCloseTo(0.1872, 8);
  });

  it.each([
    [],
    [{ input_price_per_million_cents: null, output_price_per_million_cents: 50 }],
    [{ input_price_per_million_cents: -1, output_price_per_million_cents: 50 }],
    [{ input_price_per_million_cents: "NaN", output_price_per_million_cents: 50 }],
    [{ input_price_per_million_cents: 1, output_price_per_million_cents: 2 },
     { input_price_per_million_cents: 1, output_price_per_million_cents: 2 }],
  ])("recusa preço ausente, inválido ou ambíguo antes do egress", async (rows) => {
    await expect(resolverTarifaChutes(bancoComLinhas(rows), "modelo")).rejects.toThrow(
      "chutes_model_without_verified_pricing",
    );
  });

  it("falha fechado quando o banco não pode comprovar o preço", async () => {
    const db = { query: vi.fn().mockRejectedValue(new Error("catalogo_indisponivel")) }
      as unknown as Pick<pg.Pool, "query">;
    await expect(resolverTarifaChutes(db, "modelo")).rejects.toThrow("catalogo_indisponivel");
  });
});
