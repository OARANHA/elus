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

  it("atesta canarios de DDLs distintos em verify sem confundir recibo com execucao", () => {
    const source = readFileSync(script, "utf8");
    const canaries = [
      "public.crm_lead_attachments",
      "public.mfa_trusted_devices",
      "public.importacoes_de_historico",
      "public.automation_rodizio_atribuicoes",
      "public.fn_session_mfa_proven()",
      "public.fn_automation_rodizio_atribuir(uuid,uuid,uuid,uuid)",
    ];
    for (const object of canaries) {
      expect(source).toContain(object);
    }
    expect(source).toContain("Object.values(schemaCanaries).every(v=>v===true)");
    expect(source).toContain("'SCHEMA_CANARY_DRIFT'");
    expect(source).toContain("schemaCanaries,manifest:39");
    expect(source).toContain("if(mode==='verify'){");
    expect(source).toContain("BEGIN READ ONLY");
  });

  it("confere sete fingerprints históricos privados contra o verificador v1.85", () => {
    const source = readFileSync(script, "utf8");
    const verifier = readFileSync("scripts/verificar-lotes-v185.mjs", "utf8");
    const historicalBlock =
      source.split("const HISTORICAL_FINGERPRINTS=new Map([", 2)[1]?.split("]);", 1)[0] ?? "";
    const fromExecutor = [...historicalBlock.matchAll(/\['(\d{14})',\[(\d+),'([a-f0-9]{32})'\]\]/g)]
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
    const block =
      source.split("const ELUS_HISTORICAL_FINGERPRINTS=new Map([", 2)[1]?.split("]);", 1)[0] ?? "";
    const expected = [
      ["20261019204449", "20261019120000_0689_integracoes_erp_vendaerp.sql"],
      ["20261021025530", "20261020120000_0690_org_ai_autonomy_protected.sql"],
      ["20261021025551", "20261020120001_0691_chutes_chat_catalog.sql"],
      ["20261021025613", "20261020230000_0692_chutes_catalog_sync.sql"],
    ];
    const fingerprints = [...block.matchAll(/\['(\d{14})',\[(\d+),'([a-f0-9]{32})'\]\]/g)]
      .map((match) => [match[1], Number(match[2]), match[3]] as const);
    expect(fingerprints).toHaveLength(4);
    expect(fingerprints.map((row) => row[0])).toEqual(expected.map((row) => row[0]));
    for (const [index, [, filename]] of expected.entries()) {
      const bytes = readFileSync(`supabase/migrations/${filename}`);
      const fingerprint = fingerprints[index]!;
      expect(bytes.length).toBe(fingerprint[1]);
      expect(createHash("md5").update(bytes).digest("hex")).toBe(fingerprint[2]);
    }
    expect(source).toContain(
      "r.statement_count===1&&r.first_statement_bytes===own[0]&&r.md5===own[1]",
    );
    expect(source).toContain("'ELUS_HISTORY_STATEMENT_DRIFT'");
  });

  it("reprova recibos v1.89 repartidos ou com bytes divergentes, mesmo com MD5 concatenado igual", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain("cardinality(statements) AS statement_count");
    expect(source).toContain("octet_length(statements[1]) AS first_statement_bytes");
    expect(source).toContain("r.statement_count===1,'RECEIPT_STATEMENT_CARDINALITY_DRIFT'");
    expect(source).toContain("r.first_statement_bytes===Buffer.byteLength(item.sql,'utf8')");
    expect(source).toContain("'RECEIPT_STATEMENT_LENGTH_DRIFT'");
    expect(source).toContain("r.md5===digest(Buffer.from(item.sql),'md5')");
  });

  it("diagnostica o recibo externo 9037 e a RPC 0765 sem liberar o upgrade", () => {
    const source = readFileSync(script, "utf8");
    const diagnostic =
      source.split("async function diagnoseLedger(c){", 2)[1]?.split("async function main(){", 1)[0] ??
      "";
    expect(diagnostic).toContain("SELECT count(*) AS total_receipts");
    expect(diagnostic).toContain("version='20261029104815'");
    expect(diagnostic).toContain(
      "md5(statements[1])='10df3c797779f8cb4461631cb22676d2'",
    );
    // 0690 historica e 9037 externa coexistem: o diagnostico nao as aplica.
    expect(diagnostic).toContain("version='20261021025530'");
    expect(diagnostic).toContain("name='elus_0690_org_ai_autonomy_protected'");
    expect(diagnostic).toContain("octet_length(statements[1])=2344");
    expect(diagnostic).toContain("md5(statements[1])='89178273952e0c2af1174916ab1bf0e4'");
    expect(diagnostic).toContain("receipt0690Exact:Number(ledger.receipt_0690_exact)===1");
    expect(diagnostic).toContain("guard0690And9037Coexist:Number(ledger.receipt_0690_exact)===1&&Number(ledger.external_9037_exact)===1");
    expect(diagnostic).toContain("version='20261026010000'");
    expect(diagnostic).toContain("receipt_0765_exact");
    expect(diagnostic).toContain("octet_length(statements[1])=2747");
    expect(diagnostic).toContain("md5(statements[1])='add7a7db36db87cd213fd7a7d0f81db7'");
    expect(diagnostic).toContain("receipt0765Exact:Number(ledger.receipt_0765_exact)===1");
    expect(diagnostic).toContain(
      "receipt0765RpcMismatch:Number(ledger.receipt_0765)>0&&catalog.rpc_0765_present!==true",
    );
    const rpcSql = readFileSync(
      "supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
    );
    expect(rpcSql.length).toBe(2747);
    expect(createHash("md5").update(rpcSql).digest("hex")).toBe("add7a7db36db87cd213fd7a7d0f81db7");
    expect(diagnostic).toContain(
      "to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])')",
    );
    expect(diagnostic).toContain("guard_9037_strict");
    expect(diagnostic).toContain("guard_trigger_enabled");
    expect(diagnostic).toContain("guard_trigger_wiring_correct");
    expect(diagnostic).toContain("t.tgfoid=to_regprocedure('public.fn_guard_organizations_ai_autonomy()')");
    expect(diagnostic).toContain("t.tgtype=23");
    expect(diagnostic).toContain("guardTriggerWiringCorrect:catalog.guard_trigger_wiring_correct===true");
    expect(diagnostic).toContain("AS guard_function_invoker");
    expect(diagnostic).toContain("AS guard_function_execute_restricted");
    expect(diagnostic).toContain("NOT p.prosecdef");
    expect(diagnostic).toContain("has_function_privilege('service_role',p.oid,'EXECUTE')");
    expect(diagnostic).toContain("NOT has_function_privilege('anon',p.oid,'EXECUTE')");
    expect(diagnostic).toContain("NOT has_function_privilege('authenticated',p.oid,'EXECUTE')");
    expect(diagnostic).toContain("guardFunctionInvoker:catalog.guard_function_invoker===true");
    expect(diagnostic).toContain(
      "guardFunctionExecuteRestricted:catalog.guard_function_execute_restricted===true",
    );
    expect(diagnostic).toContain("p.proname='fn_elus_rotacionar_codigos_recuperacao'");
    expect(diagnostic).toContain("rpc0765NamedFunctionsAnySchema:Number(catalog.rpc_0765_any_schema_count)");
    expect(diagnostic).toContain("relrowsecurity FROM pg_catalog.pg_class");
    expect(diagnostic).toContain("recoveryCodesRls:catalog.recovery_codes_rls===true");
    expect(diagnostic).toContain("AS recovery_codes_client_dml_denied");
    expect(diagnostic).toContain("recoveryCodesClientDmlDenied:catalog.recovery_codes_client_dml_denied===true");
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(diagnostic).toContain(`NOT has_table_privilege(roles.role,t.oid,'${privilege}')`);
    }
    expect(diagnostic).toContain("FROM (VALUES ('anon'),('authenticated')) AS roles(role)");
    expect(diagnostic).toContain("pol.polname='user_recovery_codes_ninguem_le'");
    expect(diagnostic).toContain("recoveryCodesDenySelectPolicy:catalog.recovery_codes_deny_select_policy===true");
    expect(diagnostic).toContain("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
    // Os nomes de privilégios aparecem em has_table_privilege(), não como DML executável.
    const withoutPrivilegeChecks = diagnostic.replace(/has_table_privilege\([^)]*\)/g, "has_table_privilege()");
    expect(withoutPrivilegeChecks).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/i);
    expect(source).toContain("if(mode==='diagnose'){");
    expect(source.indexOf("if(mode==='diagnose'){")).toBeLessThan(
      source.indexOf("const state=await snapshot(c,items)"),
    );
    expect(source).toContain("need(records.length<=50,'LEDGER_COUNT_DRIFT')");
    expect(source).toContain("PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL");
    expect(source).toContain("BEGIN READ ONLY");
  });

  it("atesta os 11 statements historicos em diagnose sem revelar SQL privado", () => {
    const source = readFileSync(script, "utf8");
    const helper =
      source.split("async function historicalReceiptDiagnostic(c){", 2)[1]?.split(
        "// Diagnóstico independente do gate de upgrade:", 1,
      )[0] ?? "";
    expect(helper).toContain("WHERE version = ANY($1::text[])");
    expect(helper).toContain("cardinality(statements) AS statement_count");
    expect(helper).toContain("octet_length(statements[1]) AS first_statement_bytes");
    expect(helper).toContain("md5(array_to_string(statements,'')) AS md5");
    expect(helper).toContain("r.statement_count!==1");
    expect(helper).toContain("HISTORICAL_FINGERPRINTS.get(r.version)");
    expect(helper).toContain("ELUS_HISTORICAL_FINGERPRINTS.get(r.version)");
    expect(helper).toContain("digest(Buffer.from(r.md5||'','ascii'),'md5')");
    expect(helper).toContain("historicalReceiptsMatched:matched");
    expect(helper).toContain("historicalReceiptsExpected:HISTORY.length");
    expect(helper).toContain("historicalReceiptsExact:rows.length===HISTORY.length&&matched===HISTORY.length");
    expect(helper).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/i);
    expect(helper).not.toContain("console.log");
    const diagnose =
      source.split("async function diagnoseLedger(c){", 2)[1]?.split("async function main(){", 1)[0] ??
      "";
    expect(diagnose).toContain("const historical=await historicalReceiptDiagnostic(c);");
    expect(diagnose).toContain("...historical,");
    expect(source).toContain("BEGIN READ ONLY");
    expect(source).toContain("PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL");
  });

  it("não confunde a guarda histórica 0690 com a condição mais restritiva da 9037", () => {
    const historical = readFileSync(
      "supabase/migrations/20261020120000_0690_org_ai_autonomy_protected.sql",
      "utf8",
    );
    expect(historical).toContain("auth.role() = 'service_role'\n      or (current_user = 'postgres'");
    expect(historical).not.toContain(
      "current_user = 'service_role' and auth.role() = 'service_role'",
    );

    const source = readFileSync(script, "utf8");
    const diagnostic =
      source.split("async function diagnoseLedger(c){", 2)[1]?.split("async function main(){", 1)[0] ??
      "";
    expect(diagnostic).toContain(
      "position('current_user = ''service_role'' and auth.role() = ''service_role'''",
    );
    expect(diagnostic).toContain("in lower(p.prosrc))>0");
    expect(diagnostic).toContain(
      "WHERE p.oid=to_regprocedure('public.fn_guard_organizations_ai_autonomy()')",
    );
    expect(diagnostic).toContain("guard9037Strict:catalog.guard_9037_strict===true");
    expect(source).toContain("need(records.length<=50,'LEDGER_COUNT_DRIFT')");
  });

  it("bloqueia 51 recibos e versoes nao previstas no plano v1.89", () => {
    const source = readFileSync(script, "utf8");
    // O banco observado em 29/10 possui uma 51a entrada alheia ao manifesto
    // fixado. Nao ampliar automaticamente a allowlist ou a cardinalidade.
    expect(source).toContain("need(records.length<=50,'LEDGER_COUNT_DRIFT')");
    expect(source).toContain("receipts.length<=39");
    expect(source).toContain("'UNKNOWN_RECEIPT'");
    expect(source).toContain("'NONPREFIX_LEDGER'");
    expect(source).toContain("'RECEIPT_HASH_DRIFT'");
  });

  it("fixa o DELETE 0759 ao formato legado e confronta a contagem somente leitura", () => {
    const migration = readFileSync(
      "supabase/migrations/20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql",
      "utf8",
    );
    const statement = migration
      .replace(/--[^\n]*/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    expect(statement).toBe(
      "delete from public.user_recovery_codes where octet_length(code_hash) <> 32;",
    );
    const blob = createHash("sha1")
      .update(`blob ${Buffer.byteLength(migration, "utf8")}\0`)
      .update(migration)
      .digest("hex");
    expect(blob).toBe("44bb738f4e111f6550a16c720751c69cf902146b");

    const source = readFileSync(script, "utf8");
    expect(source).toContain(
      "SELECT count(*) AS n FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32",
    );
    expect(source).toContain("PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL");
    // Mesmo com zero linhas legadas, a autorização destrutiva permanece independente.
  });

  it("mantém o verificador sem caminho SQL mutante, mesmo após remoção da guarda", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain("if(mode==='apply'){");
    expect(source).toContain("PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL");
    expect(source).toContain("BEGIN READ ONLY");
    expect(source).toContain("await c.query('ROLLBACK')");
    expect(source).toContain("DB_TARGET_MISMATCH");
    expect(source).toContain("NONPREFIX_LEDGER");
    expect(source).toContain("RECEIPT_HASH_DRIFT");
    expect(source).not.toContain("pg_advisory_lock");
    expect(source).not.toContain("await c.query(item.sql)");
    expect(source).not.toContain("INSERT INTO supabase_migrations.schema_migrations");
    expect(source).not.toContain("APPLIED=");
  });
  it("classifica o corte 11/27 sem confundir inventario offline com replay aprovado", () => {
    const stdout = execFileSync(process.execPath, [script, "manifest"], {
      encoding: "utf8",
      timeout: 20000,
    });
    const result = JSON.parse(stdout);
    const plan = result.replayClassification;
    expect(result.historicalCut).toBe("20261021025613");
    expect(plan.upstreamBeforeOrAtCut).toHaveLength(11);
    expect(plan.upstreamAfterCut).toHaveLength(27);
    const upstream = [...plan.upstreamBeforeOrAtCut, ...plan.upstreamAfterCut] as string[];
    expect(new Set(upstream).size).toBe(38);
    expect(
      plan.upstreamBeforeOrAtCut.every(
        (file: string) => file.slice(0, 14) <= result.historicalCut,
      ),
    ).toBe(true);
    expect(
      plan.upstreamAfterCut.every(
        (file: string) => file.slice(0, 14) > result.historicalCut,
      ),
    ).toBe(true);
    expect(plan.elusHistoricalVersions).toEqual([
      "20261019204449",
      "20261021025530",
      "20261021025551",
      "20261021025613",
    ]);
    expect(plan.atomicMfaMigration).toBe(
      "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
    );
    expect(plan.destructiveMigration).toBe(
      "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql",
    );
    expect(plan.replayApproved).toBe(false);
    expect(plan.reason).toBe("RESTORE_AND_FULL_LEDGER_STATEMENTS_NOT_VERIFIED");
    expect(stdout).not.toContain("20261029104815");
  });
  it("atesta a ordem nominal de cinco cadeias SQL sem autorizar replay", () => {
    const stdout = execFileSync(process.execPath, [script, "manifest"], {
      encoding: "utf8",
      timeout: 20000,
    });
    const result = JSON.parse(stdout);
    const expectedChains = [
      [
        "20261020230856_0716_agendas_de_servicos.sql",
        "20261021173000_0717_desambigua_calendar_service_professionals.sql",
        "20261023160008_0753_aviso_de_agendamento_no_whatsapp.sql",
      ],
      [
        "20261020120002_0763_banco_externo_db_type_e_aviso.sql",
        "20261022120000_0706_banco_externo_receitas.sql",
      ],
      [
        "20261020000001_0684_a_reacao_nao_passa_pelos_gatilhos.sql",
        "20261023230250_0760_historico_importado_nao_dispara.sql",
      ],
      [
        "20261023160002_0747_mfa_dispositivo_confiavel.sql",
        "20261023160012_0757_poder_de_plataforma_exige_sessao_confirmada.sql",
      ],
      [
        "20261023160010_0755_codigos_de_recuperacao_so_pelo_servidor.sql",
        "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql",
      ],
    ];
    expect(result.replayClassification.dependencyChains).toEqual(expectedChains);
    expect(result.replayClassification.dependencyOrderVerified).toBe(true);
    const positions = new Map<string, number>(
      result.files.map(
        (entry: { file: string }, index: number): [string, number] => [entry.file, index],
      ),
    );
    for (const chain of expectedChains) {
      const indices = chain.map((file) => positions.get(file));
      expect(indices.every((index) => typeof index === "number")).toBe(true);
      expect(indices).toEqual([...indices].sort((a, b) => a! - b!));
    }
    expect(readFileSync(script, "utf8")).toContain("'DEPENDENCY_ORDER_DRIFT'");
    expect(result.replayClassification.replayApproved).toBe(false);
  });

});
