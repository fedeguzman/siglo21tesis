import pg from 'pg';
import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL requerida.');
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();try{await c.query('BEGIN');await c.query(await readFile(new URL('../../../supabase/migrations/001_initial.sql',import.meta.url),'utf8'));if((await c.query("select to_regclass('storage.buckets') as table_name")).rows[0].table_name){const p=await c.query("select 1 from pg_policies where schemaname='storage' and policyname='owners_upload_lot_photos'");if(!p.rows.length)await c.query(await readFile(new URL('../../../supabase/migrations/002_storage.sql',import.meta.url),'utf8'));}await c.query('COMMIT');console.log('Migración aplicada.');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
