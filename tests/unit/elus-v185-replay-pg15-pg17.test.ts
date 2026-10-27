import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/elus-v185-reconstrucao-privada.yml"),
  "utf8",
);

const inicio = workflow.indexOf(
  "      - name: Reconstruir somente baseline v1.85 em PostgreSQL efêmero",
);
const fim = workflow.indexOf(
  "      - name: Destruir os artefatos privados e o banco temporário",
);
const replay = workflow.slice(inicio, fim);
const cleanup = workflow.slice(fim);

describe("ELUS v1.85 — replay privado isolado em PG15 e PG17", () => {
  it("preserva disparo exclusivamente manual e guarda anterior a secrets", () => {
    const triggers = workflow.slice(
      workflow.indexOf("on:\n"),
      workflow.indexOf("\npermissions:"),
    );
    expect(triggers).toMatch(/^on:\n  workflow_dispatch:\s*$/m);
    expect(triggers).not.toMatch(/(?:push|pull_request|schedule|workflow_run):/);
    const gate = workflow.indexOf(
      "      - name: Bloquear execução fora da branch autorizada",
    );
    const exportacao = workflow.indexOf(
      "      - name: Exportar e verificar os sete lotes",
    );
    expect(gate).toBeGreaterThanOrEqual(0);
    expect(exportacao).toBeGreaterThan(gate);
    expect(workflow).toContain(
      'refs/heads/feat/elus-v189-migrations-20261025',
    );
  });

  it("reproduz os mesmos sete lotes em dois PostgreSQL efêmeros", () => {
    expect(inicio).toBeGreaterThanOrEqual(0);
    expect(fim).toBeGreaterThan(inicio);
    expect(replay).toContain("for pg in 15 17; do");
    expect(replay).toContain('"pgvector/pgvector:pg${pg}"');
    expect(replay).toContain(
      'container="elus-v185-${GITHUB_RUN_ID}-pg${pg}"',
    );
    const match = replay.match(/for version in ([0-9 ]+); do/);
    expect(match).not.toBeNull();
    const versions = (match?.[1] ?? "").trim().split(/\s+/);
    expect(versions).toEqual([
      "20261018200431",
      "20261018204508",
      "20261018204837",
      "20261018204851",
      "20261018204924",
      "20261018204939",
      "20261018204955",
    ]);
    expect(replay).toContain('psql -X -q -v ON_ERROR_STOP=1');
    expect(replay).toContain('>/dev/null 2>&1; then');
    expect(replay).toContain('docker rm -f "$container"');
  });

  it("remove ambos os containers mesmo se o replay falhar", () => {
    expect(cleanup).toContain("if: always()");
    expect(cleanup).toContain("for pg in 15 17; do");
    expect(cleanup).toContain(
      'docker rm -f "elus-v185-${GITHUB_RUN_ID}-pg${pg}"',
    );
    expect(cleanup).toContain('rm -rf -- "$ELUS_PRIVATE_DIR"');
    expect(replay).toContain("SQL omitido");
    expect(replay).toContain("NÃO PROVADO:");
    expect(replay).not.toMatch(/\b(?:playwright|test:e2e|db push|db reset)\b/i);
  });
});
