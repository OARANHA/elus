import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { avaliar0759, consultar0759 } from "../../scripts/elus-v189-0759-preflight.mjs";

const zero = {
  rls_filtro_ativo: false,
  total: "10",
  elegiveis_delete_0759: "0",
  hashes_32_bytes: "10",
  hashes_nulos: "0",
};

describe("ELUS v1.89 — auditoria read-only da migration 0759", () => {
  it("nao transforma contagem zero em autorizacao", () => {
    const result = avaliar0759(zero);
    expect(result.status).toBe("PRECHECK_ONLY");
    expect(result.autoriza_delete).toBe(false);
    expect(result.autoriza_replay).toBe(false);
    expect(result.autoriza_merge_deploy).toBe(false);
  });

  it("bloqueia se 0759 afetaria linhas e nunca revela hashes", () => {
    const result = avaliar0759({ ...zero, elegiveis_delete_0759: "3", total: "13" });
    expect(result.status).toBe("BLOQUEADO_REVISAO");
    expect(result.alertas).toContain("delete_0759_afetaria_linhas");
    expect(JSON.stringify(result)).not.toContain("code_hash");
  });

  it("bloqueia contagem filtrada por RLS e hashes nulos", () => {
    const result = avaliar0759({ ...zero, rls_filtro_ativo: true, hashes_nulos: "1", total: "11" });
    expect(result.alertas).toContain("rls_filtrando_resultado");
    expect(result.alertas).toContain("hash_nulo_nao_atingido_pelo_delete");
  });

  it("rejeita contagens inconsistentes, negativas ou malformadas", () => {
    expect(() => avaliar0759({ ...zero, total: "11" })).toThrow();
    expect(() => avaliar0759({ ...zero, total: "-1" })).toThrow();
    expect(() => avaliar0759({ ...zero, total: "10;DROP TABLE" })).toThrow();
  });

  it("usa apenas transacao READ ONLY, SET LOCAL, SELECT agregado e ROLLBACK", async () => {
    const queries: string[] = [];
    const db = {
      async query(sql: string) {
        queries.push(sql.trim());
        return { rows: [zero] };
      },
    };
    const result = await consultar0759(db);
    expect(result.status).toBe("PRECHECK_ONLY");
    expect(queries.map((sql) => sql.split(/\s+/)[0])).toEqual([
      "BEGIN", "SET", "SET", "SELECT", "ROLLBACK",
    ]);
    expect(queries[0]).toMatch(/READ ONLY$/);
    expect(queries[3]).toContain("octet_length(code_hash) <> 32");
    expect(queries[3]).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\s+(INTO|FROM|TABLE)\b/i);
    expect(queries[4]).toBe("ROLLBACK");
  });

  it("faz ROLLBACK mesmo se a leitura falhar", async () => {
    const queries: string[] = [];
    const db = {
      async query(sql: string) {
        queries.push(sql.trim());
        if (sql.trim().startsWith("SELECT")) throw new Error("Falha simulada");
        return { rows: [zero] };
      },
    };
    await expect(consultar0759(db)).rejects.toThrow("Falha simulada");
    expect(queries.at(-1)).toBe("ROLLBACK");
  });

  it("recusa CLI sem conexao e nao exibe valores de ambiente", () => {
    const script = resolve(process.cwd(), "scripts/elus-v189-0759-preflight.mjs");
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "", NODE_ENV: "test" },
      encoding: "utf8",
      timeout: 4000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ELUS_0759_PRECHECK_BLOQUEADO");
    expect(result.stdout).toBe("");
  });
});
