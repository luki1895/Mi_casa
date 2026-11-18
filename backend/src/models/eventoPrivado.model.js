import crypto from "node:crypto";
import pool from "../config/db.js";
import operacionesModel from "./operaciones.model.js";

const estados = new Set([
    "PENDIENTE_REVISION",
    "REQUIERE_CAMBIOS",
    "APROBADO_PENDIENTE_ANTICIPO",
    "CONFIRMADO",
    "RECHAZADO",
    "CANCELADO",
    "REALIZADO",
]);
const tokenHash = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
const codigoAcceso = (codigo) => String(codigo || "").trim().toUpperCase();
const esUuid = (valor) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor));
const errorHttp = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });
const validarId = (id, recurso) => {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero < 1) throw errorHttp(`El identificador de ${recurso} no es válido`);
    return numero;
};
const dineroCentavos = (valor, etiqueta = "El importe") => {
    const numero = Number(valor);
    const centavos = Math.round(numero * 100);
    if (!Number.isFinite(numero) || numero < 0 || !Number.isSafeInteger(centavos)
        || centavos > 999999999999 || Math.abs(numero * 100 - centavos) > 1e-8) {
        throw errorHttp(`${etiqueta} debe ser no negativo, válido y tener como máximo dos decimales`);
    }
    return centavos;
};

const assertReady = async (db = pool) => {
    const { rows } = await db.query(
        `SELECT to_regclass('public.evento_privado') IS NOT NULL
            AND to_regclass('public.detalle_evento_privado') IS NOT NULL
            AND to_regclass('public.horario_evento_privado') IS NOT NULL
            AND to_regclass('public.pago_evento') IS NOT NULL
            AND to_regclass('public.cancelacion_evento_privado') IS NOT NULL AS ready`,
    );
    if (!rows[0].ready) throw errorHttp("Los eventos privados requieren aplicar la migración 009 preparada", 503);
};

const obtenerSiguienteVersion = async (db, idEvento) => {
    const { rows } = await db.query(
        `SELECT COUNT(*)::int + 1 AS version
         FROM historial_evento_privado
         WHERE id_evento=$1
           AND accion IN ('SOLICITUD_PUBLICA','REVISION_ADMIN','RESPUESTA_CLIENTE')`,
        [idEvento],
    );
    return rows[0].version;
};

const resumenSolicitud = (evento) => ({
    nombre_responsable: evento.nombre_responsable,
    celular: evento.celular,
    correo: evento.correo,
    tipo_evento: evento.tipo_evento,
    fecha: String(evento.fecha).slice(0, 10),
    hora_inicio: String(evento.hora_inicio).slice(0, 5),
    hora_fin: String(evento.hora_fin).slice(0, 5),
    invitados: evento.invitados,
    decoracion: evento.decoracion,
    observaciones: evento.observaciones,
});

const normalizarSolicitud = (datos = {}) => {
    const nombre = String(datos.nombre_responsable || "").trim();
    const celular = String(datos.celular || "").trim();
    const correo = String(datos.correo || "").trim();
    const tipo = String(datos.tipo_evento || "").trim();
    const decoracion = String(datos.decoracion || "CONSULTAR").trim().toUpperCase();
    const invitados = Number(datos.invitados);
    const horaInicio = String(datos.hora_inicio || "");
    const horaFin = String(datos.hora_fin || "");
    const detalle = datos.detalle;
    if (!nombre || nombre.length > 180 || !celular || celular.length > 30) {
        throw errorHttp("El nombre del responsable y un teléfono válido son obligatorios");
    }
    if (correo && (correo.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
        throw errorHttp("El correo electrónico no es válido");
    }
    if (!tipo || tipo.length > 100) throw errorHttp("Indica el tipo de evento");
    if (!Number.isInteger(invitados) || invitados < 1 || invitados > 2147483647) {
        throw errorHttp("La cantidad de invitados debe ser un entero positivo");
    }
    if (!["SI", "NO", "CONSULTAR"].includes(decoracion)) throw errorHttp("La opción de decoración no es válida");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio)
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin)
        || horaInicio >= horaFin) {
        throw errorHttp("El horario del evento no es válido");
    }
    if (!Array.isArray(detalle) || !detalle.length) throw errorHttp("Describe al menos una preparación o servicio solicitado");
    const normalizado = detalle.map((item) => {
        const preparacion = String(item.preparacion || "").trim();
        const cantidad = Number(item.cantidad_personas);
        if (!preparacion || preparacion.length > 240 || !Number.isInteger(cantidad)
            || cantidad < 1 || cantidad > 2147483647) {
            throw errorHttp("Cada preparación requiere una descripción y una cantidad válida");
        }
        return { preparacion, cantidad_personas: cantidad };
    });
    const observaciones = String(datos.observaciones || "").trim();
    if (observaciones.length > 4000) throw errorHttp("Las observaciones no deben superar 4000 caracteres");
    return {
        nombre_responsable: nombre,
        celular,
        correo: correo || null,
        tipo_evento: tipo,
        fecha: String(datos.fecha || ""),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        invitados,
        decoracion,
        observaciones: observaciones || null,
        detalle: normalizado,
    };
};

const validarFechaYHorario = async (db, evento) => {
    const fecha = String(evento.fecha).slice(0, 10);
    const parsedFecha = new Date(`${fecha}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)
        || Number.isNaN(parsedFecha.getTime())
        || parsedFecha.toISOString().slice(0, 10) !== fecha) {
        throw errorHttp("La fecha del evento no es válida");
    }
    const { rows } = await db.query(
        `SELECT
            (($1::date + $2::time) AT TIME ZONE 'America/La_Paz') >= NOW() + INTERVAL '24 hours' AS anticipacion_valida,
            EXISTS (
                SELECT 1 FROM horario_evento_privado h
                WHERE h.activo IS TRUE
                  AND h.dia_semana = EXTRACT(DOW FROM $1::date)::smallint
                  AND $2::time >= h.hora_inicio
                  AND $3::time <= h.hora_fin
            ) AS horario_valido`,
        [fecha, evento.hora_inicio, evento.hora_fin],
    );
    if (!rows[0].anticipacion_valida) throw errorHttp("Los eventos deben solicitarse con al menos 24 horas de anticipación", 409);
    if (!rows[0].horario_valido) throw errorHttp("El horario solicitado no está habilitado por Administración", 409);
};

const validarHorarioEstructural = (evento) => {
    const fecha = String(evento.fecha || "").slice(0, 10);
    const parsedFecha = new Date(`${fecha}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)
        || Number.isNaN(parsedFecha.getTime())
        || parsedFecha.toISOString().slice(0, 10) !== fecha
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(evento.hora_inicio || "").slice(0, 5))
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(evento.hora_fin || "").slice(0, 5))
        || String(evento.hora_inicio).slice(0, 5) >= String(evento.hora_fin).slice(0, 5)) {
        throw errorHttp("La fecha y el horario del evento no son válidos");
    }
};

const validarSinConflicto = async (db, evento, idExcluir = null) => {
    const { rows } = await db.query(
        `SELECT codigo
         FROM evento_privado
         WHERE fecha=$1::date
           AND estado IN ('APROBADO_PENDIENTE_ANTICIPO','CONFIRMADO','REALIZADO')
           AND hora_inicio < $3::time
           AND hora_fin > $2::time
           AND ($4::bigint IS NULL OR id_evento<>$4::bigint)
         LIMIT 1`,
        [String(evento.fecha).slice(0, 10), evento.hora_inicio, evento.hora_fin, idExcluir],
    );
    if (rows[0]) throw errorHttp(`El horario se cruza con el evento ${rows[0].codigo}`, 409);
};

const registrarHistorial = async (db, { idEvento, idUsuario = null, accion, anterior = null, nuevo = null, detalle = {} }) => {
    await db.query(
        `INSERT INTO historial_evento_privado
         (id_evento,id_usuario,accion,estado_anterior,estado_nuevo,detalle)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [idEvento, idUsuario, accion, anterior, nuevo, JSON.stringify(detalle)],
    );
};

const crear = async (datos = {}) => {
    const evento = normalizarSolicitud(datos);
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de solicitud no es válido");
    const token = datos.access_token || crypto.randomBytes(32).toString("base64url");
    if (typeof token !== "string" || token.length < 32 || token.length > 200) {
        throw errorHttp("El token de acceso no es válido");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const duplicate = await client.query(
            `SELECT id_evento,codigo,token_hash,nombre_responsable,celular,correo,tipo_evento,fecha,
                    hora_inicio,hora_fin,invitados,decoracion,observaciones,estado,creado_en
             FROM evento_privado WHERE solicitud_id=$1`,
            [solicitudId],
        );
        if (duplicate.rowCount) {
            if (duplicate.rows[0].token_hash !== tokenHash(token)) {
                throw errorHttp("El identificador de solicitud ya fue utilizado", 409);
            }
            const eventoExistente = { ...duplicate.rows[0] };
            delete eventoExistente.token_hash;
            await client.query("COMMIT");
            return {
                evento: eventoExistente,
                acceso: { codigo: eventoExistente.codigo, token },
                duplicate: true,
            };
        }
        await validarFechaYHorario(client, evento);
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`evento:${evento.fecha}`]);
        const codigo = crypto.randomBytes(12).toString("base64url").toUpperCase();
        const inserted = await client.query(
            `INSERT INTO evento_privado
             (codigo,token_hash,nombre_responsable,celular,correo,tipo_evento,fecha,hora_inicio,hora_fin,
              invitados,decoracion,observaciones,solicitud_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id_evento,codigo,nombre_responsable,celular,correo,tipo_evento,fecha,
                       hora_inicio,hora_fin,invitados,decoracion,observaciones,estado,creado_en`,
            [
                codigo, tokenHash(token), evento.nombre_responsable, evento.celular, evento.correo,
                evento.tipo_evento, evento.fecha, evento.hora_inicio, evento.hora_fin,
                evento.invitados, evento.decoracion, evento.observaciones, solicitudId,
            ],
        );
        const reserva = inserted.rows[0];
        for (const item of evento.detalle) {
            await client.query(
                `INSERT INTO detalle_evento_privado
                 (id_evento,preparacion,cantidad_personas)
                 VALUES ($1,$2,$3)`,
                [reserva.id_evento, item.preparacion, item.cantidad_personas],
            );
        }
        await registrarHistorial(client, {
            idEvento: reserva.id_evento,
            accion: "SOLICITUD_PUBLICA",
            nuevo: "PENDIENTE_REVISION",
            detalle: {
                version: 1,
                solicitud: { ...evento, solicitud_id: solicitudId },
                propuesta: null,
            },
        });
        await client.query("COMMIT");
        return { evento: reserva, acceso: { codigo, token } };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "evento_privado_solicitud_id_key") {
            const existing = await client.query(
                `SELECT id_evento,codigo,token_hash,nombre_responsable,celular,correo,tipo_evento,fecha,
                        hora_inicio,hora_fin,invitados,decoracion,observaciones,estado,creado_en
                 FROM evento_privado WHERE solicitud_id=$1`,
                [datos.solicitud_id],
            );
            if (existing.rowCount && datos.access_token
                && existing.rows[0].token_hash === tokenHash(datos.access_token)) {
                const eventoExistente = { ...existing.rows[0] };
                delete eventoExistente.token_hash;
                return {
                    evento: eventoExistente,
                    acceso: { codigo: eventoExistente.codigo, token: datos.access_token },
                    duplicate: true,
                };
            }
            throw errorHttp("Esta solicitud ya fue recibida; utiliza el enlace privado generado previamente", 409);
        }
        throw error;
    } finally {
        client.release();
    }
};

const obtenerPorAcceso = async (codigo, token) => {
    await assertReady();
    if (!token) throw errorHttp("Se requiere el token privado");
    const { rows } = await pool.query(
        `SELECT id_evento,codigo,nombre_responsable,celular,correo,tipo_evento,fecha,hora_inicio,hora_fin,
                invitados,decoracion,observaciones,estado,subtotal,costos_adicionales,total,anticipo_requerido,
                condiciones_cancelacion,creado_en,actualizado_en
         FROM evento_privado
         WHERE codigo=$1 AND token_hash=$2 AND token_revocado_en IS NULL
           AND (token_expira_en IS NULL OR token_expira_en>NOW())`,
        [codigoAcceso(codigo), tokenHash(token)],
    );
    if (!rows[0]) throw errorHttp("Evento no encontrado o enlace vencido", 404);
    const [detalle, pagos, historial, cancelaciones] = await Promise.all([
        pool.query(
            `SELECT id_detalle,id_producto,preparacion,cantidad_personas,precio_unitario,subtotal,es_adicional
             FROM detalle_evento_privado WHERE id_evento=$1 ORDER BY id_detalle`,
            [rows[0].id_evento],
        ),
        pool.query(
            `SELECT importe,metodo,estado,registrado_en,verificado_en
             FROM pago_evento WHERE id_evento=$1 ORDER BY registrado_en`,
            [rows[0].id_evento],
        ),
        pool.query(
            `SELECT accion,estado_anterior,estado_nuevo,fecha,detalle
             FROM historial_evento_privado WHERE id_evento=$1 ORDER BY fecha,id_historial`,
            [rows[0].id_evento],
        ),
        pool.query(
            `SELECT motivo,condiciones_aplicadas,monto_recibido,monto_devuelto,monto_retenido,
                    metodo_devolucion,referencia_devolucion,estado,creada_en,autorizada_en,devuelta_en
             FROM cancelacion_evento_privado WHERE id_evento=$1`,
            [rows[0].id_evento],
        ),
    ]);
    const observacionesAdmin = [...historial.rows]
        .reverse()
        .find((item) => item.accion === "REVISION_ADMIN" && item.detalle?.decision === "SOLICITAR_CAMBIOS")
        ?.detalle?.observaciones_admin || null;
    const propuestas = historial.rows
        .filter((item) => Number.isInteger(item.detalle?.version))
        .map((item) => ({
            version: item.detalle.version,
            accion: item.accion,
            fecha: item.fecha,
            solicitud: item.detalle.solicitud || null,
            propuesta: item.detalle.propuesta || null,
            observaciones_admin: item.detalle.observaciones_admin || null,
        }));
    return {
        ...rows[0],
        observaciones_admin: observacionesAdmin,
        detalle: detalle.rows,
        pagos: pagos.rows,
        historial: historial.rows.map(({ accion, estado_anterior, estado_nuevo, fecha }) => ({
            accion, estado_anterior, estado_nuevo, fecha,
        })),
        propuestas,
        cancelacion: cancelaciones.rows[0] || null,
    };
};

const cancelarPorAcceso = async (codigo, token, datos = {}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            `SELECT id_evento,estado FROM evento_privado
             WHERE codigo=$1 AND token_hash=$2 AND token_revocado_en IS NULL
               AND (token_expira_en IS NULL OR token_expira_en>NOW())
             FOR UPDATE`,
            [codigoAcceso(codigo), tokenHash(token)],
        );
        if (!rows[0]) throw errorHttp("Evento no encontrado o enlace vencido", 404);
        const cancelacionExistente = await client.query(
            "SELECT id_cancelacion,estado FROM cancelacion_evento_privado WHERE id_evento=$1",
            [rows[0].id_evento],
        );
        if (cancelacionExistente.rowCount) {
            await client.query("COMMIT");
            return { id_evento: Number(rows[0].id_evento), estado: "CANCELADO", duplicate: true };
        }
        if (!["PENDIENTE_REVISION", "REQUIERE_CAMBIOS", "APROBADO_PENDIENTE_ANTICIPO"].includes(rows[0].estado)) {
            throw errorHttp("Este evento ya no puede cancelarse mediante el enlace privado", 409);
        }
        const pagosActivos = await client.query(
            "SELECT 1 FROM pago_evento WHERE id_evento=$1 AND estado IN ('PENDIENTE','VERIFICADO') LIMIT 1",
            [rows[0].id_evento],
        );
        if (pagosActivos.rowCount) throw errorHttp("La solicitud no se puede cancelar mientras haya pagos pendientes o verificados", 409);
        const motivo = String(datos.motivo || "Cancelación solicitada por el cliente").trim();
        if (!motivo || motivo.length > 2000) throw errorHttp("El motivo de cancelación es obligatorio y no debe superar 2000 caracteres");
        const solicitudId = datos.solicitud_id || crypto.randomUUID();
        if (!esUuid(solicitudId)) throw errorHttp("El identificador de cancelación no es válido");
        await client.query(
            `INSERT INTO cancelacion_evento_privado
             (id_evento,tipo_responsable,motivo,monto_recibido,monto_devuelto,monto_retenido,
              estado,solicitud_id)
             VALUES ($1,'CLIENTE',$2,0,0,0,'SIN_DEVOLUCION',$3)`,
            [rows[0].id_evento, motivo, solicitudId],
        );
        await client.query(
            `UPDATE evento_privado SET estado='CANCELADO',actualizado_en=NOW()
             WHERE id_evento=$1`,
            [rows[0].id_evento],
        );
        await registrarHistorial(client, {
            idEvento: rows[0].id_evento,
            accion: "CANCELACION_CLIENTE",
            anterior: rows[0].estado,
            nuevo: "CANCELADO",
            detalle: { motivo, monto_recibido: 0, monto_devuelto: 0, monto_retenido: 0 },
        });
        await client.query(
            `INSERT INTO bitacora_operaciones (accion,entidad,id_entidad,detalle)
             VALUES ('CANCELAR','evento_privado',$1,$2::jsonb)`,
            [String(rows[0].id_evento), JSON.stringify({ origen: "CLIENTE", motivo })],
        );
        await client.query("COMMIT");
        return { id_evento: Number(rows[0].id_evento), estado: "CANCELADO" };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const responderSolicitud = async (codigo, token, datos = {}) => {
    if (!token) throw errorHttp("Se requiere el token privado");
    const solicitud = normalizarSolicitud(datos);
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de respuesta no es válido");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            `SELECT * FROM evento_privado
             WHERE codigo=$1 AND token_hash=$2 AND token_revocado_en IS NULL
               AND (token_expira_en IS NULL OR token_expira_en>NOW())
             FOR UPDATE`,
            [codigoAcceso(codigo), tokenHash(token)],
        );
        if (!rows[0]) throw errorHttp("Evento no encontrado o enlace vencido", 404);
        const actual = rows[0];
        const respuestaExistente = await client.query(
            `SELECT id_historial FROM historial_evento_privado
             WHERE id_evento=$1 AND accion='RESPUESTA_CLIENTE'
               AND detalle->>'solicitud_id'=$2 LIMIT 1`,
            [actual.id_evento, solicitudId],
        );
        if (respuestaExistente.rowCount) {
            await client.query("COMMIT");
            return { ...(await obtenerPorAcceso(codigo, token)), duplicate: true };
        }
        if (actual.estado !== "REQUIERE_CAMBIOS") {
            throw errorHttp("La solicitud no está esperando una respuesta del cliente", 409);
        }
        const pagosActivos = await client.query(
            "SELECT 1 FROM pago_evento WHERE id_evento=$1 AND estado IN ('PENDIENTE','VERIFICADO') LIMIT 1",
            [actual.id_evento],
        );
        if (pagosActivos.rowCount) {
            throw errorHttp("No se pueden cambiar los datos mientras exista un pago pendiente o verificado", 409);
        }
        await validarFechaYHorario(client, solicitud);
        const version = await obtenerSiguienteVersion(client, actual.id_evento);
        const propuestaAnterior = await client.query(
            `SELECT detalle->'propuesta' AS propuesta
             FROM historial_evento_privado
             WHERE id_evento=$1 AND accion='REVISION_ADMIN'
             ORDER BY fecha DESC,id_historial DESC LIMIT 1`,
            [actual.id_evento],
        );
        await client.query(
            `UPDATE evento_privado
             SET nombre_responsable=$1,celular=$2,correo=$3,tipo_evento=$4,fecha=$5,
                 hora_inicio=$6,hora_fin=$7,invitados=$8,decoracion=$9,observaciones=$10,
                 estado='PENDIENTE_REVISION',subtotal=0,costos_adicionales=0,total=0,
                 anticipo_requerido=0,actualizado_en=NOW()
             WHERE id_evento=$11`,
            [
                solicitud.nombre_responsable, solicitud.celular, solicitud.correo,
                solicitud.tipo_evento, solicitud.fecha, solicitud.hora_inicio,
                solicitud.hora_fin, solicitud.invitados, solicitud.decoracion,
                solicitud.observaciones, actual.id_evento,
            ],
        );
        await client.query("DELETE FROM detalle_evento_privado WHERE id_evento=$1", [actual.id_evento]);
        for (const item of solicitud.detalle) {
            await client.query(
                `INSERT INTO detalle_evento_privado
                 (id_evento,preparacion,cantidad_personas,precio_unitario,subtotal,es_adicional)
                 VALUES ($1,$2,$3,0,0,FALSE)`,
                [actual.id_evento, item.preparacion, item.cantidad_personas],
            );
        }
        await registrarHistorial(client, {
            idEvento: actual.id_evento,
            accion: "RESPUESTA_CLIENTE",
            anterior: actual.estado,
            nuevo: "PENDIENTE_REVISION",
            detalle: {
                version,
                solicitud_id: solicitudId,
                solicitud: { ...solicitud },
                propuesta_anterior: propuestaAnterior.rows[0]?.propuesta || null,
            },
        });
        await client.query(
            `INSERT INTO bitacora_operaciones (accion,entidad,id_entidad,detalle)
             VALUES ('RESPONDER','evento_privado',$1,$2::jsonb)`,
            [String(actual.id_evento), JSON.stringify({ origen: "CLIENTE", estado_anterior: actual.estado })],
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

const registrarPago = async (codigo, token, datos = {}) => {
    const importe = Number(datos.importe);
    const metodo = String(datos.metodo || "").trim().toUpperCase();
    const referencia = String(datos.referencia || "").trim() || null;
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    if (!Number.isFinite(importe) || importe <= 0) throw errorHttp("El importe debe ser mayor que cero");
    const importeCentavos = dineroCentavos(importe, "El importe");
    if (!["EFECTIVO", "TRANSFERENCIA", "TARJETA", "QR"].includes(metodo)) throw errorHttp("El método de pago no es válido");
    if (referencia && referencia.length > 500) throw errorHttp("La referencia no debe superar 500 caracteres");
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de solicitud de pago no es válido");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            `SELECT id_evento,estado,total,anticipo_requerido
             FROM evento_privado
             WHERE codigo=$1 AND token_hash=$2 AND token_revocado_en IS NULL
               AND (token_expira_en IS NULL OR token_expira_en>NOW())
             FOR UPDATE`,
            [codigoAcceso(codigo), tokenHash(token)],
        );
        if (!rows[0]) throw errorHttp("Evento no encontrado o enlace vencido", 404);
        const evento = rows[0];
        if (!["APROBADO_PENDIENTE_ANTICIPO", "CONFIRMADO"].includes(evento.estado)) {
            throw errorHttp("El evento debe estar aprobado antes de registrar un pago", 409);
        }
        const existing = await client.query(
            "SELECT id_evento,id_pago_evento,importe,metodo,referencia,estado,registrado_en FROM pago_evento WHERE solicitud_id=$1",
            [solicitudId],
        );
        if (existing.rowCount) {
            if (Number(existing.rows[0].id_evento) !== Number(evento.id_evento)) {
                throw errorHttp("El identificador de solicitud ya fue utilizado", 409);
            }
            await client.query("COMMIT");
            return { ...existing.rows[0], duplicate: true, solicitud_id: solicitudId };
        }
        const sum = await client.query(
            "SELECT COALESCE(SUM(importe),0) AS total FROM pago_evento WHERE id_evento=$1 AND estado IN ('PENDIENTE','VERIFICADO')",
            [evento.id_evento],
        );
        if (dineroCentavos(sum.rows[0].total, "El total registrado") + importeCentavos > dineroCentavos(evento.total, "El total del evento")) {
            throw errorHttp("El pago excede el saldo total del evento", 409);
        }
        const inserted = await client.query(
            `INSERT INTO pago_evento (id_evento,id_usuario_registro,importe,metodo,referencia,solicitud_id)
             VALUES ($1,NULL,$2,$3,$4,$5)
             RETURNING id_pago_evento,importe,metodo,referencia,estado,registrado_en`,
            [evento.id_evento, importe, metodo, referencia, solicitudId],
        );
        await registrarHistorial(client, {
            idEvento: evento.id_evento,
            accion: "PAGO_REGISTRADO",
            anterior: evento.estado,
            nuevo: evento.estado,
            detalle: { id_pago_evento: inserted.rows[0].id_pago_evento, importe, metodo, solicitud_id: solicitudId },
        });
        await client.query("COMMIT");
        return { ...inserted.rows[0], solicitud_id: solicitudId };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "pago_evento_solicitud_id_key") {
            throw errorHttp("El identificador de solicitud de pago ya fue utilizado", 409);
        }
        throw error;
    } finally {
        client.release();
    }
};

const listar = async ({ fecha, estado, buscar } = {}) => {
    await assertReady();
    const estadoFiltro = estado ? String(estado).trim().toUpperCase() : null;
    if (estadoFiltro && !estados.has(estadoFiltro)) throw errorHttp("Estado de evento no válido");
    const { rows } = await pool.query(
        `SELECT e.id_evento,e.codigo,e.nombre_responsable,e.celular,e.correo,e.tipo_evento,
                e.fecha,e.hora_inicio,e.hora_fin,e.invitados,e.estado,e.total,e.anticipo_requerido,
                COALESCE(pagos.verificado,0) AS pagos_verificados,
                COALESCE(pagos.pendiente,0) AS pagos_pendientes
         FROM evento_privado e
         LEFT JOIN LATERAL (
             SELECT SUM(importe) FILTER (WHERE estado='VERIFICADO') AS verificado,
                    SUM(importe) FILTER (WHERE estado='PENDIENTE') AS pendiente
             FROM pago_evento WHERE id_evento=e.id_evento
         ) pagos ON TRUE
         WHERE ($1::date IS NULL OR e.fecha=$1::date)
           AND ($2::text IS NULL OR e.estado=$2)
           AND ($3::text IS NULL OR e.codigo ILIKE '%'||$3||'%'
                OR e.nombre_responsable ILIKE '%'||$3||'%' OR e.celular ILIKE '%'||$3||'%')
         ORDER BY e.fecha,e.hora_inicio,e.id_evento`,
        [fecha || null, estadoFiltro, buscar ? String(buscar).trim() : null],
    );
    return rows;
};

const obtenerInterno = async (idEvento) => {
    idEvento = validarId(idEvento, "evento");
    await assertReady();
    const { rows } = await pool.query(
        `SELECT id_evento,codigo,nombre_responsable,celular,correo,tipo_evento,fecha,hora_inicio,hora_fin,
                invitados,decoracion,observaciones,estado,subtotal,costos_adicionales,total,anticipo_requerido,
                condiciones_cancelacion,id_usuario_aprobacion,aprobado_en,confirmado_en,creado_en,actualizado_en
         FROM evento_privado WHERE id_evento=$1`,
        [idEvento],
    );
    if (!rows[0]) throw errorHttp("Evento no encontrado", 404);
    const [detalle, pagos, historial, cancelacion] = await Promise.all([
        pool.query("SELECT * FROM detalle_evento_privado WHERE id_evento=$1 ORDER BY id_detalle", [idEvento]),
        pool.query(
            `SELECT p.*,ur.usuario AS registrado_por,uv.usuario AS verificado_por
             FROM pago_evento p
             LEFT JOIN usuario ur ON ur.id_usuario=p.id_usuario_registro
             LEFT JOIN usuario uv ON uv.id_usuario=p.id_usuario_verificacion
             WHERE p.id_evento=$1 ORDER BY p.registrado_en`,
            [idEvento],
        ),
        pool.query("SELECT * FROM historial_evento_privado WHERE id_evento=$1 ORDER BY fecha,id_historial", [idEvento]),
        pool.query("SELECT * FROM cancelacion_evento_privado WHERE id_evento=$1", [idEvento]),
    ]);
    const observacionesAdmin = [...historial.rows]
        .reverse()
        .find((item) => item.accion === "REVISION_ADMIN" && item.detalle?.decision === "SOLICITAR_CAMBIOS")
        ?.detalle?.observaciones_admin || null;
    return {
        ...rows[0],
        observaciones_admin: observacionesAdmin,
        detalle: detalle.rows,
        pagos: pagos.rows,
        historial: historial.rows,
        cancelacion: cancelacion.rows[0] || null,
    };
};

const revisar = async (idEvento, datos = {}, idUsuario) => {
    idEvento = validarId(idEvento, "evento");
    const accion = String(datos.accion || "").trim().toUpperCase();
    if (!["SOLICITAR_CAMBIOS", "APROBAR", "RECHAZAR"].includes(accion)) {
        throw errorHttp("La decisión administrativa no es válida");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query("SELECT * FROM evento_privado WHERE id_evento=$1 FOR UPDATE", [idEvento]);
        if (!rows[0]) throw errorHttp("Evento no encontrado", 404);
        const actual = rows[0];
        if (!["PENDIENTE_REVISION", "REQUIERE_CAMBIOS"].includes(actual.estado)) {
            throw errorHttp("El evento ya no está disponible para revisión", 409);
        }
        const observacionesAdmin = String(datos.observaciones_admin ?? datos.observaciones ?? "").trim();
        if (observacionesAdmin.length > 4000) throw errorHttp("Las observaciones no deben superar 4000 caracteres");
        if (accion === "SOLICITAR_CAMBIOS" && !observacionesAdmin) {
            throw errorHttp("Explica al cliente qué debe corregir");
        }
        if (accion === "RECHAZAR" && !observacionesAdmin) {
            throw errorHttp("Indica el motivo del rechazo");
        }
        const condicionesCancelacion = datos.condiciones_cancelacion === undefined
            ? actual.condiciones_cancelacion
            : String(datos.condiciones_cancelacion || "").trim() || null;
        if (condicionesCancelacion && condicionesCancelacion.length > 4000) {
            throw errorHttp("Las condiciones de cancelación no deben superar 4000 caracteres");
        }
        const solicitudActualizada = {
            ...actual,
            fecha: datos.fecha === undefined ? String(actual.fecha).slice(0, 10) : String(datos.fecha),
            hora_inicio: datos.hora_inicio === undefined ? String(actual.hora_inicio).slice(0, 5) : String(datos.hora_inicio),
            hora_fin: datos.hora_fin === undefined ? String(actual.hora_fin).slice(0, 5) : String(datos.hora_fin),
        };
        if (accion !== "RECHAZAR") validarHorarioEstructural(solicitudActualizada);
        const pagosActivos = await client.query(
            "SELECT 1 FROM pago_evento WHERE id_evento=$1 AND estado IN ('PENDIENTE','VERIFICADO') LIMIT 1",
            [idEvento],
        );
        if (pagosActivos.rowCount) {
            throw errorHttp("Resuelve los pagos pendientes antes de cambiar la propuesta", 409);
        }
        const detalleAnterior = await client.query(
            `SELECT id_producto,preparacion,cantidad_personas,precio_unitario,subtotal,es_adicional
             FROM detalle_evento_privado WHERE id_evento=$1 ORDER BY id_detalle FOR UPDATE`,
            [idEvento],
        );
        let nuevo = accion === "APROBAR"
            ? "APROBADO_PENDIENTE_ANTICIPO"
            : accion === "RECHAZAR" ? "RECHAZADO" : "REQUIERE_CAMBIOS";
        const costosCentavos = dineroCentavos(datos.costos_adicionales ?? actual.costos_adicionales ?? 0, "Los costos adicionales");
        const anticipoCentavos = dineroCentavos(datos.anticipo_requerido ?? actual.anticipo_requerido ?? 0, "El anticipo");
        const costos = costosCentavos / 100;
        const anticipo = anticipoCentavos / 100;
        let detalle = detalleAnterior.rows.map((item) => ({
            id_producto: item.id_producto,
            preparacion: item.preparacion,
            cantidad_personas: Number(item.cantidad_personas),
            precio_unitario: Number(item.precio_unitario),
            subtotal: Number(item.subtotal),
            es_adicional: item.es_adicional,
        }));
        if (accion !== "RECHAZAR") {
            if (!Array.isArray(datos.detalle) || datos.detalle.length === 0) throw errorHttp("Incluye el presupuesto detallado");
            if (!Number.isFinite(costos) || costos < 0 || !Number.isFinite(anticipo) || anticipo < 0) {
                throw errorHttp("Los costos y el anticipo deben ser valores no negativos");
            }
            detalle = datos.detalle.map((item) => {
                const precio = Number(item.precio_unitario);
                const cantidad = Number(item.cantidad_personas);
                const preparacion = String(item.preparacion || "").trim();
                const idProducto = item.id_producto === undefined || item.id_producto === null || item.id_producto === ""
                    ? null
                    : Number(item.id_producto);
                if (!preparacion || preparacion.length > 240 || !Number.isInteger(cantidad)
                    || cantidad < 1 || cantidad > 2147483647
                    || !Number.isFinite(precio) || dineroCentavos(precio, "El precio unitario") < 0
                    || (idProducto !== null && (!Number.isSafeInteger(idProducto) || idProducto < 1))) {
                    throw errorHttp("El presupuesto contiene preparaciones o importes no válidos");
                }
                return {
                    id_producto: idProducto,
                    preparacion,
                    cantidad_personas: cantidad,
                    precio_unitario: precio,
                    subtotal: cantidad * precio,
                    es_adicional: Boolean(item.es_adicional),
                };
            });
            const subtotalCentavos = detalle.reduce(
                (sum, item) => sum + Number(item.cantidad_personas) * dineroCentavos(item.precio_unitario, "El precio unitario"),
                0,
            );
            const totalCentavos = subtotalCentavos + costosCentavos;
            if (!Number.isSafeInteger(totalCentavos) || totalCentavos > 999999999999
                || anticipoCentavos > totalCentavos) {
                throw errorHttp("El anticipo no puede superar el total cotizado");
            }
            const subtotal = subtotalCentavos / 100;
            const total = totalCentavos / 100;
            if (accion === "APROBAR") {
                if (anticipo === 0) nuevo = "CONFIRMADO";
                await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`evento:${solicitudActualizada.fecha}`]);
                await validarFechaYHorario(client, solicitudActualizada);
                await validarSinConflicto(client, solicitudActualizada, idEvento);
            }
            const version = await obtenerSiguienteVersion(client, idEvento);
            await client.query("DELETE FROM detalle_evento_privado WHERE id_evento=$1", [idEvento]);
            for (const item of detalle) {
                await client.query(
                    `INSERT INTO detalle_evento_privado
                     (id_evento,id_producto,preparacion,cantidad_personas,precio_unitario,subtotal,es_adicional)
                     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [
                        idEvento,
                        item.id_producto,
                        item.preparacion,
                        item.cantidad_personas,
                        item.precio_unitario,
                        item.subtotal,
                        item.es_adicional,
                    ],
                );
            }
            await client.query(
                `UPDATE evento_privado
                 SET estado=$1,subtotal=$2,costos_adicionales=$3,total=$4,anticipo_requerido=$5,
                     condiciones_cancelacion=$6,fecha=$7,hora_inicio=$8,hora_fin=$9,
                     id_usuario_aprobacion=CASE WHEN $1 IN ('APROBADO_PENDIENTE_ANTICIPO','CONFIRMADO') THEN $10 ELSE id_usuario_aprobacion END,
                     aprobado_en=CASE WHEN $1 IN ('APROBADO_PENDIENTE_ANTICIPO','CONFIRMADO') THEN NOW() ELSE aprobado_en END,
                     confirmado_en=CASE WHEN $1='CONFIRMADO' THEN NOW() ELSE confirmado_en END,
                     actualizado_en=NOW()
                 WHERE id_evento=$11`,
                [
                    nuevo, subtotal, costos, total, anticipo,
                    accion === "APROBAR" ? condicionesCancelacion : actual.condiciones_cancelacion,
                    solicitudActualizada.fecha, solicitudActualizada.hora_inicio, solicitudActualizada.hora_fin,
                    idUsuario, idEvento,
                ],
            );
            await registrarHistorial(client, {
                idEvento,
                idUsuario,
                accion: "REVISION_ADMIN",
                anterior: actual.estado,
                nuevo,
                detalle: {
                    version,
                    decision: accion,
                    solicitud: resumenSolicitud(solicitudActualizada),
                    propuesta: {
                        detalle,
                        subtotal,
                        costos_adicionales: costos,
                        total,
                        anticipo_requerido: anticipo,
                        condiciones_cancelacion: accion === "APROBAR"
                            ? condicionesCancelacion
                            : actual.condiciones_cancelacion,
                    },
                    observaciones_admin: observacionesAdmin || null,
                },
            });
        } else {
            await client.query(
                `UPDATE evento_privado
                 SET estado='RECHAZADO',actualizado_en=NOW()
                 WHERE id_evento=$1`,
                [idEvento],
            );
            await registrarHistorial(client, {
                idEvento,
                idUsuario,
                accion: "REVISION_ADMIN",
                anterior: actual.estado,
                nuevo,
                detalle: {
                    version: await obtenerSiguienteVersion(client, idEvento),
                    solicitud: resumenSolicitud(actual),
                    decision: accion,
                    propuesta: {
                        detalle: detalleAnterior.rows,
                        subtotal: Number(actual.subtotal),
                        costos_adicionales: Number(actual.costos_adicionales),
                        total: Number(actual.total),
                        anticipo_requerido: Number(actual.anticipo_requerido),
                        condiciones_cancelacion: actual.condiciones_cancelacion,
                    },
                    observaciones_admin: observacionesAdmin,
                },
            });
        }
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,$2,'evento_privado',$3,$4::jsonb)`,
            [idUsuario, accion, String(idEvento), JSON.stringify({
                estado_anterior: actual.estado,
                estado_nuevo: nuevo,
                observaciones_admin: observacionesAdmin || null,
            })],
        );
        await client.query("COMMIT");
        return obtenerInterno(idEvento);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const verificarPago = async (idPago, idUsuario, aprobado, observaciones = "") => {
    idPago = validarId(idPago, "pago");
    if (typeof aprobado !== "boolean") throw errorHttp("Indica si el pago fue verificado o rechazado");
    const observacionesLimpias = String(observaciones || "").trim();
    if (observacionesLimpias.length > 1000) throw errorHttp("La observación no debe superar 1000 caracteres");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            `SELECT p.*,e.estado AS estado_evento,e.total,e.anticipo_requerido,e.fecha,e.hora_inicio
             FROM pago_evento p INNER JOIN evento_privado e ON e.id_evento=p.id_evento
             WHERE p.id_pago_evento=$1 FOR UPDATE OF p,e`,
            [idPago],
        );
        if (!rows[0]) throw errorHttp("Pago de evento no encontrado", 404);
        const pago = rows[0];
        if (pago.estado !== "PENDIENTE") throw errorHttp("El pago ya fue revisado", 409);
        if (!["APROBADO_PENDIENTE_ANTICIPO", "CONFIRMADO"].includes(pago.estado_evento)) {
            throw errorHttp("El evento ya no está pendiente de anticipo", 409);
        }
        let nuevoEstadoPago = aprobado ? "VERIFICADO" : "RECHAZADO";
        let nuevoEstadoEvento = pago.estado_evento;
        let idCaja = null;
        if (aprobado) {
            if (pago.estado_evento === "APROBADO_PENDIENTE_ANTICIPO") {
                const validacionFecha = await client.query(
                    `SELECT (($1::date+$2::time) AT TIME ZONE 'America/La_Paz') >= NOW() + INTERVAL '24 hours' AS valida`,
                    [String(pago.fecha).slice(0, 10), pago.hora_inicio],
                );
                if (!validacionFecha.rows[0].valida) throw errorHttp("No se puede confirmar el anticipo con menos de 24 horas antes del evento", 409);
            }
            const acumulado = await client.query(
                "SELECT COALESCE(SUM(importe),0) AS total FROM pago_evento WHERE id_evento=$1 AND estado='VERIFICADO'",
                [pago.id_evento],
            );
            if (dineroCentavos(acumulado.rows[0].total, "El total verificado")
                + dineroCentavos(pago.importe, "El pago")
                > dineroCentavos(pago.total, "El total del evento")) {
                throw errorHttp("Los pagos verificados superarían el total del evento", 409);
            }
            if (pago.metodo === "EFECTIVO") {
                await operacionesModel.verificarCajaAbierta(client);
                const caja = await client.query(
                    `INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario)
                     SELECT NOW(),$1,$2,0,
                            COALESCE((SELECT SUM(ingreso-egreso) FROM caja WHERE fecha::date=CURRENT_DATE),0)+$2,
                            $3
                     RETURNING id_caja`,
                    [`Anticipo evento #${pago.id_evento}`, pago.importe, idUsuario],
                );
                idCaja = caja.rows[0].id_caja;
            }
        }
        await client.query(
            `UPDATE pago_evento
             SET estado=$1,id_usuario_verificacion=$2,
                 verificado_en=CASE WHEN $1='VERIFICADO' THEN NOW() ELSE NULL END,id_caja=$3
             WHERE id_pago_evento=$4`,
            [nuevoEstadoPago, idUsuario, idCaja, idPago],
        );
        if (aprobado && pago.estado_evento === "APROBADO_PENDIENTE_ANTICIPO") {
            const pagos = await client.query(
                "SELECT COALESCE(SUM(importe),0) AS total FROM pago_evento WHERE id_evento=$1 AND estado='VERIFICADO'",
                [pago.id_evento],
            );
            if (dineroCentavos(pagos.rows[0].total, "El total verificado")
                >= dineroCentavos(pago.anticipo_requerido, "El anticipo requerido")) {
                nuevoEstadoEvento = "CONFIRMADO";
                await client.query(
                    "UPDATE evento_privado SET estado='CONFIRMADO',confirmado_en=NOW(),actualizado_en=NOW() WHERE id_evento=$1",
                    [pago.id_evento],
                );
            }
        }
        await registrarHistorial(client, {
            idEvento: pago.id_evento,
            idUsuario,
            accion: aprobado ? "PAGO_VERIFICADO" : "PAGO_RECHAZADO",
            anterior: pago.estado_evento,
            nuevo: nuevoEstadoEvento,
            detalle: { id_pago_evento: Number(idPago), importe: Number(pago.importe), observaciones: observacionesLimpias },
        });
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,$2,'pago_evento',$3,$4::jsonb)`,
            [idUsuario, aprobado ? "VERIFICAR" : "RECHAZAR", String(idPago), JSON.stringify({ estado: nuevoEstadoPago, id_evento: pago.id_evento })],
        );
        await client.query("COMMIT");
        return { id_pago_evento: Number(idPago), estado: nuevoEstadoPago, estado_evento: nuevoEstadoEvento, id_caja: idCaja };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const cancelarAdministrativamente = async (idEvento, datos = {}, idUsuario) => {
    idEvento = validarId(idEvento, "evento");
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de cancelación no es válido");
    const motivo = String(datos.motivo || "").trim();
    const condiciones = String(datos.condiciones_aplicadas || "").trim();
    if (!motivo || motivo.length > 2000) throw errorHttp("Indica el motivo de cancelación (máximo 2000 caracteres)");
    if (!condiciones || condiciones.length > 4000) {
        throw errorHttp("Registra las condiciones de cancelación acordadas para este evento");
    }
    const montoDevueltoCentavos = dineroCentavos(datos.monto_devuelto, "El monto devuelto");
    const montoRetenidoCentavos = dineroCentavos(datos.monto_retenido, "El monto retenido");
    const metodo = String(datos.metodo_devolucion || "").trim().toUpperCase() || null;
    if (montoDevueltoCentavos > 0 && !["EFECTIVO", "TRANSFERENCIA", "TARJETA", "QR"].includes(metodo)) {
        throw errorHttp("Selecciona el método de devolución acordado");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            "SELECT * FROM evento_privado WHERE id_evento=$1 FOR UPDATE",
            [idEvento],
        );
        if (!rows[0]) throw errorHttp("Evento no encontrado", 404);
        const actual = rows[0];
        const cancelacionExistente = await client.query(
            "SELECT * FROM cancelacion_evento_privado WHERE id_evento=$1 FOR UPDATE",
            [idEvento],
        );
        if (cancelacionExistente.rowCount) {
            if (cancelacionExistente.rows[0].solicitud_id === solicitudId) {
                await client.query("COMMIT");
                return { ...cancelacionExistente.rows[0], duplicate: true };
            }
            throw errorHttp("La cancelación de este evento ya fue registrada", 409);
        }
        if (!["PENDIENTE_REVISION", "REQUIERE_CAMBIOS", "APROBADO_PENDIENTE_ANTICIPO", "CONFIRMADO"].includes(actual.estado)) {
            throw errorHttp("El evento no se puede cancelar en su estado actual", 409);
        }
        const pagosPendientes = await client.query(
            "SELECT 1 FROM pago_evento WHERE id_evento=$1 AND estado='PENDIENTE' LIMIT 1",
            [idEvento],
        );
        if (pagosPendientes.rowCount) throw errorHttp("Resuelve los pagos pendientes antes de cancelar el evento", 409);
        const pagosVerificados = await client.query(
            "SELECT COALESCE(SUM(importe),0) AS total FROM pago_evento WHERE id_evento=$1 AND estado='VERIFICADO'",
            [idEvento],
        );
        const recibidoCentavos = dineroCentavos(pagosVerificados.rows[0].total, "El monto recibido");
        if (montoDevueltoCentavos + montoRetenidoCentavos !== recibidoCentavos) {
            throw errorHttp("El monto devuelto y retenido debe coincidir con los pagos verificados");
        }
        const montoRecibido = recibidoCentavos / 100;
        const montoDevuelto = montoDevueltoCentavos / 100;
        const montoRetenido = montoRetenidoCentavos / 100;
        const estado = montoDevuelto > 0 ? "AUTORIZADA" : "SIN_DEVOLUCION";
        const inserted = await client.query(
            `INSERT INTO cancelacion_evento_privado
             (id_evento,tipo_responsable,id_usuario_responsable,motivo,condiciones_aplicadas,
              monto_recibido,monto_devuelto,monto_retenido,metodo_devolucion,estado,solicitud_id,
              id_usuario_autorizacion,autorizada_en)
             VALUES ($1,'USUARIO',$2,$3,$4,$5,$6,$7,$8,$9,$10,
                     CASE WHEN $9='AUTORIZADA' THEN $2 ELSE NULL END,
                     CASE WHEN $9='AUTORIZADA' THEN NOW() ELSE NULL END)
             RETURNING *`,
            [
                idEvento, idUsuario, motivo, condiciones, montoRecibido,
                montoDevuelto, montoRetenido, montoDevuelto > 0 ? metodo : null, estado, solicitudId,
            ],
        );
        await client.query(
            "UPDATE evento_privado SET estado='CANCELADO',actualizado_en=NOW() WHERE id_evento=$1",
            [idEvento],
        );
        await registrarHistorial(client, {
            idEvento,
            idUsuario,
            accion: "CANCELACION_ADMIN",
            anterior: actual.estado,
            nuevo: "CANCELADO",
            detalle: {
                motivo,
                condiciones_aplicadas: condiciones,
                monto_recibido: montoRecibido,
                monto_devuelto: montoDevuelto,
                monto_retenido: montoRetenido,
                estado_devolucion: estado,
            },
        });
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,'CANCELAR','evento_privado',$2,$3::jsonb)`,
            [idUsuario, String(idEvento), JSON.stringify({ motivo, estado_devolucion: estado })],
        );
        await client.query("COMMIT");
        return inserted.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "cancelacion_evento_privado_solicitud_id_key") {
            throw errorHttp("El identificador de cancelación ya fue utilizado", 409);
        }
        throw error;
    } finally {
        client.release();
    }
};

const registrarDevolucion = async (idEvento, datos = {}, idUsuario) => {
    idEvento = validarId(idEvento, "evento");
    const solicitudId = datos.solicitud_id || crypto.randomUUID();
    const referencia = String(datos.referencia_devolucion || "").trim();
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de devolución no es válido");
    if (!referencia || referencia.length > 500) {
        throw errorHttp("Registra la referencia o comprobante de la devolución (máximo 500 caracteres)");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const { rows } = await client.query(
            "SELECT * FROM cancelacion_evento_privado WHERE id_evento=$1 FOR UPDATE",
            [idEvento],
        );
        if (!rows[0]) throw errorHttp("No existe una cancelación registrada para este evento", 404);
        const cancelacion = rows[0];
        if (cancelacion.estado === "DEVUELTA") {
            if (cancelacion.solicitud_devolucion_id === solicitudId) {
                await client.query("COMMIT");
                return { ...cancelacion, duplicate: true };
            }
            throw errorHttp("La devolución ya fue registrada", 409);
        }
        if (cancelacion.estado !== "AUTORIZADA") {
            throw errorHttp("No existe una devolución autorizada para completar", 409);
        }
        let idCaja = null;
        if (cancelacion.metodo_devolucion === "EFECTIVO") {
            await operacionesModel.verificarCajaAbierta(client);
            const saldoCaja = await client.query(
                "SELECT COALESCE(SUM(ingreso-egreso),0) AS total FROM caja WHERE fecha::date=CURRENT_DATE",
            );
            const caja = await client.query(
                `INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario)
                 VALUES (NOW(),$1,0,$2,$3,$4) RETURNING id_caja`,
                [
                    `Devolución evento #${idEvento}`,
                    cancelacion.monto_devuelto,
                    Number(saldoCaja.rows[0].total) - Number(cancelacion.monto_devuelto),
                    idUsuario,
                ],
            );
            idCaja = caja.rows[0].id_caja;
        }
        const updated = await client.query(
            `UPDATE cancelacion_evento_privado
             SET estado='DEVUELTA',referencia_devolucion=$1,solicitud_devolucion_id=$2,
                 id_usuario_devolucion=$3,devuelta_en=NOW(),id_caja=$4
             WHERE id_cancelacion=$5
             RETURNING *`,
            [referencia, solicitudId, idUsuario, idCaja, cancelacion.id_cancelacion],
        );
        await registrarHistorial(client, {
            idEvento,
            idUsuario,
            accion: "DEVOLUCION_REGISTRADA",
            anterior: "CANCELADO",
            nuevo: "CANCELADO",
            detalle: {
                monto_devuelto: Number(cancelacion.monto_devuelto),
                metodo_devolucion: cancelacion.metodo_devolucion,
                referencia_devolucion: referencia,
                id_caja: idCaja,
            },
        });
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle)
             VALUES ($1,'DEVOLVER','evento_privado',$2,$3::jsonb)`,
            [idUsuario, String(idEvento), JSON.stringify({
                monto_devuelto: Number(cancelacion.monto_devuelto),
                metodo_devolucion: cancelacion.metodo_devolucion,
                referencia_devolucion: referencia,
                id_caja: idCaja,
            })],
        );
        await client.query("COMMIT");
        return updated.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "cancelacion_evento_privado_solicitud_devolucion_id_key") {
            throw errorHttp("El identificador de devolución ya fue utilizado", 409);
        }
        throw error;
    } finally {
        client.release();
    }
};

const registrarImpresion = async (idEvento, idUsuario, { tipo = "COMANDA", solicitud_id, reimpresion = false } = {}) => {
    idEvento = validarId(idEvento, "evento");
    const solicitudId = solicitud_id || crypto.randomUUID();
    if (!esUuid(solicitudId)) throw errorHttp("El identificador de impresión no es válido");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const evento = await client.query("SELECT * FROM evento_privado WHERE id_evento=$1 FOR UPDATE", [idEvento]);
        if (!evento.rowCount) throw errorHttp("Evento no encontrado", 404);
        if (evento.rows[0].estado !== "CONFIRMADO") {
            throw errorHttp("La comanda requiere que el evento esté confirmado", 409);
        }
        if (!["COMANDA", "ACTUALIZACION"].includes(tipo)) throw errorHttp("El tipo de impresión no es válido");
        const existing = await client.query("SELECT id_impresion FROM impresion_evento_privado WHERE solicitud_id=$1", [solicitudId]);
        if (existing.rowCount) {
            await client.query("COMMIT");
            return { duplicate: true, id_impresion: existing.rows[0].id_impresion };
        }
        const detalle = await client.query(
            "SELECT preparacion,cantidad_personas,precio_unitario,subtotal FROM detalle_evento_privado WHERE id_evento=$1 ORDER BY id_detalle",
            [idEvento],
        );
        const inserted = await client.query(
            `INSERT INTO impresion_evento_privado (id_evento,id_usuario,tipo,version,solicitud_id,reimpresion)
             VALUES ($1,$2,$3,1,$4,$5) RETURNING id_impresion,creada_en`,
            [idEvento, idUsuario, tipo, solicitudId, Boolean(reimpresion)],
        );
        await registrarHistorial(client, {
            idEvento,
            idUsuario,
            accion: reimpresion ? "REIMPRESION_COMANDA" : "IMPRESION_COMANDA",
            anterior: evento.rows[0].estado,
            nuevo: evento.rows[0].estado,
            detalle: { id_impresion: inserted.rows[0].id_impresion, tipo, solicitud_id: solicitudId },
        });
        await client.query("COMMIT");
        return {
            evento: evento.rows[0],
            detalle: detalle.rows,
            impresion: inserted.rows[0],
            solicitud_id: solicitudId,
            mensaje: "Solicitud de impresión registrada; el navegador no confirma la impresión física.",
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const listarHorarios = async () => {
    await assertReady();
    const { rows } = await pool.query(
        "SELECT id_horario,dia_semana,hora_inicio,hora_fin,activo FROM horario_evento_privado ORDER BY dia_semana,hora_inicio",
    );
    return rows;
};

const actualizarHorarios = async (horarios, idUsuario) => {
    if (!Array.isArray(horarios)) throw errorHttp("Los horarios deben enviarse como una lista");
    const normalizados = horarios.map((item) => {
        const dia = Number(item.dia_semana);
        const inicio = String(item.hora_inicio || "");
        const fin = String(item.hora_fin || "");
        if (item.dia_semana === "" || item.dia_semana === null || item.dia_semana === undefined
            || !Number.isInteger(dia) || dia < 0 || dia > 6
            || !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)
            || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fin)
            || inicio >= fin) {
            throw errorHttp("Hay un horario o día no válido");
        }
        return { dia, inicio, fin, activo: item.activo !== false };
    });
    const claves = new Set();
    for (const horario of normalizados) {
        const clave = `${horario.dia}:${horario.inicio}`;
        if (claves.has(clave)) throw errorHttp("No repitas el mismo horario para un día");
        claves.add(clave);
    }
    for (let indice = 0; indice < normalizados.length; indice += 1) {
        const actual = normalizados[indice];
        if (!actual.activo) continue;
        const inicio = Number(actual.inicio.slice(0, 2)) * 60 + Number(actual.inicio.slice(3, 5));
        const fin = Number(actual.fin.slice(0, 2)) * 60 + Number(actual.fin.slice(3, 5));
        const seCruza = normalizados.slice(indice + 1).some((otro) => {
            if (!otro.activo || otro.dia !== actual.dia) return false;
            const otroInicio = Number(otro.inicio.slice(0, 2)) * 60 + Number(otro.inicio.slice(3, 5));
            const otroFin = Number(otro.fin.slice(0, 2)) * 60 + Number(otro.fin.slice(3, 5));
            return inicio < otroFin && fin > otroInicio;
        });
        if (seCruza) throw errorHttp("Los horarios activos de un día no pueden superponerse");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        await client.query("DELETE FROM horario_evento_privado");
        for (const horario of normalizados) {
            await client.query(
                `INSERT INTO horario_evento_privado (dia_semana,hora_inicio,hora_fin,activo,actualizado_por,actualizado_en)
                 VALUES ($1,$2,$3,$4,$5,NOW())`,
                [horario.dia, horario.inicio, horario.fin, horario.activo, idUsuario],
            );
        }
        await client.query(
            `INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,detalle)
             VALUES ($1,'ACTUALIZAR_HORARIOS','horario_evento_privado',$2::jsonb)`,
            [idUsuario, JSON.stringify(normalizados)],
        );
        await client.query("COMMIT");
        return listarHorarios();
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export default {
    crear,
    obtenerPorAcceso,
    cancelarPorAcceso,
    responderSolicitud,
    registrarPago,
    listar,
    obtenerInterno,
    revisar,
    verificarPago,
    cancelarAdministrativamente,
    registrarDevolucion,
    registrarImpresion,
    listarHorarios,
    actualizarHorarios,
};
