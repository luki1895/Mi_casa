import crypto from "node:crypto";
import pool from "../config/db.js";
import produccionModel from "./produccion.model.js";
import fechaRestaurante from "../utils/fechaRestaurante.js";

const estados = new Set(["PENDIENTE", "RECIBIDA", "EN_PREPARACION", "ATENDIDA", "CANCELADA", "NO_PRESENTADA"]);
const tokenHash = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
const validarId = (id, recurso) => {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero < 1) {
        throw Object.assign(new Error(`El identificador de ${recurso} no es válido`), { status: 400 });
    }
    return numero;
};
const assertReady = async (db) => {
    const { rows } = await db.query(
        `SELECT to_regclass('public.reserva_plato') IS NOT NULL
            AND to_regclass('public.detalle_reserva_plato') IS NOT NULL
            AND to_regclass('public.configuracion_reserva_platos') IS NOT NULL AS ready`,
    );
    if (!rows[0].ready) {
        throw Object.assign(new Error("Las reservas de platos requieren aplicar la migración local preparada"), { status: 503 });
    }
};

const obtenerConfiguracion = async (db = pool) => {
    await assertReady(db);
    const { rows } = await db.query(
        `SELECT hora_inicio,hora_fin,intervalo_minutos,tolerancia_minutos,zona_horaria
         FROM configuracion_reserva_platos WHERE id_configuracion=1`,
    );
    if (!rows[0]) throw Object.assign(new Error("La configuración de reservas no está disponible"), { status: 503 });
    return rows[0];
};

const validarFechaHora = async (fecha, hora, db = pool) => {
    const fechaTexto = String(fecha || "");
    const parsed = new Date(`${fechaTexto}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)
        || Number.isNaN(parsed.getTime())
        || parsed.toISOString().slice(0, 10) !== fechaTexto
        || fechaTexto <= fechaRestaurante()) {
        throw Object.assign(new Error("La reserva debe ser para una fecha futura válida"), { status: 400 });
    }
    const config = await obtenerConfiguracion(db);
    if (!config.hora_inicio || !config.hora_fin || !config.intervalo_minutos) {
        throw Object.assign(new Error("El horario de reservas aún no fue configurado por Administración"), { status: 503 });
    }
    const horaTexto = String(hora || "");
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaTexto);
    if (!match) throw Object.assign(new Error("La hora de llegada no es válida"), { status: 400 });
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    const start = Number(String(config.hora_inicio).slice(0, 5).slice(0, 2)) * 60
        + Number(String(config.hora_inicio).slice(3, 5));
    const end = Number(String(config.hora_fin).slice(0, 5).slice(0, 2)) * 60
        + Number(String(config.hora_fin).slice(3, 5));
    if (minutes < start || minutes > end || (minutes - start) % Number(config.intervalo_minutos) !== 0) {
        throw Object.assign(new Error("La hora no corresponde a un intervalo permitido de llegada"), { status: 400 });
    }
    return config;
};

const validarContacto = ({ nombre, celular, correo }) => {
    const nombreLimpio = String(nombre || "").trim();
    const celularLimpio = String(celular || "").trim();
    const correoLimpio = String(correo || "").trim();
    if (!nombreLimpio || nombreLimpio.length > 180 || !celularLimpio || celularLimpio.length > 30) {
        throw Object.assign(new Error("El nombre y un teléfono válido son obligatorios"), { status: 400 });
    }
    if (correoLimpio && (correoLimpio.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio))) {
        throw Object.assign(new Error("El correo electrónico no es válido"), { status: 400 });
    }
    return { nombre: nombreLimpio, celular: celularLimpio, correo: correoLimpio || null };
};

const normalizarItems = (items) => {
    if (!Array.isArray(items) || !items.length) {
        throw Object.assign(new Error("Debe seleccionar al menos un plato"), { status: 400 });
    }
    const cantidades = new Map();
    for (const item of items) {
        const idProducto = Number(item.id_producto);
        const cantidad = Number(item.cantidad);
        if (!Number.isSafeInteger(idProducto) || idProducto < 1
            || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) {
            throw Object.assign(new Error("Los platos o sus cantidades no son válidos"), { status: 400 });
        }
        const total = (cantidades.get(idProducto) || 0) + cantidad;
        if (total > 2147483647) throw Object.assign(new Error("La cantidad solicitada supera el límite permitido"), { status: 400 });
        cantidades.set(idProducto, total);
    }
    return [...cantidades].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
};

const menuDetalles = async (fecha, items, db, preciosConservados = new Map(), cantidadesLiberables = new Map()) => {
    const menu = await produccionModel.listarMenu(fecha, db, true);
    return items.map(({ id_producto, cantidad }) => {
        const plato = menu.find((producto) => Number(producto.id_producto) === id_producto);
        const disponible = Number(plato?.stock || 0) + Number(cantidadesLiberables.get(id_producto) || 0);
        if (!plato || disponible < cantidad) {
            throw Object.assign(new Error(`Disponibilidad insuficiente para el producto ${id_producto}`), { status: 409 });
        }
        return {
            id_producto,
            cantidad,
            precio_unitario: preciosConservados.has(id_producto)
                ? preciosConservados.get(id_producto).precio_unitario
                : Number(plato.precio),
            nombre_producto: preciosConservados.get(id_producto)?.nombre_producto || plato.nombre,
        };
    });
};

const guardarRevision = async (db, idReserva, version, idUsuario, origen, accion, datos) => {
    await db.query(
        `INSERT INTO revision_reserva_plato
         (id_reserva,version,id_usuario,origen,accion,datos)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [idReserva, version, idUsuario, origen, accion, JSON.stringify(datos)],
    );
};

const crear = async (datos = {}) => {
    const cliente = validarContacto({ nombre: datos.nombre, celular: datos.celular, correo: datos.correo });
    const items = normalizarItems(datos.items);
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    const token = datos.access_token || crypto.randomBytes(32).toString("base64url");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(solicitudId))) {
        throw Object.assign(new Error("El identificador de solicitud no es válido"), { status: 400 });
    }
    if (typeof token !== "string" || token.length < 32 || token.length > 200) {
        throw Object.assign(new Error("El token de acceso no es válido"), { status: 400 });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const duplicate = await client.query(
            `SELECT id_reserva,codigo,token_hash,nombre_cliente,celular,correo,fecha,hora,observaciones,estado,version,creada_en
             FROM reserva_plato WHERE solicitud_id=$1`,
            [solicitudId],
        );
        if (duplicate.rowCount) {
            if (duplicate.rows[0].token_hash !== tokenHash(token)) {
                throw Object.assign(new Error("El identificador de solicitud ya fue utilizado"), { status: 409 });
            }
            const reserva = { ...duplicate.rows[0] };
            delete reserva.token_hash;
            await client.query("COMMIT");
            return { reserva, acceso: { codigo: reserva.codigo, token }, duplicate: true };
        }
        await validarFechaHora(datos.fecha, datos.hora, client);
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${datos.fecha}`]);
        const detalles = await menuDetalles(datos.fecha, items, client);
        const codigo = crypto.randomBytes(12).toString("base64url").toUpperCase();
        const observaciones = String(datos.observaciones || "").trim();
        if (observaciones.length > 2000) throw Object.assign(new Error("Las observaciones no deben superar 2000 caracteres"), { status: 400 });
        const clienteExistente = await client.query(
            `SELECT id_cliente FROM cliente
             WHERE telefono=$1 AND UPPER(estado::text) NOT IN ('INACTIVO','FALSE')
             ORDER BY id_cliente LIMIT 1 FOR SHARE`,
            [cliente.celular],
        );
        const reservaResult = await client.query(
            `INSERT INTO reserva_plato
             (codigo,token_hash,solicitud_id,id_cliente,nombre_cliente,celular,correo,fecha,hora,observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING id_reserva,codigo,nombre_cliente,celular,correo,fecha,hora,observaciones,estado,version,creada_en`,
            [
                codigo,
                tokenHash(token),
                solicitudId,
                clienteExistente.rows[0]?.id_cliente || null,
                cliente.nombre,
                cliente.celular,
                cliente.correo,
                datos.fecha,
                datos.hora,
                observaciones || null,
            ],
        );
        const reserva = reservaResult.rows[0];
        for (const detalle of detalles) {
            await client.query(
                `INSERT INTO detalle_reserva_plato
                 (id_reserva,id_producto,cantidad,precio_unitario,nombre_producto)
                 VALUES ($1,$2,$3,$4,$5)`,
                [reserva.id_reserva, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.nombre_producto],
            );
        }
        const snapshot = { ...reserva, detalles };
        await guardarRevision(client, reserva.id_reserva, 1, null, "CLIENTE", "CREACION", snapshot);
        await client.query(
            `INSERT INTO historial_reserva_plato
             (id_reserva,estado_anterior,estado_nuevo,accion,observaciones)
             VALUES ($1,NULL,'PENDIENTE','CREACION',$2)`,
            [reserva.id_reserva, "Reserva pública creada"],
        );
        await client.query("COMMIT");
        return {
            reserva,
            acceso: { codigo, token },
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "reserva_plato_solicitud_id_key") {
            const existing = await client.query(
                `SELECT id_reserva,codigo,token_hash,nombre_cliente,celular,correo,fecha,hora,observaciones,estado,version,creada_en
                 FROM reserva_plato WHERE solicitud_id=$1`,
                [datos.solicitud_id],
            );
            if (existing.rowCount) {
                if (!datos.access_token || existing.rows[0].token_hash !== tokenHash(datos.access_token)) {
                    throw Object.assign(new Error("Esta solicitud ya fue recibida con otro token"), { status: 409 });
                }
                const reserva = { ...existing.rows[0] };
                delete reserva.token_hash;
                return {
                    reserva,
                    acceso: { codigo: existing.rows[0].codigo, token: datos.access_token },
                    duplicate: true,
                };
            }
            throw Object.assign(new Error("Esta solicitud ya fue recibida; consulta el enlace generado previamente"), { status: 409 });
        }
        throw error;
    } finally {
        client.release();
    }
};

const obtenerPorAcceso = async (codigo, token) => {
    await assertReady(pool);
    if (!codigo || !token) throw Object.assign(new Error("Se requiere el código y el token privado"), { status: 400 });
    const { rows } = await pool.query(
        `SELECT r.id_reserva,r.codigo,r.nombre_cliente,r.celular,r.correo,r.fecha,r.hora,
                r.observaciones,r.estado,r.version,r.creada_en,r.actualizada_en
         FROM reserva_plato r
         WHERE r.codigo=$1 AND r.token_hash=$2
           AND r.codigo_revocado_en IS NULL
           AND (r.codigo_expira_en IS NULL OR r.codigo_expira_en>NOW())`,
        [String(codigo).trim().toUpperCase(), tokenHash(token)],
    );
    if (!rows[0]) throw Object.assign(new Error("Reserva no encontrada o enlace vencido"), { status: 404 });
    const [detalles, revisiones] = await Promise.all([
        pool.query(
            `SELECT id_producto,cantidad,precio_unitario,nombre_producto
             FROM detalle_reserva_plato WHERE id_reserva=$1 ORDER BY id_detalle`,
            [rows[0].id_reserva],
        ),
        pool.query(
            `SELECT version,origen,accion,datos,creada_en
             FROM revision_reserva_plato WHERE id_reserva=$1 ORDER BY version`,
            [rows[0].id_reserva],
        ),
    ]);
    return { ...rows[0], detalles: detalles.rows, revisiones: revisiones.rows };
};

const modificar = async (codigo, token, datos = {}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const reservaResult = await client.query(
            `SELECT * FROM reserva_plato
             WHERE codigo=$1 AND token_hash=$2 AND codigo_revocado_en IS NULL
               AND (codigo_expira_en IS NULL OR codigo_expira_en>NOW())
             FOR UPDATE`,
            [String(codigo).trim().toUpperCase(), tokenHash(token)],
        );
        if (!reservaResult.rowCount) throw Object.assign(new Error("Reserva no encontrada o enlace vencido"), { status: 404 });
        const actual = reservaResult.rows[0];
        if (actual.estado !== "PENDIENTE" || actual.id_pedido) {
            throw Object.assign(new Error("Solo se pueden modificar reservas pendientes que aún no fueron recibidas"), { status: 409 });
        }
        const fecha = datos.fecha === undefined ? String(actual.fecha).slice(0, 10) : String(datos.fecha);
        const hora = datos.hora === undefined ? String(actual.hora).slice(0, 5) : String(datos.hora);
        const contacto = validarContacto({
            nombre: datos.nombre === undefined ? actual.nombre_cliente : datos.nombre,
            celular: datos.celular === undefined ? actual.celular : datos.celular,
            correo: datos.correo === undefined ? actual.correo : datos.correo,
        });
        const detalleActual = await client.query(
            `SELECT id_producto,cantidad,precio_unitario,nombre_producto
             FROM detalle_reserva_plato WHERE id_reserva=$1 FOR UPDATE`,
            [actual.id_reserva],
        );
        const actualesPorProducto = new Map(detalleActual.rows.map((item) => [Number(item.id_producto), item]));
        const items = datos.items === undefined
            ? detalleActual.rows.map((item) => ({ id_producto: Number(item.id_producto), cantidad: Number(item.cantidad) }))
            : normalizarItems(datos.items);

        const fechasBloqueo = [...new Set([String(actual.fecha).slice(0, 10), fecha])].sort();
        for (const fechaBloqueo of fechasBloqueo) {
            await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fechaBloqueo}`]);
        }
        await validarFechaHora(fecha, hora, client);
        const preciosConservados = new Map(items
            .filter((item) => actualesPorProducto.has(item.id_producto))
            .map((item) => [item.id_producto, actualesPorProducto.get(item.id_producto)]));
        const cantidadesLiberables = String(actual.fecha).slice(0, 10) === fecha
            ? new Map(detalleActual.rows.map((item) => [Number(item.id_producto), Number(item.cantidad)]))
            : new Map();
        const detalles = await menuDetalles(fecha, items, client, preciosConservados, cantidadesLiberables);
        const version = Number(actual.version) + 1;
        const observaciones = datos.observaciones === undefined
            ? actual.observaciones
            : String(datos.observaciones || "").trim() || null;
        await client.query(
            `UPDATE reserva_plato
             SET nombre_cliente=$1,celular=$2,correo=$3,fecha=$4,hora=$5,observaciones=$6,
                 version=$7,actualizada_en=NOW()
             WHERE id_reserva=$8`,
            [contacto.nombre, contacto.celular, contacto.correo, fecha, hora, observaciones, version, actual.id_reserva],
        );
        await client.query("DELETE FROM detalle_reserva_plato WHERE id_reserva=$1", [actual.id_reserva]);
        for (const detalle of detalles) {
            await client.query(
                `INSERT INTO detalle_reserva_plato
                 (id_reserva,id_producto,cantidad,precio_unitario,nombre_producto)
                 VALUES ($1,$2,$3,$4,$5)`,
                [actual.id_reserva, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.nombre_producto],
            );
        }
        const snapshot = { nombre_cliente: contacto.nombre, celular: contacto.celular, correo: contacto.correo, fecha, hora, observaciones, detalles };
        await guardarRevision(client, actual.id_reserva, version, null, "CLIENTE", "MODIFICACION", snapshot);
        await client.query(
            `INSERT INTO historial_reserva_plato
             (id_reserva,estado_anterior,estado_nuevo,accion,observaciones)
             VALUES ($1,$2,$2,'MODIFICACION',$3)`,
            [actual.id_reserva, actual.estado, `Versión ${version}`],
        );
        await client.query("COMMIT");
        return obtenerPorAcceso(codigo, token);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const cancelar = async (codigo, token) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const actual = await client.query(
            `SELECT id_reserva,fecha,estado,version FROM reserva_plato
             WHERE codigo=$1 AND token_hash=$2 AND codigo_revocado_en IS NULL
               AND (codigo_expira_en IS NULL OR codigo_expira_en>NOW())
             FOR UPDATE`,
            [String(codigo).trim().toUpperCase(), tokenHash(token)],
        );
        if (!actual.rowCount) throw Object.assign(new Error("Reserva no encontrada o enlace vencido"), { status: 404 });
        if (actual.rows[0].estado !== "PENDIENTE") throw Object.assign(new Error("La reserva ya no se puede cancelar desde el enlace privado"), { status: 409 });
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${String(actual.rows[0].fecha).slice(0, 10)}`]);
        const version = Number(actual.rows[0].version) + 1;
        await client.query(
            `UPDATE reserva_plato SET estado='CANCELADA',version=$1,actualizada_en=NOW()
             WHERE id_reserva=$2`,
            [version, actual.rows[0].id_reserva],
        );
        await guardarRevision(client, actual.rows[0].id_reserva, version, null, "CLIENTE", "CANCELACION", { estado: "CANCELADA" });
        await client.query(
            `INSERT INTO historial_reserva_plato
             (id_reserva,estado_anterior,estado_nuevo,accion,observaciones)
             VALUES ($1,'PENDIENTE','CANCELADA','CANCELACION','Cancelación por enlace privado')`,
            [actual.rows[0].id_reserva],
        );
        await client.query("COMMIT");
        return { id_reserva: Number(actual.rows[0].id_reserva), estado: "CANCELADA", version };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const listarInterno = async ({ fecha, estado, buscar } = {}) => {
    await assertReady(pool);
    const estadoFiltro = estado ? String(estado).trim().toUpperCase() : null;
    if (estadoFiltro && !estados.has(estadoFiltro)) throw Object.assign(new Error("Estado de reserva no válido"), { status: 400 });
    const { rows } = await pool.query(
        `SELECT r.id_reserva,r.codigo,r.nombre_cliente,r.celular,r.correo,r.fecha,r.hora,
                r.observaciones,r.estado,r.version,r.id_pedido,r.creada_en,
                r.no_presentada_en IS NULL AND r.estado='PENDIENTE'
                  AND ((r.fecha+r.hora) AT TIME ZONE c.zona_horaria)
                      + make_interval(mins=>c.tolerancia_minutos) <= NOW() AS requiere_revision_inasistencia,
                COALESCE(json_agg(json_build_object(
                    'id_producto',d.id_producto,'nombre',d.nombre_producto,
                    'cantidad',d.cantidad,'precio',d.precio_unitario
                )) FILTER (WHERE d.id_detalle IS NOT NULL),'[]') AS detalle,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'version',rv.version,'accion',rv.accion,'origen',rv.origen,
                        'datos',rv.datos,'fecha',rv.creada_en
                    ) ORDER BY rv.version)
                    FROM revision_reserva_plato rv WHERE rv.id_reserva=r.id_reserva
                ),'[]') AS revisiones,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'accion',hr.accion,'estado_anterior',hr.estado_anterior,
                        'estado_nuevo',hr.estado_nuevo,'fecha',hr.fecha,
                        'usuario',u.usuario,'observaciones',hr.observaciones
                    ) ORDER BY hr.fecha,hr.id_historial)
                    FROM historial_reserva_plato hr
                    LEFT JOIN usuario u ON u.id_usuario=hr.id_usuario
                    WHERE hr.id_reserva=r.id_reserva
                ),'[]') AS historial
         FROM reserva_plato r
         CROSS JOIN configuracion_reserva_platos c
         LEFT JOIN detalle_reserva_plato d ON d.id_reserva=r.id_reserva
         WHERE ($1::date IS NULL OR r.fecha=$1::date)
           AND ($2::text IS NULL OR r.estado=$2)
           AND ($3::text IS NULL OR r.codigo ILIKE '%'||$3||'%'
                OR r.nombre_cliente ILIKE '%'||$3||'%' OR r.celular ILIKE '%'||$3||'%')
         GROUP BY r.id_reserva,c.zona_horaria,c.tolerancia_minutos
         ORDER BY r.fecha,r.hora,r.id_reserva`,
        [fecha || null, estadoFiltro, buscar ? String(buscar).trim() : null],
    );
    return rows;
};

const recibir = async (idReserva, idUsuario, idAtencion = null) => {
    idReserva = validarId(idReserva, "reserva");
    if (idAtencion !== null) idAtencion = validarId(idAtencion, "atención");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const reservaResult = await client.query(
            "SELECT * FROM reserva_plato WHERE id_reserva=$1 FOR UPDATE",
            [idReserva],
        );
        if (!reservaResult.rowCount) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
        const reserva = reservaResult.rows[0];
        if (reserva.estado !== "PENDIENTE" || reserva.id_pedido) {
            throw Object.assign(new Error("La reserva no está pendiente de recepción"), { status: 409 });
        }
        if (String(reserva.fecha).slice(0, 10) !== fechaRestaurante()) {
            throw Object.assign(new Error("La reserva solo puede recibirse el día programado"), { status: 409 });
        }
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${String(reserva.fecha).slice(0, 10)}`]);
        if (idAtencion !== null) {
            const atencion = await client.query(
                "SELECT estado FROM atencion_mesa WHERE id_atencion=$1 FOR UPDATE",
                [idAtencion],
            );
            if (!atencion.rowCount || atencion.rows[0].estado !== "ABIERTA") {
                throw Object.assign(new Error("La atención seleccionada no existe o está cerrada"), { status: 409 });
            }
        }
        const { rows: detalles } = await client.query(
            `SELECT id_producto,cantidad,precio_unitario,nombre_producto
             FROM detalle_reserva_plato WHERE id_reserva=$1 ORDER BY id_detalle FOR UPDATE`,
            [idReserva],
        );
        if (!detalles.length) throw Object.assign(new Error("La reserva no tiene platos"), { status: 409 });

        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`cliente-telefono:${reserva.celular}`]);
        let clienteResult = await client.query(
            `SELECT id_cliente,tipo_cliente FROM cliente
             WHERE telefono=$1 AND UPPER(estado::text) NOT IN ('INACTIVO','FALSE')
             ORDER BY id_cliente LIMIT 1 FOR UPDATE`,
            [reserva.celular],
        );
        if (!clienteResult.rowCount) {
            clienteResult = await client.query(
                `INSERT INTO cliente (nombre,telefono,tipo_cliente,estado)
                 VALUES ($1,$2,'EVENTUAL',TRUE)
                 RETURNING id_cliente,tipo_cliente`,
                [reserva.nombre_cliente, reserva.celular],
            );
        }
        const total = detalles.reduce((sum, item) => sum + Number(item.precio_unitario) * Number(item.cantidad), 0);
        const pedido = await client.query(
            `INSERT INTO pedido
             (id_cliente,id_usuario,fecha,tipo_cliente,estado,total,observaciones,pagado${idAtencion === null ? "" : ",id_atencion"})
             VALUES ($1,$2,NOW(),$3,'PENDIENTE',$4,$5,FALSE${idAtencion === null ? "" : ",$6"})
             RETURNING id_pedido`,
            idAtencion === null
                ? [clienteResult.rows[0].id_cliente, idUsuario, clienteResult.rows[0].tipo_cliente, total, reserva.observaciones]
                : [clienteResult.rows[0].id_cliente, idUsuario, clienteResult.rows[0].tipo_cliente, total, reserva.observaciones, idAtencion],
        );
        for (const detalle of detalles) {
            await client.query(
                `INSERT INTO detalle_pedido (id_pedido,id_producto,cantidad,precio,subtotal)
                 VALUES ($1,$2,$3,$4,$5)`,
                [pedido.rows[0].id_pedido, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, Number(detalle.precio_unitario) * Number(detalle.cantidad)],
            );
        }
        await client.query(
            `UPDATE reserva_plato
             SET estado='RECIBIDA',id_pedido=$1,recibida_en=NOW(),recibida_por=$2,
                 actualizada_en=NOW()
             WHERE id_reserva=$3`,
            [pedido.rows[0].id_pedido, idUsuario, idReserva],
        );
        await client.query(
            `INSERT INTO historial_reserva_plato
             (id_reserva,id_usuario,estado_anterior,estado_nuevo,accion,observaciones)
             VALUES ($1,$2,'PENDIENTE','RECIBIDA','RECEPCION',$3)`,
            [idReserva, idUsuario, `Pedido #${pedido.rows[0].id_pedido} creado`],
        );
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,'RECIBIR','reserva_plato',$2,$3::jsonb)`,
            [idUsuario, String(idReserva), JSON.stringify({ id_pedido: pedido.rows[0].id_pedido, total })],
        );
        await client.query("COMMIT");
        return { id_reserva: Number(idReserva), id_pedido: pedido.rows[0].id_pedido, total, estado: "RECIBIDA" };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "42P01" || error.code === "42703") {
            throw Object.assign(new Error("La recepción requiere aplicar la migración local preparada"), { status: 503 });
        }
        throw error;
    } finally {
        client.release();
    }
};

const marcarNoPresentada = async (idReserva, idUsuario) => {
    idReserva = validarId(idReserva, "reserva");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const result = await client.query(
            `SELECT r.id_reserva,r.fecha,r.hora,r.estado,c.zona_horaria,c.tolerancia_minutos
             FROM reserva_plato r
             CROSS JOIN configuracion_reserva_platos c
             WHERE r.id_reserva=$1 FOR UPDATE OF r`,
            [idReserva],
        );
        if (!result.rowCount) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
        const reserva = result.rows[0];
        if (reserva.estado !== "PENDIENTE") throw Object.assign(new Error("Solo una reserva pendiente puede marcarse como no presentada"), { status: 409 });
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${String(reserva.fecha).slice(0, 10)}`]);
        const vencida = await client.query(
            `SELECT ($1::date+$2::time) AT TIME ZONE $3
                    + make_interval(mins=>$4) <= NOW() AS vencida`,
            [String(reserva.fecha).slice(0, 10), reserva.hora, reserva.zona_horaria, reserva.tolerancia_minutos],
        );
        if (!vencida.rows[0].vencida) throw Object.assign(new Error("Aún no se cumple la tolerancia de llegada configurada"), { status: 409 });
        const versionResult = await client.query(
            `UPDATE reserva_plato
             SET estado='NO_PRESENTADA',no_presentada_en=NOW(),no_presentada_por=$1,
                 version=version+1,actualizada_en=NOW()
             WHERE id_reserva=$2
             RETURNING version`,
            [idUsuario, idReserva],
        );
        await guardarRevision(client, idReserva, versionResult.rows[0].version, idUsuario, "INTERNO", "NO_PRESENTADA", {
            usuario: idUsuario,
            confirmada_en: new Date().toISOString(),
        });
        await client.query(
            `INSERT INTO historial_reserva_plato
             (id_reserva,id_usuario,estado_anterior,estado_nuevo,accion,observaciones)
             VALUES ($1,$2,'PENDIENTE','NO_PRESENTADA','CONFIRMAR_INASISTENCIA','Confirmación manual de Caja')`,
            [idReserva, idUsuario],
        );
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,'NO_PRESENTADA','reserva_plato',$2,$3::jsonb)`,
            [idUsuario, String(idReserva), JSON.stringify({ version: versionResult.rows[0].version })],
        );
        await client.query("COMMIT");
        return { id_reserva: Number(idReserva), estado: "NO_PRESENTADA", stock_liberado: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const registrarImpresion = async (idReserva, idUsuario, { tipo = "NOVEDAD", reimpresion = false, solicitud_id } = {}) => {
    idReserva = validarId(idReserva, "reserva");
    const solicitudId = solicitud_id || crypto.randomUUID();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const reservaResult = await client.query(
            `SELECT id_reserva,codigo,nombre_cliente,celular,fecha,hora,observaciones,estado,version
             FROM reserva_plato WHERE id_reserva=$1 FOR UPDATE`,
            [idReserva],
        );
        if (!reservaResult.rowCount) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
        if (!["NOVEDAD", "REIMPRESION"].includes(tipo)) throw Object.assign(new Error("Tipo de impresión no válido"), { status: 400 });
        const existentes = await client.query(
            `SELECT id_impresion FROM impresion_reserva_plato WHERE solicitud_id=$1`,
            [solicitudId],
        );
        if (existentes.rowCount) {
            await client.query("COMMIT");
            return { duplicate: true, id_impresion: existentes.rows[0].id_impresion };
        }
        const detalles = await client.query(
            `SELECT nombre_producto,cantidad,precio_unitario
             FROM detalle_reserva_plato WHERE id_reserva=$1 ORDER BY id_detalle`,
            [idReserva],
        );
        const reprint = reimpresion || tipo === "REIMPRESION";
        const insercion = await client.query(
            `INSERT INTO impresion_reserva_plato
             (id_reserva,id_usuario,tipo,version,reimpresion,solicitud_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING id_impresion,creada_en`,
            [idReserva, idUsuario, reprint ? "REIMPRESION" : "NOVEDAD", reservaResult.rows[0].version, reprint, solicitudId],
        );
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,$2,'impresion_reserva_plato',$3,$4::jsonb)`,
            [idUsuario, reprint ? "REIMPRIMIR" : "IMPRIMIR_NOVEDAD", String(insercion.rows[0].id_impresion), JSON.stringify({ id_reserva: Number(idReserva), version: reservaResult.rows[0].version, solicitud_id: solicitudId })],
        );
        await client.query("COMMIT");
        return {
            ...reservaResult.rows[0],
            detalle: detalles.rows,
            impresion: insercion.rows[0],
            solicitud_id: solicitudId,
            reimpresion: reprint,
            mensaje: "Solicitud de impresión registrada; el navegador no confirma la impresión física.",
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const actualizarConfiguracion = async (datos, idUsuario) => {
    const { hora_inicio, hora_fin, intervalo_minutos, tolerancia_minutos } = datos;
    const horaValida = (valor) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ""));
    if (!horaValida(hora_inicio) || !horaValida(hora_fin) || hora_inicio >= hora_fin) {
        throw Object.assign(new Error("El horario configurado no es válido"), { status: 400 });
    }
    const intervalo = Number(intervalo_minutos);
    const tolerancia = Number(tolerancia_minutos);
    if (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 32767
        || !Number.isInteger(tolerancia) || tolerancia < 0 || tolerancia > 32767) {
        throw Object.assign(new Error("Los intervalos o la tolerancia no son válidos"), { status: 400 });
    }
    await assertReady(pool);
    const { rows } = await pool.query(
        `UPDATE configuracion_reserva_platos
         SET hora_inicio=$1::time,hora_fin=$2::time,intervalo_minutos=$3,
             tolerancia_minutos=$4,actualizado_por=$5,actualizado_en=NOW()
         WHERE id_configuracion=1
         RETURNING hora_inicio,hora_fin,intervalo_minutos,tolerancia_minutos,zona_horaria,actualizado_en`,
        [hora_inicio, hora_fin, intervalo, tolerancia, idUsuario],
    );
    return rows[0];
};

export default {
    crear,
    obtenerPorAcceso,
    modificar,
    cancelar,
    listarInterno,
    recibir,
    marcarNoPresentada,
    registrarImpresion,
    obtenerConfiguracion,
    actualizarConfiguracion,
};
