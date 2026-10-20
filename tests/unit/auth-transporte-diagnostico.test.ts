// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const registrar = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { warn: registrar.warn } }));

const { fetchAuthComPrazo } = await import("@/lib/supabase/fetch-do-servidor");
const PUBLICA = "https://projeto.supabase.co";

beforeEach(() => registrar.warn.mockClear());

describe("diagnóstico do transporte Auth: só metadados seguros", () => {
  it("não escreve logs para uma validação rápida, incluindo HTTP 401 esperado", async () => {
    const base = vi.fn(async () => new Response("{}", { status: 401 }));
    const fetchSeguro = fetchAuthComPrazo(base as typeof fetch, 1000, "proxy");
    const resposta = await fetchSeguro(PUBLICA + "/auth/v1/user");
    expect(resposta.status).toBe(401);
    expect(registrar.warn).not.toHaveBeenCalled();
  });

  it("registra falha HTTP sem query string, chave, header ou usuário", async () => {
    const base = vi.fn(async () => new Response("{}", { status: 503 }));
    const fetchSeguro = fetchAuthComPrazo(base as typeof fetch, 1000, "ssr");
    await fetchSeguro(PUBLICA + "/auth/v1/user?token=segredo-em-query", {
      headers: { Authorization: "Bearer segredo-no-header" },
    });
    expect(registrar.warn).toHaveBeenCalledWith(
      "[auth] transporte Supabase respondeu lento ou com erro",
      expect.objectContaining({
        origem: "ssr",
        endpoint: "/auth/v1/user",
        metodo: "GET",
        fase: "cabecalhos",
        http_status: 503,
      }),
    );
    const registro = JSON.stringify(registrar.warn.mock.calls);
    expect(registro).not.toContain("segredo-em-query");
    expect(registro).not.toContain("segredo-no-header");
    expect(registro).not.toContain(PUBLICA);
  });

  it("mantém o erro original e identifica cancelamento do chamador", async () => {
    const erro = new Error("conteúdo sensível que não deve ser logado");
    const controlador = new AbortController();
    const base = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(erro), { once: true });
      }),
    );
    const fetchSeguro = fetchAuthComPrazo(base as typeof fetch, 1000, "proxy");
    const pendente = fetchSeguro(PUBLICA + "/auth/v1/user", { signal: controlador.signal });
    controlador.abort(erro);
    await expect(pendente).rejects.toBe(erro);
    expect(registrar.warn).toHaveBeenCalledWith(
      "[auth] transporte Supabase sem resposta",
      expect.objectContaining({
        origem: "proxy",
        endpoint: "/auth/v1/user",
        motivo: "chamador",
        tipo_erro: "desconhecido",
      }),
    );
    expect(JSON.stringify(registrar.warn.mock.calls)).not.toContain("conteúdo sensível");
  });

  it("conta chamadas concorrentes sem reter identificadores de sessão", async () => {
    let resolver: ((resposta: Response) => void) | undefined;
    const promessa = new Promise<Response>((resolve) => { resolver = resolve; });
    const base = vi.fn(() => promessa);
    const fetchSeguro = fetchAuthComPrazo(base as typeof fetch, 1000, "proxy");
    const primeira = fetchSeguro(PUBLICA + "/auth/v1/user");
    const segunda = fetchSeguro(PUBLICA + "/auth/v1/user");
    resolver!(new Response("{}", { status: 503 }));
    await Promise.all([primeira, segunda]);
    const contagens = registrar.warn.mock.calls.map(([, dados]) =>
      (dados as { concorrentes_inicio: number }).concorrentes_inicio,
    );
    expect(contagens).toEqual([1, 2]);
  });

  it("não instrumenta nem limita chamadas de negócios", async () => {
    const base = vi.fn(async () => new Response("{}", { status: 503 }));
    const fetchSeguro = fetchAuthComPrazo(base as typeof fetch, 1000, "admin");
    await fetchSeguro(PUBLICA + "/rest/v1/orders", { method: "GET" });
    expect(registrar.warn).not.toHaveBeenCalled();
    expect(base.mock.calls[0]![1]).toEqual({ method: "GET" });
  });
});
