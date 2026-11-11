# Supabase y pgAdmin - Restaurante Mi Casa

## 1. Configuracion de PostgreSQL

El proyecto utiliza PostgreSQL alojado en Supabase.

Variables necesarias en backend/.env:

- DATABASE_URL: URI de conexion PostgreSQL proporcionada por Supabase.
- PGSSLROOTCERT: prod-ca-2021.crt

No guardar contrasenas ni claves secretas en el repositorio.

## 2. Certificado SSL

El certificado debe encontrarse en backend/prod-ca-2021.crt.
La variable PGSSLROOTCERT debe contener prod-ca-2021.crt.
El backend resuelve las rutas relativas desde la carpeta backend.
La conexion utiliza TLS con verificacion del certificado.

## 3. Variables de entorno en Vercel

Backend:

- DATABASE_URL: URI de conexion de Supabase.
- JWT_SECRET: clave utilizada para firmar los tokens.
- PGSSLROOTCERT: prod-ca-2021.crt

Frontend:

- VITE_API_URL: URL publica del backend terminada en /api.

Ejemplo: https://micasa-backend-tau.vercel.app/api

No colocar la URI de PostgreSQL en el frontend.

## 4. Conexion desde pgAdmin

1. Seleccionar Servers.
2. Elegir Register y luego Server.
3. Asignar un nombre como Mi Casa - Supabase.
4. Introducir los datos de conexion proporcionados por Supabase.
5. Configurar SSL.
6. Guardar la conexion.

La conexion de pgAdmin es independiente de la configuracion del backend.

## 5. Estado de la base de datos

La migracion inicial del esquema y la restauracion de los datos ya fueron realizadas.

IMPORTANTE: No ejecutar nuevamente estos comandos sobre la base de datos de produccion sin una revision previa:

- npm run migrate
- npm run restore:data
- npm run db:align-sequences

## 6. Verificacion antes de produccion

1. Comprobar las variables de entorno en Vercel.
2. Verificar que el certificado SSL este incluido en el backend desplegado.
3. Comprobar el endpoint principal del backend.
4. Verificar la conexion con Supabase.
5. Probar el inicio de sesion.
6. Comprobar los permisos de Administrador, Caja y Mesero.
7. Verificar las operaciones principales sin modificar innecesariamente los datos existentes.
