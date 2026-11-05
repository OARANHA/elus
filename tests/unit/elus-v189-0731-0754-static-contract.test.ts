/**
 * Contratos estaticos das migrations 0731 e 0754 importadas do upstream.
 * Nao executa SQL, nao acessa banco e NAO autoriza replay ou DELETE.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = "supabase/migrations/";
const sql0731 = readFileSync(
  dir + "20261023120001_0731_crm_lead_attachments.sql",
  "utf8",
);
const sql0754 = readFileSync(
  dir + "20261023160009_0754_mediana_da_primeira_resposta_e_recorte_por_etiqueta.sql",
  "utf8",
);

describe("ELUS v1.89 — contratos 0731/0754 (somente estatico)", () => {
  it("0731 restringe a limpeza inicial aos caminhos invalidos antes de instalar a CHECK", () => {
    const block = sql0731.match(/do \$\$\s*begin([\s\S]*?)end \$\$;/i)?.[1];
    expect(block).toBeDefined();
    expect(block).toMatch(
      /delete\s+from\s+public\.crm_lead_attachments\s+where\s+not\s*\(case[\s\S]*?else false\s+end\)/i,
    );
    expect(block).toContain(
      "storage_path ~ ('^' || organization_id::text || '/leads/' || lead_id::text",
    );
    expect(block!.indexOf("delete from public.crm_lead_attachments")).toBeLessThan(
      block!.indexOf("add constraint crm_lead_attachments_storage_path_check"),
    );
    expect(block).toContain("add constraint crm_lead_attachments_storage_path_check");
  });

  it("0731 preserva isolamento por organizacao, papel minimo e revogacao anon", () => {
    expect(sql0731).toContain(
      "alter table public.crm_lead_attachments enable row level security;",
    );
    expect(sql0731).toContain("public.fn_user_org_ids()");
    expect(sql0731).toContain("public.fn_role_at_least(organization_id, 'agent')");
    expect(sql0731).toContain("revoke all on public.crm_lead_attachments from anon;");
    expect(sql0731).toContain(
      "create trigger trg_crm_lead_attachments_caminho_imutavel",
    );
  });

  it("0754 substitui a assinatura antiga, mantem recorte tenant e restringe EXECUTE", () => {
    const drop = sql0754.indexOf(
      "drop function if exists public.fn_attendant_metrics(uuid, timestamptz, timestamptz, uuid);",
    );
    const create = sql0754.indexOf(
      "create or replace function public.fn_attendant_metrics(",
    );
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(drop);
    expect(sql0754).toMatch(
      /create or replace function public\.fn_attendant_metrics\([\s\S]*?p_excluir_etiqueta text default null[\s\S]*?\) returns jsonb/i,
    );
    expect(sql0754).toContain("ct.organization_id = p_org");
    expect(sql0754).toContain(
      "where lower(btrim(t)) = lower(btrim(p_excluir_etiqueta))",
    );
    expect(sql0754).toContain(
      "revoke all on function public.fn_attendant_metrics(uuid, timestamptz, timestamptz, uuid, text)",
    );
    expect(sql0754).toContain("to authenticated, service_role;");
  });
});
