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

- Aplicación React y backend Express implementados; ver README.
- Modo local aislado con PostgreSQL embebido y cuentas de demostración; prohibido en producción.
- 8 pruebas de dominio/API aprobadas con PGlite y las mismas 8 con PostgreSQL 17 en Docker usando conexiones independientes. Incluyen 20 reservas simultáneas de 5 unidades y cancelación concurrente sin restitución duplicada.
- 3 pruebas Chromium aprobadas: reserva/retiro con rechazo de código inválido, búsqueda móvil, publicación con foto/edición/cierre e historial.
- Build de producción aprobado; auditoría de dependencias de producción sin vulnerabilidades reportadas en la validación anterior.
- Preparadas migraciones Supabase, `render.yaml`, `vercel.json` y CI. La configuración preparada no equivale a despliegues realizados. La CI remota aún no fue observada.

## Bloqueos externos confirmados

En la sesión anterior no estaban disponibles los MCP de Supabase, Render ni Vercel. No había variables ni credenciales de esos servicios inyectadas. No se crearon proyectos ni despliegues remotos. El usuario intentó conectar las apps pero las herramientas seguían sin aparecer; pidió guardar el proyecto en GitHub para retomar en otra sesión.

Una consulta real de geocodificación recibió HTTP 403. La lista de red permitida no incluía `nominatim.openstreetmap.org`. Agregar ese dominio en la configuración de red y volver a validar. No deshabilitar verificaciones TLS.

## Próximos pasos

1. Descubrir de nuevo las herramientas MCP disponibles; no asumir que las conexiones anteriores están activas. Consultar proyectos existentes para reutilizarlos antes de crear recursos duplicados.
2. Revisar README y alcance, ejecutar las pruebas pertinentes y verificar los requisitos de seguridad del PDF.
3. Con Supabase disponible: configurar Auth (correo confirmado, requisitos de contraseña, tokens de una hora, redirect URL y SMTP), aplicar migraciones y validar RLS/Storage y los flujos con cuentas reales. Las variables necesarias están en `.env.example`; ingresar valores secretos solo por canales seguros.
4. Desplegar API en Render y frontend en Vercel. Configurar origen CORS exacto, URL pública de API y URLs de Auth. Validar solicitudes HTTPS, roles, reservas simultáneas, vencimientos y retiros.
5. Configurar y probar la política de respaldos del PDF, incluyendo almacenamiento privado cifrado en Cloudflare R2 y restauración. Todavía no implementada ni verificada.
6. Registrar resultados concretos. No declarar la aplicación completa mientras esos pasos estén pendientes.

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
