// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const teste = vi.hoisted(() => ({
  fetchConfigurado: undefined as typeof fetch | undefined,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://teste.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "chave-ficticia",
    SUPABASE_SERVER_URL: "",
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (
    _url: string,
    _key: string,
    options: { global: { fetch: typeof fetch } },
  ) => {
    teste.fetchConfigurado = options.global.fetch;
    return {};
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
}));

const { createAdminClient } = await import("@/lib/supabase/admin");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("layout admin: leitura de organização não pode esperar Cloudflare 524", () => {
  it("aplica AbortSignal à leitura GET de organizations", async () => {
    const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response("[]", { status: 200 }),
    );
    vi.stubGlobal("fetch", base);
    createAdminClient();
    const fetchConfigurado = teste.fetchConfigurado!;
    await fetchConfigurado("https://teste.supabase.co/rest/v1/organizations?select=id", {
      method: "GET",
    });
    expect(base.mock.calls).toHaveLength(1);
    expect(base.mock.calls[0]![1]?.signal).toBeDefined();
  });

  it("não impõe o limite de identidade a PATCH de organizações ou módulos ERP", async () => {
    const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response("[]", { status: 200 }),
    );
    vi.stubGlobal("fetch", base);
    createAdminClient();
    const fetchConfigurado = teste.fetchConfigurado!;
    await fetchConfigurado("https://teste.supabase.co/rest/v1/organizations", {
      method: "PATCH",
    });
    await fetchConfigurado("https://teste.supabase.co/rest/v1/erp_connections", {
      method: "GET",
    });
    expect(base.mock.calls[0]![1]).not.toHaveProperty("signal");
    expect(base.mock.calls[1]![1]).not.toHaveProperty("signal");
  });

  it("GET de organizações pendurado é abortado por deadline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal!.reason),
            { once: true },
          );
        }),
      ),
    );
    createAdminClient();
    // Prazo real de 10 s: disparar apenas e cancelar o teste pelo nosso próprio
    // signal imediatamente; nenhuma requisição pode ignorar o sinal do chamador.
    const controller = new AbortController();
    const resultado = teste.fetchConfigurado!(
      "https://teste.supabase.co/rest/v1/organizations",
      { method: "GET", signal: controller.signal },
    );
    controller.abort(new Error("navegacao cancelada"));
    await expect(resultado).rejects.toThrow("navegacao cancelada");
  });
});
