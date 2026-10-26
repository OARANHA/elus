import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  avaliarContagens0759,
  consultarImpacto0759,
} from "../../scripts/elus-v189-0759-preflight.mjs";

const agregado = () => ({ total: "9", legados: "2", atuais: "6", nulos: "1" });

function bancoFake(
  options: { tipo?: string; falharNoAgregado?: boolean } = {},
) {
  const comandos: string[] = [];
  return {
    comandos,
    async query(
      sql: string,
    ): Promise<{ rows: Array<Record<string, unknown>> }> {
      comandos.push(sql);
      if (sql.startsWith("SELECT format_type")) {
        return { rows: [{ tipo: options.tipo ?? "bytea" }] };
      }
      if (sql.startsWith("SELECT count")) {
        if (options.falharNoAgregado) throw new Error("SEGREDO_NAO_EXIBIR");
        return { rows: [agregado()] };
      }
      return { rows: [] };
    },
  };
}

describe("ELUS v1.89 — pré-voo READ ONLY da migration 0759", () => {
  it("classifica exclusivamente agregados e nunca autoriza a execução", () => {
    expect(avaliarContagens0759(agregado())).toEqual({
      status: "PRECHECK_ONLY",
      total: "9",
      candidatos_exclusao_0759: "2",
      hashes_32_bytes_preservados: "6",
      hashes_nulos_nao_selecionados: "1",
      exige_revisao_e_autorizacao: true,
      autoriza_execucao: false,
    });
    expect(
      avaliarContagens0759({
        total: "0",
        legados: "0",
        atuais: "0",
        nulos: "0",
      }).autoriza_execucao,
    ).toBe(false);
  });

  it("recusa contagens divergentes, valores negativos e entradas não decimais", () => {
    for (const entrada of [
      { ...agregado(), total: "8" },
      { ...agregado(), legados: "-2" },
      { ...agregado(), atuais: "6.0" },
      { ...agregado(), nulos: 1 },
      null,
    ]) {
      expect(() => avaliarContagens0759(entrada)).toThrow();
    }
  });

  it("consulta apenas catálogo e contagens, sempre em transação READ ONLY", async () => {
    const db = bancoFake();
    const resultado = await consultarImpacto0759(db);
    expect(resultado.candidatos_exclusao_0759).toBe("2");
    expect(db.comandos[0]).toContain("READ ONLY");
    expect(db.comandos.at(-1)).toBe("ROLLBACK");
    expect(db.comandos.filter((q) => q.startsWith("SELECT"))).toHaveLength(2);
    expect(
      db.comandos.every((q) => /^(BEGIN|SET LOCAL|SELECT|ROLLBACK)\b/i.test(q)),
    ).toBe(true);
    expect(db.comandos.join("\n")).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP)\s+(?:FROM|INTO|TABLE|FUNCTION)?\s*public\./i,
    );
  });

  it("falha fechado para coluna inesperada e reverte mesmo com erro de leitura", async () => {
    const tipo = bancoFake({ tipo: "text" });
    await expect(consultarImpacto0759(tipo)).rejects.toThrow(
      "Tipo de code_hash divergente",
    );
    expect(tipo.comandos.at(-1)).toBe("ROLLBACK");
    const falha = bancoFake({ falharNoAgregado: true });
    await expect(consultarImpacto0759(falha)).rejects.toThrow();
    expect(falha.comandos.at(-1)).toBe("ROLLBACK");
  });

  it("não altera a migration upstream nem contém gatilhos E2E", () => {
    const source = readFileSync(
      new URL("../../scripts/elus-v189-0759-preflight.mjs", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/\b(?:db push|db reset|playwright|test:e2e)\b/i);
    expect(source).toMatch(/console\.error\("PRECHECK_BLOQUEADO:/);
    expect(source).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:PGPASSWORD|e\.message|code_hash\s*\))/,
    );
  });
});
