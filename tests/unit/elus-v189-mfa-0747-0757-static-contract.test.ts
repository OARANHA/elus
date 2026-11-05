/**
 * Contrato estatico 0747 -> 0757: dispositivo confiavel nao concede
 * poder de plataforma sem AAL2 quando existe TOTP verificado.
 * Nao executa SQL, nao acessa banco e nao substitui testes de ACL/RLS.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const trustedFile = "20261023160002_0747_mfa_dispositivo_confiavel.sql";
const platformFile = "20261023160012_0757_poder_de_plataforma_exige_sessao_confirmada.sql";
const sql = (file: string) =>
  readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");

function functionBody(source: string, name: string): string {
  const marker = `create or replace function public.${name}(`;
  const start = source.toLowerCase().indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const body = source.slice(start).match(/\bas \$\$([\s\S]*?)\$\$;/i)?.[1];
  expect(body).toBeDefined();
  return body ?? "";
}

describe("ELUS v1.89 — MFA 0747/0757 (contrato estatico)", () => {
  it("amarra dispositivo confiavel a usuario, fator verificado, sessao e prazo", () => {
    expect(trustedFile < platformFile).toBe(true);
    const body = functionBody(sql(trustedFile), "fn_session_mfa_proven");
    expect(body).toMatch(/d\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(body).toMatch(/f\.id\s*=\s*d\.factor_id\s+and\s+f\.user_id\s*=\s*d\.user_id\s+and\s+f\.status\s*=\s*'verified'/i);
    expect(body).toMatch(/d\.session_id::text\s*=\s*auth\.jwt\(\)->>'session_id'/i);
    expect(body).toMatch(/d\.expires_at\s*>\s*now\(\)/i);
  });

  it("exige AAL2 para poder de plataforma com TOTP, sem aceitar dispositivo confiavel", () => {
    const body = functionBody(sql(platformFile), "fn_is_platform_admin_full");
    expect(body).toMatch(/pa\.scope\s*=\s*'full'/i);
    expect(body).toMatch(/coalesce\(auth\.jwt\(\)->>'aal','aal1'\)\s*=\s*'aal2'/i);
    expect(body).toMatch(/not exists\s*\(\s*select 1 from auth\.mfa_factors f[\s\S]*?f\.factor_type\s*=\s*'totp'\s+and\s+f\.status\s*=\s*'verified'/i);
    expect(body).not.toMatch(/mfa_trusted_devices|fn_session_mfa_proven/i);
  });

  it("preserva a resposta MFA especifica na anonimizacao por poder de plataforma", () => {
    const body = functionBody(sql(platformFile), "fn_lgpd_anonymize_contact");
    expect(body).toMatch(/contact_anonymize_mfa_required/i);
    expect(body).toMatch(/coalesce\(auth\.jwt\(\)->>'aal','aal1'\)\s*<>\s*'aal2'/i);
    expect(body).toMatch(/pa\.scope\s*=\s*'full'/i);
  });
});
