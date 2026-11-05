/**
 * Contratos estaticos das migrations upstream 0729 e 0760.
 * Nao executa SQL nem comprova idempotencia, ACL ou isolamento efetivos.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSql = (name: string) =>
  readFileSync(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8")
    .replace(/--[^\r\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sql0729 = readSql("20261023120003_0729_ordem_da_resposta_rapida.sql");
const sql0760 = readSql("20261023230250_0760_historico_importado_nao_dispara.sql");

function functionBody(name: string): string {
  const start = sql0760.indexOf("create or replace function public." + name + "(");
  expect(start, "funcao SQL nao encontrada: " + name).toBeGreaterThanOrEqual(0);
  const begin = sql0760.indexOf("as $fn$", start);
  const end = sql0760.indexOf("$fn$;", begin + 7);
  expect(begin).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(begin);
  return sql0760.slice(begin + 7, end);
}

describe("ELUS v1.89 — contratos 0729/0760 (somente estatico)", () => {
  it("0729 restringe o backfill ao nascimento da coluna ordem", () => {
    const block = sql0729.match(/do \$\$\s*begin([\s\S]*?)end \$\$;/i)?.[1];
    expect(block).toBeDefined();
    expect(block).toMatch(
      /if not exists\s*\(\s*select 1 from information_schema\.columns where table_schema = 'public' and table_name = 'message_templates' and column_name = 'ordem'\s*\) then/i,
    );
    expect(block).toMatch(/alter table public\.message_templates add column ordem numeric not null default 0;/i);
    expect(block).toMatch(
      /row_number\(\) over \(\s*partition by organization_id order by updated_at desc, id\s*\)::numeric \* 1000 as posicao/i,
    );
    expect(block).toMatch(
      /update public\.message_templates as m set ordem = numeradas\.posicao from numeradas where numeradas\.id = m\.id;/i,
    );
    expect(block!.indexOf("if not exists")).toBeLessThan(
      block!.indexOf("update public.message_templates"),
    );
    expect(sql0729).toMatch(
      /create index if not exists idx_message_templates_org_ordem on public\.message_templates \(organization_id, ordem\)/i,
    );
  });

  it("0760 impede efeitos de atendimento e eventos para historico importado", () => {
    const guard = /if coalesce\(new\.metadata->>'historico_importado',''\) = 'true' then return new; end if;/i;
    for (const [name, effect] of [
      ["fn_demanda_abre_no_inbound", "perform public.fn_service_inbound"],
      ["fn_emit_message_event", "perform public.fn_log_event"],
    ] as const) {
      const body = functionBody(name);
      expect(body).toMatch(guard);
      expect(body.toLowerCase()).toContain(effect);
      expect(body.search(guard)).toBeLessThan(body.toLowerCase().indexOf(effect));
    }
    const revision = functionBody("fn_reply_inbound_revision");
    expect(revision).toMatch(
      /new\.direction='inbound' and new\.type <> 'reaction' and coalesce\(new\.metadata->>'historico_importado',''\) <> 'true'/i,
    );
    expect(revision).toMatch(
      /update public\.conversations set reply_context_revision=reply_context_revision\+1 where organization_id=new\.organization_id and id=new\.conversation_id and contact_id=new\.contact_id/i,
    );
  });

  it("0760 preserva conversa existente e restringe a RPC de importacao", () => {
    const body = functionBody("fn_upsert_wa_conversation_importada");
    expect(body).toMatch(
      /where c\.organization_id = p_org and c\.contact_id = p_contact and c\.channel_session_id = p_session and c\.is_group = false/i,
    );
    expect(body).toMatch(/if v_id is not null then return v_id; end if;/i);
    expect(body).toMatch(
      /values \(p_org, p_contact, p_session, 'whatsapp', 'closed', false, 0, '\{\}'::jsonb, p_last_message_at\)/i,
    );
    expect(body).toMatch(
      /on conflict \(organization_id, contact_id, channel_session_id\) where is_group = false do nothing/i,
    );
    expect(body).not.toMatch(/\bupdate\s+public\.conversations\b/i);
    expect(sql0760).toMatch(
      /revoke execute on function public\.fn_upsert_wa_conversation_importada\(uuid, uuid, uuid, timestamptz\) from anon, authenticated;/i,
    );
    expect(sql0760).toMatch(
      /grant execute on function public\.fn_upsert_wa_conversation_importada\(uuid, uuid, uuid, timestamptz\) to service_role;/i,
    );
  });
});
