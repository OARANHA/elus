/** Tipos públicos do pré-voo 0759; não representam aprovação de migration. */
export interface Impacto0759 {
  readonly status: "PRECHECK_ONLY";
  readonly total: string;
  readonly candidatos_exclusao_0759: string;
  readonly hashes_32_bytes_preservados: string;
  readonly hashes_nulos_nao_selecionados: string;
  readonly exige_revisao_e_autorizacao: true;
  readonly autoriza_execucao: false;
}

export declare function avaliarContagens0759(row: unknown): Impacto0759;
export declare function consultarImpacto0759(db: {
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
}): Promise<Impacto0759>;
