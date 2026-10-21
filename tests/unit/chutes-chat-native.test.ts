import { describe, expect, it } from "vitest";
import { PROVEDOR_POR_ID } from "@/lib/ai/pontos/provedores";
import { validarParProvedorModelo } from "@/lib/ai/par-provedor-modelo";
import { createDefaultRegistry, CHUTES_CHAT_ENDPOINT } from "@/lib/agent-engine/edge/llm/providers";
import { llmEdgeConfigFromEnv } from "@/lib/agent-engine/edge/llm/credentials";
import { lerAmbiente } from "@/lib/instalacao/ambiente";

describe("Chutes nativo para conversa — contrato offline", () => {
  it("oferece provedor distinto de embedding com endpoint intrinseco", () => {
    expect(PROVEDOR_POR_ID.get("chutes")?.aceitaEndpointProprio).toBe(false);
    expect(CHUTES_CHAT_ENDPOINT).toBe("https://llm.chutes.ai/v1");
    expect(createDefaultRegistry({ openaiReasoningEffort: null }).chutes).toEqual(expect.any(Function));
  });

  it("aceita o id de modelo multimarca que o gateway Chutes anuncia", () => {
    expect(validarParProvedorModelo("chutes", "Qwen/Qwen3-32B-TEE")).toEqual({ valido: true });
    expect(validarParProvedorModelo("chutes", "google/gemma-4-31B-turbo-TEE")).toEqual({ valido: true });
  });

  it("usa CHUTES_API_KEY da instalacao sem registrar chave em organizacoes", () => {
    const cfg = llmEdgeConfigFromEnv({ CHUTES_API_KEY: "chutes-secret-from-installation" });
    expect(cfg.chutesApiKey).toBe("chutes-secret-from-installation");
    expect(lerAmbiente({ CHUTES_API_KEY: "chutes-secret-from-installation" }).chavesDeProvedor.chutes).toBe(true);
    expect(lerAmbiente({}).chavesDeProvedor.chutes).toBe(false);
  });
});
