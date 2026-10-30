#!/usr/bin/env node
/** ELUS v1.89: verificador somente leitura. Aplicação produtiva desabilitada.
 * Desbloqueio exige executor separado, gates e autorização específica. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const PROJECT='tbwcgdmenrcnghogqkqi';
const BASE='32f4ec9f2df02f1db1d0b8ce2e6c00b702b6e6cf';
const HISTORY=[
 ['20261018200431','elus_v185_preparar_extensoes_92d37f6'],
 ...Array.from({length:6},(_,i)=>[
  ['20261018204508','20261018204837','20261018204851','20261018204924','20261018204939','20261018204955'][i],
  'elus_v185_baseline_92d37f6_p0'+(i+1)+'_of_06']),
 ['20261019204449','integracoes_erp_vendaerp_0689'],
 ['20261021025530','elus_0690_org_ai_autonomy_protected'],
 ['20261021025551','elus_0691_chutes_chat_catalog'],
 ['20261021025613','elus_0692_chutes_catalog_sync']
];
const EXTRA='20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql';
// Impressões públicas dos sete statements históricos privados, já validadas
// pelo exportador v1.85. Nunca expor o SQL nem tratá-las como prova de replay.
const HISTORICAL_FINGERPRINTS=new Map([
 ['20261018200431',174,'72db224ba3b80c474d771d66cb593668'],
 ['20261018204508',508044,'a1bfe00566688f95f316e4e37ffeb97c'],
 ['20261018204837',509703,'f7e534e726ec192c1db7fe984cf5c2a3'],
 ['20261018204851',510397,'df7399b2361471a32f6baebb5a51823b'],
 ['20261018204924',510108,'f3a0b9ea9d0cce746c2d403f9a04dd7f'],
 ['20261018204939',509661,'e6038fa04f2faa45f9416dc462beeb52'],
 ['20261018204955',484187,'dab84f1d8332894d78cf737b28488450'],
]);
// Os quatro recibos ELUS anteriores ao upgrade são públicos e versionados.
// Os MD5/tamanhos abaixo foram confrontados com os arquivos SQL da main e
// com o ledger produtivo por SELECT, sem executar os statements.
const ELUS_HISTORICAL_FINGERPRINTS=new Map([
 ['20261019204449',13326,'0d76f02a421336ac784a9668e58df143'],
 ['20261021025530',2344,'89178273952e0c2af1174916ab1bf0e4'],
 ['20261021025551',2484,'45c956e88e760a9e853f2b9e319b6f7d'],
 ['20261021025613',7457,'11bee3e8876a69eb515bf962db5dec44'],
]);

const digest=(data,algo='sha256')=>createHash(algo).update(data).digest('hex');
function need(ok,reason){if(!ok)throw Error(reason);}
function manifest(){
 const text=readFileSync('tests/unit/elus-v189-import-ledger-integrity.test.ts','utf8');
 const portion=text.split('const IMPORTADAS:',2)[1]?.split('const ELUS_PROPRIAS:',1)[0];
 need(Boolean(portion),'NO_PINNED_MANIFEST');
 const pairs=[...portion.matchAll(/"(\d{14}_[^"/]+\.sql)":\s*"([a-f0-9]{40})"/g)].map(x=>[x[1],x[2]]);
 need(pairs.length===38&&new Set(pairs.map(x=>x[0])).size===38,'MANIFEST_DRIFT');
 pairs.push([EXTRA,'a05333f5b12b78c334181887f089b39398d9aa50']);
 pairs.sort((a,b)=>a[0].localeCompare(b[0]));
 const entries=pairs.map(([file,blob])=>{
  const sql=readFileSync('supabase/migrations/'+file);
  const actual=digest(Buffer.concat([Buffer.from('blob '+sql.length+'\0'),sql]),'sha1');
  need(actual===blob,'BLOB_DRIFT');
  need(!/^\s*(?:BEGIN\s*;|COMMIT\s*;|ROLLBACK\s*;|START\s+TRANSACTION\b|VACUUM\b|ALTER\s+SYSTEM\b|CREATE\s+INDEX\s+CONCURRENTLY\b)/im.test(sql.toString()),'NONTRANSACTIONAL_SQL');
  return {file,version:file.slice(0,14),name:file.slice(15,-4),sql:sql.toString('utf8'),sha256:digest(sql)};
 });
 need(new Set(entries.map(x=>x.version)).size===39,'DUPLICATE_VERSION');
 return entries;
}
function sourceGuard(){
 try{execFileSync('git',['merge-base','--is-ancestor',BASE,'HEAD'],{stdio:'ignore'});}
 catch{throw Error('RELEASE_ANCESTRY_DRIFT');}
 need(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='','WORKTREE_DIRTY');
}
function config(){
 need(process.env.ELUS_V189_PROD_URL&&process.env.ELUS_V189_PG_CA_FILE,'PROD_CONNECTION_REQUIRED');
 const u=new URL(process.env.ELUS_V189_PROD_URL);
 need(['postgres:','postgresql:'].includes(u.protocol),'INVALID_PROTOCOL');
 need(u.hostname==='db.'+PROJECT+'.supabase.co','PROJECT_MISMATCH');
 need((u.port||'5432')==='5432'&&u.pathname==='/postgres'&&u.username==='postgres','DB_TARGET_MISMATCH');
 need(!u.search&&!u.hash,'UNEXPECTED_URL_OPTIONS');
 return {host:u.hostname,port:5432,database:'postgres',user:'postgres',
  password:decodeURIComponent(u.password),
  ssl:{ca:readFileSync(process.env.ELUS_V189_PG_CA_FILE,'utf8'),rejectUnauthorized:true},
  connectionTimeoutMillis:8000,query_timeout:120000};
}
async function snapshot(c,items){
 const records=(await c.query("SELECT version,name,md5(array_to_string(statements,'')) AS md5, cardinality(statements) AS statement_count, octet_length(statements[1]) AS first_statement_bytes FROM supabase_migrations.schema_migrations ORDER BY version")).rows;
 const old=records.filter(x=>HISTORY.some(y=>y[0]===x.version));
 need(old.length===11&&old.every((r,i)=>r.version===HISTORY[i][0]&&r.name===HISTORY[i][1]),'HISTORY_DRIFT');
 // O nome e a versão do recibo não bastam: comparar também a identidade
 // dos sete SQLs privados da instalação v1.85, sem exportar seu conteúdo.
 for(const r of old){
  const expected=HISTORICAL_FINGERPRINTS.get(r.version);
  if(expected){
   need(r.statement_count===1&&r.first_statement_bytes===expected[0]&&
        digest(Buffer.from(r.md5||'','ascii'),'md5')===expected[1],
        'HISTORY_STATEMENT_DRIFT');
  }
  const own=ELUS_HISTORICAL_FINGERPRINTS.get(r.version);
  if(own){
   need(r.statement_count===1&&r.first_statement_bytes===own[0]&&r.md5===own[1],
        'ELUS_HISTORY_STATEMENT_DRIFT');
  }
 }
 need(records.length<=50,'LEDGER_COUNT_DRIFT');
 const receipts=records.filter(x=>!HISTORY.some(y=>y[0]===x.version));
 need(receipts.length<=39&&new Set(receipts.map(x=>x.version)).size===receipts.length,'RECEIPT_DUPLICATE');
 const expected=new Map(items.map(i=>[i.version,i]));
 need(receipts.every(r=>expected.has(r.version)&&expected.get(r.version).name===r.name),'UNKNOWN_RECEIPT');
 const seen=new Set(receipts.map(x=>x.version));
 need(items.every((x,i)=>i<receipts.length?seen.has(x.version):!seen.has(x.version)),'NONPREFIX_LEDGER');
 // Cada recibo novo deve armazenar exatamente o SQL fixado como UM statement.
 // MD5 da concatenação sozinho aceitaria um array dividido em vários elementos.
 for(const r of receipts){
  const item=expected.get(r.version);
  need(r.statement_count===1,'RECEIPT_STATEMENT_CARDINALITY_DRIFT');
  need(r.first_statement_bytes===Buffer.byteLength(item.sql,'utf8'),'RECEIPT_STATEMENT_LENGTH_DRIFT');
  need(r.md5===digest(Buffer.from(item.sql),'md5'),'RECEIPT_HASH_DRIFT');
 }
 const tables=Number((await c.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n);
 if(receipts.length===0)need(tables===191,'INITIAL_SCHEMA_DRIFT');
 if(receipts.length===39)need(tables===208,'FINAL_SCHEMA_DRIFT');
 return {applied:receipts.length,publicTables:tables};
}
// Diagnóstico independente do gate de upgrade: observa a migration externa
// 9037 sem aceitá-la no manifesto v1.89 ou no limite fail-closed de 50.
// Somente metadados; nunca retorna statements ou dados de tenants.
async function diagnoseLedger(c){
 const ledger=(await c.query(`
   SELECT count(*) AS total_receipts,
     count(*) FILTER (WHERE version='20261029104815'
       AND name='elus_9037_ai_autonomy_guarded'
       AND cardinality(statements)=1
       AND octet_length(statements[1])=34985
       AND md5(statements[1])='10df3c797779f8cb4461631cb22676d2') AS external_9037_exact,
     count(*) FILTER (WHERE version='20261026010000') AS receipt_0765,
     count(*) FILTER (WHERE version='20261026010000'
       AND name='0765_elus_rotacao_atomica_codigos_recuperacao'
       AND cardinality(statements)=1
       AND octet_length(statements[1])=2747
       AND md5(statements[1])='add7a7db36db87cd213fd7a7d0f81db7') AS receipt_0765_exact
   FROM supabase_migrations.schema_migrations
 `)).rows[0];
 const catalog=(await c.query(`
   SELECT to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])') IS NOT NULL AS rpc_0765_present,
     (SELECT position('current_user = ''service_role'' and auth.role() = ''service_role'''
             in lower(p.prosrc))>0
      FROM pg_catalog.pg_proc p
      WHERE p.oid=to_regprocedure('public.fn_guard_organizations_ai_autonomy()')) AS guard_9037_strict,
     (SELECT t.tgenabled IN ('O','A') FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid=to_regclass('public.organizations')
        AND t.tgname='trg_guard_organizations_ai_autonomy'
        AND NOT t.tgisinternal) AS guard_trigger_enabled,
     (SELECT t.tgfoid=to_regprocedure('public.fn_guard_organizations_ai_autonomy()')
             AND t.tgtype=23
      FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid=to_regclass('public.organizations')
        AND t.tgname='trg_guard_organizations_ai_autonomy'
        AND NOT t.tgisinternal) AS guard_trigger_wiring_correct,
     (SELECT count(*) FROM pg_catalog.pg_proc p
      WHERE p.proname='fn_elus_rotacionar_codigos_recuperacao') AS rpc_0765_any_schema_count,
     (SELECT relrowsecurity FROM pg_catalog.pg_class
      WHERE oid=to_regclass('public.user_recovery_codes')) AS recovery_codes_rls,
     COALESCE((SELECT bool_and(
       NOT has_table_privilege(roles.role,t.oid,'SELECT')
       AND NOT has_table_privilege(roles.role,t.oid,'INSERT')
       AND NOT has_table_privilege(roles.role,t.oid,'UPDATE')
       AND NOT has_table_privilege(roles.role,t.oid,'DELETE'))
       FROM (VALUES ('anon'),('authenticated')) AS roles(role)
       CROSS JOIN (SELECT to_regclass('public.user_recovery_codes') AS oid) AS t
     ),false) AS recovery_codes_client_dml_denied,
     EXISTS(SELECT 1 FROM pg_catalog.pg_policy pol
            WHERE pol.polrelid=to_regclass('public.user_recovery_codes')
              AND pol.polcmd='r'
              AND pol.polname='user_recovery_codes_ninguem_le'
              AND pg_get_expr(pol.polqual,pol.polrelid)='false') AS recovery_codes_deny_select_policy
 `)).rows[0];
 return {
   ledgerReceipts:Number(ledger.total_receipts),
   external9037Exact:Number(ledger.external_9037_exact)===1,
   receipt0765Present:Number(ledger.receipt_0765)===1,
   receipt0765Exact:Number(ledger.receipt_0765_exact)===1,
   rpc0765Present:catalog.rpc_0765_present===true,
   guard9037Strict:catalog.guard_9037_strict===true,
   guardTriggerEnabled:catalog.guard_trigger_enabled===true,
   guardTriggerWiringCorrect:catalog.guard_trigger_wiring_correct===true,
   rpc0765NamedFunctionsAnySchema:Number(catalog.rpc_0765_any_schema_count),
   recoveryCodesRls:catalog.recovery_codes_rls===true,
   recoveryCodesClientDmlDenied:catalog.recovery_codes_client_dml_denied===true,
   recoveryCodesDenySelectPolicy:catalog.recovery_codes_deny_select_policy===true,
   gate:'DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL'
 };
}
async function main(){
 const mode=process.argv[2];
 need(['manifest','preflight','verify','diagnose','apply'].includes(mode),'INVALID_MODE');
 const items=manifest();
 if(mode==='manifest'){
  console.log(JSON.stringify({mode:'offline',count:39,files:items.map(({file,sha256})=>({file,sha256}))}));
  return;
 }
 // FAIL-CLOSED: o executor da main não comprova restauração do backup
 // nem exige aprovação independente para o DELETE da migration 0759.
 // Um SHA-256 bem formado e um ACK não substituem essas evidências.
 // Desbloqueio exige PR separada, restauração/replay em PG 15/17 descartável,
 // revisão de ACL/RLS e autorização específica. Bloquear antes de conectar.
 if(mode==='apply'){
  throw Error('PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL');
 }
 sourceGuard();
 const c=new pg.Client(config());
 await c.connect();
 try{
  await c.query('BEGIN READ ONLY');
  if(mode==='diagnose'){
   console.log(JSON.stringify({mode:'read-only-diagnostic',...await diagnoseLedger(c)}));
   return;
  }
  const state=await snapshot(c,items);
  // Amostra de DDLs independentes: recibos e contagem de tabelas nao provam
  // que cada objeto de migration foi criado. Isto NAO substitui replay.
  const schemaCanaries=(await c.query(`
    SELECT to_regclass('public.crm_lead_attachments') IS NOT NULL AS lead_attachments,
           to_regclass('public.mfa_trusted_devices') IS NOT NULL AS mfa_trusted_devices,
           to_regclass('public.importacoes_de_historico') IS NOT NULL AS history_imports,
           to_regclass('public.automation_rodizio_atribuicoes') IS NOT NULL AS automation_round_robin,
           to_regprocedure('public.fn_session_mfa_proven()') IS NOT NULL AS mfa_proven,
           to_regprocedure('public.fn_automation_rodizio_atribuir(uuid,uuid,uuid,uuid)') IS NOT NULL AS automation_round_robin_fn
  `)).rows[0];
  const legacy=Number((await c.query('SELECT count(*) AS n FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32')).rows[0].n);
  // Read-only catalog attestation: a matching migration receipt does not prove
  // that its SECURITY DEFINER RPC or least-privilege grants exist in the schema.
  const rpc=(await c.query(`
    SELECT p.oid IS NOT NULL AS present,
           COALESCE(p.prosecdef,false) AS security_definer,
           COALESCE(p.proconfig @> ARRAY['search_path=""']::text[],false) AS pinned_empty_search_path,
           COALESCE(p.proacl IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM pg_catalog.aclexplode(p.proacl) AS acl
             WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
           ),false) AS public_execute_denied,
           COALESCE(has_function_privilege('service_role',p.oid,'EXECUTE'),false) AS service_execute,
           COALESCE(has_function_privilege('anon',p.oid,'EXECUTE'),false) AS anon_execute,
           COALESCE(has_function_privilege('authenticated',p.oid,'EXECUTE'),false) AS authenticated_execute,
           COALESCE((SELECT relrowsecurity FROM pg_class
                     WHERE oid=to_regclass('public.user_recovery_codes')),false) AS recovery_codes_rls,
           COALESCE((SELECT bool_and(
                      NOT has_table_privilege(roles.role,t.oid,'SELECT') AND
                      NOT has_table_privilege(roles.role,t.oid,'INSERT') AND
                      NOT has_table_privilege(roles.role,t.oid,'UPDATE') AND
                      NOT has_table_privilege(roles.role,t.oid,'DELETE'))
                     FROM (VALUES ('anon'),('authenticated')) AS roles(role)
                     CROSS JOIN (SELECT to_regclass('public.user_recovery_codes') AS oid) AS t
                    ),false) AS recovery_codes_client_dml_denied,
           EXISTS(SELECT 1 FROM pg_policy pol
                  WHERE pol.polrelid=to_regclass('public.user_recovery_codes')
                    AND pol.polcmd='r'
                    AND pol.polname='user_recovery_codes_ninguem_le'
                    AND pg_get_expr(pol.polqual,pol.polrelid)='false'
                 ) AS recovery_codes_deny_select_policy
    FROM (SELECT to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])') AS oid) AS expected
    LEFT JOIN pg_proc p ON p.oid=expected.oid
  `)).rows[0];
  if(mode==='verify'){
   need(state.applied===39,'INCOMPLETE_LEDGER');
   need(Object.values(schemaCanaries).every(v=>v===true),'SCHEMA_CANARY_DRIFT');
   // A 0759 elimina os formatos legados; recibo completo não prova esse efeito.
   need(legacy===0,'MFA_LEGACY_ROWS_REMAIN_AFTER_0759');
   need(rpc.present===true,'RPC_0765_MISSING');
   need(rpc.pinned_empty_search_path===true,'RPC_0765_SEARCH_PATH_DRIFT');
   need(rpc.public_execute_denied===true,'RPC_0765_PUBLIC_EXECUTE_DRIFT');
   need(rpc.security_definer===true&&rpc.service_execute===true&&
        rpc.anon_execute===false&&rpc.authenticated_execute===false,'RPC_0765_ACL_DRIFT');
   need(rpc.recovery_codes_rls===true,'RECOVERY_CODES_RLS_DRIFT');
   need(rpc.recovery_codes_client_dml_denied===true,'RECOVERY_CODES_CLIENT_DML_GRANT_DRIFT');
   need(rpc.recovery_codes_deny_select_policy===true,'RECOVERY_CODES_DENY_SELECT_POLICY_DRIFT');
  }
  console.log(JSON.stringify({mode:'read-only',ledgerHistorical:11,...state,legacyMfaCodes:legacy,
    recoveryRotationRpcPresent:rpc.present,recoveryRotationSecurityDefiner:rpc.security_definer,
    recoveryRotationPinnedEmptySearchPath:rpc.pinned_empty_search_path,
    recoveryRotationPublicExecuteDenied:rpc.public_execute_denied,
    recoveryRotationServiceExecute:rpc.service_execute,recoveryRotationAnonExecute:rpc.anon_execute,
    recoveryRotationAuthenticatedExecute:rpc.authenticated_execute,
    recoveryCodesRls:rpc.recovery_codes_rls,
    recoveryCodesClientDmlDenied:rpc.recovery_codes_client_dml_denied,
    recoveryCodesDenySelectPolicy:rpc.recovery_codes_deny_select_policy,
    schemaCanaries,manifest:39}));
 }finally{
  await c.query('ROLLBACK').catch(()=>{});
  await c.end();
 }
}
main().catch(e=>{console.error('GATE_RED='+e.message);process.exitCode=1;});
