export declare const FUNCOES_ALVO: readonly string[];
export declare const TABELAS_ALVO: readonly string[];
export interface AclV189Funcao {
  proname: string;
  pronargs: number;
  identidade: string;
  prosecdef: boolean;
  anon_execute: boolean;
  authenticated_execute: boolean;
  service_role_execute: boolean;
}
export interface AclV189Tabela {
  relname: string;
  relrowsecurity: boolean;
  anon_select: boolean;
  anon_insert: boolean;
  anon_update: boolean;
  anon_delete: boolean;
  authenticated_select: boolean;
  authenticated_insert: boolean;
  authenticated_update: boolean;
  authenticated_delete: boolean;
}
export interface AclV189Policy {
  tablename: string;
  policyname: string;
  cmd: "ALL" | "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  roles: string[];
}
export interface AclV189Snapshot {
  funcoes: AclV189Funcao[];
  tabelas: AclV189Tabela[];
  policies: AclV189Policy[];
}
export interface AclV189Resultado {
  status: "PRECHECK_ONLY";
  autoriza_replay: false;
  autoriza_merge_deploy: false;
  autoriza_alteracao_acl: false;
  funcoes: Array<{
    nome: string;
    argumentos: number;
    identidade: string;
    security_definer: boolean;
    anon_execute: boolean;
    authenticated_execute: boolean;
    service_role_execute: boolean;
  }>;
  tabelas: Array<{
    nome: string;
    rls_ativa: boolean;
    anon_select: boolean;
    anon_insert: boolean;
    anon_update: boolean;
    anon_delete: boolean;
    authenticated_select: boolean;
    authenticated_insert: boolean;
    authenticated_update: boolean;
    authenticated_delete: boolean;
  }>;
  policies: Array<{ tabela: string; policy: string; comando: string; roles: string[] }>;
  alertas: string[];
  observacao: string;
}
export declare function avaliarAclV189(snapshot: AclV189Snapshot): AclV189Resultado;
export declare function consultarAclV189(db: {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }>;
}): Promise<AclV189Resultado>;
