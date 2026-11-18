import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
const container='excedentes-test-'+randomBytes(6).toString('hex');
const password=randomBytes(24).toString('hex');
function docker(args,options={}){const r=spawnSync('docker',args,{encoding:'utf8',...options});if(r.status!==0)throw new Error(r.stderr||'Docker failed');return r.stdout.trim();}
let started=false;
try{
 docker(['run','--rm','-d','--name',container,'-e','POSTGRES_PASSWORD','-e','POSTGRES_DB=excedentes_test','-p','127.0.0.1::5432','postgres:17-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password}});started=true;
 const port=docker(['port',container,'5432/tcp']).split(':').at(-1);const url=`postgresql://postgres:${password}@127.0.0.1:${port}/excedentes_test`;
 let ready=false;for(let attempt=0;attempt<40;attempt++){const c=new pg.Client({connectionString:url});try{await c.connect();await c.query('select 1');ready=true;}catch{}finally{await c.end().catch(()=>{});}if(ready)break;await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw new Error('PostgreSQL did not become ready.');
 console.log('Testing against PostgreSQL 17 with independent connections.');
 const result=spawnSync(process.execPath,['--test','tests/domain.test.js'],{stdio:'inherit',env:{...process.env,TEST_DATABASE_URL:url}});process.exitCode=result.status??1;
}finally{if(started)docker(['rm','-f',container]);}
