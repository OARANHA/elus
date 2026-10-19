// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { erroTransitorioDeAuth } from "@/lib/auth/erro-transitorio";
import { fetchAuthComPrazo, fetchDoServidor } from "@/lib/supabase/fetch-do-servidor";

const PUBLICA = "https://projeto.supabase.co";
const INTERNA = "http://kong:8000";

describe("deadline da autenticação — falha fechada e requisição abortada", () => {
  it("cancela de verdade /auth/v1/user sem aguardar o Cloudflare 524", async () => {
    const fetchParado = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      }),
    );
    const comPrazo = fetchAuthComPrazo(fetchParado as typeof fetch, 25);
    await expect(comPrazo(PUBLICA + "/auth/v1/user")).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetchParado).toHaveBeenCalledTimes(1);
  });

  it("preserva cancelamento do chamador em vez de substituí-lo", async () => {
    const cancelamento = new AbortController();
    const fetchParado = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      }),
    );
    const request = fetchAuthComPrazo(fetchParado as typeof fetch, 5_000);
    const pendente = request(PUBLICA + "/auth/v1/user", { signal: cancelamento.signal });
    cancelamento.abort(new Error("navegação cancelada"));
    await expect(pendente).rejects.toThrow("navegação cancelada");
  });

  it("não altera fetchs de negócio nem uploads, mesmo com a mesma origem", async () => {
    const base = vi.fn(async () => new Response("{}", { status: 200 }));
    const bounded = fetchAuthComPrazo(base as typeof fetch, 20);
    await bounded(PUBLICA + "/rest/v1/orders", { method: "GET" });
    await bounded(PUBLICA + "/storage/v1/object/upload/file", { method: "POST" });
    for (const [, options] of base.mock.calls) {
      expect(options).toEqual(expect.objectContaining({ method: expect.any(String) }));
      expect(options).not.toHaveProperty("signal");
    }
  });

  it("limita leitura de membership e RPC de admin, nunca mutação de tabela", async () => {
    const base = vi.fn(async () => new Response("{}", { status: 200 }));
    const bounded = fetchAuthComPrazo(base as typeof fetch, 20);
    await bounded(PUBLICA + "/rest/v1/user_organizations?select=role", { method: "GET" });
    await bounded(PUBLICA + "/rest/v1/rpc/fn_is_platform_admin", { method: "POST" });
    await bounded(PUBLICA + "/rest/v1/organizations", { method: "PATCH" });
    expect(base.mock.calls[0]![1]?.signal).toBeDefined();
    expect(base.mock.calls[1]![1]?.signal).toBeDefined();
    expect(base.mock.calls[2]![1]).not.toHaveProperty("signal");
  });

  it("preserva a reescrita de URL do Supabase sem publicar o endereço interno", async () => {
    const vistos: string[] = [];
    const realFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        vistos.push(String(input));
        return new Response("{}", { status: 200 });
      }) as typeof fetch;
      const fetchDoSrv = fetchAuthComPrazo(fetchDoServidor(INTERNA, PUBLICA));
      await fetchDoSrv(PUBLICA + "/auth/v1/user");
      expect(vistos).toEqual([INTERNA + "/auth/v1/user"]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("erro de autenticação não se confunde com sessão inválida", () => {
  it("classifica erro transitório por tipo e status", () => {
    expect(erroTransitorioDeAuth({ name: "AuthRetryableFetchError" })).toBe(true);
    expect(erroTransitorioDeAuth({ name: "TimeoutError" })).toBe(true);
    expect(erroTransitorioDeAuth({ status: 429 })).toBe(true);
    expect(erroTransitorioDeAuth({ status: 503 })).toBe(true);
  });

  it("não transforma credencial inválida nem ausência legítima de sessão em 503", () => {
    expect(erroTransitorioDeAuth({ name: "AuthSessionMissingError", status: 400 })).toBe(false);
    expect(erroTransitorioDeAuth({ name: "AuthApiError", status: 401 })).toBe(false);
    expect(erroTransitorioDeAuth({ name: "AuthApiError", status: 403 })).toBe(false);
    expect(erroTransitorioDeAuth(null)).toBe(false);
  });
});
