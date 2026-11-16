import pool from "../config/db.js";

const estadosSiguientes = {
    PENDIENTE: new Set(["CONFIRMADA", "CANCELADA"]),
    CONFIRMADA: new Set(["ATENDIDA", "CANCELADA", "NO_ASISTIO"]),
    ATENDIDA: new Set(),
    CANCELADA: new Set(),
    NO_ASISTIO: new Set(),
};

const validarFecha = (fecha, nombre) => {
    if (fecha === undefined || fecha === "") return null;
    const texto = String(fecha);
    const parsed = new Date(`${texto}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== texto) {
        throw Object.assign(new Error(`La fecha ${nombre} no es válida`), { status: 400 });
    }
    return texto;
};

const listar = async ({ desde, hasta, estado } = {}) => {
    const fechaDesde = validarFecha(desde, "inicial");
    const fechaHasta = validarFecha(hasta, "final");
    const estadoFiltro = estado ? String(estado).trim().toUpperCase() : null;
    const estadosValidos = new Set(Object.keys(estadosSiguientes));
    if (estadoFiltro && !estadosValidos.has(estadoFiltro)) {
        throw Object.assign(new Error("El estado de reserva no es válido"), { status: 400 });
    }
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
        throw Object.assign(new Error("La fecha inicial no puede ser posterior a la fecha final"), { status: 400 });
    }
    const { rows } = await pool.query(
        `SELECT r.id_reserva,r.id_cliente,c.nombre AS cliente,c.telefono,
                r.fecha,r.hora,r.cantidad_personas,r.observaciones,r.estado,
                r.observaciones_admin,r.creada_en
         FROM reserva r
         INNER JOIN cliente c ON c.id_cliente=r.id_cliente
         WHERE ($1::date IS NULL OR r.fecha >= $1::date)
           AND ($2::date IS NULL OR r.fecha <= $2::date)
           AND ($3::text IS NULL OR r.estado=$3)
         ORDER BY r.fecha DESC,r.hora DESC,r.id_reserva DESC
         LIMIT 200`,
        [fechaDesde, fechaHasta, estadoFiltro],
    );
    return rows;
};

const obtener = async (id) => {
    const reserva = await pool.query(
        `SELECT r.id_reserva,r.id_cliente,c.nombre AS cliente,c.telefono,
                r.fecha,r.hora,r.cantidad_personas,r.observaciones,r.estado,
                r.observaciones_admin,r.creada_en
         FROM reserva r
         INNER JOIN cliente c ON c.id_cliente=r.id_cliente
         WHERE r.id_reserva=$1`,
        [id],
    );
    if (!reserva.rowCount) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
    const historial = await pool.query(
        `SELECT h.id_historial,h.fecha,h.estado_anterior,h.estado_nuevo,
                h.observaciones_admin,u.usuario
         FROM historial_reserva h
         LEFT JOIN usuario u ON u.id_usuario=h.id_usuario
         WHERE h.id_reserva=$1
         ORDER BY h.fecha DESC,h.id_historial DESC`,
        [id],
    );
    return { ...reserva.rows[0], historial: historial.rows };
};

const actualizar = async (id, idUsuario, datos = {}) => {
    const nuevoEstado = datos.estado === undefined ? undefined : String(datos.estado).trim().toUpperCase();
    const observaciones = datos.observaciones_admin === undefined
        ? undefined
        : String(datos.observaciones_admin || "").trim();
    if (nuevoEstado && !Object.prototype.hasOwnProperty.call(estadosSiguientes, nuevoEstado)) {
        throw Object.assign(new Error("El estado de reserva no es válido"), { status: 400 });
    }
    if (observaciones !== undefined && observaciones.length > 1000) {
        throw Object.assign(new Error("Las observaciones administrativas no deben superar 1000 caracteres"), { status: 400 });
    }
    if (!nuevoEstado && observaciones === undefined) {
        throw Object.assign(new Error("Indica un estado o una observación administrativa"), { status: 400 });
    }

    const client = await pool.connect();
    let transaccionAbierta = false;
    try {
        await client.query("BEGIN");
        transaccionAbierta = true;
        const actual = await client.query(
            "SELECT estado,observaciones_admin FROM reserva WHERE id_reserva=$1 FOR UPDATE",
            [id],
        );
        if (!actual.rowCount) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
        const estadoAnterior = actual.rows[0].estado;
        const estadoFinal = nuevoEstado || estadoAnterior;
        if (nuevoEstado && nuevoEstado !== estadoAnterior && !estadosSiguientes[estadoAnterior]?.has(nuevoEstado)) {
            throw Object.assign(new Error(`No se puede cambiar una reserva de ${estadoAnterior} a ${nuevoEstado}`), { status: 409 });
        }
        const observacionesFinales = observaciones === undefined
            ? actual.rows[0].observaciones_admin
            : observaciones || null;

        await client.query(
            `UPDATE reserva SET estado=$1,observaciones_admin=$2 WHERE id_reserva=$3`,
            [estadoFinal, observacionesFinales, id],
        );
        await client.query(
            `INSERT INTO historial_reserva
                (id_reserva,id_usuario,estado_anterior,estado_nuevo,observaciones_admin)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, idUsuario, estadoAnterior, estadoFinal, observacionesFinales],
        );
        await client.query("COMMIT");
        transaccionAbierta = false;
        return await obtener(id);
    } catch (error) {
        if (transaccionAbierta) await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export default { listar, obtener, actualizar };
