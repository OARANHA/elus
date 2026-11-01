/**
 * Regressao estatica da divergencia 0690/9037 observada no ELUS.
 * Nao executa SQL, nao acessa banco e nao atesta ACL/RLS ou identidade efetiva.
 * A 9037 e externa ao manifesto: sua expressao aqui vem da auditoria
 * documentada, nao de uma migration versionada no repositorio.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20261020120000_0690_org_ai_autonomy_protected.sql", import.meta.url),
  "utf8",
);
const evidence = readFileSync(
  new URL("../../docs/integracao/elus-v189-ensaio-upgrade-isolado-20261026.md", import.meta.url),
  "utf8",
);

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

describe("ELUS v1.89 — divergencia estatica da guarda 0690/9037", () => {
  it("mantem rastreavel o predicado versionado 0690 e a diferenca externa 9037", () => {
    const assignment = migration.match(/v_privileged\s*:=([\s\S]*?);/i);
    expect(assignment).not.toBeNull();
    expect(normalize(assignment![1]!)).toBe(
      "auth.role() = 'service_role' or (current_user = 'postgres' and auth.uid() is null and auth.role() is null)",
    );

    const documented = normalize(evidence);
    expect(documented).toContain(
      "(current_user = 'service_role' and auth.role() = 'service_role')",
    );
    expect(documented).toContain("9037 externa não integra o manifesto");
    expect(documented).toContain("não demonstra que cada combinação é alcançável");
  });

  it("distingue uma unica combinacao divergente sem presumir que ela seja alcancavel", () => {
    const cases = [
      { currentService: false, roleService: false, postgresException: false, old: false, effective: false },
      { currentService: false, roleService: true, postgresException: false, old: true, effective: false },
      { currentService: true, roleService: false, postgresException: false, old: false, effective: false },
      { currentService: true, roleService: true, postgresException: false, old: true, effective: true },
      { currentService: false, roleService: false, postgresException: true, old: true, effective: true },
    ];
    const evaluated = cases.map((item) => ({
      old: item.roleService || item.postgresException,
      effective: (item.currentService && item.roleService) || item.postgresException,
    }));
    expect(evaluated).toEqual(cases.map(({ old, effective }) => ({ old, effective })));
    expect(evaluated.filter(({ old, effective }) => old !== effective)).toHaveLength(1);
  });
});
