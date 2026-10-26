/**
 * Matriz estática e não executável de reconciliação v1.85 -> v1.89.
 * Não acessa rede, credenciais ou banco e não aplica migrations.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Entry {
  file: string;
  git_blob_sha1: string;
  version?: string;
  logical_number?: string;
  cutoff_group?: string;
  review_state?: string;
  risk_flags?: string[];
}
interface Matrix {
  schema_version: number;
  status: string;
  ledger_snapshot: { versions: string[]; cutoff: string };
  collision_renames: Record<string, string>;
  known_dependency_edges: Array<{ before: string; after: string }>;
  migrations: Entry[];
  protected_elus_migrations: Entry[];
  required_gates: string[];
}
const root = process.cwd();
const matrix = JSON.parse(readFileSync(
  join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8",
)) as Matrix;
const pinSource = readFileSync(
  join(root, "tests/unit/elus-v189-import-ledger-integrity.test.ts"), "utf8",
);

function pinned(name: "IMPORTADAS" | "ELUS_PROPRIAS"): Record<string, string> {
  const block = pinSource.match(
    new RegExp("const " + name + ": Readonly<Record<string, string>> = \\{([\\s\\S]*?)\\n\\};"),
  );
  expect(block, "Pinagem original ausente: " + name).not.toBeNull();
  const entries = [...block![1].matchAll(/^\\s*"([^"]+\\.sql)": "([a-f0-9]{40})",?$/gm)];
  return Object.fromEntries(entries.map((m) => [m[1], m[2]]));
}
function blob(file: string): string {
  const bytes = readFileSync(join(root, "supabase/migrations", file));
  return createHash("sha1").update("blob " + bytes.length + "\\0").update(bytes).digest("hex");
}

describe("ELUS v1.89 — matriz estática de replay (bloqueada)", () => {
  it("mantém os 38 imports e as quatro migrations ELUS com os mesmos blobs", () => {
    expect(matrix.schema_version).toBe(1);
    expect(matrix.status).toBe("BLOCKED_FOR_REPLAY");
    expect(matrix.migrations).toHaveLength(38);
    expect(matrix.protected_elus_migrations).toHaveLength(4);
    for (const [entries, expected] of [
      [matrix.migrations, pinned("IMPORTADAS")],
      [matrix.protected_elus_migrations, pinned("ELUS_PROPRIAS")],
    ] as const) {
      expect(Object.fromEntries(entries.map((e) => [e.file, e.git_blob_sha1]))).toEqual(expected);
      for (const e of entries) {
        expect(blob(e.file), "Blob alterado: " + e.file).toBe(e.git_blob_sha1);
      }
    }
  });

  it("separa os 11 imports anteriores ao corte dos 27 posteriores sem inferir aplicação", () => {
    const versions = matrix.ledger_snapshot.versions;
    expect(versions).toHaveLength(11);
    expect(versions).toEqual([...versions].sort());
    expect(matrix.ledger_snapshot.cutoff).toBe("20261021025613");
    expect(versions.at(-1)).toBe(matrix.ledger_snapshot.cutoff);
    const counts = { before: 0, after: 0 };
    for (const e of matrix.migrations) {
      const parts = e.file.match(/^(\\d{14})_(\\d{4})_.+\\.sql$/);
      expect(parts, "Nome inválido: " + e.file).not.toBeNull();
      expect(e.version).toBe(parts![1]);
      expect(e.logical_number).toBe(parts![2]);
      expect(e.review_state).toBe("REQUIRES_MANUAL_REVIEW");
      if (e.version! <= matrix.ledger_snapshot.cutoff) {
        expect(e.cutoff_group).toBe("AT_OR_BEFORE_LEDGER_CUTOFF");
        counts.before++;
      } else {
        expect(e.cutoff_group).toBe("AFTER_LEDGER_CUTOFF");
        counts.after++;
      }
    }
    expect(counts).toEqual({ before: 11, after: 27 });
    const all = [...matrix.migrations, ...matrix.protected_elus_migrations];
    expect(new Set(all.map((e) => e.file.slice(0, 14))).size).toBe(42);
    expect(new Set(all.map((e) => e.file.split("_")[1])).size).toBe(42);
    for (const e of matrix.protected_elus_migrations) {
      expect(versions).not.toContain(e.file.slice(0, 14));
    }
  });

  it("mantém as três colisões resolvidas e dependências conhecidas em ordem", () => {
    const nominal = JSON.parse(readFileSync(
      join(root, "docs/integracao/elus-upstream-v1.89.0-plano.json"), "utf8",
    )) as { renames: Record<string, string> };
    expect(matrix.collision_renames).toEqual(nominal.renames);
    expect(Object.keys(matrix.collision_renames)).toHaveLength(3);
    for (const destination of Object.values(matrix.collision_renames)) {
      expect(matrix.migrations.map((m) => "supabase/migrations/" + m.file)).toContain(destination);
    }
    const byNumber = new Map(matrix.migrations.map((m) => [m.logical_number, m]));
    expect(matrix.known_dependency_edges.length).toBeGreaterThanOrEqual(7);
    for (const edge of matrix.known_dependency_edges) {
      const before = byNumber.get(edge.before);
      const after = byNumber.get(edge.after);
      expect(before, "Dependência ausente: " + edge.before).toBeDefined();
      expect(after, "Dependência ausente: " + edge.after).toBeDefined();
      expect(before!.version! < after!.version!, edge.before + " -> " + edge.after).toBe(true);
    }
  });

  it("bloqueia automaticamente replay e destaca a migration 0759 destrutiva", () => {
    const destructive = matrix.migrations.find((m) => m.logical_number === "0759");
    expect(destructive?.risk_flags).toContain("destructive_delete");
    expect(destructive?.review_state).toBe("REQUIRES_MANUAL_REVIEW");
    expect(matrix.required_gates).toContain("0759_explicit_impact_and_rollback_approval");
    expect(matrix.required_gates).toContain("isolated_v185_to_v189_replay_and_restore");
  });
});
