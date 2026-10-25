import { describe, expect, it } from "vitest";
import {
  auditAppliedMigrationHistory,
  ELUS_LOCAL_ALIASES,
} from "../../scripts/auditar-historico-remoto-migrations";

const rows = [
  { version: "20261018204508", name: "elus_v185_baseline_92d37f6_p01_of_06" },
  { version: "20261019204449", name: "integracoes_erp_vendaerp_0689" },
  { version: "20261021025530", name: "elus_0690_org_ai_autonomy_protected" },
  { version: "20261021025551", name: "elus_0691_chutes_chat_catalog" },
  { version: "20261021025613", name: "elus_0692_chutes_catalog_sync" },
];
const candidates = [
  "supabase/migrations/20261020000006_0762_aviso_da_central_com_destinatario.sql",
  "supabase/migrations/20261020120002_0763_banco_externo_db_type_e_aviso.sql",
  "supabase/migrations/20261022110000_0705_prospeccao_saida_configuravel.sql",
];

describe("histórico remoto de migrations — auditoria offline", () => {
  it("detecta baseline em blocos, aliases locais e migrations anteriores ao último deploy", () => {
    const before = JSON.stringify(rows);
    const result = auditAppliedMigrationHistory(rows, candidates);
    expect(result.latestVersion).toBe("20261021025613");
    expect(result.baselineChunks).toBe(1);
    expect(result.appliedLocal).toHaveLength(4);
    expect(result.issues.filter((issue) => issue.code === "local_version_alias")).toHaveLength(4);
    expect(result.backdatedCandidates).toHaveLength(2);
    expect(result.issues.map((issue) => issue.code)).toContain("baseline_in_chunks");
    expect(result.automaticImportAllowed).toBe(false);
    expect(result.requiresManualSchemaReview).toBe(true);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("rejeita histórico vazio, linhas inválidas e versões duplicadas", () => {
    expect(auditAppliedMigrationHistory([], [], []).issues[0]?.code).toBe("empty_history");
    const result = auditAppliedMigrationHistory([
      { version: "20261021025613", name: "a" },
      { version: "20261021025613", name: "b" },
      { version: "x", name: "c" },
    ], [], []);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate_version", "invalid_row"]),
    );
  });

  it("não afirma que uma migration própria ausente foi aplicada", () => {
    const result = auditAppliedMigrationHistory(rows.slice(0, 2), [], ELUS_LOCAL_ALIASES);
    expect(result.issues.filter((issue) => issue.code === "missing_local_record")).toHaveLength(3);
    expect(result.automaticImportAllowed).toBe(false);
  });

  it("rejeita candidato sem timestamp e não libera aplicação mesmo sem divergências", () => {
    expect(auditAppliedMigrationHistory(rows, ["invalido.sql"], []).issues
      .map((issue) => issue.code)).toContain("invalid_candidate");
    const clean = auditAppliedMigrationHistory(
      [{ version: "20261024000000", name: "migração" }],
      ["supabase/migrations/20261025000000_0770_nova.sql"], [],
    );
    expect(clean.issues).toEqual([]);
    expect(clean.automaticImportAllowed).toBe(false);
    expect(clean.requiresManualSchemaReview).toBe(true);
  });
});
