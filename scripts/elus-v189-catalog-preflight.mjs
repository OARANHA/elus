#!/usr/bin/env node
/**
 * Diagnóstico de metadados v1.85 -> v1.89, estritamente somente leitura.
 * Não consulta dados de clientes, não executa migrations e não concede autorização.
 */
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const TABELAS_ESPERADAS = Object.freeze([
  "calendar_resources",
  "calendar_service_schedule",
  "calendar_service_professionals",
  "calendar_service_resources",
  "calendar_service_calendar_sources",
  "calendar_service_occurrences",
  "calendar_service_occurrence_resources",
  "calendar_service_blocks",
  "lgpd_marcas_de_apagamento",
  "importacoes_de_historico",
  "crm_lead_attachments",
  "config_aviso_de_agendamento",
  "entregas_de_aviso_de_agendamento",
  "automation_rodizio_atribuicoes",
  "agent_turn_traces",
  "crm_metas",
]);

export const LEDGER_REFERENCIA_20261025 = Object.freeze([
  "20261018200431", "20261018204508", "20261018204837",
  "20261018204851", "20261018204924", "20261018204939",
  "20261018204955", "20261019204449", "20261021025530",
  "20261021025551", "20261021025613",
]);

const FUNCOES_INSPECIONADAS = Object.freeze([
  "fn_definir_aviso_de_caso", "fn_definir_aviso_de_agendamento",
  "fn_automation_rodizio_atribuir", "fn_titular_apagado_a_pedido",
  "fn_elus_rotacionar_codigos_recuperacao",
]);
const POLICIES_INSPECIONADAS = Object.freeze([
  "channel_sessions_tenant_write", "channel_sessions_tenant_insert",
  "channel_sessions_tenant_update", "channel_sessions_tenant_delete",
  "user_recovery_codes_ninguem_le",
]);

function texto(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error("Metadados inesperados");
  }
  return value;
}

function listaUnica(rows, key) {
  if (!Array.isArray(rows)) throw new Error("Resultado de catálogo inválido");
  const values = rows.map((row) => texto(row?.[key]));
  if (new Set(values).size !== values.length) throw new Error("Metadados duplicados");
  return values.sort();
}

/**
 * Avaliação deliberadamente NÃO executável. Não equipara ausência de objeto
 * à necessidade de aplicar um arquivo SQL nem presença à paridade semântica.
 */
export function avaliarCatalogoV189(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Snapshot inválido");
  }
  const tabelas = listaUnica(snapshot.tabelas, "relname");
  const versoes = listaUnica(snapshot.ledger, "version");
  const policies = listaUnica(snapshot.policies, "policyname");
  if (versoes.some((v) => !/^\d{14}$/.test(v))) {
    throw new Error("Versão do ledger inválida");
  }
  const funcoes = snapshot.funcoes;
  if (!Array.isArray(funcoes)) throw new Error("Funções inválidas");
  const assinaturas = funcoes.map((row) => {
    const nome = texto(row?.proname);
    if (!Number.isInteger(row?.pronargs) || row.pronargs < 0 || row.pronargs > 64 ||
        typeof row?.prosecdef !== "boolean") {
      throw new Error("Assinatura inválida");
    }
    return { nome, argumentos: row.pronargs, security_definer: row.prosecdef };
  });
  if (tabelas.some((v) => !TABELAS_ESPERADAS.includes(v)) ||
      policies.some((v) => !POLICIES_INSPECIONADAS.includes(v)) ||
      assinaturas.some((v) => !FUNCOES_INSPECIONADAS.includes(v.nome))) {
    throw new Error("Escopo de metadados inesperado");
  }
  const chave = (f) => `${f.nome}/${f.argumentos}`;
  if (new Set(assinaturas.map(chave)).size !== assinaturas.length) {
    throw new Error("Assinatura duplicada");
  }
  const referencia = LEDGER_REFERENCIA_20261025;
  const ledgerIgual = versoes.length === referencia.length &&
    versoes.every((v, i) => v === referencia[i]);
  const ausentes = TABELAS_ESPERADAS.filter((v) => !tabelas.includes(v));
  return Object.freeze({
    status: "PRECHECK_ONLY",
    autoriza_replay: false,
    autoriza_merge_deploy: false,
    ledger_igual_snapshot_20261025: ledgerIgual,
    ledger_total: versoes.length,
    ledger_novas_ou_divergentes: versoes.filter((v) => !referencia.includes(v)),
    tabelas_esperadas: TABELAS_ESPERADAS.length,
    tabelas_presentes: tabelas.length,
    tabelas_ausentes: ausentes,
    policies_observadas: policies,
    policy_antiga_de_escrita_presente: policies.includes("channel_sessions_tenant_write"),
    funcoes_observadas: assinaturas.sort((a, b) => chave(a).localeCompare(chave(b))),
    observacao: "Metadados não comprovam colunas, grants, RLS efetiva, dados, replay ou rollback.",
  });
}

export async function consultarCatalogoV189(db) {
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
  try {
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    const tabelas = await db.query(
      "SELECT c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY($1::text[]) ORDER BY c.relname",
      [TABELAS_ESPERADAS],
    );
    const ledger = await db.query(
      "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version",
    );
    const policies = await db.query(
      "SELECT policyname FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND policyname = ANY($1::text[]) AND tablename = ANY($2::text[]) ORDER BY policyname",
      [POLICIES_INSPECIONADAS, ["channel_sessions", "user_recovery_codes"]],
    );
    const funcoes = await db.query(
      "SELECT p.proname, p.pronargs::integer, p.prosecdef FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = ANY($1::text[]) ORDER BY p.proname, p.pronargs",
      [FUNCOES_INSPECIONADAS],
    );
    return avaliarCatalogoV189({
      tabelas: tabelas.rows,
      ledger: ledger.rows,
      policies: policies.rows,
      funcoes: funcoes.rows,
    });
  } finally {
    await db.query("ROLLBACK");
  }
}

async function main() {
  if (process.argv.length !== 2 || !process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error("Conexão privada obrigatória");
  }
  const { Client } = await import("pg");
  const db = new Client({
    connectionTimeoutMillis: 7000,
    query_timeout: 15000,
    application_name: "elus-v189-catalog-readonly-preflight",
  });
  try {
    await db.connect();
    console.log(JSON.stringify(await consultarCatalogoV189(db)));
  } finally {
    await db.end().catch(() => {});
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => {
    console.error("CATALOGO_V189_PRECHECK_BLOQUEADO: nenhuma alteração executada.");
    process.exitCode = 1;
  });
}
