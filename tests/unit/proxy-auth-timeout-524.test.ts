// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const estado = vi.hoisted(() => ({
  user: { id: "user-de-teste" } as { id: string } | null,
  erro: null as { name?: string; status?: number } | null,
  lancar: false,
  admin: true,
  erroRpc: null as { code: string } | null,
  lancarRpc: false,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.exemplo.com",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-ficticia",
    NEXT_PUBLIC_APP_URL: "https://elus.exemplo.com",
    IMPERSONATE_COOKIE_SECRET: "",
  },
}));
vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => true }));
vi.mock("@/lib/auth/public-paths", () => ({ isPublicPath: () => false }));
vi.mock("@/lib/impersonate/cookie-edge", () => ({
  IMPERSONATE_COOKIE_NAME_EDGE: "impersonate",
  verifyImpersonateCookieEdge: async () => ({ valid: false }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => {
        if (estado.lancar) throw new Error("transporte indisponível");
        return { data: { user: estado.user }, error: estado.erro };
      },
    },
    rpc: async () => {
      if (estado.lancarRpc) throw new Error("PostgREST sem resposta");
      return { data: estado.admin, error: estado.erroRpc };
    },
  }),
}));

const { proxy } = await import("@/proxy");

function requisição(path: string) {
  return new NextRequest("https://elus.exemplo.com" + path);
}

beforeEach(() => {
  estado.user = { id: "user-de-teste" };
  estado.erro = null;
  estado.lancar = false;
  estado.admin = true;
  estado.erroRpc = null;
  estado.lancarRpc = false;
});

describe("proxy — falha temporária de Auth nunca vira logout nem admin forbidden", () => {
  it("API recebe 503 JSON + Retry-After durante timeout de autenticação", async () => {
    estado.user = null;
    estado.erro = { name: "AuthRetryableFetchError", status: 0 };
    const resposta = await proxy(requisição("/api/v1/auth/interface"));
    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("retry-after")).toBe("5");
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    expect(resposta.headers.get("location")).toBeNull();
    expect((await resposta.json()).error.code).toBe("auth_temporarily_unavailable");
  });

  it("UI recebe 503 sem ser redirecionada para login", async () => {
    estado.user = null;
    estado.erro = { name: "AuthRetryableFetchError", status: 503 };
    const resposta = await proxy(requisição("/app/settings"));
    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("location")).toBeNull();
  });

  it("uma exceção de transporte também falha fechado com 503", async () => {
    estado.lancar = true;
    const resposta = await proxy(requisição("/app/inbox"));
    expect(resposta.status).toBe(503);
  });

  it("sessão de fato ausente continua indo ao login", async () => {
    estado.user = null;
    estado.erro = { name: "AuthSessionMissingError", status: 400 };
    const resposta = await proxy(requisição("/app/settings"));
    expect(resposta.status).toBe(307);
    expect(resposta.headers.get("location")).toContain("/login?next=%2Fapp%2Fsettings");
  });

  it("credencial inválida na API continua sendo 401, não 503", async () => {
    estado.user = null;
    estado.erro = { name: "AuthApiError", status: 401 };
    const resposta = await proxy(requisição("/api/v1/auth/interface"));
    expect(resposta.status).toBe(401);
  });

  it("falha de consulta de plataforma não vira acesso proibido", async () => {
    estado.erroRpc = { code: "PGRST002" };
    const resposta = await proxy(requisição("/admin"));
    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("location")).toBeNull();
  });

  it("exceção de transporte na RPC de plataforma também devolve 503", async () => {
    estado.lancarRpc = true;
    const resposta = await proxy(requisição("/admin"));
    expect(resposta.status).toBe(503);
  });

  it("não-admin validado continua proibido no admin", async () => {
    estado.admin = false;
    const resposta = await proxy(requisição("/admin"));
    expect(resposta.status).toBe(307);
    expect(resposta.headers.get("location")).toContain("/admin/forbidden");
  });

  it("identidade válida e permissões disponíveis continuam no app", async () => {
    const resposta = await proxy(requisição("/app/settings"));
    expect(resposta.status).toBe(200);
  });
});
