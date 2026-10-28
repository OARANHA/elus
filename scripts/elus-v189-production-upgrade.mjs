#!/usr/bin/env node
/** ELUS v1.89: executor PRODUTIVO separado. Não executar sem aprovação explícita,
 * dump restaurável + digests de rollback, e revisão do PR. */
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
 const records=(await c.query("SELECT version,name,md5(array_to_string(statements,'')) AS md5 FROM supabase_migrations.schema_migrations ORDER BY version")).rows;
 const old=records.filter(x=>HISTORY.some(y=>y[0]===x.version));
 need(old.length===11&&old.every((r,i)=>r.version===HISTORY[i][0]&&r.name===HISTORY[i][1]),'HISTORY_DRIFT');
 need(records.length<=50,'LEDGER_COUNT_DRIFT');
 const receipts=records.filter(x=>!HISTORY.some(y=>y[0]===x.version));
 need(receipts.length<=39&&new Set(receipts.map(x=>x.version)).size===receipts.length,'RECEIPT_DUPLICATE');
 const expected=new Map(items.map(i=>[i.version,i]));
 need(receipts.every(r=>expected.has(r.version)&&expected.get(r.version).name===r.name),'UNKNOWN_RECEIPT');
 const seen=new Set(receipts.map(x=>x.version));
 need(items.every((x,i)=>i<receipts.length?seen.has(x.version):!seen.has(x.version)),'NONPREFIX_LEDGER');
 for(const r of receipts)need(r.md5===digest(Buffer.from(expected.get(r.version).sql),'md5'),'RECEIPT_HASH_DRIFT');
 const tables=Number((await c.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n);
 if(receipts.length===0)need(tables===191,'INITIAL_SCHEMA_DRIFT');
 if(receipts.length===39)need(tables===208,'FINAL_SCHEMA_DRIFT');
 return {applied:receipts.length,publicTables:tables};
}
async function main(){
 const mode=process.argv[2];
 need(['manifest','preflight','verify','apply'].includes(mode),'INVALID_MODE');
 const items=manifest();
 if(mode==='manifest'){
  console.log(JSON.stringify({mode:'offline',count:39,files:items.map(({file,sha256})=>({file,sha256}))}));
  return;
 }
 sourceGuard();
 if(mode==='apply'){
  need(process.env.ELUS_V189_PROD_ACK==='I_AUTHORIZE_ELUS_V189_PRODUCTION_LEDGER_39','ADMIN_APPROVAL_REQUIRED');
  need(/^[a-f0-9]{64}$/.test(process.env.ELUS_V189_VERIFIED_BACKUP_SHA256||''),'VERIFIED_BACKUP_REQUIRED');
  need(process.env.ELUS_V189_ROLLBACK_APP_DIGEST==='sha256:5af1da63aced2560c1c10d2fb2505346322eff0757a1239dd6a63bcca2656c74','ROLLBACK_DIGEST_DRIFT');
 }
 const c=new pg.Client(config());
 await c.connect();
 let locked=false;
 try{
  if(mode==='apply'){await c.query('SELECT pg_advisory_lock($1)',[76050002]);locked=true;}
  else await c.query('BEGIN READ ONLY');
  const state=await snapshot(c,items);
  const legacy=Number((await c.query('SELECT count(*) AS n FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32')).rows[0].n);
  if(mode!=='apply'){
   console.log(JSON.stringify({mode:'read-only',ledgerHistorical:11,...state,legacyMfaCodes:legacy,manifest:39}));
   return;
  }
  need(legacy===0,'MFA_LEGACY_ROWS_REQUIRE_SEPARATE_APPROVAL');
  for(let i=state.applied;i<39;i++){
   const item=items[i];
   await c.query('BEGIN');
   try{
    await c.query(item.sql);
    await c.query('INSERT INTO supabase_migrations.schema_migrations (version,name,statements) VALUES ($1,$2,$3::text[])',[item.version,item.name,[item.sql]]);
    await c.query('COMMIT');
   }catch(e){
    await c.query('ROLLBACK').catch(()=>{});
    throw Error('FAILED_AT_'+item.version,{cause:e});
   }
   console.log('APPLIED='+String(i+1)+'/39');
  }
  const done=await snapshot(c,items);
  need(done.applied===39,'POST_APPLY_LEDGER_DRIFT');
  console.log('OFFICIAL_LEDGER_50_VERIFIED');
 }finally{
  if(locked)await c.query('SELECT pg_advisory_unlock($1)',[76050002]).catch(()=>{});
  else await c.query('ROLLBACK').catch(()=>{});
  await c.end();
 }
}
main().catch(e=>{console.error('GATE_RED='+e.message);process.exitCode=1;});
