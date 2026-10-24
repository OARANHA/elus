import { describe, expect, it } from "vitest";
import { auditUpstreamMigrations, parseMigration } from "../../scripts/auditar-migrations-upstream";

const migration = (timestamp: string, number: string, slug: string) =>
  `supabase/migrations/${timestamp}_${number}_${slug}.sql`;

describe("auditoria de migrations ELUS x upstream (somente leitura)", () => {
  it("ignora migration legada e interpreta timestamp + número lógico", () => {
    expect(parseMigration("supabase/migrations/00001_initial_schema.sql")).toBeNull();
    expect(parseMigration(migration("20261020120000", "0691", "teste"))).toMatchObject({
      timestamp: "20261020120000",
      number: 691,
    });
  });

  it("detecta as três colisões reais e propõe números não ocupados sem renomear o ELUS", () => {
    const base = [migration("20261018000000", "0688", "base")];
    const local = [
      ...base,
      migration("20261019120000", "0689", "integracoes_erp_vendaerp"),
      migration("20261020120001", "0691", "chutes_chat_catalog"),
      migration("20261020230000", "0692", "chutes_catalog_sync"),
    ];
    const upstream = [
      ...base,
      migration("20261020000006", "0689", "aviso_da_central_com_destinatario"),
      migration("20261020120000", "0691", "banco_externo_db_type_e_aviso"),
      migration("20261020130000", "0692", "rodizio_na_acao_atribuir"),
      migration("20261023230258", "0761", "importacoes_de_historico"),
    ];
    const result = auditUpstreamMigrations(base, local, upstream);
    expect(result.localAdded).toBe(3);
    expect(result.upstreamAdded).toBe(4);
    expect(result.collisions.map((c) => [c.reason, c.value])).toEqual([
      ["number", "0689"],
      ["number", "0691"],
      ["number", "0692"],
    ]);
    expect(result.renameSuggestions.map((x) => x.replacementNumber)).toEqual(["0762", "0763", "0764"]);
    expect(result.renameSuggestions[0].suggested).toBe(
      migration("20261020000006", "0762", "aviso_da_central_com_destinatario"),
    );
    expect(result.requiresManualTimestampFix).toBe(false);
    expect(local).toContain(migration("20261019120000", "0689", "integracoes_erp_vendaerp"));
  });

  it("detecta colisão de timestamp e não a mascara como renumeração simples", () => {
    const local = [migration("20261020120000", "0800", "nosso")];
    const upstream = [migration("20261020120000", "0801", "outro")];
    const result = auditUpstreamMigrations([], local, upstream);
    expect(result.collisions).toMatchObject([{
      reason: "timestamp", value: "20261020120000",
    }]);
    expect(result.requiresManualTimestampFix).toBe(true);
    expect(result.renameSuggestions).toEqual([]);
  });

  it("não acusa migrations compartilhadas na base nem propõe mudança sem colisão", () => {
    const base = [migration("20261020000000", "0700", "base")];
    const result = auditUpstreamMigrations(
      base, [...base, migration("20261020000001", "0701", "local")],
      [...base, migration("20261020000002", "0702", "upstream")],
    );
    expect(result.collisions).toEqual([]);
    expect(result.renameSuggestions).toEqual([]);
  });

  it("sinaliza mesmo caminho criado nos dois ramos (conteúdo requer revisão)", () => {
    const same = migration("20261021000000", "0720", "duplicado");
    const result = auditUpstreamMigrations([], [same], [same]);
    expect(result.collisions).toMatchObject([{ reason: "path", local: same, upstream: same }]);
  });
});
