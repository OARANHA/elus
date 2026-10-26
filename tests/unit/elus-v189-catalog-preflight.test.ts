import { describe, expect, it } from "vitest";
import {
  avaliarCatalogoV189,
  consultarCatalogoV189,
  LEDGER_REFERENCIA_20261025,
  TABELAS_ESPERADAS,
} from "../../scripts/elus-v189-catalog-preflight.mjs";

const snapshot = () => ({
  tabelas: TABELAS_ESPERADAS.map((relname) => ({ relname })),
  ledger: LEDGER_REFERENCIA_20261025.map((version) => ({ version })),
  policies: [
    { policyname: "channel_sessions_tenant_insert" },
    { policyname: "channel_sessions_tenant_update" },
    { policyname: "channel_sessions_tenant_delete" },
    { policyname: "user_recovery_codes_ninguem_le" },
  ],
  funcoes: [
    { proname: "fn_definir_aviso_de_caso", pronargs: 7, prosecdef: true },
    { proname: "fn_elus_rotacionar_codigos_recuperacao", pronargs: 2, prosecdef: true },
  ],
});

describe("ELUS v1.89 — pré-voo de catálogo read-only", () => {
  it("produz inventário sem autorizar execução, mesmo quando todos os objetos existem", () => {
    const resultado = avaliarCatalogoV189(snapshot());
    expect(resultado.status).toBe("PRECHECK_ONLY");
    expect(resultado.autoriza_replay).toBe(false);
    expect(resultado.autoriza_merge_deploy).toBe(false);
    expect(resultado.ledger_igual_snapshot_20261025).toBe(true);
    expect(resultado.tabelas_ausentes).toEqual([]);
    expect(resultado.policy_antiga_de_escrita_presente).toBe(false);
  });

  it("detecta mudança de ledger, objetos ausentes e policy antiga sem inferir replay", () => {
    const dados = snapshot();
    dados.ledger.push({ version: "20261027000000" });
    dados.tabelas.pop();
    dados.policies.push({ policyname: "channel_sessions_tenant_write" });
    const resultado = avaliarCatalogoV189(dados);
    expect(resultado.ledger_igual_snapshot_20261025).toBe(false);
    expect(resultado.ledger_novas_ou_divergentes).toEqual(["20261027000000"]);
    expect(resultado.tabelas_ausentes).toHaveLength(1);
    expect(resultado.policy_antiga_de_escrita_presente).toBe(true);
    expect(resultado.autoriza_replay).toBe(false);
  });

  it("falha fechado para duplicações, versões inválidas e funções inesperadas", () => {
    const duplicado = snapshot();
    duplicado.ledger.push({ version: LEDGER_REFERENCIA_20261025[0]! });
    expect(() => avaliarCatalogoV189(duplicado)).toThrow();
    const invalido = snapshot();
    invalido.ledger[0] = { version: "2026-10-18" };
    expect(() => avaliarCatalogoV189(invalido)).toThrow();
    const foraEscopo = snapshot();
    foraEscopo.funcoes.push({ proname: "fn_outra", pronargs: 1, prosecdef: false });
    expect(() => avaliarCatalogoV189(foraEscopo)).toThrow();
  });

  it("executa somente leitura de metadados e sempre encerra com ROLLBACK", async () => {
    const dados = snapshot();
    const consultas: string[] = [];
    const db = {
      query: async (sql: string) => {
        consultas.push(sql);
        if (sql.includes("pg_catalog.pg_class")) return { rows: dados.tabelas };
        if (sql.includes("supabase_migrations.schema_migrations")) return { rows: dados.ledger };
        if (sql.includes("pg_catalog.pg_policies")) return { rows: dados.policies };
        if (sql.includes("pg_catalog.pg_proc")) return { rows: dados.funcoes };
        return { rows: [] };
      },
    };
    const resultado = await consultarCatalogoV189(db);
    expect(resultado.ledger_total).toBe(11);
    expect(consultas[0]).toContain("READ ONLY");
    expect(consultas.at(-1)).toBe("ROLLBACK");
    expect(consultas.filter((q) => /^SELECT\b/.test(q))).toHaveLength(4);
    expect(consultas.every((q) => /^(BEGIN|SET LOCAL|SELECT|ROLLBACK)\b/.test(q))).toBe(true);
  });

  it("faz ROLLBACK também quando uma consulta falha", async () => {
    const consultas: string[] = [];
    const db = {
      query: async (sql: string) => {
        consultas.push(sql);
        if (sql.includes("schema_migrations")) throw new Error("sem permissão");
        return { rows: [] };
      },
    };
    await expect(consultarCatalogoV189(db)).rejects.toThrow("sem permissão");
    expect(consultas.at(-1)).toBe("ROLLBACK");
  });
});
