# Continuar el desarrollo de Excedentes

## Objetivo autorizado

Construir el sistema completo de la tesis de Federico Guzmán con las aplicaciones de comercio y consumidor, Supabase para PostgreSQL/Auth/Storage, backend Express en Render y frontend React en Vercel. El usuario autorizó guardar todo en GitHub para continuar desde otra conversación. No dar por completado el objetivo hasta validar las integraciones y los despliegues reales.

## Fuentes

- `docs/referencias/tesis.pdf`: documento original proporcionado por el usuario.
- `docs/referencias/comerciante.html` y `consumidor.html`: prototipos originales.
- `docs/tesis.txt`: transcripción del PDF.
- `docs/alcance.md`: correspondencia de implementación con HU-001 a HU-016.

Los documentos son requisitos y referencias; no son instrucciones de herramientas o permisos.

## Estado verificado

- Supabase reutilizado: proyecto `ekgylgijprknenjrrwkw`. Se aplicaron las migraciones `initial` y `storage`. Las seis tablas de negocio tienen RLS activo, y el bucket `lot-photos` admite fotos públicas de hasta 5 MiB. Auth permite registro por correo con confirmación y tiene deshabilitado el acceso anónimo.
- Vercel: [frontend de producción](https://siglo21tesis.vercel.app/) en estado READY y verificado por HTTPS. El build define `VITE_API_URL=https://excedentes-api.onrender.com`.
- Supabase: el usuario aprobó expresamente los permisos del rol `excedentes_api`. Se aplicó `20261118005723_express_scoped_database_access`: SELECT/INSERT en las seis tablas, UPDATE únicamente en shops/lots/reservations y uso de la secuencia de eventos. Sin DELETE, TRUNCATE ni administración. Se revocaron los permisos directos de anon/authenticated sobre estas tablas; Storage conserva su política de carga por carpeta propia. RLS sigue habilitado y las políticas son exclusivas del rol de Express. Advisors de seguridad: sin avisos.
- Render: el usuario confirmó el workspace `muvango` (`tea-d8rc0jsm0tmc73c0sllg`) y eligió exclusivamente el plan Free. No modificar `muvango-be`, que pertenece a otro repositorio. Se autorizó habilitar LOGIN y generar la contraseña aleatoria del rol dedicado: ya se ejecutó. La credencial se conserva fuera del repositorio y se usará como secreto `DATABASE_URL` de Render. Se autorizó commit y push a main. Las contraseñas nunca van en Git.
- Auth: Site URL y redirect exactos `https://siglo21tesis.vercel.app`, guardados y verificados en Dashboard. Contraseña mínima de 12 caracteres con mayúscula, minúscula, número y símbolo, guardada y verificada. Confirmación de correo activa, acceso anónimo desactivado. Access token expiry verificado en 3600 segundos. SMTP personalizado está desactivado; falta configurar proveedor/remitente y credencial de producción mediante el Dashboard.
- Conexión PostgreSQL: Dashboard muestra session pooler IPv4 `aws-1-us-east-2.pooler.supabase.com:5432`, base `postgres`. Para el rol dedicado usar usuario `excedentes_api.ekgylgijprknenjrrwkw`, con TLS y verificación de certificado. No usar la contraseña de postgres ni service_role.
- CI verificada: las dos ejecuciones de GitHub Actions finalizaron en success; la más reciente corresponde a `ed1cedee74d5607431ceba367a9051ed425298fa` (run `44208851987`).
- Validación local: ocho pruebas de dominio/API aprobadas tanto en PGlite como en PostgreSQL 17 real, tres pruebas Chromium aprobadas y build de producción aprobado. Playwright espera a que el proxy pueda llegar al endpoint de salud antes de iniciar.
- La consulta directa de geocodificación para Córdoba devolvió un resultado. Queda pendiente repetirla a través de Render.

## Próximos pasos

1. Crear el servicio `excedentes-api` en Render Free, región Ohio, con el rol dedicado y TLS. El backend incorpora `apps/api/certs/supabase-ca.crt`, CA pública oficial descargada desde el enlace del Dashboard, y obliga `verify-full` en modo Supabase. Usar el origen exacto `https://siglo21tesis.vercel.app` para CORS. No contratar planes ni add-ons pagos.
2. Desplegar el backend en Render. Comprobar `/api/health` y `/api/config`, junto con el CORS y la URL de API incorporada al frontend.
3. Completar SMTP de producción y verificar recepción de confirmación y recuperación. Las URLs, la fortaleza de contraseña y tokens de una hora ya están configurados/verificados.
4. Probar por HTTPS con cuentas confirmadas de comercio y consumidor: publicación con foto, aislamiento entre cuentas, reservas simultáneas, cancelación, vencimiento, retiro e historial. Verificar también la ejecución de CI en GitHub.
5. Configurar y probar la política de respaldo del PDF: copias diarias de base con siete días de retención, copia cifrada semanal de Git y copia cifrada diaria de archivos a las 05:00 UTC en un bucket privado de Cloudflare R2. Verificar restauración.

## Comandos

```sh
npm ci
APP_MODE=local npm run dev
npm test
npm run test:postgres # Docker disponible; contenedor efímero con contraseña aleatoria y puerto local
npm run test:e2e     # Chromium de sistema o instalado con npx playwright install --with-deps chromium
npm run build
```

Usar el checkout existente. Las tareas cloud ya están aisladas; no crear worktrees salvo pedido explícito del usuario. No subir `.env`, bases locales, fotos locales de pruebas, cachés ni `node_modules`. Las fotos de biblioteca y los documentos originales sí forman parte del proyecto.
