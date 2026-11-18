import {randomUUID,randomBytes} from 'node:crypto';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export function assert(ok,status,message){if(!ok)throw new HttpError(status,message);}
export async function expire(db){return db.transaction(async c=>{
 await c.query("update lots set status='expired' where pickup_end<=now() and status in ('published','sold_out')");
 const rs=await c.query("update reservations set status='expired' where pickup_end<=now() and status='reserved' returning id");
 for(const r of rs.rows)await c.query("insert into reservation_events(reservation_id,status) values($1,'expired')",[r.id]);
});}
export async function reserve(db,user,lotId,quantity){
 assert(user.role==='consumer',403,'Solo los consumidores pueden reservar.');
 assert(Number.isInteger(quantity)&&quantity>0,400,'Cantidad inválida.');
 return db.transaction(async c=>{
 const {rows:[l]}=await c.query('select l.* from lots l join shops s on s.id=l.shop_id where l.id=$1 and s.active=true for update of l',[lotId]);
 assert(l&&l.status==='published'&&new Date(l.pickup_end)>new Date(),409,'El lote ya no está disponible.');
 assert(l.available>=quantity,409,`Quedan ${l.available} unidades disponibles.`);
 const id=randomUUID(),code=randomBytes(6).toString('hex').toUpperCase();
 const {rows:[r]}=await c.query('insert into reservations(id,lot_id,consumer_id,quantity,unit_price,code,pickup_start,pickup_end) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[id,lotId,user.id,quantity,l.price,code,l.pickup_start,l.pickup_end]);
 await c.query("update lots set available=available-$2,status=case when available=$2 then 'sold_out' else status end where id=$1",[lotId,quantity]);
 await c.query("insert into reservation_events(reservation_id,status,actor_id) values($1,'reserved',$2)",[id,user.id]);return r;
 });
}
export async function transition(db,user,id,action,code){return db.transaction(async c=>{
 const {rows:[r]}=await c.query('select r.*,s.owner_id from reservations r join lots l on l.id=r.lot_id join shops s on s.id=l.shop_id where r.id=$1 for update of r',[id]);
 assert(r,404,'Reserva no encontrada.');
 assert(action==='cancel'?r.consumer_id===user.id:r.owner_id===user.id,403,'No tenés permiso para esta operación.');
 assert(r.status==='reserved'&&new Date(r.pickup_end)>new Date(),409,'La reserva ya no está activa.');
 if(action==='collect'){assert(user.role==='merchant',403,'Rol inválido.');assert(new Date(r.pickup_start)<=new Date(),409,'La franja de retiro todavía no comenzó.');assert(code===r.code,400,'Código de retiro incorrecto.');}
 const status=action==='cancel'?'cancelled':'collected';
 await c.query("update reservations set status=$2,collected_at=case when $2='collected' then now() else null end where id=$1",[id,status]);
 if(action==='cancel')await c.query("update lots set available=available+$2,status=case when status='sold_out' and pickup_end>now() then 'published' else status end where id=$1",[r.lot_id,r.quantity]);
 await c.query('insert into reservation_events(reservation_id,status,actor_id) values($1,$2,$3)',[id,status,user.id]);return {id,status};
});}
export async function editLot(db,user,id,data){return db.transaction(async c=>{
 const {rows:[l]}=await c.query('select l.* from lots l join shops s on s.id=l.shop_id where l.id=$1 and s.owner_id=$2 for update of l',[id,user.id]);assert(l,404,'Lote no encontrado.');
 const {rows:[counts]}=await c.query("select coalesce(sum(quantity) filter(where status in ('reserved','collected')),0)::int committed,count(*) filter(where status='reserved')::int active from reservations where lot_id=$1",[id]);
 assert(data.total>=counts.committed,409,'La cantidad no puede ser menor a las unidades reservadas y retiradas.');
 if(counts.active)assert(data.content===l.content&&new Date(data.pickup_start).getTime()===new Date(l.pickup_start).getTime()&&new Date(data.pickup_end).getTime()===new Date(l.pickup_end).getTime(),409,'Con reservas activas no se pueden modificar el contenido ni los horarios.');
 const available=data.total-counts.committed;const status=['closed','expired'].includes(l.status)?l.status:available?'published':'sold_out';
 const fields=['name','content','category','photo','conservation','original_price','price','total','pickup_start','pickup_end'];
 return (await c.query(`update lots set ${fields.map((f,i)=>`${f}=$${i+2}`).join(',')},available=$12,status=$13 where id=$1 returning *`,[id,...fields.map(f=>data[f]),available,status])).rows[0];
});}
