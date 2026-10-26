/**
 * Conferência OFFLINE dos sete statements históricos (preparo + seis lotes v1.85).
 * Não conecta ao Supabase, não executa SQL e não imprime conteúdo do arquivo.
 * MD5 é somente a impressão digital histórica documentada, não prova criptográfica.
 */
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const LEDGER_V185 = Object.freeze([
  { version: "20261018200431", bytes: 174, md5: "72db224ba3b80c474d771d66cb593668" },
  { version: "20261018204508", bytes: 508044, md5: "a1bfe00566688f95f316e4e37ffeb97c" },
  { version: "20261018204837", bytes: 509703, md5: "f7e534e726ec192c1db7fe984cf5c2a3" },
  { version: "20261018204851", bytes: 510397, md5: "df7399b2361471a32f6baebb5a51823b" },
  { version: "20261018204924", bytes: 510108, md5: "f3a0b9ea9d0cce746c2d403f9a04dd7f" },
  { version: "20261018204939", bytes: 509661, md5: "e6038fa04f2faa45f9416dc462beeb52" },
  { version: "20261018204955", bytes: 484187, md5: "dab84f1d8332894d78cf737b28488450" },
]);

/** @param {unknown} value @param {ReadonlyArray<{version:string,bytes:number,md5:string}>} expected */
export function verificarLedgerV185(value, expected = LEDGER_V185) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Formato de exportação inválido");
  }
  const rows = value.rows;
  if (!Array.isArray(rows) || rows.length !== expected.length) {
    throw new Error("Quantidade de registros históricos inesperada");
  }
  const versions = new Set();
  for (let i = 0; i < expected.length; i += 1) {
    const row = rows[i];
    const target = expected[i];
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        typeof row.version !== "string" || row.version !== target.version ||
        versions.has(row.version)) {
      throw new Error(`Versão ou ordem histórica inválida na posição ${i + 1}`);
    }
    versions.add(row.version);
    if (!Array.isArray(row.statements) || row.statements.length !== 1 ||
        typeof row.statements[0] !== "string") {
      throw new Error(`Statement histórico inválido na posição ${i + 1}`);
    }
    const statement = row.statements[0];
    if (Buffer.byteLength(statement, "utf8") !== target.bytes ||
        createHash("md5").update(statement, "utf8").digest("hex") !== target.md5) {
      throw new Error(`Fingerprint histórica divergente na posição ${i + 1}`);
    }
  }
  return { validado: true, registros: rows.length };
}

function executarCli() {
  try {
    if (process.argv.length !== 3) throw new Error("Informe um único arquivo JSON privado");
    const file = resolve(process.argv[2]);
    const metadata = lstatSync(file);
    if (!metadata.isFile() || metadata.size > 8 * 1024 * 1024) {
      throw new Error("Arquivo inválido ou excessivo");
    }
    const dados = JSON.parse(readFileSync(file, "utf8"));
    const resultado = verificarLedgerV185(dados);
    process.stdout.write(`LEDGER_V185_FINGERPRINT_OK registros=${resultado.registros}\n`);
  } catch {
    // Nunca ecoar SQL, caminho, erro de parse ou qualquer conteúdo privado.
    process.stderr.write("LEDGER_V185_FINGERPRINT_RED: exportação não verificada\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  executarCli();
}
