/**
 * Contrato de autorização e chamada RPC da rotação MFA.
 * Clientes simulados NÃO provam concorrência real nem aplicam migration.
 * A prova de duas transações concorrentes requer Postgres isolado.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  listFactors: vi.fn(),
  sessionAal: vi.fn(),
  isServiceRoleConfigured: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
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
const HEX_HASHES = CODES.map((code) => createHash("sha256").update(code).digest("hex"));
const rpcName = "fn_elus_rotacionar_codigos_recuperacao";
const rpcArgs = { p_user_id: USER_ID, p_hashes_hex: HEX_HASHES };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  mocks.listFactors.mockResolvedValue({ data: { totp: [{ status: "verified" }] } });
  mocks.sessionAal.mockResolvedValue("aal2");
  mocks.isServiceRoleConfigured.mockReturnValue(true);
  mocks.generateRecoveryCodes.mockReturnValue(CODES);
  mocks.hashRecoveryCode.mockImplementation((code: string) => createHash("sha256").update(code).digest());
  mocks.rpc.mockResolvedValue({ data: 10, error: null });
  mocks.audit.mockResolvedValue(undefined);
  mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc });
});

describe("regenerateRecoveryCodes — contrato da rotação atômica", () => {
  it("recusa sessão ausente sem tocar na RPC", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "unauthenticated" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa usuário sem fator verificado", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "mfa_not_enrolled" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["aal1", null, undefined])("recusa sessão %s sem escrita", async (nivel) => {
    mocks.sessionAal.mockResolvedValue(nivel);
    expect(await regenerateRecoveryCodes()).toEqual({
      ok: false, error: "mfa_session_verification_required",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("falha de leitura AAL não inicia a rotação", async () => {
    mocks.sessionAal.mockRejectedValue(new Error("auth indisponível"));
    await expect(regenerateRecoveryCodes()).rejects.toThrow("auth indisponível");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recusa service role ausente", async () => {
    mocks.isServiceRoleConfigured.mockReturnValue(false);
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "service_unavailable" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("chama uma única RPC com usuário confiável e dez hashes hex de 32 bytes", async () => {
    expect(await regenerateRecoveryCodes()).toEqual({ ok: true, recovery_codes: CODES });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(rpcName, rpcArgs);
    expect(HEX_HASHES).toHaveLength(10);
    HEX_HASHES.forEach((h) => expect(h).toMatch(/^[0-9a-f]{64}$/));
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "mfa.recovery_codes_regenerated",
        actorUserId: USER_ID,
        metadata: { count: 10 },
      }),
    );
  });

  it("se a RPC falha, não retorna os códigos nem audita sucesso", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database failed" } });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "rotation_failed" });
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each([null, 0, 9, 11])("se RPC retorna contagem %s, não revela os códigos", async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    expect(await regenerateRecoveryCodes()).toEqual({ ok: false, error: "rotation_failed" });
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("não usa consultas separadas de DELETE/INSERT no cliente", async () => {
    const from = vi.fn();
    mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc, from });
    expect((await regenerateRecoveryCodes()).ok).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("migration ELUS 0765 — cerca estática, sem executar SQL", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql"),
    "utf8",
  );

  it("usa SECURITY DEFINER e search_path vazio", () => {
    expect(sql).toMatch(/SECURITY DEFINER\s+SET search_path = ''/i);
  });

  it("trava por usuário na transação antes de apagar e inserir", () => {
    const lock = sql.indexOf("pg_advisory_xact_lock(");
    const del = sql.indexOf("DELETE FROM public.user_recovery_codes WHERE user_id = p_user_id");
    const ins = sql.indexOf("INSERT INTO public.user_recovery_codes");
    expect(lock).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(lock);
    expect(ins).toBeGreaterThan(del);
  });

  it("restringe execução a service_role e valida exatamente 10 hashes", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION[\s\S]+?FROM PUBLIC, anon, authenticated;/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]+?TO service_role;/i);
    expect(sql).toMatch(/cardinality\(p_hashes_hex\) <> 10/);
    expect(sql).toMatch(/count\(DISTINCT c\.hex_hash\)/);
    expect(sql).toMatch(/v_inseridos <> 10/);
  });
});
