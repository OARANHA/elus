import { describe, expect, it, vi } from "vitest";
import fixture from "@/tests/fixtures/chutes-models-2026-10-20.json";
import { buscarCatalogoChutes, precoChutesParaCentavos, traduzirCatalogoChutes } from "./chutes";

const modelo = () => structuredClone(fixture.data[0]!);
const catalogo = (m: unknown = modelo()) => ({ object: "list", data: [m] });

describe("catálogo Chutes real", () => {
  it("traduz os 14 modelos e somente capacidades declaradas", () => {
    const linhas = traduzirCatalogoChutes(fixture);
    expect(linhas).toHaveLength(14);
    const qwen = linhas.find((l) => l.model_id === "Qwen/Qwen3-32B-TEE")!;
    expect(qwen).toMatchObject({
      provider: "chutes",
      source: "chutes",
      input_price_per_million_cents: 10.4,
      output_price_per_million_cents: 41.6,
      supports_tools: true,
      supports_vision: false,
      context_window: 40960,
    });
    expect(linhas[0]).toMatchObject({
      supports_vision: true,
      input_price_per_million_cents: 12,
      output_price_per_million_cents: 37,
    });
    expect(linhas.find((l) => l.model_id.startsWith("unsloth/"))).toMatchObject({
      context_window: null,
      supports_tools: false,
      supports_vision: false,
    });
    expect(linhas.every((l) => l.display_name === l.model_id && l.description === null)).toBe(true);
  });
  it.each([
    {},
    [],
    { data: [] },
    { object: "list", data: [] },
    { object: "model", data: [modelo()] },
    catalogo(null),
  ])("recusa envelope/lista inválida %j", (v) => {
    expect(() => traduzirCatalogoChutes(v)).toThrow();
  });
  it("recusa IDs duplicados sem escolher uma cópia", () => {
    expect(() => traduzirCatalogoChutes({ object: "list", data: [modelo(), modelo()] })).toThrow(
      /duplicad/,
    );
  });
  it.each([null, undefined, -1, Infinity, NaN, "inválido", "", 1000000])(
    "recusa preço %s em qualquer item do lote",
    (v) => {
      const m = modelo();
      Object.assign(m.pricing, { completion: v });
      expect(() => traduzirCatalogoChutes({ object: "list", data: [modelo(), m] })).toThrow();
    },
  );
  it("recusa divergência entre pricing e os campos explicitamente USD", () => {
    const m = modelo();
    m.price.input.usd = 2;
    expect(() => traduzirCatalogoChutes(catalogo(m))).toThrow();
  });
  it("não usa preço alternativo quando falta pricing", () => {
    const m: Record<string, unknown> = modelo();
    delete m.pricing;
    expect(() => traduzirCatalogoChutes(catalogo(m))).toThrow();
  });
  it("não infere ferramentas, imagem nem contexto pelo nome ou max_model_len", () => {
    const m: Record<string, unknown> = modelo();
    delete m.supported_features;
    delete m.input_modalities;
    delete m.context_length;
    expect(traduzirCatalogoChutes(catalogo(m))[0]).toMatchObject({
      supports_tools: false,
      supports_vision: false,
      context_window: null,
    });
  });
  it.each(["id", "context_length", "supported_features", "input_modalities"])(
    "recusa campo malformado %s",
    (campo) => {
      expect(() => traduzirCatalogoChutes(catalogo({ ...modelo(), [campo]: {} }))).toThrow();
    },
  );
});

describe("USD/1M para centavos/1M exatos", () => {
  it.each([
    [0, 0],
    [0.104, 10.4],
    [0.416, 41.6],
    [0.0245, 2.45],
    ["0.0000001", 0.0001],
    ["1.000001000000000001", 100.0002],
    ["9999.999999", 999999.9999],
    ["1e-7", 0.0001],
  ])("%s → %s", (valor, esperado) => {
    expect(precoChutesParaCentavos(valor)).toBe(esperado);
  });
  it.each(["-0.01", "NaN", "Infinity", "1e100000", "9999.9999991", "", "0x10"])("recusa %s", (v) =>
    expect(() => precoChutesParaCentavos(v)).toThrow(),
  );
});

describe("GET público limitado", () => {
  it("usa URL fixa, GET, sem autenticação nem redirect", async () => {
    const fetcher = vi.fn(async () => Response.json(fixture));
    expect(await buscarCatalogoChutes(fetcher)).toHaveLength(14);
    expect(fetcher).toHaveBeenCalledWith(
      "https://llm.chutes.ai/v1/models",
      expect.objectContaining({
        method: "GET",
        redirect: "error",
        credentials: "omit",
        headers: { accept: "application/json" },
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it.each([302, 401, 500])("recusa HTTP %s", async (status) => {
    await expect(
      buscarCatalogoChutes(async () => new Response("{}", { status })),
    ).rejects.toThrow();
  });
  it.each(["{", "{}", "null"])("recusa JSON inválido %s", async (body) => {
    await expect(
      buscarCatalogoChutes(
        async () => new Response(body, { headers: { "content-type": "application/json" } }),
      ),
    ).rejects.toThrow();
  });
  it("recusa Content-Type incorreto", async () => {
    await expect(
      buscarCatalogoChutes(async () => new Response(JSON.stringify(fixture))),
    ).rejects.toThrow();
  });
  it("limita o corpo mesmo sem content-length", async () => {
    await expect(
      buscarCatalogoChutes(
        async () =>
          new Response(" ".repeat(1048577), { headers: { "content-type": "application/json" } }),
      ),
    ).rejects.toThrow(/tamanho/);
  });
  it("preserva o decimal JSON anterior ao arredondamento IEEE754", async () => {
    const body = JSON.stringify(catalogo())
      .replace('"prompt":0.12', '"prompt":1.000001000000000001')
      .replace('"usd":0.12', '"usd":1.000001000000000001');
    const linhas = await buscarCatalogoChutes(
      async () => new Response(body, { headers: { "content-type": "application/json" } }),
    );
    expect(linhas[0]!.input_price_per_million_cents).toBe(100.0002);
  });
  it("aplica prazo de 20s e aborta a leitura pendente", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode("{"));
      },
      cancel,
    });
    const pendente = buscarCatalogoChutes(
      async () => new Response(stream, { headers: { "content-type": "application/json" } }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort(new Error("prazo expirado"));
    try {
      await expect(pendente).rejects.toThrow("prazo expirado");
      expect(timeout).toHaveBeenCalledWith(20_000);
      expect(cancel).toHaveBeenCalled();
    } finally {
      timeout.mockRestore();
    }
  }, 1000);
  it("propaga erro de rede", async () => {
    await expect(
      buscarCatalogoChutes(async () => {
        throw new Error("rede bloqueada");
      }),
    ).rejects.toThrow("rede bloqueada");
  });
});
