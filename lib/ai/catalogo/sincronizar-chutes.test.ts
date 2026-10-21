import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fixture from "@/tests/fixtures/chutes-models-2026-10-20.json";
import { traduzirCatalogoChutes } from "./chutes";
import { sincronizarCatalogoChutes } from "./sincronizar-chutes";

// Cliente real, transporte PostgREST offline: mede os filtros e o corpo enviados.
function banco(existentes: unknown = [], falha?: "leitura" | "rpc") {
  const requests: { url: URL; body: unknown }[] = [];
  const admin = createClient("https://banco.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
        const rpc = url.pathname.includes("/rpc/");
        if ((falha === "rpc" && rpc) || (falha === "leitura" && !rpc))
          return Response.json({ message: "indisponível", code: "XX000" }, { status: 500 });
        return Response.json(
          rpc
            ? { fonte: "chutes", recebidos: 14, gravados: 13, depreciados: 1, ressuscitados: 1 }
            : existentes,
        );
      },
    },
  });
  return { admin, requests };
}
const linhas = () => traduzirCatalogoChutes(fixture);

describe("serviço Chutes isolado", () => {
  it("consulta apenas provider/source chutes e persiste um lote atômico", async () => {
    const { admin, requests } = banco([{ model_id: "voltou", deprecated_at: "2020-01-01" }]);
    expect(await sincronizarCatalogoChutes(admin, async () => linhas())).toMatchObject({
      fonte: "chutes",
      gravados: 13,
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]!.url.searchParams.get("provider")).toBe("eq.chutes");
    expect(requests[0]!.url.searchParams.get("source")).toBe("eq.chutes");
    expect(requests[1]!.url.pathname).toBe("/rest/v1/rpc/fn_sincronizar_catalogo_chutes");
    expect(requests[1]!.body).toEqual({ p_modelos: linhas() });
  });
  it("valida todos os modelos antes de consultar o banco", async () => {
    const { admin, requests } = banco();
    const lote = linhas();
    lote[13]!.output_price_per_million_cents = null;
    await expect(sincronizarCatalogoChutes(admin, async () => lote)).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
  it("recusa ownership de outra fonte antes da leitura", async () => {
    const { admin, requests } = banco();
    const lote = linhas();
    lote[0]!.source = "manual";
    await expect(sincronizarCatalogoChutes(admin, async () => lote)).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
  it("piso suspeito impede qualquer persistência", async () => {
    const { admin, requests } = banco(
      Array.from({ length: 30 }, (_, i) => ({ model_id: String(i), deprecated_at: null })),
    );
    await expect(sincronizarCatalogoChutes(admin, async () => linhas())).rejects.toThrow(/piso/);
    expect(requests).toHaveLength(1);
  });
  it.each(["leitura", "rpc"] as const)(
    "propaga falha %s sem fallback ou escrita extra",
    async (falha) => {
      const { admin, requests } = banco([], falha);
      await expect(sincronizarCatalogoChutes(admin, async () => linhas())).rejects.toThrow(
        /indisponível/,
      );
      expect(requests).toHaveLength(falha === "leitura" ? 1 : 2);
    },
  );
  it("falha de transporte não toca no banco", async () => {
    const { admin, requests } = banco();
    await expect(
      sincronizarCatalogoChutes(admin, vi.fn().mockRejectedValue(new Error("timeout"))),
    ).rejects.toThrow("timeout");
    expect(requests).toHaveLength(0);
  });
});
