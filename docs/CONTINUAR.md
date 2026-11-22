# Continuar el desarrollo de Excedentes

## Consumidor mobile 1.1.0

La sección de consumidor usa `Consumer.jsx` y `consumer.css`, basados en `docs/referencias/consumidor.html`. Tiene navegación inferior fija (Explorar, Reservas, Historial, Cuenta), ofertas de una columna, categorías horizontales, filtros en un panel, detalle del lote, confirmación con cantidad/total, comprobante con código, tarjetas de reservas activas/finalizadas, historial por período y cuenta. El contenido ocupa el ancho del teléfono hasta 430 px y mantiene la composición de teléfono centrada en pantallas grandes. El comercio conserva su panel.

La autenticación y los datos siguen usando la integración existente. Se carga el componente de consumidor solo al entrar con ese rol. Se mantienen las validaciones y la autorización en la API. Las ventanas de detalle retienen el foco, permiten Escape y bloquean la interacción con el fondo; los botones inferiores contemplan el área segura del teléfono. Los horarios se muestran en formato de 24 horas.

La validación local incluye 21 pruebas de navegador y 12 pruebas de API/dominio. Comprueba anchos 320/390/430/768/1280, barra inferior horizontal, tarjetas de una columna, ausencia de desbordamiento, filtros/geolocalización, foco de teclado, cantidad, reserva/código/cancelación/historial y el flujo de entrega del comercio. La suite usa una base en memoria nueva por ejecución para no consumir el stock de corridas anteriores. Ver el informe para el estado de despliegue y la verificación HTTPS. SMTP y respaldos externos siguen pendientes por decisión previa; todos los servicios conservan planes gratuitos.

## Revisión 1.0.1 (base 1.0.0)

Se corrigió la pérdida de sesión del frontend (`persistSession:false`), la restauración inicial y el descarte de respuestas tardías. La sesión se conserva al recargar/reabrir y se cierra en las pestañas de la misma sesión; logout limpia los datos, ubicación y filtros de la cuenta. Se actualizan datos al navegar y se explican los errores HTML/429 sin errores técnicos de JSON.

Antes de publicar esta versión se ejecutaron doce pruebas de API/dominio en PGlite y PostgreSQL local real, trece pruebas de Chrome y un recorrido con las dos cuentas reales suministradas por el usuario, usando frontend, API y datos de negocio aislados en local. El flujo real incluye persistencia de ambos roles, dirección geocodificada, publicación, reserva, cancelación, retiro e historial. No hay credenciales de prueba en el repositorio. El script reproducible es `npm run test:auth-real`; recibe las variables de entorno indicadas en README.

La versión está en `package.json` y se muestra en el pie de página. 1.0.0 se publicó después de las pruebas locales y pasó CI. La validación por HTTPS confirmó persistencia de ambos roles, renovación real de token, permisos y geocodificación. El comercio de prueba no tenía datos: se registró expresamente como comercio de prueba. Una publicación QA comprobó foto real en Storage, publicación, reserva y cancelación, pero reveló una carrera al abrir la segunda reserva antes de terminar de refrescar la lista; el lote se cerró. 1.0.1 corrige esa espera y agrega una regresión de latencia: catorce pruebas de navegador aprobadas en local.

Ver `docs/REVISION_1.0.0.md` para alcance y límites. La publicación debe seguir a las comprobaciones locales. Tras el push, verificar CI, Vercel READY y Render live para el commit publicado y repetir el recorrido completo por HTTPS. Cerrar los lotes QA y cancelar reservas QA activas al terminar, sin borrar el historial.

El recorrido real de 1.0.1 ya terminó correctamente con ambas cuentas, incluyendo foto en Storage, publicación, reserva, cancelación, retiro e historial. La base confirmó que el lote QA `e9717333-6c7f-4076-9e2e-52d0f0d6ddd7` quedó cerrado, con una reserva cancelada, una retirada y cero activas. La sesión del consumidor renovó un token realmente por HTTPS. Se cerraron las sesiones usadas para la prueba. El ajuste posterior de la suite solo aísla cuotas entre escenarios y no cambia el código de aplicación de la etiqueta v1.0.1.

El siguiente objetivo de consumidor mobile se implementa en 1.1.0; ver la sección inicial y `docs/REVISION_1.1.0.md`.

## Objetivo y decisiones

Sistema de tesis de Federico Guzmán: aplicaciones React de comercio y consumidor, PostgreSQL/Auth/Storage en Supabase, Express en Render y frontend en Vercel. Leer también `docs/alcance.md` y `docs/tesis.txt`; las referencias originales están en `docs/referencias/`.

El usuario autorizó commit y push a main, el rol exclusivo de Express y su credencial, una copia local de esa credencial fuera de Git, y activar SSL obligatorio con reinicio de Supabase. Eligió Render Free y pidió usar exclusivamente planes gratuitos: no contratar planes, add-ons ni servicios pagos. Luego pidió dejar SMTP pendiente por ahora. No dar por terminadas las pruebas de negocio en producción ni los respaldos remotos.

## Servicios reales

- Frontend: https://siglo21tesis.vercel.app/ — Vercel, proyecto `prj_eHvFyAR4S24HLqAuWIyDzsceUJyD`, equipo `team_3ObqcKHNcGsrHWOOWs3OlhFJ`. Producción READY. `VITE_API_URL=https://excedentes-api.onrender.com`.
- API: https://excedentes-api.onrender.com — Render Free, Ohio, servicio `srv-dbufos5g1s2s73bnkke0`, workspace autorizado `muvango` (`tea-d8rc0jsm0tmc73c0sllg`). Dashboard: https://dashboard.render.com/web/srv-dbufos5g1s2s73bnkke0 . Primer despliegue y actualización de health check terminaron en live. Node 24, build `npm ci --cache /tmp/npm-cache`, start `npm start`, health check `/api/health`.
- Render tiene acceso GitHub a este repositorio después de que el usuario lo agregó a la instalación. No modificar el servicio `muvango-be`, que pertenece a otro repositorio.
- Supabase Free: `ekgylgijprknenjrrwkw`, región Ohio, estado saludable tras el reinicio. Migraciones remotas `20261118003028 initial`, `20261118003035 storage` y `20261118005723 express_scoped_database_access`.

## Base y seguridad

Las seis tablas de negocio tienen RLS. Solo el rol PostgreSQL `excedentes_api` tiene políticas para el acceso desde Express; anon/authenticated no tienen permisos directos sobre esas tablas. El backend verifica sesión confirmada y aplica autorización/propiedad y transacciones.

El rol tiene SELECT/INSERT en las seis tablas, UPDATE solo en shops/lots/reservations y USAGE en la secuencia de eventos. No tiene DELETE, TRUNCATE, administración ni BYPASSRLS. LOGIN habilitado y contraseña aleatoria probada. `DATABASE_URL` se guardó en Render; una copia local protegida fue entregada al usuario fuera del repositorio. Nunca imprimir ni subir esa credencial, claves privadas o archivos .env.

Session pooler IPv4: `aws-1-us-east-2.pooler.supabase.com:5432`, base postgres, usuario `excedentes_api.ekgylgijprknenjrrwkw`. En modo Supabase el código exige verify-full con la CA pública oficial incluida en `apps/api/certs/supabase-ca.crt`. Se verificó TLSv1.3 con certificado autorizado en el cliente y `pg_stat_ssl.ssl=true` en el tramo interno tras activar SSL obligatorio.

Render contiene solo la clave pública moderna de Supabase para Auth (`SUPABASE_ANON_KEY`, nombre histórico), nunca service_role. CORS: origen exacto `https://siglo21tesis.vercel.app`. La API reconoce únicamente el proxy más cercano cuando corre en Render para aplicar límites por cliente.

Storage: bucket público `lot-photos`, máximo 5 MiB; carga autenticada en la carpeta del propio usuario. Advisors de seguridad sin avisos.

## Auth

- Site URL y único redirect: `https://siglo21tesis.vercel.app`, guardados y verificados.
- Contraseña mínima de 12 caracteres con mayúscula, minúscula, número y símbolo.
- Confirmación de correo activa; acceso anónimo desactivado.
- Access tokens de 3600 segundos, verificados.
- SMTP personalizado sin configurar. El usuario confirmó que no tiene proveedor y decidió dejarlo pendiente por ahora. No desactivar confirmación de correo para sortearlo.

## Verificación realizada

- `/api/health`: HTTP 200, `{"status":"ok","mode":"supabase"}`; consulta la base real.
- `/api/config`: HTTP 200, local=false, URL correcta y clave publishable.
- `/api/me` sin token o con token inválido: HTTP 401.
- Preflight CORS de POST: HTTP 204, origen exacto de Vercel.
- Frontend HTTPS HTTP 200; en Chrome la configuración carga y el botón de inicio de sesión queda habilitado.
- Ocho pruebas originales de dominio/API y nueva prueba del proxy: nueve aprobadas localmente. La prueba adicional verifica cupos separados para dos IP y decremento para solicitudes de la misma IP.
- Tres pruebas Chrome locales aprobadas con base aislada: reserva/retiro, móvil/filtros y publicación con foto/edición/cierre/historial.
- Build de producción aprobado. Auditoría de dependencias de producción: cero vulnerabilidades.
- CI de GitHub del commit `e2af9fb` terminó en success (run `44214085120`). Revisar el estado del commit más nuevo después de cada push.
- Vercel publicó `e2af9fb` en READY. Las nuevas publicaciones se disparan por push a main.

## Pendientes reales

1. Monitorizar el despliegue del último commit y revisar logs después de tráfico real. Los primeros logs detectaron ERR_ERL_UNEXPECTED_X_FORWARDED_FOR; la corrección y prueba del proxy están en el código.
2. Cuando el usuario retome SMTP, configurar un proveedor gratuito, remitente y credencial en Supabase, y comprobar recepción de confirmación/recuperación. Brevo Free fue propuesto; no se creó cuenta ni se contrató nada.
3. Con cuentas confirmadas de comercio y consumidor, probar por HTTPS publicación con foto, aislamiento entre cuentas, stock simultáneo, cancelación, vencimiento, retiro e historial. Las pruebas locales no reemplazan esta validación de producción. Repetir geocodificación a través de Render con una sesión de comercio.
4. Respaldos del PDF: base diaria con siete días de retención, Git cifrado semanal y archivos cifrados diarios a las 05:00 UTC en bucket privado R2; verificar restauración. El usuario confirmó que no tiene bucket R2. No hay respaldos remotos configurados ni restauración validada. R2 tiene cuota gratuita y cobros por excedentes; no activar facturación sin autorización.
5. Render Free se suspende por inactividad y puede tardar en responder al reanudarse. Los vencimientos se recalculan al recibir solicitudes y las transacciones verifican vigencia; no se promete ejecución continua del temporizador durante la suspensión.

## Continuación local

Usar este checkout; no crear worktrees salvo pedido explícito. No subir .env, bases/fotos locales de pruebas, cachés, node_modules ni credenciales.

```sh
npm ci
APP_MODE=local npm run dev
npm test
npm run test:postgres # requiere Docker; base efímera
npm run test:e2e     # CHROMIUM_PATH si corresponde
npm run build
```

Las migraciones initial/storage conservan sus nombres locales originales (001/002) porque el desarrollo local las referencia; en remoto se aplicaron con las versiones listadas arriba. No reaplicar automáticamente el directorio completo sin reconciliar primero el historial. La migración de acceso a Express documenta el rol dedicado previamente creado; un entorno nuevo debe provisionar ese rol sin permisos administrativos y sin contraseña en Git.
