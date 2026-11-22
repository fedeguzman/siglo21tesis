import {test,expect} from '@playwright/test';

test.beforeEach(async({context},info)=>{await context.setExtraHTTPHeaders({'X-Forwarded-For':`198.19.${info.repeatEachIndex}.${info.line}`});});

for(const width of [320,390,430,768,1280]){
 test(`consumidor conserva la composición mobile en ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();
  await expect(page.getByRole('heading',{name:'Lotes disponibles'})).toBeVisible();await expect(page.locator('.consumer-offer').first()).toBeVisible();
  const nav=page.getByRole('navigation',{name:'Navegación principal'});await expect(nav.getByRole('button')).toHaveCount(4);
  expect(await nav.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
  const bar=await nav.boundingBox();expect(bar.height).toBeLessThanOrEqual(90);expect(Math.round(bar.y+bar.height)).toBe(844);
  const cards=await page.locator('.consumer-offer').evaluateAll(els=>els.slice(0,2).map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  expect(cards[1].x).toBe(cards[0].x);expect(cards[1].y).toBeGreaterThanOrEqual(cards[0].y+cards[0].height);expect(cards[0].width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await nav.getByRole('button',{name:'Mis reservas'}).click();await expect(page.getByRole('button',{name:'Activas',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Finalizadas',exact:true}).click();await expect(page.locator('table')).toHaveCount(0);
  await nav.getByRole('button',{name:'Mi historial'}).click();await expect(page.getByLabel('Período del historial')).toBeVisible();await expect(page.locator('.consumer-history-counts>div')).toHaveCount(3);
  await nav.getByRole('button',{name:'Mi cuenta'}).click();await expect(page.getByRole('heading',{name:'Mi cuenta',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Cerrar sesión'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

test('filtros, ubicación y detalle del lote se usan desde el teléfono y con teclado',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:-31.4,longitude:-64.23});
 await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();await page.getByRole('button',{name:'Filtros',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Distancia máxima')).toBeDisabled();await dialog.getByRole('button',{name:'Usar mi ubicación'}).click();await expect(dialog.getByLabel('Distancia máxima')).toBeEnabled();
 await dialog.getByLabel('Precio máximo en pesos').fill('1');await dialog.getByRole('button',{name:'Ver resultados'}).click();await expect(page.getByRole('heading',{name:'No hay ofertas que coincidan con tu búsqueda.'})).toBeVisible();await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await expect(page.locator('.consumer-offer').first()).toBeVisible();
 await page.getByRole('button',{name:/Ver detalle de/}).first().click();await expect(dialog.getByRole('heading',{name:'Qué incluye'})).toBeVisible();await expect(dialog.getByRole('button',{name:'Reservar este lote'})).toBeVisible();
 // Focus remains in the overlay, while the underlying navigation is inert.
 await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]'))).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:/Ver detalle de/}).first()).toBeFocused();
});

test('reserva mobile muestra resumen, cantidad, aviso activo y código; cancelar conserva el historial',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Entrar a la demostración'}).click();
 await page.getByRole('button',{name:/Ver detalle de/}).first().click();await page.getByRole('button',{name:'Reservar este lote'}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Datos de la reserva'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Reducir cantidad'})).toBeDisabled();await dialog.getByRole('button',{name:'Aumentar cantidad'}).click();await expect(dialog.getByRole('spinbutton',{name:'Cantidad',exact:true})).toHaveValue('2');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/reservations')&&r.request().method()==='POST');await dialog.getByRole('button',{name:/Confirmar reserva/}).click();const reservation=await (await created).json();expect(reservation.quantity).toBe(2);await expect(page.getByRole('alert')).toContainText('Reserva confirmada');
 await page.getByRole('button',{name:'Explorar ofertas',exact:true}).click();await page.locator('.consumer-reservation-banner').click();await expect(dialog.locator('.pickup-code')).toBeVisible();await expect(dialog).toContainText('2 unidades');
 await dialog.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await dialog.getByRole('button',{name:'Conservar mi reserva'}).click();await expect(dialog.locator('.pickup-code')).toBeVisible();await dialog.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await dialog.getByRole('button',{name:'Confirmar cancelación'}).click();await expect(page.getByRole('alert')).toContainText('Reserva cancelada');
 await page.getByRole('button',{name:'Mis reservas',exact:true}).click();await page.getByRole('button',{name:'Finalizadas',exact:true}).click();await expect(page.locator('.consumer-reservation .badge.cancelled').first()).toBeVisible();await page.getByRole('button',{name:'Mi historial',exact:true}).click();await expect(page.locator('.consumer-reservation .badge.cancelled').first()).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'Mi cuenta'}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await expect(page.getByRole('button',{name:'Entrar a la demostración'})).toBeEnabled();
});
