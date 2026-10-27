/**
 * Snapshot observado em 25/10/2026 do ledger oficial v1.85 do ELUS.
 * Não representa estado em tempo real nem autoriza execução de migrations.
 * Somente identidade (version + name); statements/rollback exigem gate separado.
 */
export const LEDGER_HISTORICO_V185 = Object.freeze([
  ["20261018200431", "elus_v185_preparar_extensoes_92d37f6"],
  ["20261018204508", "elus_v185_baseline_92d37f6_p01_of_06"],
  ["20261018204837", "elus_v185_baseline_92d37f6_p02_of_06"],
  ["20261018204851", "elus_v185_baseline_92d37f6_p03_of_06"],
  ["20261018204924", "elus_v185_baseline_92d37f6_p04_of_06"],
  ["20261018204939", "elus_v185_baseline_92d37f6_p05_of_06"],
  ["20261018204955", "elus_v185_baseline_92d37f6_p06_of_06"],
  ["20261019204449", "integracoes_erp_vendaerp_0689"],
  ["20261021025530", "elus_0690_org_ai_autonomy_protected"],
  ["20261021025551", "elus_0691_chutes_chat_catalog"],
  ["20261021025613", "elus_0692_chutes_catalog_sync"],
].map(([version, name]) => Object.freeze({ version, name })));

/** Reprova qualquer divergência de ordem, versão, nome ou cardinalidade. */
export function conferirLedgerHistorico(rows) {
  if (!Array.isArray(rows) || rows.length !== LEDGER_HISTORICO_V185.length) {
    throw new Error("HISTORICAL_LEDGER_MISMATCH");
  }
  for (let i = 0; i < LEDGER_HISTORICO_V185.length; i += 1) {
    const esperado = LEDGER_HISTORICO_V185[i];
    const observado = rows[i];
    if (observado?.version !== esperado.version || observado?.name !== esperado.name) {
      throw new Error("HISTORICAL_LEDGER_MISMATCH");
    }
  }
  return true;
}
