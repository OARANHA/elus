/**
 * Inventario estatico de dependencias SQL v1.89.
 * Este teste NAO conecta a banco, nao executa SQL e nao comprova replay.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalogSql = readFileSync(
  new URL("../../docs/integracao/elus-v189-dependencias-catalogo-readonly.sql", import.meta.url),
  "utf8",
);
const sql = catalogSql.replace(/--[^\r\n]*/g, "").trim();

const migration = (file: string) =>
  readFileSync(new URL("../../supabase/migrations/" + file, import.meta.url), "utf8");

describe("ELUS v1.89 — preflight de dependencias somente leitura", () => {
  it("consulta apenas catalogo e nao contem instrucoes mutantes", () => {
    expect(sql).toMatch(/^WITH targets AS\s*\(/i);
    expect(sql).toMatch(/\bFROM targets t\b/i);
    expect(sql).toContain("pg_catalog.pg_depend");
    expect(sql).toContain("pg_catalog.pg_describe_object");
    expect(sql).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|COPY|MERGE|REFRESH|VACUUM|DO)\b/i,
    );
    expect(sql).not.toMatch(/\b(?:public|auth)\.(?:messages|contacts|organizations)\b/i);
  });

  it("mapeia os quatro alvos reais de DROP das migrations importadas", () => {
    const targets = [
      "to_regprocedure('public.fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)')",
      "to_regclass('public.external_db_connections_safe')",
      "to_regprocedure('public.fn_automation_rodizio_atribuir(uuid,uuid,uuid)')",
      "to_regprocedure('public.fn_attendant_metrics(uuid,timestamptz,timestamptz,uuid)')",
    ];
    for (const target of targets) expect(sql).toContain(target);

    expect(migration("20261020000004_0687_responder_caso_pelo_whatsapp_interno.sql")).toMatch(
      /drop function if exists public\.fn_definir_aviso_de_caso\(uuid,uuid,text,text,boolean,boolean\);/i,
    );
    expect(migration("20261020120002_0763_banco_externo_db_type_e_aviso.sql")).toMatch(
      /drop view if exists public\.external_db_connections_safe;/i,
    );
    expect(migration("20261020130000_0764_rodizio_na_acao_atribuir.sql")).toMatch(
      /drop function if exists public\.fn_automation_rodizio_atribuir\(uuid, uuid, uuid\);/i,
    );
    expect(migration("20261022120000_0706_banco_externo_receitas.sql")).toMatch(
      /drop view if exists public\.external_db_connections_safe;/i,
    );
    expect(migration("20261023160009_0754_mediana_da_primeira_resposta_e_recorte_por_etiqueta.sql")).toMatch(
      /drop function if exists public\.fn_attendant_metrics\(uuid, timestamptz, timestamptz, uuid\);/i,
    );
  });

  it("distingue objetos com mesmo nome mas tipo errado para DROP VIEW/FUNCTION", () => {
    expect(sql).toContain("THEN 'KIND_MISMATCH'");
    expect(sql).toMatch(/t\.kind\s*=\s*'view'[\s\S]*?FROM pg_catalog\.pg_class c[\s\S]*?c\.relkind\s*=\s*'v'/i);
    expect(sql).toMatch(/t\.kind\s*=\s*'function'[\s\S]*?FROM pg_catalog\.pg_proc p[\s\S]*?p\.prokind\s*=\s*'f'/i);
    expect(sql).toContain("END AS target_state");
    expect(sql).toContain("ELSE 'PRESENT'");
  });

  it("classifica a regra _RETURN interna da view sem esconder dependencias externas", () => {
    expect(sql).toContain("WHEN d.objid IS NULL THEN 'NONE_RECORDED'");
    expect(sql).toContain("d.classid = 'pg_catalog.pg_rewrite'::regclass");
    expect(sql).toMatch(/d\.deptype\s*=\s*'i'/i);
    expect(sql).toMatch(
      /FROM pg_catalog\.pg_rewrite rw[\s\S]*?rw\.oid\s*=\s*d\.objid[\s\S]*?rw\.ev_class\s*=\s*t\.object_oid/i,
    );
    expect(sql).toContain("THEN 'OWN_VIEW_RULE_INTERNAL'");
    expect(sql).toContain("ELSE 'REVIEW_DEPENDENCY'");
    expect(sql).toContain("END AS dependency_scope");
    expect(sql).toMatch(/LEFT JOIN pg_catalog\.pg_depend d/i);
  });

  it("nao oculta dependencias por coincidencia de OIDs entre catalogos", () => {
    expect(sql).not.toMatch(/\bd\.objid\s*<>\s*t\.object_oid\b/i);
    expect(sql).toContain("d.classid::regclass::text AS dependent_catalog");
    expect(sql).toContain("d.objid AS dependent_oid");
    expect(sql).toContain("d.objsubid AS dependent_subid");
    expect(sql).toContain("d.refobjsubid AS target_column_subid");
  });
});
