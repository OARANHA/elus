export interface LedgerMetadataRow {
  readonly version: string;
  readonly name: string;
  readonly statements_count: number;
  readonly statements_sha256: string | null;
  readonly rollback_count: number;
  readonly rollback_sha256: string | null;
}

/** Consulta de privilégios efetivos antes de ler metadados do ledger. */
export const LEDGER_READONLY_ROLE_SQL: string;
/** Rejeita resultados ausentes, elevados ou com privilégios de escrita. */
export function conferirRoleSomenteLeitura(rows: readonly unknown[]): true;

export const LEDGER_METADATA_SQL: string;
export function fingerprintLedgerMetadados(
  rows: readonly LedgerMetadataRow[],
  expectedVersions: readonly string[],
): string;
export function conferirFingerprintLedgerMetadados(
  rows: readonly LedgerMetadataRow[],
  expectedVersions: readonly string[],
  approvedSha256: string | undefined,
): true;
