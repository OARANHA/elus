export interface Snapshot0759 {
  rls_filtro_ativo: boolean;
  total: string | number;
  elegiveis_delete_0759: string | number;
  hashes_32_bytes: string | number;
  hashes_nulos: string | number;
}
export interface Resultado0759 {
  status: "PRECHECK_ONLY" | "BLOQUEADO_REVISAO";
  total: string;
  elegiveis_delete_0759: string;
  hashes_32_bytes: string;
  hashes_nulos: string;
  rls_filtro_ativo: boolean;
  alertas: string[];
  autoriza_delete: false;
  autoriza_replay: false;
  autoriza_merge_deploy: false;
  observacao: string;
}
export function avaliar0759(row: Snapshot0759): Resultado0759;
export function consultar0759(db: {
  query(sql: string): Promise<{ rows: Snapshot0759[] }>;
}): Promise<Resultado0759>;
