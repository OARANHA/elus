import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { validateMigrationImportPlan } from "../../scripts/validar-plano-migrations-upstream";

const migration = (timestamp: string, number: string, slug: string) =>
  `supabase/migrations/${timestamp}_${number}_${slug}.sql`;

const base = [migration("20261018000000", "0688", "base")];
const local = [
  ...base,
  migration("20261019120000", "0689", "integracoes_erp_vendaerp"),
  migration("20261020120000", "0690", "org_ai_autonomy_protected"),
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

const manifest = JSON.parse(readFileSync(
  new URL("../../docs/integracao/elus-upstream-v1.89.0-plano.json", import.meta.url),
  "utf8",
)) as { renames: Record<string, string> };

describe("pré-voo de migrations upstream v1.89.0 (somente leitura)", () => {
  it("valida o manifesto candidato sem tocar nas quatro migrations próprias", () => {
    const before = JSON.stringify({ base, local, upstream });
    const result = validateMigrationImportPlan(base, local, upstream, manifest.renames);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.localAdded).toBe(4);
    expect(result.upstreamAdded).toBe(4);
    expect(result.entries.filter((entry) => entry.renamed)).toHaveLength(3);
    expect(result.entries.find((entry) => entry.source.includes("0691_banco_externo"))?.destination)
      .toBe(migration("20261020120002", "0763", "banco_externo_db_type_e_aviso"));
    expect(result.requiresDatabaseHistoryReview).toBe(true);
    expect(JSON.stringify({ base, local, upstream })).toBe(before);
  });

  it("rejeita importar as migrations sem remapear número e timestamp", () => {
    const result = validateMigrationImportPlan(base, local, upstream, {});
    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "number_collision")).toHaveLength(3);
    expect(result.issues.filter((issue) => issue.code === "timestamp_collision")).toHaveLength(1);
  });

  it("não aceita remapear só o número da migration com timestamp duplicado", () => {
    const renames = {
      ...manifest.renames,
      [migration("20261020120000", "0691", "banco_externo_db_type_e_aviso")]:
        migration("20261020120000", "0763", "banco_externo_db_type_e_aviso"),
    };
    const result = validateMigrationImportPlan(base, local, upstream, renames);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "timestamp_collision" }),
    ]));
  });

  it("rejeita fontes não presentes no upstream e troca do slug da migration", () => {
    const source = migration("20261020000006", "0689", "aviso_da_central_com_destinatario");
    const result = validateMigrationImportPlan(base, local, upstream, {
      ...manifest.renames,
      [source]: migration("20261020000006", "0762", "sql_estranho"),
      [migration("20261025000000", "0770", "inexistente")]:
        migration("20261025000000", "0771", "inexistente"),
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["unknown_source", "changed_slug"]),
    );
  });

  it("rejeita destino duplicado e inversão cronológica do upstream", () => {
    const source = migration("20261020120000", "0691", "banco_externo_db_type_e_aviso");
    const duplicate = validateMigrationImportPlan(base, local, upstream, {
      ...manifest.renames,
      [source]: migration("20261020000006", "0762", "banco_externo_db_type_e_aviso"),
    });
    expect(duplicate.issues.map((issue) => issue.code)).toContain("timestamp_collision");
    expect(duplicate.issues.map((issue) => issue.code)).toContain("number_collision");

    const outOfOrder = validateMigrationImportPlan(base, local, upstream, {
      ...manifest.renames,
      [source]: migration("20261025000000", "0763", "banco_externo_db_type_e_aviso"),
    });
    expect(outOfOrder.issues.map((issue) => issue.code)).toContain("timestamp_order");
  });

  it("não permite um destino com caminho inválido", () => {
    const source = migration("20261020130000", "0692", "rodizio_na_acao_atribuir");
    const result = validateMigrationImportPlan(base, local, upstream, {
      ...manifest.renames,
      [source]: "supabase/migrations/sem-versao.sql",
    });
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_destination");
  });
});
