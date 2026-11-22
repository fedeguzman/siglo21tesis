# Consumidor mobile 1.1.0

## Cambio

La interfaz anterior del consumidor reutilizaba el panel de escritorio: navegación superior desplazable, dos columnas de ofertas y reservas en tablas. La nueva interfaz toma la composición y los recorridos de `docs/referencias/consumidor.html` y trabaja como una aplicación de teléfono.

- Encabezado con marca y acceso a cuenta; ubicación y búsqueda; categorías horizontales y filtros de precio/distancia.
- Ofertas de una columna con fotografía, comercio, stock, descuento, precio y horario.
- Detalle con contenido, conservación, dirección y retiro. Paso de confirmación con cantidad, resumen y total a pagar en el comercio.
- Navegación inferior fija: Explorar, Reservas, Historial y Cuenta. Aviso de reserva activa en Explorar.
- Reservas activas/finalizadas en tarjetas, comprobante con código y movimientos, cancelación y consulta de historial por período.
- Cuenta con datos reales del perfil, accesos a reservas/historial, ubicación y cierre de sesión.

Se adapta de 320 a 430 px sin desbordar; en tablet y escritorio conserva una columna de teléfono centrada. No se incorporan los datos ficticios ni los controles de simulación del prototipo. Las publicaciones, ubicaciones, precios, reservas y códigos provienen de la API existente. No se agregan pagos electrónicos. La experiencia del comercio y los permisos de la API se conservan.

## Validación local

- 21 pruebas de Playwright Chromium aprobadas: las ocho de autenticación, seis de negocio y siete nuevas de consumidor mobile.
- Anchos 320, 390, 430, 768 y 1280: barra inferior fija y horizontal, tarjetas de una columna, cuenta/historial y ausencia de desbordamiento.
- Geolocalización autorizada, filtros con resultados vacíos y limpieza; foco retenido y restaurado al cerrar el detalle con Escape.
- Checkout de dos unidades, código, aviso de reserva activa, conservar/cancelar la reserva, reservas finalizadas e historial.
- Comercio: publicación, foto, edición, cierre, catálogo, datos e indicadores; consumidor: reserva, cancelación y retiro confirmado por el comercio.
- 12 pruebas de API/dominio aprobadas, incluida concurrencia y control de stock.
- Build de producción aprobado. El consumidor se carga en un módulo separado según el rol.
- Recorrido con cuentas reales contra Supabase y datos de negocio aislados en local: persistencia, geocodificación, publicación, reserva, cancelación, retiro, historial y logout. El consumidor se prueba a 390 × 844.

La automatización de navegador inicia una base en memoria nueva por ejecución y mantiene habilitado el limitador de solicitudes. Las credenciales se reciben únicamente por variables de entorno y no están en el repositorio.

## Publicación

La etiqueta `v1.1.0` apunta a `f03355c5a0c5c493ac1bb51f8c48538bca760e11`, subido a main después de las pruebas locales. [CI 44988158026](https://github.com/fedeguzman/siglo21tesis/actions/runs/44988158026) terminó correctamente, incluyendo PostgreSQL y las 21 pruebas de navegador. Vercel publicó ese commit en READY (`dpl_3x19S5oo29rCSFFhJuJYchnKBiAk`) y Render en live (`dep-dc17i1e1egvs7381pb0g`); el plan de la API sigue siendo Free.

Se verificó por HTTPS con ambas cuentas autorizadas: versión visible, login, recarga, reapertura, renovación real del token del consumidor, permisos, dirección geocodificada, foto en Supabase Storage, publicación, reserva/cancelación, nueva reserva, entrega confirmada por el comercio, historial y cierre de sesión. El consumidor operó a 390 × 844, sin errores de navegador. Mi cuenta muestra el correo de la sesión autenticada.

El lote QA final `2d139cac-f6e3-4c8d-9cb4-a55ba97ac754` quedó cerrado. La consulta directa a Supabase confirmó dos unidades originales, una disponible, una reserva cancelada, una retirada y cero activas. Los logs de aplicación revisados desde el despliegue no contienen Error/ERR_/ValidationError.

Una primera corrida de la automatización abrió una tarjeta previa a la respuesta del buscador; esa reserva de prueba se canceló y el stock quedó restituido. La publicación QA de esa corrida también quedó cerrada. Se ajustó la automatización para esperar el nombre exacto de la publicación y seleccionar exclusivamente sus reservas, y se repitió correctamente el recorrido entero. El script local con cuentas reales usa la misma selección por publicación exacta y comprueba su propio historial.

## Límites

La verificación mobile usa emulación de viewport en navegadores de escritorio; no sustituye una prueba manual en un dispositivo iOS/Android real. SMTP personalizado y respaldos externos permanecen pendientes por decisión del usuario. No se contrataron planes ni complementos pagos.
