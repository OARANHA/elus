#!/usr/bin/env node
/**
 * Exportação PRIVADA e estritamente read-only dos 7 registros históricos v1.85.
 * Não roda no CI, não executa DDL/DML, não imprime SQL, senha ou URL.
 * Exige conexão PostgreSQL privada pré-configurada via libpq PGHOST/PGPORT/
 * PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE, sem flags de credenciais.
 */
import { createHash } from "node:crypto";
import { mkdir, lstat, open, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import process from "node:process";
import { Client } from "pg";

const lotes = new Map([
  ["20261018200431", [174, "72db224ba3b80c474d771d66cb593668"]],
  ["20261018204508", [508044, "a1bfe00566688f95f316e4e37ffeb97c"]],
  ["20261018204837", [509703, "f7e534e726ec192c1db7fe984cf5c2a3"]],
  ["20261018204851", [510397, "df7399b2361471a32f6baebb5a51823b"]],
  ["20261018204924", [510108, "f3a0b9ea9d0cce746c2d403f9a04dd7f"]],
  ["20261018204939", [509661, "e6038fa04f2faa45f9416dc462beeb52"]],
  ["20261018204955", [484187, "dab84f1d8332894d78cf737b28488450"]],
]);
const md5 = (data) => createHash("md5").update(data).digest("hex");
function requireDir(arg) {
  if (!arg || process.argv.length !== 3 || !isAbsolute(arg)) {
    throw new Error("Uso: node scripts/exportar-lotes-v185-privado.mjs /caminho/absoluto/privado");
  }
}
async function main() {
  const destination = process.argv[2];
  requireDir(destination);
  const root = await realpath(process.cwd());
  const dir = resolve(destination);
  if (dir === root || dir.startsWith(root + sep)) {
    throw new Error("Destino dentro do checkout não é permitido");
  }
  // O caminho lexical pode estar fora do repo, mas o pai ser um symlink para dentro dele.
  const canonicalParent = await realpath(dirname(dir));
  if (canonicalParent === root || canonicalParent.startsWith(root + sep)) {
    throw new Error("Destino indireto dentro do checkout não é permitido");
  }
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error("Conexão PGHOST, PGUSER e PGDATABASE deve estar configurada privadamente");
  }
  // Não aceitar exportação já existente: evita sobrescrever e misturar versões.
  await mkdir(dir, { recursive: false, mode: 0o700 });
  const mode = (await lstat(dir)).mode;
  if ((mode & 0o077) !== 0) throw new Error("Diretório não é privado");
  const canonicalDir = await realpath(dir);
  if (canonicalDir === root || canonicalDir.startsWith(root + sep)) {
    throw new Error("Destino real dentro do checkout não é permitido");
  }
  const originalUmask = process.umask(0o077);
  const db = new Client({ connectionTimeoutMillis: 7000, query_timeout: 30000, application_name: "elus-v185-private-ledger-export" });
  let connected = false;
  const written = [];
  try {
    await db.connect();
    connected = true;
    await db.query("BEGIN READ ONLY");
    await db.query("SET LOCAL statement_timeout='30s'");
    const result = await db.query(
      "SELECT version, statements FROM supabase_migrations.schema_migrations WHERE version = ANY($1::text[]) ORDER BY version",
      [[...lotes.keys()]],
    );
    if (result.rows.length !== lotes.size) throw new Error("Ledger não contém exatamente os sete registros exigidos");
    // Validar todos os hashes ANTES de escrever qualquer SQL.
    const checked = [];
    for (const row of result.rows) {
      const expected = lotes.get(row.version);
      if (!expected || !Array.isArray(row.statements) || row.statements.length !== 1 || typeof row.statements[0] !== "string") {
        throw new Error("Estrutura histórica divergente");
      }
      const bytes = Buffer.from(row.statements[0], "utf8");
      if (bytes.length !== expected[0] || md5(md5(bytes)) !== expected[1]) {
        throw new Error("Integridade histórica divergente: " + row.version);
      }
      checked.push([row.version, bytes]);
    }
    await db.query("ROLLBACK");
    for (const [version, bytes] of checked) {
      // Revalidar antes de cada escrita: não seguir um destino substituído por symlink.
      const currentDir = await realpath(dir);
      const currentMode = await lstat(dir);
      if (currentDir !== canonicalDir || !currentMode.isDirectory() || (currentMode.mode & 0o077) !== 0) {
        throw new Error("Destino privado alterado durante a exportação");
      }
      const path = resolve(dir, version + ".sql");
      const fh = await open(path, "wx", 0o600);
      written.push(path);
      try { await fh.writeFile(bytes); } finally { await fh.close(); }
    }
    console.log("Exportação privada validada: 7/7 lotes. Conteúdo SQL omitido.");
    console.log("Executar verificador offline antes de qualquer ensaio. NÃO executar SQL de produção.");
  } catch (e) {
    for (const path of written) await rm(path, { force: true });
    throw new Error("Exportação recusada" + (typeof e.code === "string" && /^[A-Z0-9]{4,6}$/.test(e.code) ? " (código " + e.code + ")" : ""));
  } finally {
    if (connected) await db.end().catch(() => {});
    process.umask(originalUmask);
  }
}
main().catch(() => { console.error("Exportação bloqueada; verifique conexão privada e integridade dos lotes."); process.exitCode = 1; });
