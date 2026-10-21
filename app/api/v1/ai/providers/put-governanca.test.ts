import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient as supabase } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { fail } from "@/lib/api/wrappers";
import { PUT } from "./route";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => {}) }));

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CRED_A = "11111111-1111-4111-8111-111111111111";
const CRED_B = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";
const usuario = {
  id: ID,
  idioma: "pt-BR",
  is_platform_admin: false,
  platform_admin_scope: null,
  support: null,
};
const binding = () => ({
  id: ID,
  organization_id: A,
  purpose: "stage_classifier",
  provider: "openai",
  model_id: "gpt-5.4-mini",
  credential_id: null as string | null,
  base_url: null as string | null,
  is_enabled: true,
});
let estado: {
  anterior: ReturnType<typeof binding> | null;
  grants: Record<string, Record<string, boolean> | null>;
  consultas: URL[];
  escritas: unknown[];
  leitura?: "erro" | "malformada" | "tenant_errado";
  semPreco?: boolean;
  erroGrants?: boolean;
  concorrencia?: "alterar" | "criar";
};

function cliente() {
  return supabase("https://offline.invalid", "offline-test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `offline-test-${Math.random()}`,
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        estado.consultas.push(url);
        const tabela = url.pathname.split("/").at(-1);
        const org = url.searchParams.get("organization_id")?.replace("eq.", "");
        if (tabela === "organizations") {
          if (estado.erroGrants)
            return Response.json({ message: "leitura falhou", code: "XX000" }, { status: 400 });
          const id = url.searchParams.get("id")?.replace("eq.", "");
          return Response.json(estado.grants[id!] ? { ai_autonomy: estado.grants[id!] } : null);
        }
        if (tabela === "ai_purpose_bindings") {
          if (init?.method === "POST" || init?.method === "PATCH") {
            if (estado.concorrencia) {
              estado.anterior = { ...binding(), provider: "anthropic", credential_id: CRED_B };
              estado.concorrencia = undefined;
            }
            if (init.method === "PATCH") {
              const atual = estado.anterior;
              const filtros = [
                "id",
                "organization_id",
                "purpose",
                "provider",
                "model_id",
                "credential_id",
                "base_url",
                "is_enabled",
              ] as const;
              if (
                !atual ||
                filtros.some(
                  (campo) =>
                    url.searchParams.get(campo) !==
                    (atual[campo] === null ? "is.null" : `eq.${atual[campo]}`),
                )
              )
                return Response.json(null);
            } else if (
              estado.anterior &&
              !new Headers(init.headers).get("prefer")?.includes("resolution=merge-duplicates")
            ) {
              return Response.json({ code: "23505", message: "já existe" }, { status: 409 });
            }
            const corpo = JSON.parse(String(init.body));
            estado.escritas.push(corpo);
            return Response.json({ id: ID, ...corpo });
          }
          if (estado.leitura === "erro")
            return Response.json({ message: "leitura falhou", code: "XX000" }, { status: 400 });
          if (estado.leitura === "malformada") return Response.json({ provider: "openai" });
          if (estado.leitura === "tenant_errado")
            return Response.json({ ...binding(), organization_id: B });
          return Response.json(
            estado.anterior?.organization_id === org &&
              estado.anterior?.purpose === url.searchParams.get("purpose")?.replace("eq.", "")
              ? estado.anterior
              : null,
          );
        }
        if (tabela === "ai_provider_credentials") {
          const id = url.searchParams.get("id")?.replace("eq.", "");
          return Response.json(org === A && id === CRED_A ? { id, provider: "openai" } : null);
        }
        if (tabela === "ai_models")
          return Response.json(
            estado.semPreco
              ? null
              : {
                  model_id: "gpt-5.4-mini",
                  supports_tools: true,
                  supports_vision: false,
                  input_price_per_million_cents: 10,
                  output_price_per_million_cents: 40,
                },
          );
        throw new Error(`Tabela não esperada: ${tabela}`);
      },
    },
  });
}
const request = (alteracoes: Record<string, unknown> = {}) =>
  new NextRequest("https://app.invalid/api/v1/ai/providers", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      purpose: "stage_classifier",
      provider: "openai",
      model_id: "gpt-5.4-mini",
      ...alteracoes,
    }),
  });
const permitir = (...grants: string[]) => {
  estado.grants[A] = Object.fromEntries(grants.map((g) => [g, true]));
};

beforeEach(() => {
  vi.clearAllMocks();
  estado = {
    anterior: binding(),
    grants: { [A]: {}, [B]: { provider: true, model: true, credentials: true } },
    consultas: [],
    escritas: [],
  };
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: usuario,
    org: { orgId: A, role: "admin" },
  } as never);
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  vi.mocked(createClient).mockResolvedValue(cliente());
  vi.mocked(createAdminClient).mockReturnValue(cliente());
});

function semEscrita() {
  expect(estado.escritas).toEqual([]);
  expect(audit).not.toHaveBeenCalled();
}

describe("PUT exige grants independentes para mudanças reais", () => {
  it("provider concedido não autoriza modelo", async () => {
    permitir("provider");
    expect((await PUT(request({ model_id: "outro-modelo" }))).status).toBe(403);
    semEscrita();
  });
  it("provider concedido não autoriza credencial", async () => {
    permitir("provider");
    expect((await PUT(request({ credential_id: CRED_A }))).status).toBe(403);
    semEscrita();
  });
  it("apenas model permite trocar somente modelo", async () => {
    permitir("model");
    expect((await PUT(request({ model_id: "outro-modelo" }))).status).toBe(200);
    expect(estado.escritas).toHaveLength(1);
  });
  it("apenas credentials permite trocar somente credencial", async () => {
    permitir("credentials");
    expect((await PUT(request({ credential_id: CRED_A }))).status).toBe(200);
    expect(estado.escritas).toHaveLength(1);
  });
  it("model não autoriza mudar provider", async () => {
    permitir("model");
    expect((await PUT(request({ provider: "anthropic" }))).status).toBe(403);
    semEscrita();
  });
  it("exige todos os grants numa alteração combinada", async () => {
    permitir("provider", "model");
    expect(
      (await PUT(request({ provider: "openai", model_id: "outro", credential_id: CRED_A }))).status,
    ).toBe(403);
    semEscrita();
  });
  it("revogação vale na próxima requisição", async () => {
    permitir("model");
    expect((await PUT(request({ model_id: "outro" }))).status).toBe(200);
    estado.escritas = [];
    vi.mocked(audit).mockClear();
    permitir();
    expect((await PUT(request({ model_id: "outro" }))).status).toBe(403);
    semEscrita();
  });
  it.each([{ base_url: "https://gateway.example/v1" }, { is_enabled: false }])(
    "endpoint/ativação exigem provider: %j",
    async (alteracoes) => {
      permitir("model", "credentials");
      expect((await PUT(request(alteracoes))).status).toBe(403);
      semEscrita();
      permitir("provider");
      expect((await PUT(request(alteracoes))).status).toBe(200);
    },
  );
  it("omitir credencial limpa o valor, logo exige credentials", async () => {
    estado.anterior!.credential_id = CRED_A;
    permitir("provider");
    expect((await PUT(request())).status).toBe(403);
    semEscrita();
  });
  it("omitir endpoint ou enabled também considera os defaults reais gravados", async () => {
    estado.anterior!.base_url = "https://old.example/v1";
    estado.anterior!.is_enabled = false;
    permitir("model", "credentials");
    expect((await PUT(request())).status).toBe(403);
    semEscrita();
  });
  it("ausência de binding requer provider e model, não apenas provider", async () => {
    estado.anterior = null;
    permitir("provider");
    expect((await PUT(request())).status).toBe(403);
    semEscrita();
    permitir("provider", "model");
    expect((await PUT(request())).status).toBe(200);
  });
  it("reenvio idêntico não exige grants nem gera nova mutação", async () => {
    expect((await PUT(request())).status).toBe(200);
    semEscrita();
  });
  it("sucesso autorizado preserva audit e tenant", async () => {
    permitir("provider", "model", "credentials");
    expect(
      (await PUT(request({ model_id: "outro", credential_id: CRED_A, organization_id: B }))).status,
    ).toBe(200);
    expect(estado.escritas[0]).toMatchObject({ organization_id: A, credential_id: CRED_A });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: A,
        resourceId: ID,
        action: "ai.purpose_binding_updated",
      }),
    );
  });
});

describe("PUT recusa alterações concorrentes", () => {
  it("grant de modelo não restaura provider ou credencial alterados depois do snapshot", async () => {
    permitir("model");
    estado.concorrencia = "alterar";
    expect((await PUT(request({ model_id: "outro" }))).status).toBe(409);
    expect(estado.anterior).toMatchObject({ provider: "anthropic", credential_id: CRED_B });
    semEscrita();
  });
  it("criação concorrente não é sobrescrita por upsert", async () => {
    permitir("provider", "model", "credentials");
    estado.anterior = null;
    estado.concorrencia = "criar";
    expect((await PUT(request())).status).toBe(409);
    expect(estado.anterior).toMatchObject({ provider: "anthropic", credential_id: CRED_B });
    semEscrita();
  });
});

describe("PUT falha fechado e mantém o escopo autenticado", () => {
  it.each(["erro", "malformada", "tenant_errado"] as const)(
    "leitura %s não escreve",
    async (leitura) => {
      estado.leitura = leitura;
      permitir("provider", "model", "credentials");
      expect((await PUT(request({ model_id: "outro" }))).status).toBe(503);
      semEscrita();
    },
  );
  it("leitura dos grants falha: nega a mudança", async () => {
    estado.erroGrants = true;
    expect((await PUT(request({ model_id: "outro" }))).status).toBe(403);
    semEscrita();
  });
  it("tenant A não recebe grants de B e consulta o purpose correto", async () => {
    expect((await PUT(request({ model_id: "outro", organization_id: B }))).status).toBe(403);
    semEscrita();
    const leitura = estado.consultas.find((u) => u.pathname.endsWith("ai_purpose_bindings"));
    expect(leitura?.searchParams.get("organization_id")).toBe(`eq.${A}`);
    expect(leitura?.searchParams.get("purpose")).toBe("eq.stage_classifier");
  });
  it("recusa chave de outro tenant mesmo com grant credentials", async () => {
    permitir("provider", "model", "credentials");
    expect((await PUT(request({ credential_id: CRED_B }))).status).toBe(422);
    semEscrita();
  });
  it("suporte somente leitura interrompe antes do banco", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(
      fail("forbidden", "Acesso negado no teste", 403),
    );
    expect((await PUT(request({ model_id: "outro" }))).status).toBe(403);
    expect(estado.consultas).toEqual([]);
    semEscrita();
  });
  it("papel sem autorização não alcança o banco", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: fail("forbidden", "Acesso negado no teste", 403),
    });
    expect((await PUT(request())).status).toBe(403);
    expect(estado.consultas).toEqual([]);
    semEscrita();
  });
  it("reenvio Chutes sem tarifa também preserva a validação existente", async () => {
    estado.anterior = { ...binding(), provider: "chutes", model_id: "Qwen/Qwen3-32B-TEE" };
    estado.semPreco = true;
    expect(
      (await PUT(request({ provider: "chutes", model_id: "Qwen/Qwen3-32B-TEE" }))).status,
    ).toBe(422);
    semEscrita();
  });
  it("Chutes sem tarifa comprovada continua recusado", async () => {
    permitir("provider", "model", "credentials");
    estado.semPreco = true;
    expect(
      (await PUT(request({ provider: "chutes", model_id: "Qwen/Qwen3-32B-TEE" }))).status,
    ).toBe(422);
    semEscrita();
  });
});
