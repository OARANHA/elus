/**
 * Contratos estaticos de dependencias entre migrations importadas v1.89.
 * Nao executa SQL, nao acessa banco e nao prova replay ou equivalencia de catalogo.
 * O manifesto valida a ordem geral; estes testes protegem os objetos que a justificam.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrations = {
  externalBase: "20261020120002_0763_banco_externo_db_type_e_aviso.sql",
  externalRecipes: "20261022120000_0706_banco_externo_receitas.sql",
  calendarServices: "20261020230856_0716_agendas_de_servicos.sql",
  calendarFkFix: "20261021173000_0717_desambigua_calendar_service_professionals.sql",
} as const;

const sql = (file: string) =>
  readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8")
    .replace(/--[^\r\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();

describe("ELUS v1.89 — dependencias SQL estaticas (sem banco)", () => {
  it("exige 0763 antes de 0706 e nao expoe receitas na view segura", () => {
    const first = sql(migrations.externalBase);
    const second = sql(migrations.externalRecipes);
    expect(migrations.externalBase < migrations.externalRecipes).toBe(true);
    expect(first).toMatch(/add column if not exists db_type text not null default 'postgres'/i);
    expect(first).toMatch(/add column if not exists last_test_aviso text/i);
    expect(second).toMatch(
      /db_type,\s*last_test_aviso,\s*jsonb_array_length\(receitas\) as receitas_count/i,
    );
    expect(second).toMatch(
      /create view public\.external_db_connections_safe\s+with \(security_invoker = true\)/i,
    );
    const view = second.split(/create view public\.external_db_connections_safe/i)[1]
      ?.split(/from public\.external_db_connections;/i)[0];
    expect(view).toBeDefined();
    expect(view).toMatch(/jsonb_array_length\(receitas\) as receitas_count/i);
    expect(view).not.toMatch(/,\s*receitas\s*(?:,|from)/i);
  });

  it("exige 0716 antes de 0717 e preserva a FK composta de membro", () => {
    const first = sql(migrations.calendarServices);
    const second = sql(migrations.calendarFkFix);
    expect(migrations.calendarServices < migrations.calendarFkFix).toBe(true);
    expect(first).toMatch(/create table if not exists public\.calendar_service_professionals\s*\(/i);
    expect(first).toMatch(
      /constraint calendar_service_professional_member_fk foreign key\(organization_id,user_id\)/i,
    );
    expect(second).toMatch(
      /alter table public\.calendar_service_professionals\s+drop constraint if exists calendar_service_professionals_organization_id_fkey;/i,
    );
    expect(second).not.toMatch(/drop constraint if exists calendar_service_professional_member_fk/i);
  });
});
