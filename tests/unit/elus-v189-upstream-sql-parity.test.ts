/**
 * Paridade textual do catálogo SQL com DeskcommCRM v1.89.0.
 * Fonte: melgarafael/DeskcommCRM@6540929d5ef7a951531dda550db0bf54affa516a.
 * Os 19 blobs divergentes são apenas anotações `upstream:` em comentários
 * (18 arquivos) e um espaço ao final da linha de ALTER TABLE (0717).
 * Os 3 arquivos renomeados conservam exatamente os blobs originais.
 * Comparação estática: não executa SQL, não valida replay nem catálogo do banco.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BLOB_ORIGINAL_DIVERGENTE: Readonly<Record<string, string>> = {
  "20261002152000_0520_extensao_de_tema_gancho.sql": "427cc24b7ca9cea0ab106c9ba6fae7e713da16cc",
  "20261003170000_0531_origem_do_negocio_segue_o_canal_da_conversa.sql": "33bb1f154bf25898fa98b5f334bc487ab1e77316",
  "20261004100000_0535_tipo_de_envio_no_trace.sql": "63be9a067e2e1e43de1d6f9d006b980f888aabc2",
  "20261004230000_0542_destino_de_funil_da_intencao.sql": "4080f2589573fa9df1aac24ca37acd2217fc6975",
  "20261007205228_0593_nome_da_agenda.sql": "1111c002d5d4b1efca29bb9a1457e25421af9c8e",
  "20261008021443_0596_recorte_da_janela_nas_metricas.sql": "e6c2fb73c3b15dcf7e9ffc62408f442d33baa448",
  "20261008111858_0601_cobranca_webhook_e_avisos.sql": "eacf3a22aebe4e79e1f470421bb2aa5acb7e94a6",
  "20261011150000_0645_o_comando_da_conversa_le_o_bit_do_contato.sql": "59a2dacd057c776bfd5d8d3657d6c63dec91d335",
  "20261011210004_0644_copias_antigas_de_skill_reconstroem_o_vinculo_com_o_catalogo.sql": "61c1d73fc5e54d814f3ce895622747040b71a33f",
  "20261015090000_0669_o_endereco_do_servidor_aceita_sublinhado.sql": "f247949d3e696756f629f8ccb204a5c103ee3850",
  "20261018160000_0678_o_ack_da_api_oficial_alcanca_o_destinatario.sql": "ef961365e71d694860f100412c43545b0989b44c",
  "20261019000002_0655_avisos_de_tarefa_na_central.sql": "9c97f9bd18c552487beceacb24f161cef66ba149",
  "20261020000001_0684_a_reacao_nao_passa_pelos_gatilhos.sql": "a1170d7804ea8b9abda2f1fd91e32d7693736bc2",
  "20261021000000_0693_motivo_verificacao_manual.sql": "8c29718c907fa639c7d7c7e56bdd7e8b5f7411ab",
  "20261021173000_0717_desambigua_calendar_service_professionals.sql": "21694b9645d9c09df61573ce4ffc213931945294",
  "20261023150001_0744_telefone_ganho_nos_quatro_caminhos.sql": "b5474f83c196f543f7c3b57455848ac7e0ac138d",
  "20261023160009_0754_mediana_da_primeira_resposta_e_recorte_por_etiqueta.sql": "5fa34bf0afc0da35926a7e89c06c468539ea3d5c",
  "20261023160010_0755_codigos_de_recuperacao_so_pelo_servidor.sql": "062ae45438c84ad39f9b54639ed154ad62dc3b46",
  "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql": "0b75057ef601d350dd2c0b8b8dc0f495429a2f88"
};

const BLOB_ORIGINAL_RENOMEADO: Readonly<Record<string, string>> = {
  "20261020000006_0762_aviso_da_central_com_destinatario.sql": "db94f72c1aef5ce22865799fb03f7c25750eff91",
  "20261020120002_0763_banco_externo_db_type_e_aviso.sql": "531cdcd4ab8fa60acb22b0cd5bf6b31a736b8962",
  "20261020130000_0764_rodizio_na_acao_atribuir.sql": "6f692b09882550feac4be04dea53404fc2947dfe"
};

function gitBlobSha(texto: string): string {
  const bytes = Buffer.from(texto, "utf8");
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

function textoOriginalEsperado(nome: string, texto: string): string {
  if (nome === "20261021173000_0717_desambigua_calendar_service_professionals.sql") {
    const semEspaco = "alter table public.calendar_service_professionals\n";
    expect(texto).toContain(semEspaco);
    return texto.replace(semEspaco, "alter table public.calendar_service_professionals \n");
  }
  return texto.split("\n").map((linha) => {
    const inicioComentario = linha.indexOf("--");
    if (inicioComentario < 0) return linha;
    return linha.slice(0, inicioComentario) + linha.slice(inicioComentario).replaceAll("upstream:", "");
  }).join("\n");
}

describe("ELUS v1.89 — paridade dos SQL com upstream fixado (offline)", () => {
  it.each(Object.entries(BLOB_ORIGINAL_DIVERGENTE))("%s diverge somente por comentário/espaço", (nome, upstreamSha) => {
    const sql = readFileSync(new URL(`../../supabase/migrations/${nome}`, import.meta.url), "utf8");
    const restaurado = textoOriginalEsperado(nome, sql);
    expect(restaurado).not.toBe(sql);
    expect(gitBlobSha(restaurado)).toBe(upstreamSha);
  });
  it.each(Object.entries(BLOB_ORIGINAL_RENOMEADO))("%s mantém blob upstream após renomeação", (nome, upstreamSha) => {
    const sql = readFileSync(new URL(`../../supabase/migrations/${nome}`, import.meta.url), "utf8");
    expect(gitBlobSha(sql)).toBe(upstreamSha);
  });
});
