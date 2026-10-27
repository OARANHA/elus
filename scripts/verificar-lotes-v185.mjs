#!/usr/bin/env node
// Gate local read-only: não consulta Supabase, não executa SQL nem imprime conteúdo.
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, readdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LOTES = [
  ["20261018200431", 174, "72db224ba3b80c474d771d66cb593668"],
  ["20261018204508", 508044, "a1bfe00566688f95f316e4e37ffeb97c"],
  ["20261018204837", 509703, "f7e534e726ec192c1db7fe984cf5c2a3"],
  ["20261018204851", 510397, "df7399b2361471a32f6baebb5a51823b"],
  ["20261018204924", 510108, "f3a0b9ea9d0cce746c2d403f9a04dd7f"],
  ["20261018204939", 509661, "e6038fa04f2faa45f9416dc462beeb52"],
  ["20261018204955", 484187, "dab84f1d8332894d78cf737b28488450"],
];
const md5 = (bytes) => createHash("md5").update(bytes).digest("hex");

async function main() {
  const dirArg = process.argv[2];
  if (!dirArg || process.argv.length !== 3 || !isAbsolute(dirArg)) {
    throw new Error("Uso: diretório privado absoluto obrigatório");
  }
  const requested = resolve(dirArg);
  const requestedStat = await lstat(requested);
  if (!requestedStat.isDirectory() || requestedStat.isSymbolicLink()) {
    throw new Error("Diretório irregular");
  }
  const dir = await realpath(requested);
  const repo = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  if (dir === repo || dir.startsWith(repo + sep)) {
    throw new Error("Recusado: exportações dentro do repositório");
  }
  const dirStat = await lstat(dir);
  if (!dirStat.isDirectory() || (dirStat.mode & 0o077) !== 0) {
    throw new Error("Diretório deve ser privado (chmod 700)");
  }
  const expectedNames = LOTES.map(([version]) => version + ".sql").sort();
  const actualNames = (await readdir(dir)).sort();
  if (
    actualNames.length !== expectedNames.length ||
    actualNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error("Conjunto de lotes divergente");
  }
  let ok = 0;
  for (const [version, bytes, expected] of LOTES) {
    const file = resolve(dir, version + ".sql");
    const info = await lstat(file);
    if (!info.isFile() || (info.mode & 0o077) !== 0) {
      throw new Error("Lote " + version + ": arquivo não privado ou irregular (chmod 600)");
    }
    const body = await readFile(file);
    // A consulta no Supabase usou md5(string_agg(md5(statement),'|' ...)); cada lote contém um statement.
    if (body.length !== bytes || md5(md5(body)) !== expected) {
      throw new Error("Lote " + version + ": fingerprint divergente; NÃO executar replay");
    }
    ok++;
  }
  console.log("VALIDAÇÃO LOCAL: " + ok + "/7 lotes íntegros. NÃO aprova replay nem semântica do SQL.");
}
main().catch((error) => {
  // Erros de filesystem podem conter caminhos privados: nunca imprimi-los.
  const safeReasons = new Set([
    "Uso: diretório privado absoluto obrigatório",
    "Diretório irregular",
    "Recusado: exportações dentro do repositório",
    "Diretório deve ser privado (chmod 700)",
    "Conjunto de lotes divergente",
  ]);
  const reason = error instanceof Error && safeReasons.has(error.message)
    ? error.message
    : "verificação privada falhou";
  console.error("BLOQUEADO: " + reason + ". Nenhum SQL foi executado.");
  process.exitCode = 1;
});
