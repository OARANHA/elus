export declare const TABELAS_ESPERADAS: readonly string[];
export declare const LEDGER_REFERENCIA_20261025: readonly string[];
export interface CatalogoV189Snapshot {
  tabelas: Array<{ relname: string }>;
  ledger: Array<{ version: string }>;
  policies: Array<{ policyname: string }>;
  funcoes: Array<{ proname: string; pronargs: number; prosecdef: boolean }>;
}
export interface CatalogoV189Resultado {
  status: "PRECHECK_ONLY";
  autoriza_replay: false;
  autoriza_merge_deploy: false;
  ledger_igual_snapshot_20261025: boolean;
  ledger_total: number;
  ledger_novas_ou_divergentes: string[];
  tabelas_esperadas: number;
  tabelas_presentes: number;
  tabelas_ausentes: string[];
  policies_observadas: string[];
  policy_antiga_de_escrita_presente: boolean;
  funcoes_observadas: Array<{ nome: string; argumentos: number; security_definer: boolean }>;
  observacao: string;
}
export declare function avaliarCatalogoV189(snapshot: CatalogoV189Snapshot): CatalogoV189Resultado;
export declare function consultarCatalogoV189(db: {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}): Promise<CatalogoV189Resultado>;
