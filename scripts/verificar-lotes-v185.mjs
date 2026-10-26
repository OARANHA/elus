#!/usr/bin/env node
// Gate local read-only: não consulta Supabase, não executa SQL nem imprime conteúdo.
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

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
  if (!dirArg || process.argv.length !== 3) {
    throw new Error("Uso: node scripts/verificar-lotes-v185.mjs /diretorio-privado");
  }
  const dir = await realpath(resolve(dirArg));
  const repo = await realpath(process.cwd());
  if (dir === repo || dir.startsWith(repo + sep)) {
    throw new Error("Recusado: exportações dentro do repositório");
  }
  const dirStat = await lstat(dir);
  if (!dirStat.isDirectory() || (dirStat.mode & 0o077) !== 0) {
    throw new Error("Diretório deve ser privado (chmod 700)");
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
    console.log("Lote " + version + ": OK (conteúdo omitido)");
  }
  console.log("VALIDAÇÃO LOCAL: " + ok + "/7 lotes íntegros. NÃO aprova replay nem semântica do SQL.");
}
main().catch((error) => {
  console.error("BLOQUEADO: " + error.message);
  process.exitCode = 1;
});
