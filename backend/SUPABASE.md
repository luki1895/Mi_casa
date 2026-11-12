# Supabase y PostgreSQL - Mi Casa

## 1. Objetivo

Usar una sola base de datos PostgreSQL limpia en Supabase y mantener una conexión consistente entre local y despliegue.

No mezclar proyectos, URLs antiguas, conexiones de pgAdmin viejas ni variables de entorno duplicadas.

## 2. Variables necesarias

En `backend/.env` usa:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.TU_PROJECT_REF.supabase.co:5432/postgres?sslmode=require
PGSSLROOTCERT=prod-ca-2021.crt
```

Reemplaza:

- `TU_PASSWORD` por la contraseña real de la base de Supabase
- `TU_PROJECT_REF` por el identificador del proyecto de Supabase

## 3. Certificado SSL

El certificado debe estar en:

- `backend/prod-ca-2021.crt`

La variable `PGSSLROOTCERT` debe tener exactamente:

```env
PGSSLROOTCERT=prod-ca-2021.crt
```

El backend resuelve esta ruta relativa desde la carpeta `backend`.

## 4. Recomendación para una conexión limpia

1. Crear un proyecto nuevo y limpio en Supabase.
2. Usar una sola `DATABASE_URL` para el backend.
3. No poner esa URL en el frontend.
4. No reutilizar conexiones de otros proyectos.
5. Mantener un único entorno por proyecto: local, preview y producción.

## 5. Variables de entorno en Vercel

Backend:

- `DATABASE_URL`
- `PGSSLROOTCERT`
- `JWT_SECRET` (si el backend lo usa)

Frontend:

- `VITE_API_URL=https://tu-backend.vercel.app/api`

Nunca pongas `DATABASE_URL` en el frontend.

## 6. Verificación rápida

Desde la carpeta `backend`:

```bash
npm run db:ping
```

Si la conexión está bien, el comando responde con `Conexión OK`.

## 7. pgAdmin

La conexión de pgAdmin es opcional y es independiente del backend. Se usa para inspeccionar la base, no para producir la app.

## 8. Importante

Si vas a migrar a una base nueva:

- crea primero el proyecto Supabase nuevo
- configura `DATABASE_URL` nueva
- prueba conexión con `npm run db:ping`
- luego ejecuta migraciones solo sobre la base correcta

No vuelvas a reutilizar la base antigua ni los secretos viejos.
