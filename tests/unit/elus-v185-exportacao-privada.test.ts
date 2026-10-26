import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Gate estático do exportador v1.85. Não conecta ao banco.
 * Este teste não comprova exportação, restauração ou replay.
 */
const source = readFileSync(join(process.cwd(), "scripts/exportar-lotes-v185-privado.mjs"), "utf8");

describe("ELUS v1.85 — exportação privada dos lotes", () => {
  it("limita a consulta aos registros explícitos do ledger", () => {
    expect(source).toMatch(/BEGIN READ ONLY/);
    expect(source).toMatch(/SELECT version, statements FROM supabase_migrations\.schema_migrations WHERE version = ANY\(\$1::text\[\]\)/);
    expect(source).toMatch(/rows\.length !== lotes\.size/);
    expect(source).toMatch(/statements\.length !== 1/);
  });

  it("compara tamanho e impressão digital antes de gravar", () => {
    expect(source).toMatch(/bytes\.length !== expected\[0\]/);
    expect(source).toMatch(/md5\(md5\(bytes\)\) !== expected\[1\]/);
    expect(source.indexOf("const checked = []")).toBeLessThan(source.indexOf("for (const [version, bytes] of checked)"));
  });

  it("nega saída dentro do checkout, sobrescrita e acesso público", () => {
    expect(source).toMatch(/dir\.startsWith\(root \+ sep\)/);
    expect(source).toMatch(/realpath\(dirname\(dir\)\)/);
    expect(source).toMatch(/canonicalParent === root/);
    expect(source).toMatch(/canonicalDir === root/);
    expect(source).toMatch(/recursive: false, mode: 0o700/);
    expect(source).toMatch(/open\(path, "wx", 0o600\)/);
    expect(source).toMatch(/process\.umask\(0o077\)/);
  });

  it("não expõe conteúdos ou mensagens arbitrárias de erro", () => {
    expect(source).not.toMatch(/console\.(log|error)\([^\n]*(?:row\.statements|e\.message|PGPASSWORD)/);
    expect(source).toMatch(/Exportação recusada/);
  });

  it("recusa exportação por symlink que aponta para dentro do checkout, antes de abrir conexão", () => {
    if (process.platform === "win32") return;
    const temp = mkdtempSync(join(tmpdir(), "elus-v185-export-"));
    try {
      const checkout = join(temp, "checkout");
      mkdirSync(checkout);
      const atalho = join(temp, "atalho");
      symlinkSync(checkout, atalho, "dir");
      const result = spawnSync(
        process.execPath,
        [resolve(process.cwd(), "scripts/exportar-lotes-v185-privado.mjs"), join(atalho, "lotes")],
        {
          cwd: checkout,
          env: {
            PATH: process.env.PATH ?? "",
            PGHOST: "192.0.2.1",
            PGUSER: "invalido",
            PGDATABASE: "invalido",
            PGSSLMODE: "disable",
          },
          encoding: "utf8",
          timeout: 4_500,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Exportação bloqueada");
      expect(existsSync(join(checkout, "lotes"))).toBe(false);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
