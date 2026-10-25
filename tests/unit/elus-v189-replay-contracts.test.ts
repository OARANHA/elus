/**
 * Pré-voo ESTÁTICO da PR #43 (DeskcommCRM v1.89.0).
 * Detecta regressões em ordem de dependências, policies, projeção de dados
 * e o DELETE deliberado de códigos de recuperação legados.
 * NÃO executa SQL, não acessa Supabase e NÃO autoriza replay ou deploy.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVOS = {
  avisosCaso: "20261020000004_0687_responder_caso_pelo_whatsapp_interno.sql",
  agenda: "20261020230856_0716_agendas_de_servicos.sql",
  agendaFk: "20261021173000_0717_desambigua_calendar_service_professionals.sql",
  avisosAgenda: "20261023160008_0753_aviso_de_agendamento_no_whatsapp.sql",
  dbType: "20261020120002_0763_banco_externo_db_type_e_aviso.sql",
  receitas: "20261022120000_0706_banco_externo_receitas.sql",
  eventoInicial: "20261020000001_0684_a_reacao_nao_passa_pelos_gatilhos.sql",
  eventoFinal: "20261023230250_0760_historico_importado_nao_dispara.sql",
  mfa: "20261023160002_0747_mfa_dispositivo_confiavel.sql",
  sessao: "20261023160012_0757_poder_de_plataforma_exige_sessao_confirmada.sql",
  policies: "20261023160007_0752_channel_sessions_leitura_sem_regra_de_escrita.sql",
  codigos: "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql",
} as const;

type Chave = keyof typeof ARQUIVOS;

function sql(chave: Chave): string {
  return readFileSync(
    new URL("../../supabase/migrations/" + ARQUIVOS[chave], import.meta.url),
    "utf8",
  ).replace(/^\s*--.*$/gm, "");
}

const ORDEM_CRITICA: ReadonlyArray<readonly [Chave, Chave]> = [
  ["agenda", "agendaFk"],
  ["agendaFk", "avisosAgenda"],
  ["avisosCaso", "avisosAgenda"],
  ["dbType", "receitas"],
  ["eventoInicial", "eventoFinal"],
  ["mfa", "sessao"],
];

describe("ELUS v1.89 — pré-voo estático de replay (sem banco)", () => {
  it("mantém a ordem cronológica dos contratos SQL dependentes", () => {
    for (const [antes, depois] of ORDEM_CRITICA) {
      expect(sql(antes).length).toBeGreaterThan(0);
      expect(sql(depois).length).toBeGreaterThan(0);
      expect(
        ARQUIVOS[antes].slice(0, 14) < ARQUIVOS[depois].slice(0, 14),
        "Ordem insegura: " + antes + " precisa anteceder " + depois,
      ).toBe(true);
    }
  });

  it("explicita o DELETE destrutivo de 0759 e exige o predicado por formato", () => {
    const corpo = sql("codigos");
    expect([...corpo.matchAll(/\bdelete\s+from\b/gi)]).toHaveLength(1);
    expect(corpo).toMatch(
      /delete\s+from\s+public\.user_recovery_codes\s+where\s+octet_length\s*\(\s*code_hash\s*\)\s*<>\s*32\s*;/i,
    );
  });

  it("preserva a troca da policy ALL pelas três policies de escrita", () => {
    const corpo = sql("policies");
    expect(corpo).toMatch(
      /drop\s+policy\s+if\s+exists\s+channel_sessions_tenant_write\s+on\s+public\.channel_sessions\s*;/i,
    );
    expect(corpo).not.toMatch(/create\s+policy\s+channel_sessions_tenant_write\b/i);
    for (const verbo of ["insert", "update", "delete"]) {
      expect(corpo).toMatch(
        new RegExp(
          "create\\s+policy\\s+channel_sessions_tenant_" + verbo +
            "\\s+on\\s+public\\.channel_sessions\\s+for\\s+" + verbo,
          "i",
        ),
      );
    }
  });

  it("mantém as views de banco externo invoker-only e sem receitas em bruto", () => {
    for (const chave of ["dbType", "receitas"] as const) {
      const corpo = sql(chave);
      const projecao = corpo.match(
        /create\s+view\s+public\.external_db_connections_safe\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)\s+as\s+select\s+([\s\S]*?)\s+from\s+public\.external_db_connections\s*;/i,
      );
      expect(projecao, "view invoker ausente: " + chave).not.toBeNull();
      expect(corpo).toMatch(
        /revoke\s+all\s+on\s+public\.external_db_connections_safe\s+from\s+anon\s*;/i,
      );
      expect(corpo).toMatch(
        /grant\s+select\s+on\s+public\.external_db_connections_safe\s+to\s+authenticated\s*;/i,
      );
      expect(projecao![1]).not.toMatch(/\b(password|secret|connection_string)\b/i);
    }
    const projecaoFinal = sql("receitas").match(
      /create\s+view\s+public\.external_db_connections_safe\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)\s+as\s+select\s+([\s\S]*?)\s+from\s+public\.external_db_connections\s*;/i,
    )?.[1] ?? "";
    expect(projecaoFinal).toMatch(
      /jsonb_array_length\s*\(\s*receitas\s*\)\s+as\s+receitas_count/i,
    );
    expect(
      projecaoFinal.replace(/jsonb_array_length\s*\(\s*receitas\s*\)\s+as\s+receitas_count/gi, ""),
    ).not.toMatch(/\breceitas\b/i);
  });

  it("mantém E2E exclusivamente manual, sem gatilho automático", () => {
    const workflow = readFileSync(
      new URL("../../.github/workflows/e2e.yml", import.meta.url),
      "utf8",
    ).replace(/^\s*#.*$/gm, "");
    const gatilhos = workflow.match(/^on:\s*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m)?.[1] ?? "";
    expect(gatilhos).toMatch(/^\s{2}workflow_dispatch:\s*\{\s*\}\s*$/m);
    expect(gatilhos).not.toMatch(/^\s{2}(push|pull_request|schedule|workflow_run):/m);
  });
});
