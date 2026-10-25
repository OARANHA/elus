/**
 * Guarda estática do lote de 38 migrations importadas na PR #43 e das
 * quatro migrations exclusivas ELUS. Os SHAs são blobs Git do candidato
 * d85ce1ef3a1c74fae5c77e5708a56b7db3d06dbc (não os blobs upstream
 * sem as anotações de manifesto). Qualquer edição exige revisão explícita.
 *
 * O ledger abaixo é uma OBSERVAÇÃO datada, não um estado atual do Supabase.
 * Nenhum teste executa SQL, acessa rede, consulta ou modifica banco.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const IMPORTADAS: Readonly<Record<string, string>> = {
  "20261007205228_0593_nome_da_agenda.sql": "52e77e1a47d46388e4b67916fbc65a570778cb7c",
  "20261013120000_0657_rotulo_opaco_e_external_id_na_cascata.sql": "df413dc9de43a1b42f8578d5a42d34464e9c43a3",
  "20261015090000_0669_o_endereco_do_servidor_aceita_sublinhado.sql": "33f06f704628a1b5da3656b7cd782812bd6c3529",
  "20261019000002_0655_avisos_de_tarefa_na_central.sql": "6c437844ba6f9347e528bb20baa7a964f8ddcb4d",
  "20261020000001_0684_a_reacao_nao_passa_pelos_gatilhos.sql": "ffc39e947abc6ea1dfa0c83741acd68383f7ab7b",
  "20261020000004_0687_responder_caso_pelo_whatsapp_interno.sql": "b19bcd0f56256a59ba721f23d2b2f2a34da29938",
  "20261020000006_0762_aviso_da_central_com_destinatario.sql": "db94f72c1aef5ce22865799fb03f7c25750eff91",
  "20261020120002_0763_banco_externo_db_type_e_aviso.sql": "531cdcd4ab8fa60acb22b0cd5bf6b31a736b8962",
  "20261020130000_0764_rodizio_na_acao_atribuir.sql": "6f692b09882550feac4be04dea53404fc2947dfe",
  "20261020230856_0716_agendas_de_servicos.sql": "2ea848d614d302d2ca1c22b3c586c7a00156c2fb",
  "20261021000000_0693_motivo_verificacao_manual.sql": "d298469fe942fd4193f06497d51a948352f3acf3",
  "20261021120000_0703_catalogo_gemini_4_argon.sql": "692ea815549b63bdcc8d55a881dd0c924e55b5b1",
  "20261021173000_0717_desambigua_calendar_service_professionals.sql": "6e0ed59b02855eedebd27bf3880b745dc4f0e04b",
  "20261021183000_0726_escopo_da_conversa_uma_vez_por_consulta.sql": "d3f1004252f7e064b3959c28b6c09aec564d6f98",
  "20261022110000_0705_prospeccao_saida_configuravel.sql": "668418d6502d353b757c22d5858101bfd6c49abf",
  "20261022120000_0706_banco_externo_receitas.sql": "7b60db1d4d22cfef9dc2585dbefa3e35449a6ba8",
  "20261022120010_0710_campanha_com_modelo_aprovado.sql": "dc3e29ca0dbc91822dbf8ef32af129c6c1dfef65",
  "20261022150000_0721_traco_do_turno_do_agente.sql": "6baa10b9651f5a47afddaf16e8a9fab951cbae4b",
  "20261022160000_0722_reusar_o_card_aberto_na_captacao.sql": "f90442c1626b1e8e918f012615b8153ba125cc2b",
  "20261023120001_0731_crm_lead_attachments.sql": "2b226e04f99afb9767d104dac7de0e3b729c9cbf",
  "20261023120002_0734_avaliacao_unica_de_permissoes.sql": "a3596e9e2dfb4d2252dbda3a64f04d08f88de216",
  "20261023120003_0729_ordem_da_resposta_rapida.sql": "497ae6e82cb10404d9bca692a87f9b2c684d6603",
  "20261023120006_0738_teto_do_adiamento_do_canal.sql": "1cc978b9a4977cf9b151adbc7f6e72499bdf04f8",
  "20261023150000_0743_gatilho_de_data_do_funil_alcanca_a_origem.sql": "c284586f0905c6db36495b562f8382a28471107b",
  "20261023150001_0744_telefone_ganho_nos_quatro_caminhos.sql": "a30826c33cf079e7c9ccce62664dad620d3d739d",
  "20261023160002_0747_mfa_dispositivo_confiavel.sql": "c0a7a41d3da0bf6ed85c8d320262e6f561f2dc11",
  "20261023160003_0748_vocabulario_paginado.sql": "71acffef19caa086570a02b51caca7b70ab976e8",
  "20261023160004_0749_router_member_publish_without_direct_channel.sql": "0eae2a1078f2a602a7486c418d14eeb76db48e13",
  "20261023160005_0750_lgpd_marca_de_apagamento.sql": "38decfb649dbc7920140b8a6280456dfba2831be",
  "20261023160007_0752_channel_sessions_leitura_sem_regra_de_escrita.sql": "6dc00f90b68d34ec941877f1eca10617e3da3fe0",
  "20261023160008_0753_aviso_de_agendamento_no_whatsapp.sql": "6c1df7bd0b0a7694e3524f95af2ba40d13fee073",
  "20261023160009_0754_mediana_da_primeira_resposta_e_recorte_por_etiqueta.sql": "eb013cc64594ed48ab92135640567790d3cde952",
  "20261023160010_0755_codigos_de_recuperacao_so_pelo_servidor.sql": "49c65be836633348832cae31d52648021e66938c",
  "20261023160011_0756_meta_mensal_por_indicador.sql": "6d08af58c6256d7399c7f36b8e864ad82e2e7270",
  "20261023160012_0757_poder_de_plataforma_exige_sessao_confirmada.sql": "c41f4f33b69d01f1e086c9e0f5cdd183de2954ce",
  "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql": "44bb738f4e111f6550a16c720751c69cf902146b",
  "20261023230250_0760_historico_importado_nao_dispara.sql": "d54f64138fee1c5e847aa12c0534440bcb1567d5",
  "20261023230258_0761_importacoes_de_historico.sql": "c95dae9050e2b92d5144b4fa77558392331ff5a1",
};

const ELUS_PROPRIAS: Readonly<Record<string, string>> = {
  "20261019120000_0689_integracoes_erp_vendaerp.sql": "e46f99c1cbbda48b952ac9fa9273f5a181c03bbd",
  "20261020120000_0690_org_ai_autonomy_protected.sql": "4ad880adf0a8e294e20a1b50dae1fb9dbed1db65",
  "20261020120001_0691_chutes_chat_catalog.sql": "f9a74e1505c550196643bacae86ff016dbafca2b",
  "20261020230000_0692_chutes_catalog_sync.sql": "20a38af9bd51e7f3d37d9601d9392613a2700f68",
};

/** Último registro do snapshot somente leitura de 25/10/2026 (11 entradas). */
const LEDGER_VERSOES_20261025 = [
  "20261018200431",
  "20261018204508",
  "20261018204837",
  "20261018204851",
  "20261018204924",
  "20261018204939",
  "20261018204955",
  "20261019204449",
  "20261021025530",
  "20261021025551",
  "20261021025613",
] as const;

function blobGit(nome: string): string {
  const bytes = readFileSync(new URL(`../../supabase/migrations/${nome}`, import.meta.url));
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

describe("ELUS v1.89 — integridade das migrations importadas (sem banco)", () => {
  it("fixa os 38 arquivos importados e as 4 migrations próprias por bytes exatos", () => {
    expect(Object.keys(IMPORTADAS)).toHaveLength(38);
    expect(Object.keys(ELUS_PROPRIAS)).toHaveLength(4);
    for (const [nome, sha] of Object.entries({ ...IMPORTADAS, ...ELUS_PROPRIAS })) {
      expect(blobGit(nome), `SQL histórico alterado: ${nome}`).toBe(sha);
    }
  });

  it("não aceita colisões entre timestamps ou números lógicos do lote e do ELUS", () => {
    const nomes = [...Object.keys(IMPORTADAS), ...Object.keys(ELUS_PROPRIAS)];
    const partes = nomes.map((nome) => {
      const match = /^(\d{14})_(\d{4})_.+\.sql$/.exec(nome);
      expect(match, `Nome de migration inválido: ${nome}`).not.toBeNull();
      return { versao: match![1], numero: match![2] };
    });
    expect(new Set(partes.map((p) => p.versao)).size).toBe(42);
    expect(new Set(partes.map((p) => p.numero)).size).toBe(42);
  });

  it("mantém as três resoluções de colisão alinhadas ao plano nominal", () => {
    const plano = JSON.parse(readFileSync(
      new URL("../../docs/integracao/elus-upstream-v1.89.0-plano.json", import.meta.url),
      "utf8",
    )) as { renames: Record<string, string> };
    expect(Object.keys(plano.renames)).toHaveLength(3);
    expect(Object.values(plano.renames).sort()).toEqual([
      "supabase/migrations/20261020000006_0762_aviso_da_central_com_destinatario.sql",
      "supabase/migrations/20261020120002_0763_banco_externo_db_type_e_aviso.sql",
      "supabase/migrations/20261020130000_0764_rodizio_na_acao_atribuir.sql",
    ]);
    for (const destino of Object.values(plano.renames)) {
      expect(IMPORTADAS).toHaveProperty(destino.replace("supabase/migrations/", ""));
    }
  });

  it("expõe o bloqueio de replay: 11 imports precedem o último registro do ledger", () => {
    expect(LEDGER_VERSOES_20261025).toHaveLength(11);
    expect([...LEDGER_VERSOES_20261025].sort()).toEqual([...LEDGER_VERSOES_20261025]);
    const corte = LEDGER_VERSOES_20261025.at(-1)!;
    const importadas = Object.keys(IMPORTADAS);
    const anteriores = importadas.filter((nome) => nome.slice(0, 14) <= corte);
    const posteriores = importadas.filter((nome) => nome.slice(0, 14) > corte);
    expect(anteriores).toHaveLength(11);
    expect(posteriores).toHaveLength(27);
    // Prova somente a classificação por timestamp, NÃO valida replay/upgrade.
    // Nunca inferir que db push aplicará os 38 arquivos ou que o banco está pronto.
  });
});
