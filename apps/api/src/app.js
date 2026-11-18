import multer from 'multer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {assert,expire,reserve,transition,editLot} from './domain.js';
const uuid=z.string().uuid();
const photosDirectory=path.resolve(process.env.LOCAL_PHOTO_PATH||'../../.local/photos');
const lotSchema=z.object({name:z.string().trim().min(3).max(120),content:z.string().trim().min(5).max(2000),category:z.enum(['Panadería','Rotisería','Restaurante','Cafetería','Verdulería','Otros']),photo:z.string().regex(/^(\/images\/food-[0-5]\.jpg|\/api\/photos\/[a-f0-9-]+\.(?:jpg|png|webp)|https:\/\/[^\s]+)$/),conservation:z.string().trim().min(5).max(1000),original_price:z.number().int().positive(),price:z.number().int().positive(),total:z.number().int().min(1).max(10000),pickup_start:z.iso.datetime({offset:true}),pickup_end:z.iso.datetime({offset:true})}).refine(d=>d.price<=d.original_price&&new Date(d.pickup_end)>new Date(d.pickup_start),'Revisá el precio y la franja de retiro.');
const shopSchema=z.object({name:z.string().trim().min(3).max(120),phone:z.string().trim().min(7).max(40),address:z.string().trim().min(8).max(300),description:z.string().max(2000),pickup_hours:z.string().max(200),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),active:z.boolean().default(true)});
export function createApp(db,{local=process.env.APP_MODE==='local',supabaseUrl=process.env.SUPABASE_URL,supabaseKey=process.env.SUPABASE_ANON_KEY}={}){
 assert(!(local&&process.env.NODE_ENV==='production'),500,'El modo local está prohibido en producción.');
 const auth=local?null:createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false}});
 const app=express();
 // Render's ingress supplies the client address; trust only the nearest proxy.
 if(process.env.RENDER==='true')app.set('trust proxy',1);
 app.use(helmet());app.use(cors({origin:process.env.WEB_ORIGIN||'http://localhost:5173'}));app.use(express.json({limit:'100kb'}));
 app.use('/api',rateLimit({windowMs:60000,limit:180}));
 app.get('/api/health',async(req,res)=>{await db.query('select 1');res.json({status:'ok',mode:local?'local':'supabase'});});
 if(local)app.use('/api/photos',express.static(photosDirectory,{dotfiles:'deny'}));
 app.get('/api/config',(req,res)=>res.json({local,supabaseUrl:local?null:supabaseUrl,supabaseKey:local?null:supabaseKey}));
 app.use('/api',async(req,res,next)=>{try{
 const token=req.headers.authorization?.replace(/^Bearer /,'');assert(token,401,'Iniciá sesión para continuar.');let identity;
 if(local){const roles={ 'local-merchant':['00000000-0000-4000-8000-000000000001','merchant','Alta Picada'],'local-consumer':['00000000-0000-4000-8000-000000000002','consumer','Lucía Romero']};const r=roles[token];assert(r,401,'Sesión inválida.');identity={id:r[0],user_metadata:{name:r[2],role:r[1]}};}
 else {const {data,error}=await auth.auth.getUser(token);assert(!error&&data.user,401,'Sesión inválida o vencida.');identity=data.user;assert(identity.email_confirmed_at,403,'Confirmá tu correo electrónico.');}
 // Role chosen once at registration; subsequent metadata edits never change database privileges.
 const role=identity.user_metadata.role;assert(['consumer','merchant'].includes(role),403,'Perfil inválido.');
 await db.query('insert into profiles(id,name,role) values($1,$2,$3) on conflict(id) do nothing',[identity.id,String(identity.user_metadata.name||'Usuario').slice(0,120),role]);
 req.accessToken=token;req.user=(await db.query('select * from profiles where id=$1',[identity.id])).rows[0];next();
 }catch(e){next(e);}});
 app.use('/api',async(req,res,next)=>{try{await expire(db);next();}catch(e){next(e);}});
 const merchant=(req,res,next)=>{try{assert(req.user.role==='merchant',403,'Solo disponible para comercios.');next();}catch(e){next(e);}};
 app.get('/api/me',(req,res)=>res.json(req.user));
 app.get('/api/shop',merchant,async(req,res)=>res.json((await db.query('select * from shops where owner_id=$1',[req.user.id])).rows[0]||null));
 app.put('/api/shop',merchant,async(req,res)=>{const d=shopSchema.parse(req.body);const fields=Object.keys(d);res.json((await db.query(`insert into shops(id,owner_id,${fields.join(',')}) values($1,$2,${fields.map((_,i)=>'$'+(i+3)).join(',')}) on conflict(owner_id) do update set ${fields.map(f=>`${f}=excluded.${f}`).join(',')} returning *`,[randomUUID(),req.user.id,...Object.values(d)])).rows[0]);});
 app.get('/api/geocode',merchant,async(req,res)=>{const q=z.string().min(8).max(300).parse(req.query.q);const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ar&q='+encodeURIComponent(q),{headers:{'User-Agent':'Excedentes-Tesis/1.0'},signal:AbortSignal.timeout(10000)});assert(r.ok,502,'No se pudo consultar la dirección.');res.json((await r.json()).map(x=>({address:x.display_name,latitude:+x.lat,longitude:+x.lon})));});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
 app.post('/api/photos',merchant,upload.single('photo'),async(req,res)=>{
 const f=req.file;assert(f,400,'Seleccioná una imagen.');const b=f.buffer;
 const format=b.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'webp':null;
 assert(format,400,'Solo se admiten imágenes JPEG, PNG o WebP.');const fileName=randomUUID()+'.'+format;let url;
 if(local){await mkdir(photosDirectory,{recursive:true});await writeFile(path.join(photosDirectory,fileName),b,{flag:'wx'});url='/api/photos/'+fileName;}
 else {const client=createClient(supabaseUrl,supabaseKey,{global:{headers:{Authorization:'Bearer '+req.accessToken}},auth:{persistSession:false}});const name=req.user.id+'/'+fileName;const {error}=await client.storage.from('lot-photos').upload(name,b,{contentType:format==='jpg'?'image/jpeg':'image/'+format,upsert:false});assert(!error,502,'No se pudo guardar la imagen.');url=client.storage.from('lot-photos').getPublicUrl(name).data.publicUrl;}
 res.status(201).json({url});
 });
 app.get('/api/products',merchant,async(req,res)=>res.json((await db.query('select p.* from products p join shops s on s.id=p.shop_id where s.owner_id=$1',[req.user.id])).rows));
 app.post('/api/products',merchant,async(req,res)=>{const d=z.object({name:z.string().min(3).max(120),category:z.string().min(2).max(50),description:z.string().max(2000)}).parse(req.body);const {rows:[s]}=await db.query('select id from shops where owner_id=$1',[req.user.id]);assert(s,409,'Registrá tu comercio.');res.status(201).json((await db.query('insert into products(id,shop_id,name,category,description) values($1,$2,$3,$4,$5) returning *',[randomUUID(),s.id,d.name,d.category,d.description])).rows[0]);});
 app.get('/api/lots',async(req,res)=>{const own=req.user.role==='merchant';let rows=(await db.query(`select l.*,s.name shop_name,s.address,s.phone,s.latitude,s.longitude from lots l join shops s on s.id=l.shop_id where ${own?'s.owner_id=$1':"s.active and l.status='published' and l.available>0 and l.pickup_end>now()"} order by l.created_at desc`,own?[req.user.id]:[])).rows;
 const f=z.object({q:z.string().max(120).optional(),category:z.string().max(50).optional(),maxPrice:z.coerce.number().nonnegative().optional(),lat:z.coerce.number().min(-90).max(90).optional(),lng:z.coerce.number().min(-180).max(180).optional(),distance:z.coerce.number().positive().optional()}).parse(req.query);
 if(f.q)rows=rows.filter(l=>(l.name+' '+l.content+' '+l.shop_name).toLowerCase().includes(f.q.toLowerCase()));if(f.category)rows=rows.filter(l=>l.category===f.category);if(f.maxPrice!==undefined)rows=rows.filter(l=>l.price<=f.maxPrice);
 if(f.lat!==undefined&&f.lng!==undefined){const rad=x=>x*Math.PI/180;rows=rows.map(l=>({...l,distance:6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(rad(l.latitude-f.lat)/2)**2+Math.cos(rad(f.lat))*Math.cos(rad(l.latitude))*Math.sin(rad(l.longitude-f.lng)/2)**2)))}));if(f.distance)rows=rows.filter(l=>l.distance<=f.distance);rows.sort((a,b)=>a.distance-b.distance);}else assert(!f.distance,400,'Informá tu ubicación para filtrar por distancia.');res.json(rows);});
 app.post('/api/lots',merchant,async(req,res)=>{const d=lotSchema.parse(req.body);assert(new Date(d.pickup_end)>new Date(),400,'El horario de retiro debe ser futuro.');const {rows:[s]}=await db.query('select id from shops where owner_id=$1 and active',[req.user.id]);assert(s,409,'Registrá y activá tu comercio.');const fields=Object.keys(d);res.status(201).json((await db.query(`insert into lots(id,shop_id,available,${fields.join(',')}) values($1,$2,$3,${fields.map((_,i)=>'$'+(i+4)).join(',')}) returning *`,[randomUUID(),s.id,d.total,...Object.values(d)])).rows[0]);});
 app.put('/api/lots/:id',merchant,async(req,res)=>res.json(await editLot(db,req.user,uuid.parse(req.params.id),lotSchema.parse(req.body))));
 app.post('/api/lots/:id/close',merchant,async(req,res)=>{const r=await db.query("update lots set status='closed' where id=$1 and shop_id in (select id from shops where owner_id=$2) and status in ('published','sold_out') returning *",[uuid.parse(req.params.id),req.user.id]);assert(r.rows[0],409,'El lote no puede cerrarse.');res.json(r.rows[0]);});
 app.get('/api/reservations',async(req,res)=>res.json((await db.query(`select r.*,l.name lot_name,s.name shop_name,s.address,p.name consumer_name from reservations r join lots l on l.id=r.lot_id join shops s on s.id=l.shop_id join profiles p on p.id=r.consumer_id where ${req.user.role==='merchant'?'s.owner_id':'r.consumer_id'}=$1 order by r.created_at desc`,[req.user.id])).rows));
 app.post('/api/reservations',async(req,res)=>{const d=z.object({lot_id:uuid,quantity:z.number().int().positive()}).parse(req.body);res.status(201).json(await reserve(db,req.user,d.lot_id,d.quantity));});
 app.get('/api/reservations/:id/events',async(req,res)=>{const id=uuid.parse(req.params.id);const {rows:[r]}=await db.query('select r.consumer_id,s.owner_id from reservations r join lots l on l.id=r.lot_id join shops s on s.id=l.shop_id where r.id=$1',[id]);assert(r&&(r.consumer_id===req.user.id||r.owner_id===req.user.id),404,'Reserva no encontrada.');res.json((await db.query('select status,created_at from reservation_events where reservation_id=$1 order by id',[id])).rows);});
 for(const action of ['cancel','collect'])app.post(`/api/reservations/:id/${action}`,async(req,res)=>res.json(await transition(db,req.user,uuid.parse(req.params.id),action,req.body.code)));
 app.get('/api/history',merchant,async(req,res)=>{
 const {from,to}=z.object({from:z.iso.datetime({offset:true}),to:z.iso.datetime({offset:true})}).parse(req.query);
 const ls=(await db.query('select l.* from lots l join shops s on s.id=l.shop_id where s.owner_id=$1 and l.created_at between $2 and $3 order by l.created_at desc',[req.user.id,from,to])).rows;
 const rs=(await db.query('select r.id,r.lot_id,r.quantity,r.unit_price,r.status,r.created_at from reservations r join lots l on l.id=r.lot_id join shops s on s.id=l.shop_id where s.owner_id=$1 and l.created_at between $2 and $3 order by r.created_at desc',[req.user.id,from,to])).rows;
 res.json(ls.map(l=>({...l,reservations:rs.filter(r=>r.lot_id===l.id)})));
 });
 app.get('/api/metrics',merchant,async(req,res)=>{const {from,to}=z.object({from:z.iso.datetime({offset:true}),to:z.iso.datetime({offset:true})}).parse(req.query);const args=[req.user.id,from,to];const lots=(await db.query('select coalesce(sum(total),0)::int published from lots l join shops s on s.id=l.shop_id where s.owner_id=$1 and l.created_at between $2 and $3',args)).rows[0];const rows=(await db.query('select r.status,sum(r.quantity)::int units,sum(r.quantity*r.unit_price)::bigint amount from reservations r join lots l on l.id=r.lot_id join shops s on s.id=l.shop_id where s.owner_id=$1 and r.created_at between $2 and $3 group by r.status',args)).rows;res.json({...lots,reserved:rows.reduce((a,r)=>a+r.units,0),collected:rows.find(r=>r.status==='collected')?.units||0,cancelled:rows.find(r=>r.status==='cancelled')?.units||0,expired:rows.find(r=>r.status==='expired')?.units||0,recovered:Number(rows.find(r=>r.status==='collected')?.amount||0)});});
 app.use((err,req,res,next)=>{if(err instanceof multer.MulterError)return res.status(400).json({error:'La imagen supera el límite de 5 MB o el formato de envío no es válido.'});if(err instanceof z.ZodError)return res.status(400).json({error:'Revisá los campos del formulario.',fields:err.issues.map(x=>({field:x.path.join('.'),message:x.message}))});res.status(err.status||500).json({error:err.status?err.message:'No se pudo completar la operación.'});if(!err.status)console.error('API error:',err.message);});return app;
}
