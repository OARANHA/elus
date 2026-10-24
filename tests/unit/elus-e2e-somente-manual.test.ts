import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Política ELUS: E2E/Playwright nunca executa em push, PR ou agendamento.
 * Somente workflow_dispatch após autorização explícita do proprietário.
 * Este teste é estático: não executa navegador, Playwright nem jornadas E2E.
 */
describe("ELUS: E2E somente sob pedido explícito", () => {
  const workflowsDir = path.resolve(process.cwd(), ".github/workflows");

  it("o workflow E2E só pode receber workflow_dispatch", () => {
    const e2e = readFileSync(path.join(workflowsDir, "e2e.yml"), "utf8");
    const bloco = e2e.match(/^on:\s*\n([\s\S]*?)(?=^[^\s#]|\s*$)/m);
    expect(bloco, "bloco on: obrigatório no e2e.yml").not.toBeNull();
    expect(bloco?.[1].trim()).toBe("workflow_dispatch: {}");
  });

  it("nenhum outro workflow inicia testes E2E/Playwright", () => {
    const arquivos = readdirSync(workflowsDir).filter((nome) => /\.ya?ml$/.test(nome) && nome !== "e2e.yml");
    for (const nome of arquivos) {
      const texto = readFileSync(path.join(workflowsDir, nome), "utf8");
      const comandos = texto.split("\n").filter((linha) =>
        /^\s*(run:|pnpm |npm |npx |bash |.*\|.*playwright)/.test(linha),
      ).join("\n");
      expect(comandos, `${nome} não pode invocar E2E sem autorização`).not.toMatch(
        /(?:pnpm\s+(?:test:e2e|test:journeys)|(?:pnpm\s+exec|npx)\s+playwright\s+test|playwright\s+test)/,
      );
    }
  });
});
