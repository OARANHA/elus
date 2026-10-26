import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Gate estático: não exporta SQL, não lê secrets e não inicia PostgreSQL. */
const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/elus-v185-reconstrucao-privada.yml"),
  "utf8",
);

describe("ELUS v1.85 — reconstrução privada só na branch autorizada", () => {
  it("aceita somente acionamento manual", () => {
    const start = workflow.indexOf("on:\n");
    const end = workflow.indexOf("\npermissions:", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const triggers = workflow.slice(start, end);
    expect(triggers).toMatch(/^on:\n  workflow_dispatch:\s*$/m);
    expect(triggers).not.toMatch(/^\s+(?:push|pull_request|schedule|workflow_run):/m);
  });

  it("recusa outras branches ANTES do checkout, dos secrets e da exportação", () => {
    const steps = workflow.indexOf("    steps:\n");
    const guard = workflow.indexOf("      - name: Bloquear execução fora da branch autorizada");
    const checkout = workflow.indexOf("      - uses: actions/checkout@", guard);
    const exportStep = workflow.indexOf("      - name: Exportar e verificar", guard);
    expect(steps).toBeGreaterThanOrEqual(0);
    expect(guard).toBeGreaterThan(steps);
    expect(checkout).toBeGreaterThan(guard);
    expect(exportStep).toBeGreaterThan(checkout);
    const firstStep = workflow.slice(steps + "    steps:\n".length, checkout);
    expect(firstStep).toContain("      - name: Bloquear execução fora da branch autorizada");
    expect(firstStep).toContain('if [ "${GITHUB_EVENT_NAME}" != "workflow_dispatch" ] ||');
    expect(firstStep).toContain('[ "${GITHUB_REF}" != "refs/heads/feat/elus-v189-migrations-20261025" ]; then');
    expect(firstStep).toMatch(/^\s+exit 1\s*$/m);
    expect(firstStep).not.toContain("secrets.");
  });

  it("não usa if no job: um skip poderia parecer CI GREEN", () => {
    const job = workflow.indexOf("  reconstruir-v185:");
    const steps = workflow.indexOf("    steps:", job);
    expect(job).toBeGreaterThanOrEqual(0);
    expect(steps).toBeGreaterThan(job);
    expect(workflow.slice(job, steps)).not.toMatch(/^    if:/m);
  });
});
