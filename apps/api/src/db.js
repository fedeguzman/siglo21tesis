import { dirname } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
export async function createDatabase({url=process.env.DATABASE_URL,localPath=process.env.LOCAL_DB_PATH||'../../.local/database'}={}) {
 let pool, local=false;
 if(url) {
  if(process.env.APP_MODE==='supabase'){
   const connection=new URL(url);
   connection.searchParams.set('sslmode','verify-full');
   connection.searchParams.set('sslrootcert',fileURLToPath(new URL('../certs/supabase-ca.crt',import.meta.url)));
   url=connection.toString();
  }
  pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:10000});
 }
 else {
  if(process.env.APP_MODE!=='local') throw new Error('DATABASE_URL requerida. Usá APP_MODE=local solo para desarrollo.');
  if(localPath!=='memory://')await mkdir(dirname(localPath),{recursive:true});
  const {PGlite}=await import('@electric-sql/pglite');pool=new PGlite(localPath);local=true;
  await pool.exec(await readFile(fileURLToPath(new URL('../../../supabase/migrations/001_initial.sql',import.meta.url)),'utf8'));
 }
 let tail=Promise.resolve();
 return {query:(sql,args)=>pool.query(sql,args),async transaction(fn){
  if(!local){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  const work=tail.then(()=>pool.transaction(fn));tail=work.catch(()=>{});return work;
 },close:()=>local?pool.close():pool.end(),local};
}
