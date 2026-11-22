import {test,expect} from '@playwright/test';

const identity={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'merchant@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{name:'Comercio de prueba',role:'merchant'}};
const jwt=expires=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:identity.id,exp:expires,iat:Math.floor(Date.now()/1000),role:'authenticated'})).toString('base64url'),'test-signature'].join('.');

async function authFixture(context){
 let refreshes=0;
 const session=()=>({access_token:jwt(Math.floor(Date.now()/1000)+3600),refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user:identity});
 await context.route('**/api/**',async route=>{
  if(new URL(route.request().url()).pathname==='/api/config')return route.fulfill({json:{local:false,supabaseUrl:'http://127.0.0.1:54321',supabaseKey:'sb_publishable_test'}});
  expect(route.request().headers().authorization).toMatch(/^Bearer ey/);
  const path=new URL(route.request().url()).pathname;
  const data={'/api/me':{id:identity.id,name:'Comercio de prueba',role:'merchant'},'/api/lots':[],'/api/reservations':[],'/api/shop':null,'/api/products':[],'/api/history':[],'/api/metrics':{published:0,reserved:0,collected:0,recovered:0}};
  if(!(path in data))throw new Error('Unexpected API route: '+path);
  await route.fulfill({json:data[path]});
 });
 await context.route('http://127.0.0.1:54321/auth/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'}});
  if(url.pathname.endsWith('/token')){
   if(url.searchParams.get('grant_type')==='refresh_token')refreshes++;
   return route.fulfill({json:session()});
  }
  if(url.pathname.endsWith('/user'))return route.fulfill({json:identity});
  if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
  return route.fulfill({status:404,json:{message:'Unexpected Auth request'}});
 });
 return {refreshes:()=>refreshes};
}

async function login(page){
 await page.goto('/');
 await page.getByLabel('Correo electrónico').fill(identity.email);
 await page.getByLabel('Contraseña',{exact:true}).fill('Test-Only-Password-12!');
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();
}

test('la sesión de Supabase sobrevive recargas y nuevas pestañas y se elimina al salir',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();
 await login(page);await page.reload();
 await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();
 const second=await context.newPage();await second.goto('/');
 await expect(second.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeVisible();
 await expect(second.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeEnabled();
 await context.close();
});

test('una sesión vencida se renueva al volver a abrir el navegador',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();await login(page);
 const state=await context.storageState();await context.close();
 for(const origin of state.origins)for(const entry of origin.localStorage){
  if(entry.name.endsWith('-auth-token')){const stored=JSON.parse(entry.value);stored.expires_at=Math.floor(Date.now()/1000)-60;stored.access_token=jwt(stored.expires_at);entry.value=JSON.stringify(stored);}
 }
 const reopened=await browser.newContext({storageState:state});const fixture=await authFixture(reopened);const restored=await reopened.newPage();await restored.goto('/');
 await expect(restored.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();
 expect(fixture.refreshes()).toBeGreaterThan(0);await reopened.close();
});

test('un fallo temporal del perfil permite reintentar sin perder la sesión guardada',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();let failed=false;
 await page.route('**/api/me',async route=>{if(!failed){failed=true;return route.fulfill({status:503,json:{error:'Conexión temporalmente no disponible.'}});}await route.fallback();});
 await page.goto('/');await page.getByLabel('Correo electrónico').fill(identity.email);await page.getByLabel('Contraseña',{exact:true}).fill('Test-Only-Password-12!');
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('temporalmente');
 await page.getByRole('button',{name:'Reintentar conexión'}).click();await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();await context.close();
});

test('credenciales incorrectas muestran un error sin iniciar una sesión',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();
 await page.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({status:400,json:{error_code:'invalid_credentials',msg:'Invalid login credentials'}}));
 await page.goto('/');await page.getByLabel('Correo electrónico').fill(identity.email);await page.getByLabel('Contraseña',{exact:true}).fill('Incorrect-Test-Password-12!');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toHaveCount(0);await context.close();
});

test('registro valida contraseña fuerte y conserva el paso de confirmación por correo',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();let registrations=0;
 await page.route('**/auth/v1/signup**',async route=>{registrations++;const body=route.request().postDataJSON();expect(body.data.role).toBe('merchant');expect(body.data.name).toBe('Comercio de registro');await route.fulfill({json:{user:{...identity,email_confirmed_at:null},session:null}});});
 await page.goto('/');await page.getByRole('button',{name:'¿Todavía no tenés cuenta? Registrate'}).click();await page.getByLabel('Tu nombre').fill('Comercio de registro');await page.getByLabel('Correo electrónico').fill(identity.email);await page.locator('select[name="role"]').selectOption('merchant');
 await page.getByLabel('Contraseña',{exact:true}).fill('weak-password-long');await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Usá al menos 12');expect(registrations).toBe(0);
 await page.getByLabel('Contraseña',{exact:true}).fill('Strong-Test-Password-12!');await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await expect(page.getByRole('alert')).toContainText('confirmar la cuenta');expect(registrations).toBe(1);await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toHaveCount(0);await context.close();
});

test('enlace de recuperación muestra el formulario y valida la contraseña nueva',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();let updates=0;
 await page.route('**/auth/v1/user',async route=>{if(route.request().method()==='PUT')updates++;await route.fallback();});
 const hash=new URLSearchParams({access_token:jwt(Math.floor(Date.now()/1000)+3600),refresh_token:'test-refresh-token',expires_in:'3600',token_type:'bearer',type:'recovery'});
 await page.goto('/#'+hash);await expect(page.getByRole('heading',{name:'Elegí una nueva contraseña'})).toBeVisible();
 await page.getByLabel('Nueva contraseña').fill('weak-password-long');await page.getByRole('button',{name:'Guardar contraseña'}).click();await expect(page.getByRole('alert')).toContainText('Usá al menos 12');expect(updates).toBe(0);
 await page.getByLabel('Nueva contraseña').fill('New-Test-Password-12!');await page.getByRole('button',{name:'Guardar contraseña'}).click();await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toBeVisible();expect(updates).toBe(1);await context.close();
});

test('recuperación y reenvío de confirmación usan Auth sin iniciar sesión',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();const requested=[];
 for(const endpoint of ['recover','resend'])await page.route('**/auth/v1/'+endpoint+'**',async route=>{expect(route.request().postDataJSON().email).toBe(identity.email);requested.push(endpoint);await route.fulfill({json:{}});});
 await page.goto('/');await page.getByLabel('Correo electrónico').fill(identity.email);await page.getByRole('button',{name:'Olvidé mi contraseña'}).click();await expect(page.getByRole('alert')).toContainText('recibirás un enlace');
 await page.getByRole('button',{name:'Reenviar confirmación'}).click();await expect(page.getByRole('alert')).toContainText('Solicitud de confirmación enviada');expect(requested).toEqual(['recover','resend']);await expect(page.getByRole('heading',{name:'Así va tu comercio'})).toHaveCount(0);await context.close();
});

test('un error de infraestructura en HTML se explica y permite reintentar',async({browser})=>{
 const context=await browser.newContext();await authFixture(context);const page=await context.newPage();let failed=false;
 await page.route('**/api/config',async route=>{if(!failed){failed=true;return route.fulfill({status:503,contentType:'text/html',body:'<h1>Service unavailable</h1>'});}await route.fallback();});
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('No pudimos conectar con el servidor');await page.getByRole('button',{name:'Reintentar conexión'}).click();await expect(page.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeEnabled();await context.close();
});
