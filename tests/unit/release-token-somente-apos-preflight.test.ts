import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O ELUS recebe pushes comuns na main mesmo sem um GitHub App de release
 * configurado. A ausência de token é aceitável SOMENTE quando não há corte.
 * Uma remoção real de fragmento continua exigindo token da App e guarda.
 */
describe("release: token do GitHub App somente em um possível corte", () => {
  const yaml = readFileSync(".github/workflows/release.yml", "utf8");
  const corte = yaml.split("\n  cortar-tag:\n")[1] ?? "";

  it("faz o preflight local, fail-closed, antes da criação de token", () => {
    const posChecagem = corte.indexOf("- name: Este push removeu fragmentos de release?");
    const posToken = corte.indexOf("- uses: actions/create-github-app-token@v3");
    expect(posChecagem).toBeGreaterThan(0);
    expect(posToken).toBeGreaterThan(posChecagem);
    expect(corte).toContain("git rev-parse --verify HEAD^ >/dev/null");
    expect(corte).toContain("git diff --find-renames --diff-filter=D --name-only HEAD^ HEAD -- .changes/");
    expect(corte).toContain('echo "precisa_app=nao" >> "${GITHUB_OUTPUT}"');
    expect(corte).toContain('echo "precisa_app=sim" >> "${GITHUB_OUTPUT}"');
    expect(corte).toContain("persist-credentials: false");
  });

  it("não cria token no push comum e mantém a exigência de App no corte real", () => {
    expect(corte).toMatch(/- uses: actions\/create-github-app-token@v3\n\s+if: steps\.preflight\.outputs\.precisa_app == 'sim'/);
    expect(corte).toMatch(/- uses: \.\/\.github\/actions\/preparar-node\n\s+if: steps\.preflight\.outputs\.precisa_app == 'sim'/);
    expect(corte).toMatch(/- name: Este push foi um corte de release\?\n\s+if: steps\.preflight\.outputs\.precisa_app == 'sim'/);
    expect(corte).toContain("private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}");
    expect(corte).toContain("git push origin");
    expect(corte).toContain("corte_do_app=sim");
    expect(corte).toContain("if: steps.pendente.outputs.cortar == 'sim'");
  });
});
