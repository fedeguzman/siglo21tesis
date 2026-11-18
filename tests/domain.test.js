import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createDatabase} from '../apps/api/src/db.js';
import {reserve,transition,expire,editLot} from '../apps/api/src/domain.js';
import {createApp} from '../apps/api/src/app.js';
process.env.APP_MODE='local';
let db,server,base;
const owner={id:randomUUID(),role:'merchant'},buyer={id:randomUUID(),role:'consumer'},stranger={id:randomUUID(),role:'consumer'};const shop=randomUUID();
before(async()=>{db=await createDatabase({url:process.env.TEST_DATABASE_URL,localPath:'memory://'});if(process.env.TEST_DATABASE_URL)await db.query(await readFile(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8'));for(const p of [owner,buyer,stranger])await db.query('insert into profiles(id,name,role) values($1,$2,$3)',[p.id,p.role,p.role]);await db.query("insert into shops(id,owner_id,name,phone,address,latitude,longitude) values($1,$2,'Test','12345678','Cordoba',-31,-64)",[shop,owner.id]);server=createApp(db,{local:true}).listen(0);await new Promise(r=>server.once('listening',r));base='http://localhost:'+server.address().port;});
after(async()=>{server?.close();if(db){await db.query('delete from reservation_events where reservation_id in (select r.id from reservations r join lots l on l.id=r.lot_id where l.shop_id=$1)',[shop]);await db.query('delete from reservations where lot_id in (select id from lots where shop_id=$1)',[shop]);await db.query('delete from lots where shop_id=$1',[shop]);await db.query('delete from shops where id=$1',[shop]);await db.query('delete from profiles where id in ($1,$2,$3)',[owner.id,buyer.id,stranger.id]);await db.close();}});
async function lot(total=3){const id=randomUUID();await db.query("insert into lots(id,shop_id,name,content,category,conservation,original_price,price,total,available,pickup_start,pickup_end) values($1,$2,'Test','Contenido','Panadería','Refrigerar',10000,7000,$3,$3,now()-interval '1 hour',now()+interval '1 hour')",[id,shop,total]);return (await db.query('select * from lots where id=$1',[id])).rows[0];}
test('reservas simultáneas no sobrevendan la última unidad',async()=>{const l=await lot(1);const rs=await Promise.allSettled([reserve(db,buyer,l.id,1),reserve(db,stranger,l.id,1)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await db.query('select available,status from lots where id=$1',[l.id])).rows[0].available,0);});
test('cancelar una reserva cerrada libera stock sin reabrir publicación; no permite cancelar dos veces',async()=>{const l=await lot(2),r=await reserve(db,buyer,l.id,1);await db.query("update lots set status='closed' where id=$1",[l.id]);await transition(db,buyer,r.id,'cancel');const {rows:[v]}=await db.query('select * from lots where id=$1',[l.id]);assert.equal(v.available,2);assert.equal(v.status,'closed');await assert.rejects(transition(db,buyer,r.id,'cancel'),/activa/);});
test('rechaza consumidores ajenos y códigos incorrectos; entrega queda registrada una sola vez',async()=>{const l=await lot(),r=await reserve(db,buyer,l.id,1);await assert.rejects(transition(db,stranger,r.id,'cancel'),/permiso/);await assert.rejects(transition(db,owner,r.id,'collect','BAD'),/incorrecto/);await transition(db,owner,r.id,'collect',r.code);await assert.rejects(transition(db,owner,r.id,'collect',r.code),/activa/);const events=(await db.query('select status from reservation_events where reservation_id=$1 order by id',[r.id])).rows;assert.deepEqual(events.map(x=>x.status),['reserved','collected']);});
test('edición conserva precios de reservas y protege contenido, horarios y cantidades comprometidas',async()=>{const l=await lot(2),r=await reserve(db,buyer,l.id,2);const fields=['name','content','category','photo','conservation','original_price','price','total','pickup_start','pickup_end'];const d=Object.fromEntries(fields.map(k=>[k,l[k]]));await assert.rejects(editLot(db,owner,l.id,{...d,total:1}),/cantidad/);await assert.rejects(editLot(db,owner,l.id,{...d,content:'otro'}),/contenido/);await editLot(db,owner,l.id,{...d,price:8000,total:3});assert.equal((await db.query('select unit_price from reservations where id=$1',[r.id])).rows[0].unit_price,7000);});
test('vencimiento automático es idempotente y bloquea retiro y nuevas reservas',async()=>{const l=await lot(),r=await reserve(db,buyer,l.id,1);await db.query("update reservations set pickup_end=now()-interval '1 minute' where id=$1",[r.id]);await db.query("update lots set pickup_end=now()-interval '1 minute',pickup_start=now()-interval '2 hours' where id=$1",[l.id]);await expire(db);await expire(db);assert.equal((await db.query('select status from reservations where id=$1',[r.id])).rows[0].status,'expired');assert.equal((await db.query("select count(*)::int n from reservation_events where reservation_id=$1 and status='expired'",[r.id])).rows[0].n,1);await assert.rejects(reserve(db,buyer,l.id,1),/disponible/);await assert.rejects(transition(db,owner,r.id,'collect',r.code),/activa/);});
test('API exige autenticación y valida roles y campos',async()=>{assert.equal((await fetch(base+'/api/lots')).status,401);assert.equal((await fetch(base+'/api/shop',{headers:{Authorization:'Bearer local-consumer'}})).status,403);const invalid=await fetch(base+'/api/reservations',{method:'POST',headers:{Authorization:'Bearer local-consumer','Content-Type':'application/json'},body:JSON.stringify({lot_id:'not-a-uuid',quantity:0})});assert.equal(invalid.status,400);assert.equal((await fetch(base+'/api/health')).status,200);});

test('muchos consumidores compiten sin stock negativo y todos los rechazos son por disponibilidad',async()=>{const l=await lot(5);const attempts=await Promise.allSettled(Array.from({length:20},()=>reserve(db,buyer,l.id,1)));assert.equal(attempts.filter(r=>r.status==='fulfilled').length,5);for(const r of attempts.filter(r=>r.status==='rejected'))assert.equal(r.reason.status,409);const {rows:[v]}=await db.query('select available,status from lots where id=$1',[l.id]);assert.equal(v.available,0);assert.equal(v.status,'sold_out');});
test('dos cancelaciones concurrentes restituyen una sola vez la unidad',async()=>{const l=await lot(1),r=await reserve(db,buyer,l.id,1);const attempts=await Promise.allSettled([transition(db,buyer,r.id,'cancel'),transition(db,buyer,r.id,'cancel')]);assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal((await db.query('select available from lots where id=$1',[l.id])).rows[0].available,1);});

test('Render limita solicitudes por cliente y no comparte el cupo del proxy',async()=>{
 const previous=process.env.RENDER;process.env.RENDER='true';let app;
 try{app=createApp(db,{local:true});}finally{if(previous===undefined)delete process.env.RENDER;else process.env.RENDER=previous;}
 const proxyServer=app.listen(0);await new Promise(r=>proxyServer.once('listening',r));
 try{
  const endpoint='http://localhost:'+proxyServer.address().port+'/api/health';
  const first=await fetch(endpoint,{headers:{'X-Forwarded-For':'198.51.100.1'}});
  const other=await fetch(endpoint,{headers:{'X-Forwarded-For':'198.51.100.2'}});
  const repeat=await fetch(endpoint,{headers:{'X-Forwarded-For':'198.51.100.1'}});
  assert.equal(first.status,200);assert.equal(other.status,200);
  assert.equal(first.headers.get('x-ratelimit-remaining'),'179');
  assert.equal(other.headers.get('x-ratelimit-remaining'),'179');
  assert.equal(repeat.headers.get('x-ratelimit-remaining'),'178');
 }finally{await new Promise(r=>proxyServer.close(r));}
});
