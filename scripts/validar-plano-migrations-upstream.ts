/**
 * Pré-voo somente leitura para o lote de migrations DeskcommCRM -> ELUS.
 *
 * Confere colisões de caminho, versão/timestamp e número lógico; exige
 * também que as migrations históricas da base tenham blob SHA idêntico
 * nas árvores ELUS e upstream. Não altera nenhum arquivo nem banco.
 *
 * NÃO valida dependências SQL, schema real, migrations já aplicadas ou permissões
 * de execução. Resultado válido NÃO autoriza db push, reset, deploy ou merge.
 *
 * Uso:
 * pnpm exec tsx scripts/validar-plano-migrations-upstream.ts \
 *   HEAD upstream-base-v185 upstream-target-v189 \
 *   docs/integracao/elus-upstream-v1.89.0-plano.json
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseMigration } from "./auditar-migrations-upstream";

export type ImportIssueCode =
  | "unknown_source"
  | "invalid_source"
  | "invalid_destination"
  | "changed_slug"
  | "path_collision"
  | "timestamp_collision"
  | "number_collision"
  | "timestamp_order";

export interface ImportIssue {
  code: ImportIssueCode;
  path: string;
  conflictWith?: string;
}

export function validateMigrationImportPlan(
  basePaths: readonly string[],
  localPaths: readonly string[],
  upstreamPaths: readonly string[],
  renames: Readonly<Record<string, string>>,
) {
  const base = new Set(basePaths);
  const upstreamAdded = [...new Set(upstreamPaths)].filter((p) => !base.has(p)).sort();
  const upstreamAddedSet = new Set(upstreamAdded);
  const localAdded = [...new Set(localPaths)].filter((p) => !base.has(p)).length;
  const issues: ImportIssue[] = [];
  const paths = new Set(localPaths);
  const timestamps = new Map<string, string>();
  const numbers = new Map<number, string>();

  // O histórico local é intocável: inclui base upstream e migrations próprias.
  for (const path of localPaths) {
    const parsed = parseMigration(path);
    if (!parsed) continue;
    timestamps.set(parsed.timestamp, path);
    numbers.set(parsed.number, path);
  }

  for (const source of Object.keys(renames).sort()) {
    if (!upstreamAddedSet.has(source)) {
      issues.push({ code: "unknown_source", path: source });
    }
  }

  const entries: Array<{ source: string; destination: string; renamed: boolean }> = [];
  let previousImportedTimestamp: string | null = null;
  for (const source of upstreamAdded) {
    const destination = renames[source] ?? source;
    const original = parseMigration(source);
    const target = parseMigration(destination);
    if (!original) {
      issues.push({ code: "invalid_source", path: source });
      continue;
    }
    if (!target) {
      issues.push({ code: "invalid_destination", path: destination });
      continue;
    }
    // Somente timestamp e NNNN podem mudar. O slug e o conteúdo SQL
    // permanecem identificáveis; eventual ajuste SQL exige revisão separada.
    const slug = (path: string) => path.replace(/^supabase\/migrations\/\d{14}_\d{4}_/, "");
    if (slug(source) !== slug(destination)) {
      issues.push({ code: "changed_slug", path: destination, conflictWith: source });
    }

    if (paths.has(destination)) {
      issues.push({ code: "path_collision", path: destination });
    }
    const timestampOwner = timestamps.get(target.timestamp);
    if (timestampOwner) {
      issues.push({ code: "timestamp_collision", path: destination, conflictWith: timestampOwner });
    }
    const numberOwner = numbers.get(target.number);
    if (numberOwner) {
      issues.push({ code: "number_collision", path: destination, conflictWith: numberOwner });
    }
    // Uma renomeação não pode inverter a sequência cronológica das migrations
    // novas do upstream; o ordenamento de versões Supabase usa o timestamp.
    if (previousImportedTimestamp !== null && target.timestamp <= previousImportedTimestamp) {
      issues.push({ code: "timestamp_order", path: destination });
    }
    previousImportedTimestamp = target.timestamp;

    paths.add(destination);
    timestamps.set(target.timestamp, destination);
    numbers.set(target.number, destination);
    entries.push({ source, destination, renamed: source !== destination });
  }

  return {
    localAdded,
    upstreamAdded: upstreamAdded.length,
    entries,
    issues,
    valid: issues.length === 0,
    // Gate externo obrigatório mesmo quando a verificação de nomes é GREEN.
    requiresDatabaseHistoryReview: true,
  };
}

/** Blob SHA do Git identifica bytes exatos, sem executar nem interpretar SQL. */
export interface MigrationBlob {
  path: string;
  sha: string;
}

export type MigrationHistoryIssueCode =
  | "empty_baseline"
  | "local_history_missing"
  | "local_history_modified"
  | "upstream_history_missing"
  | "upstream_history_modified";

export interface MigrationHistoryIssue {
  code: MigrationHistoryIssueCode;
  path: string;
}

/**
 * Falha fechado se a cópia ELUS ou o alvo upstream apagou/alterou uma migration
 * presente no baseline comum. Arquivo aplicado não pode ser reescrito
 * silenciosamente; a existência do mesmo caminho não é prova de integridade.
 *
 * Isto NÃO verifica se o SQL já foi aplicado em qualquer banco real.
 */
export function validateMigrationHistory(
  base: readonly MigrationBlob[],
  local: readonly MigrationBlob[],
  upstream: readonly MigrationBlob[],
) {
  const own = new Map(local.map((entry) => [entry.path, entry.sha]));
  const target = new Map(upstream.map((entry) => [entry.path, entry.sha]));
  const issues: MigrationHistoryIssue[] = [];
  // Uma ref errada ou vazia não pode virar GREEN só por iteração vazia.
  if (base.length === 0) issues.push({ code: "empty_baseline", path: "supabase/migrations" });

  for (const migration of base) {
    const localSha = own.get(migration.path);
    if (localSha === undefined) {
      issues.push({ code: "local_history_missing", path: migration.path });
    } else if (localSha !== migration.sha) {
      issues.push({ code: "local_history_modified", path: migration.path });
    }
    const upstreamSha = target.get(migration.path);
    if (upstreamSha === undefined) {
      issues.push({ code: "upstream_history_missing", path: migration.path });
    } else if (upstreamSha !== migration.sha) {
      issues.push({ code: "upstream_history_modified", path: migration.path });
    }
  }

  return { checked: base.length, issues, valid: issues.length === 0 };
}

/**
 * Lê somente os metadados de objetos da árvore Git (sem checkout, rede, SQL
 * executável ou database). A saída padrão é "100644 blob SHA\\tpath".
 */
function listMigrationBlobsAt(ref: string): MigrationBlob[] {
  const stdout = execFileSync(
    "git", ["ls-tree", "-r", ref, "--", "supabase/migrations"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return stdout.split("\n").filter(Boolean).map((line) => {
    const match = /^100644 blob ([0-9a-f]{40})\t(.+\.sql)$/.exec(line);
    if (!match?.[1] || !match[2]) {
      throw new Error("Objeto de migration Git inesperado: " + line.slice(0, 100));
    }
    return { sha: match[1], path: match[2] };
  });
}

function main(): void {
  const [localRef, baseRef, upstreamRef, planFile, ...extra] = process.argv.slice(2);
  if (!localRef || !baseRef || !upstreamRef || !planFile || extra.length) {
    console.error(
      "Uso: pnpm exec tsx scripts/validar-plano-migrations-upstream.ts " +
      "<ref-local> <ref-base> <ref-upstream> <arquivo-plano.json>",
    );
    process.exitCode = 2;
    return;
  }
  try {
    const plan = JSON.parse(readFileSync(planFile, "utf8")) as { renames?: unknown };
    if (!plan || typeof plan.renames !== "object" || plan.renames === null ||
      Array.isArray(plan.renames) ||
      !Object.values(plan.renames).every((value) => typeof value === "string")) {
      throw new Error("Plano inválido: renames deve ser um objeto de caminhos.");
    }
    const base = listMigrationBlobsAt(baseRef);
    const local = listMigrationBlobsAt(localRef);
    const upstream = listMigrationBlobsAt(upstreamRef);
    const history = validateMigrationHistory(base, local, upstream);
    const result = validateMigrationImportPlan(
      base.map((entry) => entry.path),
      local.map((entry) => entry.path),
      upstream.map((entry) => entry.path),
      plan.renames as Record<string, string>,
    );
    console.log(JSON.stringify({
      refs: { local: localRef, base: baseRef, upstream: upstreamRef },
      ...result,
      history,
    }, null, 2));
    if (!result.valid || !history.valid) process.exitCode = 1;
  } catch (error) {
    console.error("NÃO MEDIDO — plano ou refs indisponíveis:", String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
