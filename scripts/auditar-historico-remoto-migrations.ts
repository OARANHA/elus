/**
 * Auditoria OFFLINE do histórico remoto de migrations do ELUS.
 * Entrada: JSON sanitizado contendo APENAS version e name.
 * Não consulta o banco, não executa SQL, não aplica migrations e não autoriza deploy.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type AppliedRow = { version: string; name: string };
export type LocalAlias = { path: string; recordedName: string };
export type HistoryIssue = {
  code: "empty_history" | "invalid_row" | "duplicate_version" |
    "baseline_in_chunks" | "missing_local_record" | "local_version_alias" |
    "invalid_candidate" | "candidate_not_newer_than_remote";
  value: string;
  remoteVersion?: string;
};

/** Nomes de registro observados no ELUS; NÃO são versões dos arquivos Git. */
export const ELUS_LOCAL_ALIASES: readonly LocalAlias[] = [
  { path: "supabase/migrations/20261019120000_0689_integracoes_erp_vendaerp.sql",
    recordedName: "integracoes_erp_vendaerp_0689" },
  { path: "supabase/migrations/20261020120000_0690_org_ai_autonomy_protected.sql",
    recordedName: "elus_0690_org_ai_autonomy_protected" },
  { path: "supabase/migrations/20261020120001_0691_chutes_chat_catalog.sql",
    recordedName: "elus_0691_chutes_chat_catalog" },
  { path: "supabase/migrations/20261020230000_0692_chutes_catalog_sync.sql",
    recordedName: "elus_0692_chutes_catalog_sync" },
];
const VERSION = /^\d{14}$/;
const MIGRATION = /^supabase\/migrations\/(\d{14})_\d{4}_[^/]+\.sql$/;
const BASELINE_CHUNK = /^elus_v185_baseline_.+_p\d+_of_\d+$/;

/** Não confundir schema_migrations.version com timestamp do arquivo. */
export function auditAppliedMigrationHistory(
  snapshot: readonly unknown[],
  candidates: readonly string[],
  aliases: readonly LocalAlias[] = ELUS_LOCAL_ALIASES,
) {
  const issues: HistoryIssue[] = [];
  const rows: AppliedRow[] = [];
  const seen = new Set<string>();
  if (snapshot.length === 0) issues.push({ code: "empty_history", value: "schema_migrations" });
  for (const [index, raw] of snapshot.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      !("version" in raw) || !("name" in raw) ||
      typeof raw.version !== "string" || !VERSION.test(raw.version) ||
      typeof raw.name !== "string" || raw.name.trim() === "") {
      issues.push({ code: "invalid_row", value: String(index) });
      continue;
    }
    const row: AppliedRow = { version: raw.version, name: raw.name };
    if (seen.has(row.version)) issues.push({ code: "duplicate_version", value: row.version });
    seen.add(row.version);
    rows.push(row);
  }
  const latestVersion = rows.map((row) => row.version).sort().at(-1) ?? null;
  const baselineChunks = rows.filter((row) => BASELINE_CHUNK.test(row.name)).length;
  if (baselineChunks) issues.push({ code: "baseline_in_chunks", value: String(baselineChunks) });
  const appliedLocal: Array<{ path: string; recordedVersion: string | null }> = [];
  for (const alias of aliases) {
    const row = rows.find((item) => item.name === alias.recordedName);
    appliedLocal.push({ path: alias.path, recordedVersion: row?.version ?? null });
    if (!row) {
      issues.push({ code: "missing_local_record", value: alias.path });
    } else if (MIGRATION.exec(alias.path)?.[1] !== row.version) {
      issues.push({ code: "local_version_alias", value: alias.path, remoteVersion: row.version });
    }
  }
  const backdatedCandidates: string[] = [];
  for (const path of candidates) {
    const timestamp = MIGRATION.exec(path)?.[1];
    if (!timestamp) issues.push({ code: "invalid_candidate", value: path });
    else if (latestVersion !== null && timestamp <= latestVersion) {
      backdatedCandidates.push(path);
      issues.push({ code: "candidate_not_newer_than_remote",
        value: path, remoteVersion: latestVersion });
    }
  }
  return {
    recorded: rows.length, latestVersion, baselineChunks, appliedLocal,
    candidateCount: candidates.length, backdatedCandidates, issues,
    requiresManualSchemaReview: true,
    automaticImportAllowed: false,
  };
}

function migrationPathsAt(ref: string): string[] {
  const stdout = execFileSync("git",
    ["ls-tree", "-r", "--name-only", ref, "--", "supabase/migrations"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return stdout.split("\n").filter((path) => path.endsWith(".sql"));
}

function main(): void {
  const [snapshotFile, baseRef, upstreamRef, planFile, ...extra] = process.argv.slice(2);
  if (!snapshotFile || !baseRef || !upstreamRef || !planFile || extra.length) {
    console.error("Uso: pnpm exec tsx scripts/auditar-historico-remoto-migrations.ts " +
      "<snapshot-sanitizado.json> <ref-base-v185> <ref-upstream-v189> <plano.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const snapshot: unknown = JSON.parse(readFileSync(snapshotFile, "utf8"));
    const plan: unknown = JSON.parse(readFileSync(planFile, "utf8"));
    if (!Array.isArray(snapshot) || !plan || typeof plan !== "object" ||
      !("renames" in plan) || !plan.renames || typeof plan.renames !== "object" ||
      Array.isArray(plan.renames) ||
      !Object.values(plan.renames).every((value) => typeof value === "string")) {
      throw new Error("Snapshot/plano inválido: requer array version/name e objeto renames.");
    }
    const base = new Set(migrationPathsAt(baseRef));
    const added = migrationPathsAt(upstreamRef).filter((path) => !base.has(path));
    const renames = plan.renames as Record<string, string>;
    const result = auditAppliedMigrationHistory(snapshot, added.map((path) => renames[path] ?? path));
    console.log(JSON.stringify(result, null, 2));
    if (result.issues.length) process.exitCode = 1;
  } catch (error) {
    console.error("NÃO MEDIDO — snapshot, plano ou refs indisponíveis:", String(error));
    process.exitCode = 2;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
