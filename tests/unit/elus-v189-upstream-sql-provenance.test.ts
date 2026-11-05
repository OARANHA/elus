/**
 * ELUS v1.89 — proveniência estática dos SQLs upstream.
 *
 * Pinos públicos: DeskcommCRM v1.85.0 @ 83aeac8f78aa076f3adfaf3e773c8616229e5cd9
 * e v1.89.0 @ 6540929d5ef7a951531dda550db0bf54affa516a.
 *
 * Este teste complementa elus-v189-import-ledger-integrity.test.ts:
 * aquele fixa os blobs do fork; este fixa a relação com o upstream.
 * Não executa SQL, não acessa banco, não consulta rede e não autoriza replay.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const COMMENT_PREFIX_ONLY = {
  // 9 migrations históricas anteriores à v1.85.0, preservadas semanticamente.
  "20261002152000_0520_extensao_de_tema_gancho.sql": "427cc24b7ca9cea0ab106c9ba6fae7e713da16cc",
  "20261003170000_0531_origem_do_negocio_segue_o_canal_da_conversa.sql": "33bb1f154bf25898fa98b5f334bc487ab1e77316",
  "20261004100000_0535_tipo_de_envio_no_trace.sql": "63be9a067e2e1e43de1d6f9d006b980f888aabc2",
  "20261004230000_0542_destino_de_funil_da_intencao.sql": "4080f2589573fa9df1aac24ca37acd2217fc6975",
  "20261008021443_0596_recorte_da_janela_nas_metricas.sql": "e6c2fb73c3b15dcf7e9ffc62408f442d33baa448",
  "20261008111858_0601_cobranca_webhook_e_avisos.sql": "eacf3a22aebe4e79e1f470421bb2aa5acb7e94a6",
  "20261011150000_0645_o_comando_da_conversa_le_o_bit_do_contato.sql": "59a2dacd057c776bfd5d8d3657d6c63dec91d335",
  "20261011210004_0644_copias_antigas_de_skill_reconstroem_o_vinculo_com_o_catalogo.sql": "61c1d73fc5e54d814f3ce895622747040b71a33f",
  "20261018160000_0678_o_ack_da_api_oficial_alcanca_o_destinatario.sql": "ef961365e71d694860f100412c43545b0989b44c",
  // 9 das 38 migrations importadas na v1.89.0, com referências de caminho prefixadas.
  "20261007205228_0593_nome_da_agenda.sql": "1111c002d5d4b1efca29bb9a1457e25421af9c8e",
  "20261015090000_0669_o_endereco_do_servidor_aceita_sublinhado.sql": "f247949d3e696756f629f8ccb204a5c103ee3850",
  "20261019000002_0655_avisos_de_tarefa_na_central.sql": "9c97f9bd18c552487beceacb24f161cef66ba149",
  "20261020000001_0684_a_reacao_nao_passa_pelos_gatilhos.sql": "a1170d7804ea8b9abda2f1fd91e32d7693736bc2",
  "20261021000000_0693_motivo_verificacao_manual.sql": "8c29718c907fa639c7d7c7e56bdd7e8b5f7411ab",
  "20261023150001_0744_telefone_ganho_nos_quatro_caminhos.sql": "b5474f83c196f543f7c3b57455848ac7e0ac138d",
  "20261023160009_0754_mediana_da_primeira_resposta_e_recorte_por_etiqueta.sql": "5fa34bf0afc0da35926a7e89c06c468539ea3d5c",
  "20261023160010_0755_codigos_de_recuperacao_so_pelo_servidor.sql": "062ae45438c84ad39f9b54639ed154ad62dc3b46",
  "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql": "0b75057ef601d350dd2c0b8b8dc0f495429a2f88",
} as const;

const WHITESPACE_ONLY = {
  // A única diferença observada é um espaço antes de \n após "professionals".
  "20261021173000_0717_desambigua_calendar_service_professionals.sql":
    "21694b9645d9c09df61573ce4ffc213931945294",
} as const;

function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

function sql(file: string): string {
  return readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
}

describe("ELUS v1.89: proveniência de SQL histórico e importado (offline)", () => {
  it("fixa 18 variações exclusivamente por prefixo upstream: em comentários", () => {
    expect(Object.keys(COMMENT_PREFIX_ONLY)).toHaveLength(18);
    for (const [file, upstreamBlob] of Object.entries(COMMENT_PREFIX_ONLY)) {
      const current = sql(file);
      expect(current, file).toContain("upstream:");
      for (const line of current.split(/\r?\n/)) {
        if (line.includes("upstream:")) {
          expect(line.trimStart().startsWith("--"), file).toBe(true);
        }
      }
      expect(gitBlobSha(current.replaceAll("upstream:", "")), file).toBe(upstreamBlob);
    }
  });

  it("fixa 0717 com a única diferença de espaço final de linha", () => {
    const file = "20261021173000_0717_desambigua_calendar_service_professionals.sql";
    const current = sql(file);
    const original = current.replace(
      "alter table public.calendar_service_professionals\n",
      "alter table public.calendar_service_professionals \n",
    );
    expect(original, file).not.toBe(current);
    expect(gitBlobSha(original)).toBe(WHITESPACE_ONLY[file]);
  });

  it("não concede aprovação de replay ou baseline a partir da proveniência", () => {
    // Integridade textual é diferente de equivalência funcional, ACL/RLS ou replay.
    expect(Object.keys(COMMENT_PREFIX_ONLY).length + Object.keys(WHITESPACE_ONLY).length)
      .toBe(19);
  });
});
