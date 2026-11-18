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

El ejecutor no migra al iniciar el backend. `npm run migrate` requiere un subcomando:

```bash
npm run migrate -- status
npm run migrate -- deps 005_integral_completion.sql
npm run migrate -- run 005_integral_completion.sql --confirm <sha256>
```

`status` y `deps` consultan la base en una transacción de solo lectura y muestran los checksums local y registrado. `run` exige un archivo concreto, checksum de confirmación exacto, dependencias satisfechas y que sea la siguiente migración aplicable. Aplica solo ese archivo, bajo bloqueo asesor transaccional, y registra el checksum en la misma transacción. No hay comando para aplicar todas las migraciones. Las migraciones 003 y 004 son manuales y el ejecutor las bloquea.

El estado remoto consultado previamente indicó un checksum distinto para 000. El ejecutor debe detenerse ante esa discrepancia; no edites 000, no alteres `schema_migrations` y no ejecutes SQL manual para saltarte la validación. 004 también requiere revisión: su SQL local está incompleto. La migración 009 depende de 008 y su archivo debe estar incluido en el commit de código que se vaya a usar.

La configuración persistente de mesas requiere `006_mesas_atenciones.sql` y la nueva migración aditiva `010_configuracion_mesas.sql`. La 010 crea sectores y agrega asignación, orden y habilitación a `mesa`; no inserta mesas ni modifica registros históricos. No la ejecutes hasta que `status` y `deps` confirmen el historial, checksum y orden aplicable; la discrepancia conocida de 000 mantiene bloqueadas las migraciones hasta su reconciliación formal.

Para resolver el checksum de 000, recupera el archivo exacto del artefacto o revisión usada al aplicarlo y verifica que el SHA-256 calculado por el ejecutor coincida con el registro remoto. Traslada cualquier cambio posterior a una migración nueva, después de revisar sus efectos. Si el original no puede recuperarse, mantén bloqueada la ejecución y solicita una reconciliación de esquema formal y aprobada; no agregues excepciones que acepten un checksum distinto.

Antes de una migración de producción: verifica el proyecto destino y un respaldo completo; revisa `status`, las dependencias y el checksum; ejecuta una migración por vez desde un job de CI/manual protegido con las variables de producción. No agregues un endpoint público de migraciones ni ejecutes `npm run migrate`, `npm run restore:data` o `npm run db:align-sequences` sin este control. El dump de esquema no es respaldo de datos.

Para una base nueva, configura sus variables de forma segura, prueba `npm run db:ping` y aplica 000 individualmente antes de migraciones dependientes. 000 contiene datos semilla; no la ejecutes contra una base existente sin comprobar antes el historial y el respaldo.

## pgAdmin

pgAdmin es opcional e independiente del backend; sirve para inspeccionar la base de datos, no para ejecutar la aplicación.
