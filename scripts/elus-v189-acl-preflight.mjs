#!/usr/bin/env node
/**
 * Inspecao read-only de ACL/RLS de objetos criticos do upgrade v1.89.
 * Resultado e observacional: nao valida corpos de funcoes nem autoriza replay.
 */
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const FUNCOES_ALVO = Object.freeze([
  "fn_log_event",
  "emit_event",
  "fn_lgpd_cascade_redact_contact",
  "fn_definir_aviso_de_caso",
  "fn_elus_rotacionar_codigos_recuperacao",
]);
export const TABELAS_ALVO = Object.freeze(["channel_sessions", "user_recovery_codes"]);

const REGRAS_ASSINATURA = Object.freeze({
  fn_log_event: [3],
  emit_event: [6],
  fn_lgpd_cascade_redact_contact: [3],
  fn_definir_aviso_de_caso: [6, 7],
  fn_elus_rotacionar_codigos_recuperacao: [2],
});

function nome(value) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_]{0,100}$/.test(value)) {
    throw new Error("Metadados invalidos");
  }
  return value;
}
function booleano(value) {
  if (typeof value !== "boolean") throw new Error("Metadados invalidos");
  return value;
}
function linhas(value) {
  if (!Array.isArray(value)) throw new Error("Metadados invalidos");
  return value;
}
function ordenar(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

/** Falha fechada para formatos inesperados; nunca retorna permissao de execucao. */
export function avaliarAclV189(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Snapshot invalido");
  }
  const funcoes = linhas(snapshot.funcoes).map((row) => {
    const funcao = nome(row?.proname);
    if (!FUNCOES_ALVO.includes(funcao) || !Number.isInteger(row?.pronargs) ||
        !REGRAS_ASSINATURA[funcao].includes(row.pronargs)) {
      throw new Error("Assinatura fora do escopo");
    }
    const identidade = row?.identidade;
    if (typeof identidade !== "string" || identidade.length > 240 || /[\r\n]/.test(identidade)) {
      throw new Error("Identidade invalida");
    }
    return {
      nome: funcao, argumentos: row.pronargs, identidade,
      security_definer: booleano(row.prosecdef),
      anon_execute: booleano(row.anon_execute),
      authenticated_execute: booleano(row.authenticated_execute),
      service_role_execute: booleano(row.service_role_execute),
    };
  });
  if (new Set(funcoes.map((f) => \`\${f.nome}/\${f.identidade}\`)).size !== funcoes.length) {
    throw new Error("Funcao duplicada");
  }
  const tabelas = linhas(snapshot.tabelas).map((row) => {
    const tabela = nome(row?.relname);
    if (!TABELAS_ALVO.includes(tabela)) throw new Error("Tabela fora do escopo");
    return {
      nome: tabela, rls_ativa: booleano(row.relrowsecurity),
      anon_select: booleano(row.anon_select),
      anon_insert: booleano(row.anon_insert),
      anon_update: booleano(row.anon_update),
      anon_delete: booleano(row.anon_delete),
      authenticated_select: booleano(row.authenticated_select),
      authenticated_insert: booleano(row.authenticated_insert),
      authenticated_update: booleano(row.authenticated_update),
      authenticated_delete: booleano(row.authenticated_delete),
    };
  });
  if (new Set(tabelas.map((t) => t.nome)).size !== tabelas.length) {
    throw new Error("Tabela duplicada");
  }
  const policies = linhas(snapshot.policies).map((row) => {
    const tabela = nome(row?.tablename);
    if (!TABELAS_ALVO.includes(tabela)) throw new Error("Policy fora do escopo");
    const policy = nome(row?.policyname);
    if (!Array.isArray(row.roles) || !row.roles.every((r) => typeof r === "string" && /^[a-z_]+$/.test(r))) {
      throw new Error("Roles invalidas");
    }
    if (typeof row.cmd !== "string" || !["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"].includes(row.cmd)) {
      throw new Error("Comando invalido");
    }
    return { tabela, policy, comando: row.cmd, roles: ordenar(row.roles) };
  });
  if (new Set(policies.map((p) => \`\${p.tabela}/\${p.policy}\`)).size !== policies.length) {
    throw new Error("Policy duplicada");
  }

  const alertas = [];
  for (const tabela of TABELAS_ALVO) {
    const t = tabelas.find((row) => row.nome === tabela);
    if (!t) alertas.push(\`tabela_ausente:\${tabela}\`);
    else if (!t.rls_ativa) alertas.push(\`rls_desativada:\${tabela}\`);
  }
  const recovery = tabelas.find((t) => t.nome === "user_recovery_codes");
  if (recovery && ["select", "insert", "update", "delete"].some((verb) =>
    recovery[\`anon_\${verb}\`] || recovery[\`authenticated_\${verb}\`])) {
    alertas.push("recovery_codes_privilegio_cliente_efetivo");
  }
  const rotacao = funcoes.filter((f) => f.nome === "fn_elus_rotacionar_codigos_recuperacao");
  if (rotacao.length !== 1) alertas.push("rpc_rotacao_ausente_ou_sobrecarregada");
  for (const f of rotacao) {
    if (!f.security_definer || f.anon_execute || f.authenticated_execute || !f.service_role_execute) {
      alertas.push("rpc_rotacao_acl_divergente");
    }
  }
  const caso7 = funcoes.some((f) => f.nome === "fn_definir_aviso_de_caso" && f.argumentos === 7);
  if (!caso7) alertas.push("rpc_aviso_caso_sete_argumentos_ausente");
  if (policies.some((p) => p.tabela === "channel_sessions" && p.policy === "channel_sessions_tenant_write")) {
    alertas.push("policy_antiga_channel_sessions_presente");
  }
  for (const verb of ["insert", "update", "delete"]) {
    if (!policies.some((p) => p.tabela === "channel_sessions" &&
      p.policy === \`channel_sessions_tenant_\${verb}\` && p.comando === verb.toUpperCase())) {
      alertas.push(\`policy_channel_sessions_\${verb}_ausente\`);
    }
  }
  if (!policies.some((p) => p.tabela === "user_recovery_codes" &&
    p.policy === "user_recovery_codes_ninguem_le" && p.comando === "SELECT")) {
    alertas.push("policy_recovery_codes_negacao_ausente");
  }
  for (const f of funcoes) {
    if (f.security_definer && (f.anon_execute || f.authenticated_execute) &&
        f.nome !== "fn_elus_rotacionar_codigos_recuperacao") {
      alertas.push(\`security_definer_exposta_requer_revisao:\${f.nome}\`);
    }
  }
  return Object.freeze({
    status: "PRECHECK_ONLY",
    autoriza_replay: false,
    autoriza_merge_deploy: false,
    autoriza_alteracao_acl: false,
    funcoes: funcoes.sort((a, b) => (a.nome + a.identidade).localeCompare(b.nome + b.identidade)),
    tabelas: tabelas.sort((a, b) => a.nome.localeCompare(b.nome)),
    policies: policies.sort((a, b) => (a.tabela + a.policy).localeCompare(b.tabela + b.policy)),
    alertas: ordenar(new Set(alertas)),
    observacao: "Privilegios efetivos nao provam grant direto, seguranca do corpo SQL, isolamento, replay ou rollback.",
  });
}

export async function consultarAclV189(db) {
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
  try {
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    const funcoes = await db.query(
      "SELECT p.proname, p.pronargs::integer, pg_get_function_identity_arguments(p.oid) AS identidade, p.prosecdef, " +
      "has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute, " +
      "has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute, " +
      "has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute " +
      "FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace " +
      "WHERE n.nspname = 'public' AND p.proname = ANY($1::text[]) ORDER BY p.proname, p.oid",
      [FUNCOES_ALVO],
    );
    const grants = ["anon", "authenticated"].flatMap((role) =>
      ["SELECT", "INSERT", "UPDATE", "DELETE"].map((verb) =>
        \`has_table_privilege('\${role}', c.oid, '\${verb}') AS \${role}_\${verb.toLowerCase()}\`),
    ).join(", ");
    const tabelas = await db.query(
      "SELECT c.relname, c.relrowsecurity, " + grants + " FROM pg_catalog.pg_class c " +
      "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace " +
      "WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY($1::text[]) ORDER BY c.relname",
      [TABELAS_ALVO],
    );
    const policies = await db.query(
      "SELECT tablename, policyname, cmd, roles FROM pg_catalog.pg_policies " +
      "WHERE schemaname = 'public' AND tablename = ANY($1::text[]) ORDER BY tablename, policyname",
      [TABELAS_ALVO],
    );
    return avaliarAclV189({ funcoes: funcoes.rows, tabelas: tabelas.rows, policies: policies.rows });
  } finally {
    await db.query("ROLLBACK");
  }
}

async function main() {
  if (process.argv.length !== 2 || !process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error("Conexao privada obrigatoria");
  }
  const { Client } = await import("pg");
  const db = new Client({
    connectionTimeoutMillis: 7000,
    query_timeout: 15000,
    application_name: "elus-v189-acl-readonly-preflight",
  });
  try {
    await db.connect();
    console.log(JSON.stringify(await consultarAclV189(db)));
  } finally {
    await db.end().catch(() => {});
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => {
    console.error("ACL_V189_PRECHECK_BLOQUEADO: nenhuma alteracao executada.");
    process.exitCode = 1;
  });
}
