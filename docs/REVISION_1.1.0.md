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

Pendiente de completar: push, CI y comprobación del despliegue 1.1.0 por HTTPS. No considerar validada la publicación hasta cerrar esos controles.

## Límites

La verificación mobile usa emulación de viewport en navegadores de escritorio; no sustituye una prueba manual en un dispositivo iOS/Android real. SMTP personalizado y respaldos externos permanecen pendientes por decisión del usuario. No se contrataron planes ni complementos pagos.
