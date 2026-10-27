import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  parseMigrationBlobsFromTree,
  validateMigrationHistory,
  validateMigrationImportPlan,
} from "../../scripts/validar-plano-migrations-upstream";

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

describe("integridade de migrations históricas (SHA de blob Git)", () => {
  const base = [
    { path: migration("20261018000000", "0688", "base"), sha: "a".repeat(40) },
    { path: migration("20261018000001", "0689", "base_dois"), sha: "b".repeat(40) },
  ];

  it("não declara sucesso quando a ref do baseline não contém migrations", () => {
    const result = validateMigrationHistory([], [], []);
    expect(result).toEqual({
      checked: 0,
      issues: [{ code: "empty_baseline", path: "supabase/migrations" }],
      valid: false,
    });
  });

  it("aceita apenas históricos idênticos em ambas as árvores", () => {
    const local = [...base, { path: migration("20261019120000", "0690", "elus"), sha: "c".repeat(40) }];
    const upstream = [...base, { path: migration("20261020000000", "0690", "upstream"), sha: "d".repeat(40) }];
    const result = validateMigrationHistory(base, local, upstream);
    expect(result).toEqual({ checked: 2, issues: [], valid: true });
  });

  it("recusa SQL histórico reescrito em ELUS ou upstream, mesmo com nome intacto", () => {
    const local = [{ ...base[0]!, sha: "f".repeat(40) }, base[1]!];
    const upstream = [base[0]!, { ...base[1]!, sha: "e".repeat(40) }];
    const result = validateMigrationHistory(base, local, upstream);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { code: "local_history_modified", path: base[0]!.path },
      { code: "upstream_history_modified", path: base[1]!.path },
    ]);
  });

  it("recusa a ausência de migration do baseline nas duas árvores", () => {
    const result = validateMigrationHistory(base, [base[0]!], [base[1]!]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { code: "upstream_history_missing", path: base[0]!.path },
      { code: "local_history_missing", path: base[1]!.path },
    ]);
  });
});

describe("leitura da árvore Git de migrations", () => {
  it("ignora o MANIFEST não SQL e mantém apenas os blobs .sql", () => {
    const tree = [
      `100644 blob ${"a".repeat(40)}\tsupabase/migrations/20261018000000_0688_base.sql`,
      `100644 blob ${"b".repeat(40)}\tsupabase/migrations/MANIFEST.md`,
      `100644 blob ${"c".repeat(40)}\tsupabase/migrations/20261018000001_0689_base.sql`,
    ].join("\n");

    expect(parseMigrationBlobsFromTree(tree)).toEqual([
      { sha: "a".repeat(40), path: "supabase/migrations/20261018000000_0688_base.sql" },
      { sha: "c".repeat(40), path: "supabase/migrations/20261018000001_0689_base.sql" },
    ]);
  });
});
