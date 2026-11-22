# Excedentes · Cada alimento cuenta

Plataforma de excedentes alimentarios para el TFG de Federico Guzmán (Universidad Siglo 21). React + Express + PostgreSQL, con Supabase Auth en producción. Dos espacios: consumidor y comercio. Los precios se almacenan en centavos de ARS; el pago se realiza fuera de la aplicación.

## Desarrollo local

Node.js 24 y npm 11. Desde el checkout existente (las tareas cloud ya están aisladas, no hace falta crear un worktree):

```sh
npm ci --cache /workspace/.npm-cache
APP_MODE=local npm run dev
```

El frontend usa el puerto 5173 y la API el 3001. El modo local usa PostgreSQL embebido (PGlite) persistido en `.local/database`, sin credenciales externas. Seleccionar un rol en la pantalla inicial permite probar las dos cuentas de demostración. **No es autenticación de producción** y el servidor rechaza este modo con `NODE_ENV=production`. Los seis lotes iniciales tienen una ventana de seis horas desde la creación de la base. No se renuevan ni eliminan datos existentes al reiniciar.

```sh
npm test
npm run test:postgres # requiere Docker; base efímera con conexiones independientes
npm run test:e2e  # requiere Chromium en /usr/bin/chromium o CHROMIUM_PATH
npm run build
```

Las pruebas de navegador crean reservas y retiros en la base local de demostración. Usar un entorno local dedicado para validación. `tests/domain.test.js` usa una base en memoria aislada.

## Supabase, Render y Vercel

1. Crear o reutilizar un proyecto Supabase. Guardar `DATABASE_URL` (conexión PostgreSQL o session pooler con TLS), `SUPABASE_URL` y `SUPABASE_ANON_KEY` en las variables seguras del backend. Nunca usar el service role key en el navegador. El acceso a las tablas de negocio pasa por la API; RLS está habilitado sin políticas de acceso directo.
2. Configurar Supabase Auth: confirmación de correo obligatoria, contraseña de 12 caracteres con mayúscula, minúscula, número y símbolo, access token de una hora, Site URL y redirect URL iguales a la URL del frontend. Deshabilitar registro anónimo. Configurar SMTP para envío real. Supabase conserva la sesión del frontend en el almacenamiento del navegador y renueva el token. Cerrar sesión borra esa sesión y limpia los datos de la cuenta en pantalla.
3. Ejecutar `npm run migrate -w apps/api` con `DATABASE_URL` en el entorno. La migración inicial es idempotente y no contiene datos simulados. En Supabase también se aplica la migración 002, que crea el bucket público de fotos y permite escrituras en la carpeta del usuario autenticado. Usar un usuario de base limitado para la API en producción; el usuario de migración debe poder crear tablas y habilitar RLS.
4. Render: usar `render.yaml` para el backend. Completar sus variables y `WEB_ORIGIN` con el origen exacto de Vercel. Build `npm ci`; start `npm start`; comprobar `/api/health`. `APP_MODE=supabase`, `NODE_ENV=production`. El cron interno controla vencimientos cada 30 segundos y cada solicitud vuelve a controlar la vigencia; las transacciones rechazan reservas/retiros vencidos aunque el proceso haya estado detenido.
5. Vercel: importar el monorepo desde su raíz, usar `vercel.json` y definir `VITE_API_URL` con el origen HTTPS de Render antes del build. Se obtiene la configuración pública de Supabase de `/api/config`; ninguna credencial de base se incorpora al bundle.
6. Validar con cuentas reales confirmadas: comercio registra una dirección, publica un lote; consumidor reserva; otro consumidor no puede consultar ni cancelar esa reserva; comercio valida el código; ambos ven el historial; probar stock simultáneo y vencimiento. El navegador debe poder llamar a la API por HTTPS.

Geocodificación: Nominatim/OpenStreetMap (`nominatim.openstreetmap.org`), consultas iniciadas por el usuario para direcciones de Argentina. Revisar sus términos y límites antes de escalar o contratar otro proveedor. No se almacena la ubicación del consumidor.

## Estado y alcance

Ver `docs/alcance.md` para la correspondencia con las historias HU-001 a HU-016 y los pendientes de infraestructura. El PDF se transcribió en `docs/tesis.txt` como referencia de requisitos, no como instrucciones de ejecución. Las imágenes provienen de los HTML aportados.

El frontend está publicado en [Vercel](https://siglo21tesis.vercel.app/) y la [API en Render Free](https://excedentes-api.onrender.com/api/health), conectada con Supabase mediante un rol exclusivo y TLS con certificado verificado. Supabase tiene RLS, Storage, URLs de Auth y requisitos de contraseña configurados. SMTP quedó pendiente por decisión del usuario; faltan las pruebas con cuentas confirmadas en producción y los respaldos R2. El estado y las verificaciones están en [Continuar el desarrollo](docs/CONTINUAR.md).

## Verificación de esta implementación

- 8 pruebas de dominio/API aprobadas con PGlite y PostgreSQL 17 real (stock simultáneo, cancelación, propiedad, códigos, edición y vencimientos).
- 3 pruebas Chromium aprobadas (reserva/retiro completo, móvil y búsqueda, publicación con foto/edición/cierre e historial).
- Build de producción aprobado.
- Auditoría de dependencias de producción: 0 vulnerabilidades reportadas en el momento de ejecución.
- Una consulta directa a Nominatim para Córdoba devolvió un resultado desde el entorno de validación. Falta probarla a través de la API desplegada.

Para retomar desde otra sesión, leer primero [`docs/CONTINUAR.md`](docs/CONTINUAR.md).

## Versiones 1.0.0/1.0.1 y revisión integral

La versión se muestra en el pie de la aplicación. La causa de la pérdida de sesión era `persistSession:false`; se corrigieron además la restauración inicial, las respuestas fuera de orden, la actualización al navegar y los errores no JSON. Ver [revisión y cobertura](docs/REVISION_1.0.0.md).

`npm run test:auth-real` levanta frontend y API locales con una base en memoria y Supabase Auth real. Requiere `REVIEW_MERCHANT_EMAIL`, `REVIEW_MERCHANT_PASSWORD`, `REVIEW_CONSUMER_EMAIL` y `REVIEW_CONSUMER_PASSWORD` en el entorno, y Chromium instalado (o `CHROMIUM_PATH`). No modifica datos de negocio de producción ni cambia contraseñas; comprueba ambas cuentas, persistencia, geocodificación, reserva, cancelación, retiro e historial. Usar los puertos locales 3001 y 5173 libres. Nunca guardar esas credenciales en Git.
