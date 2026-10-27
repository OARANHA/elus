export interface LedgerHistoricoV185 {
  readonly version: string;
  readonly name: string;
}

export const LEDGER_HISTORICO_V185: ReadonlyArray<Readonly<LedgerHistoricoV185>>;
export function conferirLedgerHistorico(rows: unknown): true;
