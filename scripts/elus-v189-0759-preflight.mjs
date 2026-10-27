#!/usr/bin/env node
/**
 * Pre-voo 0759: contagem agregada em transacao PostgreSQL READ ONLY.
 * Nao executa migrations, nao consulta hashes individuais, nao autoriza DELETE.
 */
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function quantidade(value) {
  if ((typeof value !== "string" || !/^\d+$/.test(value)) &&
      (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Contagem invalida");
  }
  return BigInt(value);
}

export function avaliar0759(row) {
  if (!row || typeof row !== "object" || Array.isArray(row) ||
      typeof row.rls_filtro_ativo !== "boolean") {
    throw new Error("Snapshot 0759 invalido");
  }
  const total = quantidade(row.total);
  const legados = quantidade(row.elegiveis_delete_0759);
  const atuais = quantidade(row.hashes_32_bytes);
  const nulos = quantidade(row.hashes_nulos);
  if (total !== legados + atuais + nulos) {
    throw new Error("Contagens 0759 inconsistentes");
  }
  const alertas = [];
  if (row.rls_filtro_ativo) alertas.push("rls_filtrando_resultado");
  if (legados > 0n) alertas.push("delete_0759_afetaria_linhas");
  if (nulos > 0n) alertas.push("hash_nulo_nao_atingido_pelo_delete");
  return Object.freeze({
    status: alertas.length ? "BLOQUEADO_REVISAO" : "PRECHECK_ONLY",
    total: total.toString(),
    elegiveis_delete_0759: legados.toString(),
    hashes_32_bytes: atuais.toString(),
    hashes_nulos: nulos.toString(),
    rls_filtro_ativo: row.rls_filtro_ativo,
    alertas,
    autoriza_delete: false,
    autoriza_replay: false,
    autoriza_merge_deploy: false,
    observacao: "Snapshot agregado pontual; contagem zero nao comprova seguranca futura nem autoriza a migration 0759.",
  });
}

export async function consultar0759(db) {
  let iniciou = false;
  try {
    await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
    iniciou = true;
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    const result = await db.query(`
      SELECT row_security_active('public.user_recovery_codes'::regclass) AS rls_filtro_ativo,
             count(*)::text AS total,
             count(*) FILTER (WHERE code_hash IS NOT NULL AND octet_length(code_hash) <> 32)::text AS elegiveis_delete_0759,
             count(*) FILTER (WHERE octet_length(code_hash) = 32)::text AS hashes_32_bytes,
             count(*) FILTER (WHERE code_hash IS NULL)::text AS hashes_nulos
        FROM public.user_recovery_codes
    `);
    if (!Array.isArray(result?.rows) || result.rows.length !== 1) {
      throw new Error("Snapshot 0759 incompleto");
    }
    return avaliar0759(result.rows[0]);
  } finally {
    if (iniciou) await db.query("ROLLBACK");
  }
}

async function main() {
  if (process.argv.length !== 2 || !process.env.PGHOST ||
      !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error("Conexao privada obrigatoria");
  }
  const { Client } = await import("pg");
  const db = new Client({
    connectionTimeoutMillis: 7000,
    query_timeout: 15000,
    application_name: "elus-v189-0759-readonly-preflight",
  });
  try {
    await db.connect();
    console.log(JSON.stringify(await consultar0759(db)));
  } finally {
    await db.end().catch(() => {});
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => {
    console.error("ELUS_0759_PRECHECK_BLOQUEADO: nenhum SQL de alteracao executado.");
    process.exitCode = 1;
  });
}
