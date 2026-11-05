/**
 * ELUS v1.89 — cerca offline para o escopo destrutivo da migration upstream 0759.
 * Atesta apenas o texto versionado; NÃO autoriza execução, replay ou deploy.
 * A contagem de linhas afetadas em produção exige SELECT independente.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql",
    import.meta.url,
  ),
  "utf8",
);
const baseline = readFileSync(new URL("../../supabase/baseline.sql", import.meta.url), "utf8");
const executor = readFileSync(
  new URL("../../scripts/elus-v189-production-upgrade.mjs", import.meta.url),
  "utf8",
);

// Guarda lexical restrita a este statement; não é parser SQL nem prova funcional.
function withoutComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "").trim();
}

const narrowDelete =
  /\bdelete\s+from\s+public\.user_recovery_codes\s+where\s+octet_length\s*\(\s*code_hash\s*\)\s*<>\s*32\s*;/gi;

describe("ELUS v1.89: escopo estático da exclusão 0759 (offline)", () => {
  it("mantém o SQL ativo da 0759 limitado a hashes com comprimento diferente de 32 bytes", () => {
    expect(withoutComments(migration).toLowerCase().replace(/\s+/g, " ")).toBe(
      "delete from public.user_recovery_codes where octet_length(code_hash) <> 32;",
    );
  });

  it("inclui exatamente uma cópia do DELETE restrito na baseline candidata", () => {
    expect([...withoutComments(baseline).matchAll(narrowDelete)]).toHaveLength(1);
  });

  it("não converte ausência de linhas legadas ou recibo 0765 em autorização de apply", () => {
    expect(executor).toContain("need(legacy===0,'MFA_LEGACY_ROWS_REMAIN_AFTER_0759')");
    expect(executor).toContain("PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL");
    expect(executor).toContain("receipt0765RpcMismatch:");
  });
});
