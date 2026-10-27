import { describe, expect, it } from "vitest";
import { costCents, gravacaoDeUmaHora } from "../../lib/agent-engine/edge/llm/pricing";

const uso = (cacheWrite1hTokens?: number) => ({
  inputTokens: 1_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 1_000,
  ...(cacheWrite1hTokens === undefined ? {} : { cacheWrite1hTokens }),
});

describe("ELUS × DeskcommCRM 1.89: preço do cache por TTL real", () => {
  it("mantém o cálculo anterior quando não há dados crus do provedor", () => {
    expect(gravacaoDeUmaHora([undefined, {}, { cache_creation: null }], 1_000)).toBeUndefined();
    expect(costCents("claude-sonnet-4-5", uso(), "1h")).toBeCloseTo(0.6, 10);
    expect(costCents("claude-sonnet-4-5", uso(), "5m")).toBeCloseTo(0.375, 10);
  });

  it("cobra gravação mista pelo TTL de cada parcela, não pelo TTL global", () => {
    const crus = [
      { cache_creation: { ephemeral_5m_input_tokens: 600, ephemeral_1h_input_tokens: 100 } },
      { cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 100 } },
    ];
    const umaHora = gravacaoDeUmaHora(crus, 1_000);
    expect(umaHora).toBe(200);
    expect(costCents("claude-sonnet-4-5", uso(umaHora), "1h")).toBeCloseTo(0.42, 10);
    expect(costCents("claude-sonnet-4-5", uso(umaHora), "5m")).toBeCloseTo(0.42, 10);
  });

  it("ajusta proporção ao total agregado pelo SDK sem exceder o total", () => {
    expect(gravacaoDeUmaHora([
      { cache_creation: { ephemeral_5m_input_tokens: 50, ephemeral_1h_input_tokens: 50 } },
    ], 500)).toBe(250);
    expect(costCents("claude-sonnet-4-5", uso(5_000), "1h")).toBeCloseTo(0.6, 10);
    expect(costCents("claude-sonnet-4-5", uso(-100), "1h")).toBeCloseTo(0.375, 10);
  });

  it("ignora divisão inválida e mantém comportamento seguro com cache zero", () => {
    expect(gravacaoDeUmaHora([{ cache_creation: { ephemeral_1h_input_tokens: "inválido" } }], 1_000))
      .toBeUndefined();
    expect(gravacaoDeUmaHora([{ cache_creation: {} }], 1_000)).toBe(0);
    expect(gravacaoDeUmaHora([
      { cache_creation: { ephemeral_5m_input_tokens: 20, ephemeral_1h_input_tokens: 80 } },
    ], 0)).toBe(0);
    expect(costCents("modelo-sem-tarifa", uso(200), "1h")).toBeNull();
  });
});
