import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = "scripts/elus-v189-production-upgrade.mjs";

describe("ELUS v1.89: executor produtivo guardado", () => {
  it("verifica offline os 39 SQLs por SHA Git + SHA256", () => {
    const stdout = execFileSync(process.execPath, [script, "manifest"], {
      encoding: "utf8",
      timeout: 20000,
    });
    const result = JSON.parse(stdout);
    expect(result.mode).toBe("offline");
    expect(result.count).toBe(39);
    expect(result.files).toHaveLength(39);
    expect(new Set(result.files.map((entry: { file: string }) => entry.file)).size).toBe(39);
    expect(result.files.every((entry: { sha256: string }) => /^[a-f0-9]{64}$/.test(entry.sha256))).toBe(true);
  });

  it("recusa apply antes de qualquer conexão, mesmo com ACK e digests fornecidos", () => {
    const run = spawnSync(process.execPath, [script, "apply"], {
      encoding: "utf8",
      timeout: 20000,
      env: {
        ...process.env,
        ELUS_V189_PROD_ACK: "I_AUTHORIZE_ELUS_V189_PRODUCTION_LEDGER_39",
        ELUS_V189_VERIFIED_BACKUP_SHA256: "a".repeat(64),
        ELUS_V189_ROLLBACK_APP_DIGEST:
          "sha256:5af1da63aced2560c1c10d2fb2505346322eff0757a1239dd6a63bcca2656c74",
        ELUS_V189_PROD_URL: "postgres://postgres:fake@127.0.0.1:1/postgres",
        ELUS_V189_PG_CA_FILE: "/nonexistent-ca-for-test",
      },
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain(
      "GATE_RED=PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL",
    );
    expect(run.stdout).not.toContain("APPLIED=");
  });

  it("exige prova de schema e ACL na verificação read-only, não apenas recibos", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain("if(mode==='verify'){");
    expect(source).toContain("need(state.applied===39,'INCOMPLETE_LEDGER')");
    expect(source).toContain("need(rpc.present===true,'RPC_0765_MISSING')");
    expect(source).toContain("'RPC_0765_ACL_DRIFT'");
    expect(source).toContain("'RPC_0765_SEARCH_PATH_DRIFT'");
    expect(source).toContain("'RPC_0765_PUBLIC_EXECUTE_DRIFT'");
    expect(source).toContain("p.proconfig @> ARRAY['search_path=""']::text[]");
    expect(source).toContain("pg_catalog.aclexplode(p.proacl)");
    expect(source).toContain("acl.grantee=0 AND acl.privilege_type='EXECUTE'");
    expect(source).toContain("recoveryRotationPinnedEmptySearchPath:rpc.pinned_empty_search_path");
    expect(source).toContain("recoveryRotationPublicExecuteDenied:rpc.public_execute_denied");
    expect(source).toContain("'RECOVERY_CODES_RLS_DRIFT'");
    expect(source).toContain("'RECOVERY_CODES_CLIENT_DML_GRANT_DRIFT'");
    expect(source).toContain("'RECOVERY_CODES_DENY_SELECT_POLICY_DRIFT'");
    expect(source).toContain("has_table_privilege(roles.role,t.oid,'SELECT')");
    expect(source).toContain("has_table_privilege(roles.role,t.oid,'INSERT')");
    expect(source).toContain("has_table_privilege(roles.role,t.oid,'UPDATE')");
    expect(source).toContain("has_table_privilege(roles.role,t.oid,'DELETE')");
    expect(source).toContain("pg_get_expr(pol.polqual,pol.polrelid)='false'");
    expect(source).toContain("recoveryCodesClientDmlDenied:rpc.recovery_codes_client_dml_denied");
    expect(source).toContain("recoveryCodesDenySelectPolicy:rpc.recovery_codes_deny_select_policy");
    expect(source).toContain("to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])')");
    expect(source).toContain("has_function_privilege('service_role',p.oid,'EXECUTE')");
    expect(source).toContain("has_function_privilege('anon',p.oid,'EXECUTE')");
    expect(source).toContain("has_function_privilege('authenticated',p.oid,'EXECUTE')");
    expect(source).toContain("recoveryRotationRpcPresent:rpc.present");
  });

  it("exige assinatura operacional e preserva guardas do ledger e rollback", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain("ADMIN_APPROVAL_REQUIRED");
    expect(source).toContain("VERIFIED_BACKUP_REQUIRED");
    expect(source).toContain("ROLLBACK_DIGEST_DRIFT");
    expect(source).toContain("DB_TARGET_MISMATCH");
    expect(source).toContain("NONPREFIX_LEDGER");
    expect(source).toContain("RECEIPT_HASH_DRIFT");
    expect(source).toContain("pg_advisory_lock");
    expect(source).toContain("ROLLBACK");
    expect(source).toContain("MFA_LEGACY_ROWS_REQUIRE_SEPARATE_APPROVAL");
  });
});
