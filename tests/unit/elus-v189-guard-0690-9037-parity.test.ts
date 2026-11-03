import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Auditoria offline: nunca consulta Supabase nem executa SQL/migrations.
// A referencia 9037 vem da observacao do catalogo em 03/11/2026;
// a comparacao textual NAO prova equivalencia funcional.
type GuardParity = {
  baselineIncludes0690Verbatim: boolean;
  baselineGuardDefinitionCount: number;
  migration0690ServiceRoleJwtOnly: boolean;
  baselineServiceRoleDbAndJwtRequired: boolean;
  adminExceptionPreserved: boolean;
  denialBranchPreserved: boolean;
  external9037Reference: string;
  comparison: string;
  replayApproved: boolean;
  freshInstallParityApproved: boolean;
};

const executor = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
const migrationPath =
  "supabase/migrations/20261020120000_0690_org_ai_autonomy_protected.sql";
const baselinePath = "supabase/baseline.sql";

function audit(read: (path: string) => string): GuardParity {
  const start = executor.indexOf("function guardParity(){");
  const end = executor.indexOf("function sourceGuard(){", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const fn = runInNewContext(
    `${executor.slice(start, end)}\nguardParity`,
    { readFileSync: read },
    { timeout: 1000 },
  ) as () => GuardParity;
  return fn();
}

describe("ELUS v1.89: divergencia estatica 0690/9037, sem banco", () => {
  it("detecta baseline candidata mais permissiva que a guarda externa observada", () => {
    const result = audit((path) => readFileSync(path, "utf8"));
    expect(result.baselineIncludes0690Verbatim).toBe(true);
    expect(result.baselineGuardDefinitionCount).toBe(1);
    expect(result.migration0690ServiceRoleJwtOnly).toBe(true);
    expect(result.baselineServiceRoleDbAndJwtRequired).toBe(false);
    expect(result.adminExceptionPreserved).toBe(true);
    expect(result.denialBranchPreserved).toBe(true);
    expect(result.comparison).toBe("BASELINE_0690_WEAKER_THAN_OBSERVED_9037");
    expect(result.replayApproved).toBe(false);
    expect(result.freshInstallParityApproved).toBe(false);
    expect(executor).toContain("guard0690Vs9037:guardParity()");
  });

  it("nao aprova automaticamente uma baseline com guarda modificada", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const stricter = migration.replace(
      "auth.role() = 'service_role'",
      "current_user = 'service_role' and auth.role() = 'service_role'",
    );
    expect(stricter).not.toBe(migration);
    const result = audit((path) => path === baselinePath ? stricter : migration);
    expect(result.baselineServiceRoleDbAndJwtRequired).toBe(true);
    expect(result.baselineIncludes0690Verbatim).toBe(false);
    expect(result.comparison).toBe("UNVERIFIED_DO_NOT_RELEASE");
    expect(result.replayApproved).toBe(false);
    expect(result.freshInstallParityApproved).toBe(false);
  });

  it("falha fechado quando a funcao nao esta na baseline", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const result = audit((path) => path === baselinePath ? "" : migration);
    expect(result.baselineGuardDefinitionCount).toBe(0);
    expect(result.baselineIncludes0690Verbatim).toBe(false);
    expect(result.comparison).toBe("UNVERIFIED_DO_NOT_RELEASE");
    expect(result.replayApproved).toBe(false);
    expect(result.freshInstallParityApproved).toBe(false);
  });
  it("ignora um predicado estrito escrito somente em comentario SQL", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const injected = migration.replace(
      "auth.role() = 'service_role'\n      or",
      "auth.role() = 'service_role' -- current_user = 'service_role' and auth.role() = 'service_role'\n      or",
    );
    expect(injected).not.toBe(migration);
    const result = audit(() => injected);
    expect(result.baselineIncludes0690Verbatim).toBe(true);
    expect(result.baselineServiceRoleDbAndJwtRequired).toBe(false);
    expect(result.comparison).toBe("BASELINE_0690_WEAKER_THAN_OBSERVED_9037");
    expect(result.replayApproved).toBe(false);
  });

  it("nao classifica como simples downgrade se a excecao postgres mudou", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const unsafe = migration.replace(
      "or (current_user = 'postgres' and auth.uid() is null and auth.role() is null)",
      "or true",
    );
    expect(unsafe).not.toBe(migration);
    const result = audit(() => unsafe);
    expect(result.adminExceptionPreserved).toBe(false);
    expect(result.comparison).toBe("UNVERIFIED_DO_NOT_RELEASE");
    expect(result.freshInstallParityApproved).toBe(false);
  });

  it("nao classifica como simples downgrade se o ramo de negacao mudou", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const unsafe = migration.replace(
      "raise exception 'elus_ai_autonomy_restricted'",
      "raise exception 'unexpected_error'",
    );
    expect(unsafe).not.toBe(migration);
    const result = audit(() => unsafe);
    expect(result.denialBranchPreserved).toBe(false);
    expect(result.comparison).toBe("UNVERIFIED_DO_NOT_RELEASE");
    expect(result.replayApproved).toBe(false);
  });

});
