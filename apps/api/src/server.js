import {createDatabase} from './db.js';
import {createApp} from './app.js';
import {expire} from './domain.js';
import {seed} from './seed.js';
const db=await createDatabase();if(db.local)await seed(db);
const server=createApp(db).listen(process.env.PORT||3001,'0.0.0.0',()=>console.log('API Excedentes iniciada.'));
const timer=setInterval(()=>expire(db).catch(e=>console.error('Expiry failed:',e.message)),30000);
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{clearInterval(timer);server.close(async()=>{await db.close();process.exit(0);});});
