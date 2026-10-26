/**
 * Gate unitário das ações de regeneração MFA na PR #43.
 * Usa clientes simulados: NÃO acessa Supabase, NÃO executa SQL e NÃO prova
 * serialização entre duas requisições concorrentes (gate separado).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  listFactors: vi.fn(),
  sessionAal: vi.fn(),
  isServiceRoleConfigured: vi.fn(),
  createAdminClient: vi.fn(),
  audit: vi.fn(),
  generateRecoveryCodes: vi.fn(),
  hashRecoveryCode: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/http/ip-do-cliente", () => ({ ipDoCliente: () => "127.0.0.1" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser, mfa: { listFactors: mocks.listFactors } },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/audit", () => ({
  audit: mocks.audit,
  isServiceRoleConfigured: mocks.isServiceRoleConfigured,
}));
vi.mock("@/lib/auth/recovery-codes", () => ({
  generateRecoveryCodes: mocks.generateRecoveryCodes,
  hashRecoveryCode: mocks.hashRecoveryCode,
}));
vi.mock("@/lib/auth/server", () => ({ sessionAal: mocks.sessionAal }));

import { regenerateRecoveryCodes } from "./regenerateRecoveryCodes";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CODES = Array.from({ length: 10 }, (_, i) => "CODE" + String(i).padStart(4, "0"));
const NEW_IDS = CODES.map((_, i) => "new-" + i);

function bancoSimulado(falhas: { read?: boolean; insert?: boolean; delete?: boolean } = {}) {
  const leituraEq = vi.fn(async () => ({
    data: falhas.read ? null : [{ id: "old-1" }],
    error: falhas.read ? { message: "read failed" } : null,
  }));
  const insercaoSelect = vi.fn(async () => ({
    data: falhas.insert ? null : NEW_IDS.map((id) => ({ id })),
    error: falhas.insert ? { message: "insert failed" } : null,
  }));
  const insert = vi.fn((_rows: unknown) => ({ select: insercaoSelect }));
  const exclusoes: Array<{ coluna: string; usuario: string; ids: string[] }> = [];
  const deleteEq = vi.fn((coluna: string, usuario: string) => ({
    in: async (_colunaIds: string, ids: string[]) => {
      exclusoes.push({ coluna, usuario, ids });
      return {
        error: falhas.delete && exclusoes.length === 1
          ? { message: "delete failed" }
          : null,
      };
    },
  }));
  const from = vi.fn((_tabela: string) => ({
    select: (_colunas: string) => ({ eq: leituraEq }),
    insert,
    delete: () => ({ eq: deleteEq }),
  }));
  return { from, leituraEq, insercaoSelect, insert, deleteEq, exclusoes };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  mocks.listFactors.mockResolvedValue({
    data: { totp: [{ status: "verified" }] },
  });
  mocks.sessionAal.mockResolvedValue("aal2");
  mocks.isServiceRoleConfigured.mockReturnValue(true);
  mocks.generateRecoveryCodes.mockReturnValue(CODES);
  mocks.hashRecoveryCode.mockImplementation((code: string) => Buffer.from(code));
  mocks.audit.mockResolvedValue(undefined);
  mocks.createAdminClient.mockReturnValue(bancoSimulado());
});

describe("regenerateRecoveryCodes — autorização e persistência", () => {
  it("recusa sessão ausente sem ler fatores nem escrever", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "unauthenticated" });
    expect(mocks.listFactors).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("recusa conta sem TOTP verificado", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "mfa_not_enrolled" });
    expect(mocks.sessionAal).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each(["aal1", null, undefined])(
    "recusa nível de sessão %s sem qualquer escrita",
    async (nivel) => {
      mocks.sessionAal.mockResolvedValue(nivel);
      expect(await regenerateRecoveryCodes()).toEqual({
        ok: false,
        error: "mfa_session_verification_required",
      });
      expect(mocks.createAdminClient).not.toHaveBeenCalled();
      expect(mocks.audit).not.toHaveBeenCalled();
    },
  );

  it("falha na leitura de AAL sem abrir o cliente administrativo", async () => {
    mocks.sessionAal.mockRejectedValue(new Error("auth indisponível"));
    await expect(regenerateRecoveryCodes()).rejects.toThrow("auth indisponível");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("recusa serviço ausente antes de consultar códigos", async () => {
    mocks.isServiceRoleConfigured.mockReturnValue(false);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "service_unavailable" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("em AAL2, grava dez hashes por usuário, exclui só IDs antigos e entrega após persistir", async () => {
    const db = bancoSimulado();
    mocks.createAdminClient.mockReturnValue(db);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: true, recovery_codes: CODES });
    expect(db.from).toHaveBeenCalledWith("user_recovery_codes");
    expect(db.leituraEq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(db.insert).toHaveBeenCalledWith(
      CODES.map((code) => ({ user_id: USER_ID, code_hash: Buffer.from(code) })),
    );
    expect(db.exclusoes).toEqual([{ coluna: "user_id", usuario: USER_ID, ids: ["old-1"] }]);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "mfa.recovery_codes_regenerated",
        actorUserId: USER_ID,
        metadata: { count: 10 },
      }),
    );
  });

  it("falha de SELECT não insere nem revela códigos", async () => {
    const db = bancoSimulado({ read: true });
    mocks.createAdminClient.mockReturnValue(db);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "read_failed" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("falha de INSERT preserva códigos antigos e não revela novos", async () => {
    const db = bancoSimulado({ insert: true });
    mocks.createAdminClient.mockReturnValue(db);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "insert_failed" });
    expect(db.exclusoes).toHaveLength(0);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("falha de DELETE tenta compensar somente IDs novos e não revela códigos", async () => {
    const db = bancoSimulado({ delete: true });
    mocks.createAdminClient.mockReturnValue(db);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "delete_failed" });
    expect(db.exclusoes).toEqual([
      { coluna: "user_id", usuario: USER_ID, ids: ["old-1"] },
      { coluna: "user_id", usuario: USER_ID, ids: NEW_IDS },
    ]);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
