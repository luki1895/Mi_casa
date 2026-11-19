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

El historial remoto conserva para 000 el checksum histórico `19d7c3e534575735f565c27b63fec789b11bcce95a70b87bad5df9a67388c7b9`, distinto del archivo actual. La revisión de solo lectura y el ensayo sobre un respaldo restaurado confirmaron que las columnas, restricciones e índices de las 16 tablas base coinciden, salvo el constraint legado de `usuario.rol`, que incluye `empleado`. Ese checksum concreto está registrado como histórico aceptado en el manifiesto: `status` lo muestra como `APLICADA_RECONCILIADA` y conserva el valor original en `schema_migrations`. No edites 000 ni cambies manualmente el historial. La migración 005 conserva temporalmente el rol legado `empleado`; la aplicación solo autoriza `admin`, `caja`, `mesero` y `cliente`.

003 y 004 no crean ni alteran tablas, columnas, índices, restricciones, funciones o triggers: solo actualizan filas de `usuario`. 003 cambia `password` a los hashes semilla y establece `estado = TRUE` para cada una de cinco cuentas cuyo hash actual coincide exactamente con su hash previo. Una repetición deja de afectar una fila después del cambio de hash, pero puede reactivar y restablecer credenciales de las filas que aún satisfacen la guarda.

004 depende lógicamente de 003: su guarda espera el hash objetivo de `maria` definido por 003 y cambia `rol` de `empleado` a `mesero`. Puede reasignar una cuenta histórica y no tiene registro propio en `schema_migrations`; no se puede atribuir a 004 un cambio observado solo por coincidir con su poscondición.

El estado remoto consultado en noviembre de 2026 no registra 003 ni 004. De las cinco cuentas protegidas por 003, tres tienen el hash objetivo, dos tienen hashes distintos y ninguna conserva el hash previo; las cinco están activas. `maria` tiene el hash objetivo y rol `mesero`; hay dos cuentas con rol `empleado`. La coincidencia de esos estados no demuestra qué proceso los produjo. No ejecutes los SQL originales ni escribas una fila de historial para simular una aplicación. Usa `node src/maintenance/reconcile-003-004-preflight.js` para una inspección TLS/solo lectura; si aparece alguna precondición antigua, requiere revisión humana, no corrección automática.

No se ejecutan nuevamente los SQL de 003 ni 004, tampoco desde pruebas locales; el preflight anterior solo consulta. El historial sigue sin registrar ambas migraciones.

La configuración persistente de mesas requiere `006_mesas_atenciones.sql`, `010_configuracion_mesas.sql` y `011_distribucion_plano_mesas.sql`. La 010 crea sectores y agrega asignación, orden y habilitación a `mesa`; la 011 añade las propiedades visuales del plano. No insertan mesas ni modifican registros históricos. El esquema remoto ya contiene todos los objetos de 005–011; la auditoría vigente registró 67 claves foráneas válidas y dos restricciones `CHECK NOT VALID` introducidas por 005.

El checksum legado aceptado para 000 es específico y explícito; cualquier otro checksum distinto sigue bloqueando la ejecución. La aceptación no modifica el esquema ni reescribe el historial. Mantén 000 inmutable y traslada cambios posteriores a migraciones nuevas.

012 es una barrera temporal, no la retirada definitiva del rol. Mantiene `empleado` en `usuario_rol_check` para que las dos filas históricas sigan siendo válidas y agrega un trigger que rechaza inserts con ese rol, asignaciones nuevas y cambios de rol en las filas legado. Las actualizaciones de otros campos en esas filas siguen permitidas. La aplicación no autentica `empleado`, no le concede permisos funcionales, permite que Administración identifique las filas y solo acepta un rol funcional al crear cuentas; al editar una fila legado conserva el rol sin permitir cambiarlo ni reactivarla si ya estaba inactiva.

012 sigue manual y no se aplicó. Antes de cualquier ejecución, valida en PostgreSQL aislado la restricción, el trigger, login, consultas y actualización de perfil: `npm run test:roles:postgres`. La prueba usa SQL real, crea un clúster temporal local y no conecta con Supabase. La retirada definitiva de `empleado` y la limpieza demo requieren decisiones y autorizaciones separadas.

Antes de una migración de producción: verifica el proyecto destino y un respaldo completo; revisa `status`, las dependencias y el checksum; ejecuta una migración por vez desde un job de CI/manual protegido con las variables de producción. No agregues un endpoint público de migraciones ni ejecutes `npm run migrate`, `npm run restore:data` o `npm run db:align-sequences` sin este control. El dump de esquema no es respaldo de datos.

Para una base nueva, configura sus variables de forma segura, prueba `npm run db:ping` y aplica 000 individualmente antes de migraciones dependientes. 000 contiene datos semilla; no la ejecutes contra una base existente sin comprobar antes el historial y el respaldo.

## pgAdmin

pgAdmin es opcional e independiente del backend; sirve para inspeccionar la base de datos, no para ejecutar la aplicación.
