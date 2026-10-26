/** Contrato TypeScript do verificador offline implementado em .mjs. */
export interface RegistroLedgerV185 {
  readonly version: string;
  readonly bytes: number;
  readonly md5: string;
}

export declare const LEDGER_V185: ReadonlyArray<RegistroLedgerV185>;

export declare function verificarLedgerV185(
  value: unknown,
  expected?: ReadonlyArray<RegistroLedgerV185>,
): { validado: true; registros: number };
