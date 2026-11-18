import {randomUUID} from 'node:crypto';
export async function seed(db){
 const merchant='00000000-0000-4000-8000-000000000001',consumer='00000000-0000-4000-8000-000000000002';
 await db.query("insert into profiles(id,name,role) values($1,'Alta Picada','merchant'),($2,'Lucía Romero','consumer') on conflict do nothing",[merchant,consumer]);
 if((await db.query('select id from shops limit 1')).rows.length)return;
 const shop=randomUUID();await db.query("insert into shops(id,owner_id,name,phone,address,description,latitude,longitude,pickup_hours) values($1,$2,'Alta Picada','351 628 1940','Av. Don Bosco 3842, Córdoba','Panadería y rotisería. Elaborado en el día.',-31.4035,-64.2458,'20:30 a 22:00')",[shop,merchant]);
 const names=['Medialunas y criollos','Empanadas para compartir','Tarta de verdura y ensalada','Pan francés y criollos','Milanesa con puré','Docena de facturas'];
 for(let i=0;i<names.length;i++)await db.query("insert into lots(id,shop_id,name,content,category,photo,conservation,original_price,price,total,available,pickup_start,pickup_end) values($1,$2,$3,$4,$5,$6,'Mantener refrigerado y consumir dentro de las 24 horas.',1000000,$7,12,12,now()-interval '1 hour',now()+interval '6 hours')",[randomUUID(),shop,names[i],['6 medialunas + 4 criollos de hojaldre','6 empanadas al horno: carne y pollo','2 porciones de tarta + ensalada','500 g de pan + 250 g de criollos','Una porción individual','12 facturas surtidas'][i],i===0||i===3||i===5?'Panadería':'Rotisería',`/images/food-${i}.jpg`,[450000,750000,560000,350000,675000,900000][i]]);
}
