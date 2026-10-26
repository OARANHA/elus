"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, isServiceRoleConfigured } from "@/lib/audit";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/recovery-codes";

export type ConfirmMfaEnrollResult =
  | { ok: true; recovery_codes: string[] }
  | { ok: false; error: "invalid_code" | "challenge_failed" | "verify_failed" | "recovery_codes_unavailable"; message?: string };

/**
 * Confirms a TOTP enrollment by issuing a challenge + verifying the code, then
 * generates 10 single-use recovery codes (sha256-hashed, stored as bytea).
 *
 * Recovery codes are returned ONCE to the caller for display — never stored
 * plaintext. Caller is responsible for showing them to the user with copy /
 * download / acknowledge UX.
 */
export async function confirmMfaEnroll(
  code: string,
  factorId: string,
): Promise<ConfirmMfaEnrollResult> {
  const supabase = await createClient();
  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");
  const ip = ipDoCliente(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "invalid_code" };
  }

  // A migration 0755 revoga INSERT para authenticated. Nunca confirmar o
  // cadastro se não há um cliente de serviço capaz de persistir os códigos.
  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "recovery_codes_unavailable", message: "O armazenamento seguro de códigos está indisponível. Contate o administrador." };
  }

  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeErr || !challenge) {
    return { ok: false, error: "challenge_failed", message: challengeErr?.message };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) {
    return { ok: false, error: "verify_failed", message: verifyErr.message };
  }

  // Generate + hash 10 recovery codes.
  const codes = generateRecoveryCodes();
  const rows = codes.map((c) => ({
    user_id: user.id,
    code_hash: hashRecoveryCode(c),
  }));

  // Só o servidor pode gravar na tabela após a migration 0755.
  // Falha de persistência nunca deve gerar sucesso/códigos inutilizáveis.
  const { error: insertErr } = await createAdminClient()
    .from("user_recovery_codes")
    .insert(rows);
  if (insertErr) {
    console.error("[confirmMfaEnroll] failed to persist recovery codes");
    // A verificação TOTP já ocorreu: desfazer o fator quando possível para
    // evitar ativação sem códigos de recuperação. Se a remoção falhar, o
    // resultado ainda será um erro, nunca uma lista de códigos não gravados.
    try {
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollErr) console.error("[confirmMfaEnroll] failed to undo MFA enrollment");
    } catch {
      console.error("[confirmMfaEnroll] failed to undo MFA enrollment");
    }
    return { ok: false, error: "recovery_codes_unavailable", message: "Não foi possível salvar os códigos. Verifique a segurança da conta antes de tentar novamente." };
  }

  await audit({
    action: "auth.mfa_enrolled",
    actorUserId: user.id,
    metadata: { recovery_codes_generated: codes.length },
    requestId,
    ip,
    userAgent,
  });

  return { ok: true, recovery_codes: codes };
}
