"use server";

import { headers } from "next/headers";

import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, isServiceRoleConfigured } from "@/lib/audit";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/recovery-codes";
import { sessionAal } from "@/lib/auth/server";

export type RegenerateRecoveryCodesResult =
  | { ok: true; recovery_codes: string[] }
  | { ok: false; error: string };

/**
 * Deletes existing user_recovery_codes for the current user and issues 10
 * fresh codes. Plaintext returned ONCE — never persisted.
 */
export async function regenerateRecoveryCodes(): Promise<RegenerateRecoveryCodesResult> {
  const supabase = await createClient();
  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");
  const ip = ipDoCliente(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Confirm user has a verified TOTP factor (regenerate is meaningless otherwise).
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasFactor = factors?.totp?.some((f) => f.status === "verified");
  if (!hasFactor) return { ok: false, error: "mfa_not_enrolled" };

  // Regenerar códigos permite remover o único caminho de recuperação.
  // Tal como desativar MFA, exige TOTP comprovado NESTA sessão (aal2).
  // Falha de leitura/nível desconhecido recusa, nunca degrada para aal1.
  if ((await sessionAal()) !== "aal2") {
    return { ok: false, error: "mfa_session_verification_required" };
  }

  // A migration 0755 revoga todos os privilégios do cliente autenticado.
  // Não apagar códigos existentes se o serviço necessário não estiver pronto.
  if (!isServiceRoleConfigured()) return { ok: false, error: "service_unavailable" };
  const admin = createAdminClient();

  const codes = generateRecoveryCodes();
  // A RPC aceita hashes SHA256 em hexadecimal, não códigos em texto claro.
  const hashes = codes.map((code) => hashRecoveryCode(code).toString("hex"));

  // A migration ELUS 0765 executa DELETE e INSERT na MESMA transação do
  // Postgres, com advisory lock por usuário. Se a função ainda não existir,
  // o PostgREST falha fechado e nenhum código antigo é removido.
  const { data: inseridos, error: rotateErr } = await admin.rpc(
    "fn_elus_rotacionar_codigos_recuperacao",
    { p_user_id: user.id, p_hashes_hex: hashes },
  );
  if (rotateErr || inseridos !== codes.length) {
    console.error("[regenerateRecoveryCodes] atomic recovery rotation failed");
    return { ok: false, error: "rotation_failed" };
  }

  await audit({
    action: "mfa.recovery_codes_regenerated",
    actorUserId: user.id,
    resourceType: "user",
    resourceId: user.id,
    requestId,
    ip,
    userAgent,
    metadata: { count: codes.length },
  });

  return { ok: true, recovery_codes: codes };
}
