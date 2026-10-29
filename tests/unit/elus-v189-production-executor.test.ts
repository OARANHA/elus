import { createHash } from "node:crypto";
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
    expect(source).toContain("need(legacy===0,'MFA_LEGACY_ROWS_REMAIN_AFTER_0759')");
    expect(source).toContain("need(rpc.present===true,'RPC_0765_MISSING')");
    expect(source).toContain("'RPC_0765_ACL_DRIFT'");
    expect(source).toContain("'RPC_0765_SEARCH_PATH_DRIFT'");
    expect(source).toContain("'RPC_0765_PUBLIC_EXECUTE_DRIFT'");
    expect(source).toContain("p.proconfig @> ARRAY['search_path=\"\"']::text[]");
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

  it("confere sete fingerprints históricos privados contra o verificador v1.85", () => {
    const source = readFileSync(script, "utf8");
    const verifier = readFileSync("scripts/verificar-lotes-v185.mjs", "utf8");
    const historicalBlock = source.split("const HISTORICAL_FINGERPRINTS=new Map([", 2)[1]?.split("]);", 1)[0] ?? "";
    const fromExecutor = [...historicalBlock.matchAll(/\['(\d{14})',(\d+),'([a-f0-9]{32})'\]/g)]
      .map((match) => [match[1], Number(match[2]), match[3]]);
    const fromVerifier = [...verifier.matchAll(/\["(\d{14})", (\d+), "([a-f0-9]{32})"\]/g)]
      .map((match) => [match[1], Number(match[2]), match[3]]);
    expect(fromExecutor).toHaveLength(7);
    expect(fromExecutor).toEqual(fromVerifier);
    expect(source).toContain("cardinality(statements) AS statement_count");
    expect(source).toContain("octet_length(statements[1]) AS first_statement_bytes");
    expect(source).toContain("r.statement_count===1");
    expect(source).toContain("r.first_statement_bytes===expected[0]");
    expect(source).toContain("digest(Buffer.from(r.md5||'','ascii'),'md5')===expected[1]");
    expect(source).toContain("'HISTORY_STATEMENT_DRIFT'");
  });

  it("confere quatro recibos ELUS históricos contra SQL versionado e ledger atestado", () => {
    const source = readFileSync(script, "utf8");
    const block = source.split("const ELUS_HISTORICAL_FINGERPRINTS=new Map([", 2)[1]?.split("]);", 1)[0] ?? "";
    const expected = [
      ["20261019204449", "20261019120000_0689_integracoes_erp_vendaerp.sql"],
      ["20261021025530", "20261020120000_0690_org_ai_autonomy_protected.sql"],
      ["20261021025551", "20261020120001_0691_chutes_chat_catalog.sql"],
      ["20261021025613", "20261020230000_0692_chutes_catalog_sync.sql"],
    ];
    const fingerprints = [...block.matchAll(/\\['(\\d{14})',(\\d+),'([a-f0-9]{32})'\\]/g)]
      .map((match) => [match[1], Number(match[2]), match[3]] as const);
    expect(fingerprints).toHaveLength(4);
    expect(fingerprints.map((row) => row[0])).toEqual(expected.map((row) => row[0]));
    for (const [index, [, filename]] of expected.entries()) {
      const bytes = readFileSync(`supabase/migrations/${filename}`);
      expect(bytes.length).toBe(fingerprints[index][1]);
      expect(createHash("md5").update(bytes).digest("hex")).toBe(fingerprints[index][2]);
    }
    expect(source).toContain("r.statement_count===1&&r.first_statement_bytes===own[0]&&r.md5===own[1]");
    expect(source).toContain("'ELUS_HISTORY_STATEMENT_DRIFT'");
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
