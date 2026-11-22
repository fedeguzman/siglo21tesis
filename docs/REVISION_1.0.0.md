# Revisión de la versión 1.0.0

## Problemas corregidos

- Supabase usaba `persistSession:false` en el navegador: la sesión desaparecía al recargar. Ahora se persiste con el SDK, se renueva el token y se restaura el perfil antes de mostrar la pantalla.
- Las respuestas de perfil y consultas anteriores podían llegar después de una sesión o búsqueda más nueva. Se descartan las respuestas obsoletas y se limpian los datos, filtros y ubicación al cerrar sesión.
- Cambiar de sección no solicitaba datos recientes. Ahora la navegación actualiza las consultas.
- El cierre de sesión no esperaba al SDK. Ahora se espera, se informa cualquier error y se cierra únicamente la sesión actual, sin revocar sesiones de otros dispositivos.
- Respuestas HTML y el límite de solicitudes podían mostrar errores técnicos de JSON. Se muestran mensajes comprensibles y se puede reintentar; HTTP 429 devuelve JSON.
- Las credenciales incorrectas se explican en español. La versión aparece en el pie de página.

## Evidencia local antes del despliegue

| Área | Comprobación |
|---|---|
| Registro y autenticación (HU-001/002) | Registro con contraseña fuerte, rechazo de credenciales incorrectas, confirmación, recuperación, recarga, reapertura, renovación de token y salida entre pestañas. Auth simulado en pruebas deterministas y ambas cuentas reales en el recorrido integrado. |
| Comercio (HU-003/004) | Guardado y relectura de datos; geocodificación real con la cuenta de comercio contra API local; datos aislados. |
| Publicación y edición (HU-005/006) | Foto propia local, guardado, edición, cierre e historial; rechazo de imágenes inválidas y superiores a 5 MiB; protección de horarios y contenido con reservas activas. |
| Stock y búsqueda (HU-007/008/009) | Reservas simultáneas sin sobreventa, stock no negativo, filtros de texto/categoría/precio/distancia y búsqueda fuera de orden. |
| Reserva, consulta y cancelación (HU-010/011/012) | Recorridos de API y navegador; cancelación devuelve stock una sola vez; propiedad y aislamiento verificados con identidades diferentes. |
| Gestión y retiro (HU-013/014) | Vista de comercio, rechazo de código inválido y retiro con código correcto; entrega registrada una sola vez. |
| Vencimiento e historial (HU-015/016) | Vencimiento idempotente, bloqueo de operaciones vencidas, eventos, indicadores e historial de ambos roles. |
| Infraestructura | CORS, autenticación obligatoria, límite por IP detrás del proxy, error JSON de límite y recuperación ante respuesta HTML. |

- `npm test`: 12 pruebas aprobadas con PGlite.
- Las mismas 12 pruebas aprobadas sobre un PostgreSQL local efímero con conexiones independientes. CI usa PostgreSQL 17 en Docker.
- `npm run test:e2e`: 13 pruebas aprobadas en Chrome sobre base local aislada.
- `npm run test:auth-real`: recorrido con las cuentas de comercio y consumidor suministradas, Supabase Auth real y datos de negocio exclusivamente locales; sin errores del navegador.
- `npm run build`: aprobado. `npm audit --omit=dev`: cero vulnerabilidades reportadas.

## Alcance de producción y límites

Después de publicar, comprobar que Vercel y Render ejecuten el commit esperado, que la API conecte a la base y que ambas cuentas conserven sesión tras recargar y reabrir por HTTPS. La validación local se realizó antes de cualquier push de esta versión.

Las pruebas deterministas de registro/recuperación simulan Auth y no prueban la entrega de correo. SMTP y los respaldos R2 siguen pendientes por las decisiones y dependencias documentadas en `CONTINUAR.md`. No se presenta una restauración de respaldo ni correo de producción como validados. Render Free puede tardar al reanudarse por inactividad; no se contrataron planes pagos.
