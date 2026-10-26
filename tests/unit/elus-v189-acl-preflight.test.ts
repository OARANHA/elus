import { describe, expect, it } from "vitest";
import { avaliarAclV189, consultarAclV189, type AclV189Snapshot } from "../../scripts/elus-v189-acl-preflight.mjs";

const tabela = (relname: string) => ({
  relname,
  relrowsecurity: true,
  anon_select: false, anon_insert: false, anon_update: false, anon_delete: false,
  authenticated_select: false, authenticated_insert: false,
  authenticated_update: false, authenticated_delete: false,
});
const funcao = (proname: string, pronargs: number, identidade: string) => ({
  proname, pronargs, identidade, prosecdef: true,
  anon_execute: false, authenticated_execute: false, service_role_execute: true,
});
const snapshot = (): AclV189Snapshot => ({
  funcoes: [
    funcao("fn_log_event", 3, "uuid, text, jsonb"),
    funcao("emit_event", 6, "text, text, uuid, jsonb, jsonb, uuid"),
    funcao("fn_lgpd_cascade_redact_contact", 3, "uuid, uuid, uuid"),
    funcao("fn_definir_aviso_de_caso", 7, "uuid, uuid, text, text, boolean, boolean, text"),
    funcao("fn_elus_rotacionar_codigos_recuperacao", 2, "uuid, text[]"),
  ],
  tabelas: [tabela("channel_sessions"), tabela("user_recovery_codes")],
  policies: [
    { tablename: "channel_sessions", policyname: "channel_sessions_tenant_insert", cmd: "INSERT" as const, roles: ["authenticated"] },
    { tablename: "channel_sessions", policyname: "channel_sessions_tenant_update", cmd: "UPDATE" as const, roles: ["authenticated"] },
    { tablename: "channel_sessions", policyname: "channel_sessions_tenant_delete", cmd: "DELETE" as const, roles: ["authenticated"] },
    { tablename: "user_recovery_codes", policyname: "user_recovery_codes_ninguem_le", cmd: "SELECT" as const, roles: ["public"] },
  ],
});

describe("ELUS v1.89 — ACL e RLS: preflight de metadados", () => {
  it("nunca concede autorizacao mesmo com catalogo esperado", () => {
    const result = avaliarAclV189(snapshot());
    expect(result.status).toBe("PRECHECK_ONLY");
    expect(result.autoriza_replay).toBe(false);
    expect(result.autoriza_merge_deploy).toBe(false);
    expect(result.autoriza_alteracao_acl).toBe(false);
    expect(result.alertas).toEqual([]);
  });

  it("marca grants efetivos de clientes na tabela de recuperacao", () => {
    const data = snapshot();
    data.tabelas[1]!.authenticated_select = true;
    expect(avaliarAclV189(data).alertas).toContain("recovery_codes_privilegio_cliente_efetivo");
  });

  it("detecta ACL inadequada e ausencia da RPC de rotacao", () => {
    const data = snapshot();
    data.funcoes.pop();
    expect(avaliarAclV189(data).alertas).toContain("rpc_rotacao_ausente_ou_sobrecarregada");
    const other = snapshot();
    other.funcoes.at(-1)!.authenticated_execute = true;
    expect(avaliarAclV189(other).alertas).toContain("rpc_rotacao_acl_divergente");
  });

  it("exige revisao humana de SECURITY DEFINER exposta, sem inferir bypass", () => {
    const data = snapshot();
    data.funcoes[0]!.authenticated_execute = true;
    expect(avaliarAclV189(data).alertas).toContain("security_definer_exposta_requer_revisao:fn_log_event");
  });

  it("identifica policy antiga, falta de policy, RLS desligada e assinatura antiga", () => {
    const data = snapshot();
    data.policies.push({ tablename: "channel_sessions", policyname: "channel_sessions_tenant_write", cmd: "ALL", roles: ["public"] });
    data.policies.splice(0, 1);
    data.tabelas[0]!.relrowsecurity = false;
    data.funcoes[3]!.pronargs = 6;
    const alerts = avaliarAclV189(data).alertas;
    expect(alerts).toContain("policy_antiga_channel_sessions_presente");
    expect(alerts).toContain("policy_channel_sessions_insert_ausente");
    expect(alerts).toContain("rls_desativada:channel_sessions");
    expect(alerts).toContain("rpc_aviso_caso_sete_argumentos_ausente");
  });

  it("rejeita duplicatas e metadados fora do escopo", () => {
    const duplicate = snapshot();
    duplicate.funcoes.push({ ...duplicate.funcoes[0]! });
    expect(() => avaliarAclV189(duplicate)).toThrow();
    const invalid = snapshot();
    invalid.policies[0]!.tablename = "private_tokens";
    expect(() => avaliarAclV189(invalid)).toThrow();
  });

  it("usa apenas SELECTs de catalogo, transacao READ ONLY e ROLLBACK", async () => {
    const data = snapshot();
    const queries: string[] = [];
    const db = { query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("pg_catalog.pg_proc")) return { rows: data.funcoes };
      if (sql.includes("pg_catalog.pg_class")) return { rows: data.tabelas };
      if (sql.includes("pg_catalog.pg_policies")) return { rows: data.policies };
      return { rows: [] };
    } };
    const result = await consultarAclV189(db);
    expect(result.alertas).toEqual([]);
    expect(queries[0]).toContain("READ ONLY");
    expect(queries.at(-1)).toBe("ROLLBACK");
    expect(queries.filter((q) => /^SELECT\b/.test(q))).toHaveLength(3);
    expect(queries.every((q) => /^(BEGIN|SET LOCAL|SELECT|ROLLBACK)\b/.test(q))).toBe(true);
  });

  it("faz ROLLBACK se uma consulta falhar", async () => {
    const queries: string[] = [];
    const db = { query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("pg_catalog.pg_class")) throw new Error("catalogo indisponivel");
      return { rows: [] };
    } };
    await expect(consultarAclV189(db)).rejects.toThrow("catalogo indisponivel");
    expect(queries.at(-1)).toBe("ROLLBACK");
  });
});
