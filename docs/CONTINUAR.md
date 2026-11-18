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
- Render: la cuenta respondió y no había un servicio para este repositorio. La revisión automática rechazó las políticas de acceso a las seis tablas para el rol dedicado de Express. El rol quedó sin login y la API aún no se desplegó.
- Validación local: ocho pruebas de dominio/API aprobadas tanto en PGlite como en PostgreSQL 17 real, tres pruebas Chromium aprobadas y build de producción aprobado. Playwright espera a que el proxy pueda llegar al endpoint de salud antes de iniciar.
- La consulta directa de geocodificación para Córdoba devolvió un resultado. Queda pendiente repetirla a través de Render.

## Próximos pasos

1. Resolver los permisos del rol de Express en Supabase. Guardar su cadena de conexión con TLS como secreto de Render. Usar el origen exacto `https://siglo21tesis.vercel.app` para CORS.
2. Desplegar el backend en Render. Comprobar `/api/health` y `/api/config`, junto con el CORS y la URL de API incorporada al frontend.
3. Configurar y verificar Supabase Auth: Site URL y redirect de Vercel, contraseña de 12 caracteres con mayúscula, minúscula, número y símbolo, tokens de una hora y SMTP de producción.
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
