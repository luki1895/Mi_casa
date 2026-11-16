# Supabase y PostgreSQL - Mi Casa

## Objetivo

Usar una sola base PostgreSQL por entorno y mantener la conexión consistente entre desarrollo local y despliegue. No mezcles proyectos, URLs antiguas ni variables duplicadas.

## Variables de entorno

Configura en `backend/.env` local y en el entorno del backend desplegado:

- `DATABASE_URL`: URI PostgreSQL proporcionada por Supabase.
- `PGSSLROOTCERT`: ruta local a `prod-ca-2021.crt`, relativa a `backend` o absoluta.
- `PGSSLROOTCERT_PEM`: opcional; contenido PEM completo del certificado raíz (BEGIN/END CERTIFICATE). En Vercel tiene prioridad sobre `PGSSLROOTCERT` y evita depender de empaquetar el archivo.
- `JWT_SECRET`: clave usada para firmar tokens.

Nunca guardes contraseñas ni claves reales en el repositorio. No configures `DATABASE_URL` en el frontend. El código valida el certificado CA y mantiene `rejectUnauthorized=true`; nunca desactiva la verificación TLS. `includeFiles` en `backend/vercel.json` queda como respaldo para archivos `.crt`.

El frontend usa `VITE_API_URL` con la URL pública del backend terminada en `/api` (por ejemplo, `https://tu-backend.vercel.app/api`). No pongas la URI de PostgreSQL en el frontend.

## Verificación de conexión

Desde `backend`, ejecuta:

```bash
npm run db:ping
```

Si la conexión está bien, responde `Conexión OK`. En Vercel, comprueba también `PGSSLROOTCERT_PEM`, el endpoint principal, el inicio de sesión y los permisos de Administrador, Caja y Mesero.

## Migraciones y datos

La versión actual incluye `src/migrations/005_integral_completion.sql`, requerida por las funciones de productos, saldos de pensionados, historial de reservas, anulación de pagos y comandas. Esta migración no se ejecutó durante el desarrollo. Valida su compatibilidad en una base de pruebas y prepara un respaldo antes de aplicar cambios a una base existente.

No ejecutes `npm run migrate`, `npm run restore:data` ni `npm run db:align-sequences` sobre producción sin revisión previa. Para una base nueva, crea primero el proyecto Supabase, configura su `DATABASE_URL`, prueba con `npm run db:ping` y ejecuta las migraciones solo cuando hayas confirmado que apuntas a la base correcta. No reutilices conexiones ni secretos antiguos.

## pgAdmin

pgAdmin es opcional e independiente del backend; sirve para inspeccionar la base de datos, no para ejecutar la aplicación.
