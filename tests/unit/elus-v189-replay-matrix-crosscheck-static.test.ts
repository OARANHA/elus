/**
 * Contrato cruzado do plano v1.89: matriz de replay, manifesto pinado e plano upstream.
 * Somente arquivos versionados; nao conecta a banco, nao executa SQL nem aprova replay.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Migration = {
  file: string;
  git_blob_sha1: string;
  version: string;
  logical_number: string;
  cutoff_group: "AT_OR_BEFORE_LEDGER_CUTOFF" | "AFTER_LEDGER_CUTOFF";
  review_state: string;
  risk_flags: string[];
};
type Matrix = {
  status: string;
  source: { upstream_base_commit: string; upstream_target_commit: string };
  ledger_snapshot: { versions: string[]; cutoff: string };
  collision_renames: Record<string, string>;
  known_dependency_edges: Array<{ before: string; after: string }>;
  migrations: Migration[];
  protected_elus_migrations: Array<{ file: string; git_blob_sha1: string }>;
  required_gates: string[];
};

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const matrix = JSON.parse(read("docs/integracao/elus-v189-ledger-replay-matrix.json")) as Matrix;
const plan = JSON.parse(read("docs/integracao/elus-upstream-v1.89.0-plano.json")) as {
  base: string;
  source: string;
  renames: Record<string, string>;
};
const pinnedSource = read("tests/unit/elus-v189-import-ledger-integrity.test.ts");

function pinned(name: "IMPORTADAS" | "ELUS_PROPRIAS"): Record<string, string> {
  const block = pinnedSource.match(
    new RegExp(`const ${name}:[\\s\\S]*?= \\{([\\s\\S]*?)\\};`),
  );
  expect(block, `Manifesto ${name} ausente`).not.toBeNull();
  return Object.fromEntries(
    [...block![1]!.matchAll(/"(\d{14}_\d{4}_[^"]+\.sql)": "([a-f0-9]{40})"/g)].map(
      (match) => [match[1]!, match[2]!],
    ),
  );
}

const sortedPairs = (entries: Array<[string, string]>) =>
  entries.sort(([left], [right]) => left.localeCompare(right));

describe("ELUS v1.89 — coerencia estatica da matriz de replay", () => {
  it("mantem 38 imports e quatro SQLs ELUS byte-identificados pelo manifesto independente", () => {
    const imports = pinned("IMPORTADAS");
    const own = pinned("ELUS_PROPRIAS");
    expect(Object.keys(imports)).toHaveLength(38);
    expect(Object.keys(own)).toHaveLength(4);
    expect(matrix.migrations).toHaveLength(38);
    expect(matrix.protected_elus_migrations).toHaveLength(4);
    expect(sortedPairs(matrix.migrations.map((m) => [m.file, m.git_blob_sha1]))).toEqual(
      sortedPairs(Object.entries(imports)),
    );
    expect(sortedPairs(matrix.protected_elus_migrations.map((m) => [m.file, m.git_blob_sha1]))).toEqual(
      sortedPairs(Object.entries(own)),
    );
    for (const entry of matrix.migrations) {
      expect(entry.file.slice(0, 14)).toBe(entry.version);
      expect(entry.file.slice(15, 19)).toBe(entry.logical_number);
      expect(entry.review_state).toBe("REQUIRES_MANUAL_REVIEW");
    }
  });

  it("preserva o corte historico de 11 recibos e a divisao 11/27 sem inferir replay", () => {
    const { versions, cutoff } = matrix.ledger_snapshot;
    expect(versions).toHaveLength(11);
    expect([...versions].sort()).toEqual(versions);
    expect(versions.at(-1)).toBe(cutoff);
    expect(matrix.migrations.filter((m) => m.version <= cutoff)).toHaveLength(11);
    expect(matrix.migrations.filter((m) => m.version > cutoff)).toHaveLength(27);
    for (const migration of matrix.migrations) {
      expect(migration.cutoff_group).toBe(
        migration.version <= cutoff ? "AT_OR_BEFORE_LEDGER_CUTOFF" : "AFTER_LEDGER_CUTOFF",
      );
    }
  });

  it("reconcilia as tres colisoes, incluindo a unica alteracao de timestamp", () => {
    expect(matrix.collision_renames).toEqual(plan.renames);
    const pairs = Object.entries(matrix.collision_renames);
    expect(pairs).toHaveLength(3);
    expect(pairs.map(([from, to]) => [
      from.split("/").at(-1)!.slice(15, 19),
      to.split("/").at(-1)!.slice(15, 19),
    ])).toEqual([["0689", "0762"], ["0691", "0763"], ["0692", "0764"]]);
    expect(pairs.filter(([from, to]) => from.slice(20, 34) !== to.slice(20, 34))).toHaveLength(1);
    expect(matrix.source.upstream_base_commit).toBe(plan.base.match(/[a-f0-9]{40}/)?.[0]);
    expect(matrix.source.upstream_target_commit).toBe(plan.source.match(/[a-f0-9]{40}/)?.[0]);
  });

  it("mantem as sete dependencias em ordem e sinaliza DELETEs para revisao", () => {
    const byNumber = new Map(
      [...matrix.migrations, ...matrix.protected_elus_migrations.map((m) => ({
        ...m, version: m.file.slice(0, 14), logical_number: m.file.slice(15, 19),
      }))].map((m) => [m.logical_number, m.version]),
    );
    const edges = matrix.known_dependency_edges.map((edge) => `${edge.before}->${edge.after}`);
    expect(edges).toHaveLength(7);
    expect(new Set(edges).size).toBe(7);
    for (const { before, after } of matrix.known_dependency_edges) {
      expect(byNumber.has(before)).toBe(true);
      expect(byNumber.has(after)).toBe(true);
      expect(byNumber.get(before)! < byNumber.get(after)!).toBe(true);
    }
    expect(matrix.migrations.find((m) => m.logical_number === "0759")?.risk_flags)
      .toContain("destructive_delete");
    expect(matrix.migrations.find((m) => m.logical_number === "0731")?.risk_flags)
      .toContain("conditional_data_delete");
  });

  it("mantem o grafo de dependencias sincronizado com o executor bloqueado", () => {
    const source = read("scripts/elus-v189-production-upgrade.mjs");
    const match = source.match(/const DEPENDENCY_CHAINS=\[([\s\S]*?)\];\s*const digest=/);
    expect(match, "Cadeias do executor ausentes").not.toBeNull();
    const chains = JSON.parse(`[${match![1]}]`) as string[][];
    expect(chains).toHaveLength(6);
    const executorEdges = chains.flatMap((chain) =>
      chain.slice(1).map((file, index) =>
        `${chain[index]!.slice(15, 19)}->${file.slice(15, 19)}`,
      ),
    );
    const matrixEdges = matrix.known_dependency_edges.map(
      ({ before, after }) => `${before}->${after}`,
    );
    expect(executorEdges).toHaveLength(7);
    expect([...executorEdges].sort()).toEqual([...matrixEdges].sort());
  });

  it("permanece bloqueada ate gates independentes, sem aprovar aplicacao", () => {
    expect(matrix.status).toBe("BLOCKED_FOR_REPLAY");
    expect(matrix.required_gates).toContain("reconcile_11_historical_versions_and_38_imports");
    expect(matrix.required_gates).toContain("0759_explicit_impact_and_rollback_approval");
    expect(matrix.required_gates).toContain("isolated_v185_to_v189_replay_and_restore");
    expect(matrix.required_gates).toContain("authorization_before_any_real_database_change");
  });
});
