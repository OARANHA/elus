import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/verificar-lotes-v185.mjs");
const versions = [
  "20261018200431",
  "20261018204508",
  "20261018204837",
  "20261018204851",
  "20261018204924",
  "20261018204939",
  "20261018204955",
];

function run(dir: string) {
  return spawnSync(process.execPath, [script, dir], {
    cwd: process.cwd(),
    env: { PATH: process.env.PATH ?? "", NODE_ENV: "test" },
    encoding: "utf8",
    timeout: 4_500,
  });
}

/** Todos os arquivos são sentinelas sintéticas inválidas; jamais SQL real. */
function fixture() {
  const temp = mkdtempSync(join(tmpdir(), "elus-v185-verify-"));
  const dir = join(temp, "private");
  mkdirSync(dir, { mode: 0o700 });
  for (const version of versions) {
    writeFileSync(join(dir, version + ".sql"), "SENTINELA_PRIVADA_SEM_SQL", { mode: 0o600 });
  }
  return { temp, dir };
}

describe("ELUS v1.85 — verificador offline dos lotes privados", () => {
  it("recusa arquivos adicionais antes de tentar verificar fingerprints", () => {
    if (process.platform === "win32") return;
    const { temp, dir } = fixture();
    try {
      writeFileSync(join(dir, "inesperado.sql"), "SENTINELA_PRIVADA_SEM_SQL", { mode: 0o600 });
      const result = run(dir);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Conjunto de lotes divergente");
      expect(result.stdout).not.toContain("SENTINELA_PRIVADA_SEM_SQL");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("recusa symlink para diretório privado", () => {
    if (process.platform === "win32") return;
    const { temp, dir } = fixture();
    try {
      const alias = join(temp, "atalho");
      symlinkSync(dir, alias, "dir");
      const result = run(alias);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Diretório irregular");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("recusa arquivos públicos e symlinks de lotes sem imprimir conteúdo", () => {
    if (process.platform === "win32") return;
    const { temp, dir } = fixture();
    try {
      const first = join(dir, versions[0] + ".sql");
      chmodSync(first, 0o644);
      const publicResult = run(dir);
      expect(publicResult.error).toBeUndefined();
      expect(publicResult.status).toBe(1);
      expect(publicResult.stderr).toContain("BLOQUEADO");
      expect(publicResult.stdout).not.toContain("SENTINELA_PRIVADA_SEM_SQL");

      rmSync(first);
      symlinkSync(join(dir, versions[1] + ".sql"), first);
      const symlinkResult = run(dir);
      expect(symlinkResult.error).toBeUndefined();
      expect(symlinkResult.status).toBe(1);
      expect(symlinkResult.stderr).toContain("BLOQUEADO");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("não revela caminhos privados em erros de filesystem", () => {
    if (process.platform === "win32") return;
    const { temp, dir } = fixture();
    try {
      const missing = join(dir, "caminho-privado-inexistente");
      const result = run(missing);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("BLOQUEADO");
      expect(result.stderr).not.toContain(missing);
      expect(result.stdout).toBe("");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
