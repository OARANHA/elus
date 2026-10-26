"use server";

import { headers } from "next/headers";

import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, isServiceRoleConfigured } from "@/lib/audit";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/recovery-codes";

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

  // A migration 0755 revoga todos os privilégios do cliente autenticado.
  // Não apagar códigos existentes se o serviço necessário não estiver pronto.
  if (!isServiceRoleConfigured()) return { ok: false, error: "service_unavailable" };
  const admin = createAdminClient();

  // Guardar os IDs antigos ANTES de inserir, para não apagar os novos por
  // acidente e preservar os antigos em caso de falha na gravação.
  const { data: antigos, error: readErr } = await admin
    .from("user_recovery_codes")
    .select("id")
    .eq("user_id", user.id);
  if (readErr || !antigos) return { ok: false, error: "read_failed" };

  const codes = generateRecoveryCodes();
  const rows = codes.map((c) => ({ user_id: user.id, code_hash: hashRecoveryCode(c) }));

  // Inserir ANTES de remover os antigos: uma falha de INSERT não inutiliza
  // os códigos que o usuário já possui.
  const { data: novos, error: insertErr } = await admin
    .from("user_recovery_codes")
    .insert(rows)
    .select("id");
  if (insertErr || !novos || novos.length !== rows.length) {
    return { ok: false, error: "insert_failed" };
  }

  const idsAntigos = antigos.map((row) => row.id);
  if (idsAntigos.length > 0) {
    const { error: deleteErr } = await admin
      .from("user_recovery_codes")
      .delete()
      .eq("user_id", user.id)
      .in("id", idsAntigos);
    if (deleteErr) {
      // Melhor esforço: remover novos hashes não entregues ao usuário.
      const { error: rollbackErr } = await admin
        .from("user_recovery_codes")
        .delete()
        .eq("user_id", user.id)
        .in("id", novos.map((row) => row.id));
      if (rollbackErr) console.error("[regenerateRecoveryCodes] cleanup of new hashes failed");
      return { ok: false, error: "delete_failed" };
    }
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
