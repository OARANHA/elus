import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({
  chutes: vi.fn(),
  autoriza: vi.fn(),
  audit: vi.fn(),
  logError: vi.fn(),
}));
vi.mock("@/lib/ai/catalogo/sincronizar-chutes", () => ({
  sincronizarCatalogoChutes: mocks.chutes,
}));
vi.mock("@/lib/auth/cron-auth", () => ({ autorizaCron: mocks.autoriza }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.logError },
}));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }));
import { GET } from "./route";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const requests: string[] = [];
const admin = createClient("https://banco.invalid", "offline-test", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: async (input) => {
      requests.push(String(input));
      return Response.json([]);
    },
  },
});
const req = () => new Request("https://app.invalid/api/v1/cron/sync-model-catalog") as NextRequest;
beforeEach(() => {
  vi.clearAllMocks();
  requests.length = 0;
  mocks.autoriza.mockReturnValue(true);
  mocks.chutes.mockResolvedValue({
    fonte: "chutes",
    recebidos: 14,
    gravados: 14,
    depreciados: 0,
    ressuscitados: 0,
  });
});

describe("cron canônico com duas fontes", () => {
  it("sem autorização não busca nem persiste catálogo", async () => {
    mocks.autoriza.mockReturnValue(false);
    expect((await GET(req())).status).toBe(401);
    expect(mocks.chutes).not.toHaveBeenCalled();
    expect(requests).toEqual([]);
  });
  it("executa Chutes e OpenRouter na mesma rodada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    try {
      const res = await GET(req());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.fontes.map((f: { fonte: string }) => f.fonte)).toEqual([
        "openrouter",
        "chutes",
      ]);
      expect(mocks.chutes).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("falha OpenRouter não impede tentativa Chutes nem vira sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    try {
      expect((await GET(req())).status).toBe(500);
      expect(mocks.chutes).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("falha Chutes não é ocultada pelo sucesso OpenRouter", async () => {
    mocks.chutes.mockRejectedValue(new Error("chutes_erro"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    try {
      expect((await GET(req())).status).toBe(500);
      expect(requests.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("observabilidade sem payload remoto", () => {
  it.each([
    [new Error("chutes_catalogo_http_503: SECRET"), "chutes_catalogo_http_503"],
    [
      new Error("chutes_catalogo_persistencia_falhou: SECRET"),
      "chutes_catalogo_persistencia_falhou",
    ],
    [new DOMException("SECRET", "TimeoutError"), "catalogo_timeout"],
  ])("classifica %s sem copiar a mensagem", async (error, motivo) => {
    mocks.chutes.mockRejectedValue(error);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    try {
      await GET(req());
      expect(mocks.logError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ fonte: "chutes", motivo }),
      );
      expect(JSON.stringify(mocks.logError.mock.calls)).not.toContain("SECRET");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("audita a rodada Chutes mutante com contagens e sem tenant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [] })),
    );
    try {
      await GET(req());
      expect(AUDIT_ACTIONS).toContain("ai.catalog_sync");
      expect(mocks.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ai.catalog_sync",
          organizationId: null,
          bypassedRls: true,
          metadata: expect.objectContaining({ fonte: "chutes", gravados: 14 }),
        }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it.each(["sem_efeito", "falha"])(
    "não audita Chutes %s como mutação bem-sucedida",
    async (modo) => {
      if (modo === "falha") mocks.chutes.mockRejectedValue(new Error("falhou"));
      else
        mocks.chutes.mockResolvedValue({
          fonte: "chutes",
          recebidos: 14,
          gravados: 0,
          depreciados: 0,
          ressuscitados: 0,
        });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ data: [] })),
      );
      try {
        await GET(req());
        expect(mocks.audit).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
