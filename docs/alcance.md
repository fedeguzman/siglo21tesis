# Alcance y validación

| Historia | Implementación |
|---|---|
| HU-001/002 Registro y sesión | Supabase Auth con correo confirmado, contraseña validada, sesión persistida y renovación de tokens; modo local separado para demostración |
| HU-003/004 Comercio | Alta y actualización, datos públicos, búsqueda y selección geocodificada de dirección, activación y permisos de propietario |
| HU-005 Publicación | Contenido, categoría, precio habitual/descuento, cantidad, foto de biblioteca o propia, conservación y franja de retiro |
| HU-006 Edición/cierre | Bloqueo de contenido y franja con reservas activas; mínimo de unidades comprometidas; precio de reserva inmutable; cierre conserva reservas |
| HU-007 Disponibilidad | Bloqueo de filas y transacciones; estado agotado; restitución por cancelación sin reabrir lotes cerrados |
| HU-008/009 Búsqueda/detalle | Texto, categoría, precio, geolocalización opcional y distancia; detalle del comercio y retiro |
| HU-010 Reserva | Cantidad validada, precio y franja congelados, código aleatorio único, stock atómico |
| HU-011 Consulta | Reservas del usuario o del comercio propietario; código para consumidor activo e historial de estados |
| HU-012 Cancelación | Solo propietario consumidor, activa y no vencida, restaura unidades sin publicar lotes cerrados |
| HU-013 Gestión | Reservas propias del comercio con filtros por lote, estado y fecha |
| HU-014 Retiro | Comercio propietario, código correcto, reserva activa y dentro de su franja |
| HU-015 Vencimiento | Control cada 30 segundos y por solicitud, sin volver a ofrecer unidades vencidas, historial idempotente |
| HU-016 Historial/indicadores | Historial por rol y período, publicadas, reservadas, retiradas, canceladas, vencidas y valor de retiros |

## Límites y pendientes

- Supabase, PostgreSQL remoto y despliegues Render/Vercel tienen comprobaciones reales documentadas en `CONTINUAR.md`. La revisión de la versión 1.0.0 agrega pruebas locales con las dos cuentas reales proporcionadas por el usuario; ver `REVISION_1.0.0.md`. El correo real depende de SMTP, que quedó pendiente por decisión del usuario.
- Las fotos propias se validan por firma JPEG/PNG/WebP y tamaño máximo de 5 MB. En local se guardan en `.local/photos`; en producción se usa Supabase Storage y la migración 002. El almacenamiento remoto aún no está verificado.
- El catálogo permite agregar y consultar productos; las publicaciones describen el contenido en texto. No hay asociación estructurada lote/productos.
- El historial del comercio agrupa lotes y sus reservas por período, además de mostrar el historial de estados de cada reserva.
- Recuperación de contraseña y reenvío de confirmación están implementados mediante Supabase Auth; el envío real de correos y el enlace de recuperación requieren configurar Auth/SMTP y probar con el proyecto remoto.
- La política de copias diarias de Supabase y copias cifradas de repositorio/archivos en Cloudflare R2 del PDF necesita configuración externa y verificación de restauración. No se presenta como implementada.
- La geocodificación mediante la API local, con una cuenta de comercio real autenticada, devolvió una dirección seleccionable y permitió guardar el comercio en la base aislada. Atribución de datos: © OpenStreetMap contributors.
- Las pruebas automatizadas validan PostgreSQL embebido y flujos locales; no equivalen a verificación de permisos del usuario PostgreSQL de producción ni de la configuración de Supabase.
