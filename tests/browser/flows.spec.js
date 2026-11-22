import {test,expect} from '@playwright/test';
const quotaErrors=new WeakMap();
test.beforeEach(async({context},info)=>{
 // Isolate each scenario's quota while keeping the production limiter enabled.
 await context.setExtraHTTPHeaders({'X-Forwarded-For':`198.18.${info.repeatEachIndex}.${info.line}`});
 quotaErrors.set(context,[]);context.on('response',response=>{if(response.status()===429)quotaErrors.get(context).push(new URL(response.url()).pathname);});
});
test.afterEach(async({context})=>{expect(quotaErrors.get(context),'Las pruebas no deben compartir el cupo de solicitudes').toEqual([]);});
test('consumidor reserva y comercio confirma entrega; historial conserva la operación',async({context})=>{
 const consumer=await context.newPage();const merchant=await context.newPage();const errors=[];consumer.on('pageerror',e=>errors.push(e.message));merchant.on('pageerror',e=>errors.push(e.message));
 await consumer.goto('/');await consumer.getByRole('button',{name:'Entrar a la demostración'}).click();await expect(consumer.getByRole('heading',{name:'Algo rico merece otra oportunidad.'})).toBeVisible();
 await consumer.getByRole('button',{name:'Ver detalle'}).first().click();await consumer.getByRole('button',{name:'Confirmar reserva'}).click();await expect(consumer.getByRole('alert')).toContainText('Reserva confirmada');await consumer.getByRole('button',{name:'Ver reserva'}).first().click();const code=await consumer.locator('.pickup-code').innerText();
 await merchant.goto('/');await merchant.locator('select[name="role"]').selectOption('merchant');await merchant.getByRole('button',{name:'Entrar a la demostración'}).click();await merchant.getByRole('button',{name:'Reservas',exact:false}).first().click();await merchant.getByRole('button',{name:'Ver reserva'}).first().click();await merchant.getByLabel('Código presentado por el consumidor').fill('INVALIDO');await merchant.getByRole('button',{name:'Confirmar entrega'}).click();await expect(merchant.getByRole('dialog').getByRole('alert')).toContainText('incorrecto');await merchant.getByLabel('Código presentado por el consumidor').fill(code);await merchant.getByRole('button',{name:'Confirmar entrega'}).click();await expect(merchant.getByRole('alert')).toContainText('Entrega confirmada');
 await merchant.screenshot({path:'/tmp/excedentes-merchant.png',fullPage:true});await consumer.reload();await consumer.getByRole('button',{name:'Entrar a la demostración'}).click();await consumer.getByRole('button',{name:'Mi historial'}).click();await expect(consumer.locator('tbody .badge.collected').first()).toBeVisible();await consumer.screenshot({path:'/tmp/excedentes-consumer.png',fullPage:true});expect(errors).toEqual([]);await consumer.close();await merchant.close();
});
test('mobile muestra ofertas y filtros sin desbordar',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();await expect(page.locator('.lot-card').first()).toBeVisible();await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('inexistente-1234');await expect(page.getByRole('heading',{name:'No hay ofertas que coincidan con tu búsqueda.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();});
test('comercio publica un lote con foto propia, lo edita y cierra sin perder historial',async({page})=>{
 await page.goto('/');await page.locator('select[name="role"]').selectOption('merchant');await page.getByRole('button',{name:'Entrar a la demostración'}).click();await page.getByRole('button',{name:'Publicar lote'}).click();const dialog=page.getByRole('dialog');const name='Lote de prueba '+Date.now();
 await dialog.getByLabel('Nombre del lote').fill(name);await dialog.getByLabel('Contenido del lote').fill('Seis medialunas elaboradas hoy');await dialog.getByLabel('Precio habitual ($)').fill('6000');await dialog.getByLabel('Precio del lote ($)').fill('4500');await dialog.getByLabel('Condiciones de conservación').fill('Mantener en lugar fresco y consumir hoy');await dialog.locator('input[type=file]').setInputFiles('apps/web/public/images/food-0.jpg');await expect(dialog.locator('select').nth(1)).toHaveValue(/\/api\/photos\//);await dialog.getByRole('button',{name:'Guardar publicación'}).click();await expect(page.getByRole('alert')).toContainText('Publicación guardada');
 const card=page.locator('.lot-card').filter({has:page.getByRole('heading',{name,exact:true})});await expect(card).toBeVisible();await card.getByRole('button',{name:'Editar',exact:true}).click();await dialog.getByLabel('Cantidad total de lotes').fill('2');await dialog.getByRole('button',{name:'Guardar publicación'}).click();await expect(card.getByText('2 disponibles')).toBeVisible();await card.getByRole('button',{name:'Cerrar',exact:true}).click();await dialog.getByRole('button',{name:'Confirmar cierre'}).click();await expect(card.locator('.badge')).toHaveText('Cerrado');
 await page.getByRole('button',{name:'Historial e indicadores'}).click();await expect(page.locator('summary').filter({hasText:name})).toBeVisible();
});

test('catálogo y datos del comercio se guardan y reaparecen al ingresar',async({page})=>{
 await page.goto('/');await page.locator('select[name="role"]').selectOption('merchant');await page.getByRole('button',{name:'Entrar a la demostración'}).click();
 await page.getByRole('button',{name:'Mi comercio',exact:true}).click();await page.getByLabel('Teléfono').fill('3515551234');await page.getByRole('button',{name:'Guardar datos',exact:true}).click();await expect(page.getByRole('alert')).toContainText('se guardaron');
 await page.getByRole('button',{name:'Catálogo',exact:true}).click();await page.getByRole('button',{name:'Agregar producto',exact:true}).click();const dialog=page.getByRole('dialog');const name='Producto de validación '+Date.now();
 await dialog.getByLabel('Nombre',{exact:true}).fill(name);await dialog.getByLabel('Descripción').fill('Producto de prueba local');await dialog.getByRole('button',{name:'Guardar producto'}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).first().click();await page.locator('select[name="role"]').selectOption('merchant');await page.getByRole('button',{name:'Entrar a la demostración'}).click();
 await page.getByRole('button',{name:'Mi comercio',exact:true}).click();await expect(page.getByLabel('Teléfono')).toHaveValue('3515551234');await page.getByRole('button',{name:'Catálogo',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
});

test('consumidor cancela y ve el historial; una búsqueda anterior no reemplaza el filtro actual',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();await page.getByRole('button',{name:'Ver detalle'}).first().click();await page.getByRole('button',{name:'Confirmar reserva'}).click();await expect(page.getByRole('alert')).toContainText('Reserva confirmada');
 await page.getByRole('button',{name:'Ver reserva'}).first().click();await page.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await page.getByRole('button',{name:'Confirmar cancelación'}).click();await expect(page.getByRole('alert')).toContainText('Reserva cancelada');
 await page.getByRole('button',{name:'Mi historial',exact:true}).click();await expect(page.locator('tbody .badge.cancelled').first()).toBeVisible();await page.getByRole('button',{name:'Explorar ofertas',exact:true}).click();
 await page.route('**/api/lots?*',async route=>{if(new URL(route.request().url()).searchParams.get('q')==='inexistente-lento')await new Promise(r=>setTimeout(r,700));await route.continue();});
 const oldResponse=page.waitForResponse(r=>r.url().includes('q=inexistente-lento'));
 const started=page.waitForRequest(r=>r.url().includes('q=inexistente-lento'));await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('inexistente-lento');await started;
 await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('Medialunas');await expect(page.locator('.lot-card').first()).toBeVisible();await (await oldResponse).finished();
 await expect(page.locator('.lot-card').first()).toBeVisible();await expect(page.getByRole('heading',{name:'Medialunas y criollos',exact:true})).toBeVisible();
});

test('la segunda reserva abre su código aunque la actualización de la lista sea lenta',async({page})=>{
 let posts=0,reads=0;
 await page.route('**/api/reservations',async route=>{if(route.request().method()==='POST')posts++;else if(posts===2&&++reads===2)await new Promise(r=>setTimeout(r,1000));await route.continue();});
 await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();await page.getByRole('button',{name:'Ver detalle'}).first().click();await page.getByRole('button',{name:'Confirmar reserva'}).click();await expect(page.getByRole('alert')).toContainText('Reserva confirmada');await page.getByRole('button',{name:'Ver reserva'}).first().click();await page.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await page.getByRole('button',{name:'Confirmar cancelación'}).click();await expect(page.getByRole('alert')).toContainText('Reserva cancelada');
 await page.getByRole('button',{name:'Explorar ofertas',exact:true}).click();await page.getByRole('button',{name:'Ver detalle'}).first().click();await page.getByRole('button',{name:'Confirmar reserva'}).click();await expect(page.getByRole('alert')).toContainText('Reserva confirmada');await page.getByRole('button',{name:'Ver reserva'}).first().click();await expect(page.locator('.pickup-code')).toBeVisible();expect(reads).toBeGreaterThanOrEqual(2);
});
