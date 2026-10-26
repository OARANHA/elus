#!/usr/bin/env node
/**
 * Pré-voo de impacto da migration 0759. Somente SELECT em transação READ ONLY.
 * Não executa migrations, não retorna hashes e nunca autoriza DELETE.
 */
import { pathToFileURL } from "node:url";
import process from "node:process";

function inteiroNaoNegativo(valor) {
  if (typeof valor !== "string" || !/^(0|[1-9][0-9]*)$/.test(valor)) {
    throw new Error("Contagem agregada inválida");
  }
  return BigInt(valor);
}

export function avaliarContagens0759(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Contagens ausentes");
  }
  const total = inteiroNaoNegativo(row.total);
  const legados = inteiroNaoNegativo(row.legados);
  const atuais = inteiroNaoNegativo(row.atuais);
  const nulos = inteiroNaoNegativo(row.nulos);
  if (total !== legados + atuais + nulos) {
    throw new Error("Contagens inconsistentes");
  }
  return Object.freeze({
    status: "PRECHECK_ONLY",
    total: total.toString(),
    candidatos_exclusao_0759: legados.toString(),
    hashes_32_bytes_preservados: atuais.toString(),
    hashes_nulos_nao_selecionados: nulos.toString(),
    exige_revisao_e_autorizacao: true,
    autoriza_execucao: false,
  });
}

export async function consultarImpacto0759(db) {
  // Snapshot estável para as duas leituras; não é lock de escrita nem aprovação futura.
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
  try {
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '2s'");
    const coluna = await db.query(
      "SELECT format_type(a.atttypid, a.atttypmod) AS tipo FROM pg_catalog.pg_attribute a WHERE a.attrelid = 'public.user_recovery_codes'::regclass AND a.attname = 'code_hash' AND NOT a.attisdropped",
    );
    if (coluna.rows.length !== 1 || coluna.rows[0]?.tipo !== "bytea") {
      throw new Error("Tipo de code_hash divergente");
    }
    const resultado = await db.query(
      "SELECT count(*)::text AS total, count(*) FILTER (WHERE octet_length(code_hash) <> 32)::text AS legados, count(*) FILTER (WHERE octet_length(code_hash) = 32)::text AS atuais, count(*) FILTER (WHERE code_hash IS NULL)::text AS nulos FROM public.user_recovery_codes",
    );
    if (resultado.rows.length !== 1) throw new Error("Agregado incompleto");
    return avaliarContagens0759(resultado.rows[0]);
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
    application_name: "elus-v189-0759-readonly-preflight",
  });
  try {
    await db.connect();
    const impacto = await consultarImpacto0759(db);
    console.log(JSON.stringify(impacto));
  } finally {
    await db.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("PRECHECK_BLOQUEADO: sem autorização para executar 0759.");
    process.exitCode = 1;
  });
}
