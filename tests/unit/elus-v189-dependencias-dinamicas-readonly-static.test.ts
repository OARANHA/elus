/** Auditoria estatica da consulta lexical de dependencias. Nao conecta a banco. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../docs/integracao/elus-v189-dependencias-dinamicas-readonly.sql", import.meta.url),
  "utf8",
);
const sql = source.replace(/--[^\r\n]*/g, "").trim();

describe("ELUS v1.89 — triagem lexical read-only de referencias a DROP", () => {
  it("consulta exclusivamente metadados de funcoes sem executar SQL mutante", () => {
    expect(sql).toMatch(/^WITH targets\s*\(/i);
    expect(sql).toContain("pg_catalog.pg_proc");
    expect(sql).toContain("pg_catalog.pg_namespace");
    expect(sql).toMatch(/\bp\.prosrc\s*~\*/i);
    expect(sql).toMatch(/\bp\.prokind\s+IN\s*\('f',\s*'p'\)/i);
    expect(sql).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|COPY|MERGE|REFRESH|VACUUM|DO)\b/i,
    );
    expect(sql).not.toMatch(/\b(?:public|auth)\.(?:messages|contacts|organizations)\b/i);
  });

  it("cobre os quatro alvos de DROP e nao exporta corpos SQL", () => {
    for (const name of [
      "fn_definir_aviso_de_caso",
      "external_db_connections_safe",
      "fn_automation_rodizio_atribuir",
      "fn_attendant_metrics",
    ]) {
      expect(sql).toContain("('" + name + "')");
    }
    expect(sql).toContain("count(*) FILTER (WHERE source_match)");
    expect(sql).toContain("array_agg(function_signature ORDER BY function_signature)");
    expect(sql).not.toMatch(/\bSELECT\s+[^;]*\bp\.prosrc\s+AS\b/i);
    expect(sql).toContain("GROUP BY target_name");
  });
});
