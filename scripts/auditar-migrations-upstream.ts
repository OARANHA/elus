/**
 * Auditoria somente leitura de migrations do ELUS versus DeskcommCRM.
 * Não altera arquivos, banco, refs, ambientes ou dispara E2E.
 *
 * Uso: pnpm exec tsx scripts/auditar-migrations-upstream.ts \
 *   HEAD upstream-base-v185 upstream-target-v189
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RE_MIGRATION = /^supabase\/migrations\/(\d{14})_(\d{4})_([^/]+)\.sql$/;

export type MigrationInfo = {
  path: string;
  timestamp: string;
  number: number;
};

export type Collision = {
  reason: "number" | "timestamp" | "path";
  local: string;
  upstream: string;
  value: string;
};

export function parseMigration(path: string): MigrationInfo | null {
  const match = RE_MIGRATION.exec(path);
  if (!match) return null; // migração legada anterior à convenção
  return { path, timestamp: match[1], number: Number(match[2]) };
}

export function auditUpstreamMigrations(
  basePaths: readonly string[],
  localPaths: readonly string[],
  upstreamPaths: readonly string[],
) {
  const base = new Set(basePaths);
  const localAdditions = [...new Set(localPaths)].filter((p) => !base.has(p)).sort();
  const upstreamAdditions = [...new Set(upstreamPaths)].filter((p) => !base.has(p)).sort();
  const local = localAdditions.map(parseMigration).filter((m): m is MigrationInfo => m !== null);
  const upstream = upstreamAdditions.map(parseMigration).filter((m): m is MigrationInfo => m !== null);

  const collisions: Collision[] = [];
  for (const newer of upstream) {
    for (const own of local) {
      if (own.path === newer.path) {
        collisions.push({ reason: "path", local: own.path, upstream: newer.path, value: newer.path });
      } else {
        if (own.number === newer.number) {
          collisions.push({
            reason: "number", local: own.path, upstream: newer.path,
            value: String(newer.number).padStart(4, "0"),
          });
        }
        if (own.timestamp === newer.timestamp) {
          collisions.push({
            reason: "timestamp", local: own.path, upstream: newer.path,
            value: newer.timestamp,
          });
        }
      }
    }
  }

  const reservedNumbers = [...localPaths, ...upstreamPaths]
    .map(parseMigration)
    .filter((m): m is MigrationInfo => m !== null)
    .map((m) => m.number);
  let nextNumber = Math.max(0, ...reservedNumbers) + 1;
  const renameSuggestions = [...new Set(
    collisions.filter((c) => c.reason === "number").map((c) => c.upstream),
  )].sort().map((path) => {
    const old = parseMigration(path);
    if (!old) throw new Error("Caminho inesperado de migration: " + path);
    const replacementNumber = String(nextNumber++).padStart(4, "0");
    return {
      original: path,
      suggested: path.replace(
        /^(supabase\/migrations\/\d{14})_\d{4}_/,
        `$1_${replacementNumber}_`,
      ),
      previousNumber: String(old.number).padStart(4, "0"),
      replacementNumber,
    };
  });

  return {
    localAdded: localAdditions.length,
    upstreamAdded: upstreamAdditions.length,
    collisions,
    renameSuggestions,
    requiresManualTimestampFix: collisions.some((c) => c.reason === "timestamp"),
  };
}

function listMigrationsAt(ref: string): string[] {
  const stdout = execFileSync(
    "git", ["ls-tree", "-r", "--name-only", ref, "--", "supabase/migrations"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return stdout.split("\n").filter((line) => line.endsWith(".sql"));
}

function main(): void {
  const refs = process.argv.slice(2);
  if (refs.length !== 3) {
    console.error(
      "Uso: pnpm exec tsx scripts/auditar-migrations-upstream.ts " +
      "<ref-local> <ref-base-upstream> <ref-alvo-upstream>",
    );
    process.exitCode = 2;
    return;
  }
  try {
    const result = auditUpstreamMigrations(
      listMigrationsAt(refs[1]),
      listMigrationsAt(refs[0]),
      listMigrationsAt(refs[2]),
    );
    console.log(JSON.stringify({ refs: { local: refs[0], base: refs[1], upstream: refs[2] }, ...result }, null, 2));
    if (result.collisions.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error("NÃO MEDIDO — refs indisponíveis ou leitura Git falhou:", String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
