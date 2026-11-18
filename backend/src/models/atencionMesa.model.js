import pool from "../config/db.js";

const assertReady = async (db = pool) => {
    const { rows } = await db.query(
        `SELECT to_regclass('public.mesa') IS NOT NULL
            AND to_regclass('public.atencion_mesa') IS NOT NULL
            AND to_regclass('public.historial_atencion_mesa') IS NOT NULL AS ready`,
    );
    if (!rows[0].ready) {
        throw Object.assign(new Error("La gestión de mesas requiere aplicar la migración local preparada"), { status: 503 });
    }
};
const validarId = (id, recurso) => {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero < 1) {
        throw Object.assign(new Error(`El identificador de ${recurso} no es válido`), { status: 400 });
    }
    return numero;
};

const validarMesa = (datos = {}) => {
    const numero = String(datos.numero || "").trim();
    const capacidad = Number(datos.capacidad);
    if (!numero || numero.length > 20) {
        throw Object.assign(new Error("El número o nombre de mesa es obligatorio y no debe superar 20 caracteres"), { status: 400 });
    }
    if (!Number.isInteger(capacidad) || capacidad < 1) {
        throw Object.assign(new Error("La capacidad debe ser un entero positivo"), { status: 400 });
    }
    return { numero, capacidad };
};

const listarMesas = async () => {
    await assertReady();
    const { rows } = await pool.query(
        `SELECT m.id_mesa,m.numero,m.capacidad,m.estado,m.creada_en,m.actualizada_en,
                a.id_atencion,a.id_usuario_apertura,a.abierta_en,
                (SELECT COUNT(*)::int FROM pedido p WHERE p.id_atencion=a.id_atencion) AS cantidad_pedidos
         FROM mesa m
         LEFT JOIN atencion_mesa a ON a.id_mesa=m.id_mesa AND a.estado='ABIERTA'
         ORDER BY m.numero`,
    );
    return rows.map((mesa) => ({
        ...mesa,
        estado_atencion: mesa.estado !== "ACTIVA" ? "FUERA_SERVICIO" : mesa.id_atencion ? "OCUPADA" : "DISPONIBLE",
    }));
};

const crearMesa = async (datos) => {
    await assertReady();
    const mesa = validarMesa(datos);
    const { rows } = await pool.query(
        `INSERT INTO mesa (numero,capacidad)
         VALUES ($1,$2)
         RETURNING id_mesa,numero,capacidad,estado,creada_en,actualizada_en`,
        [mesa.numero, mesa.capacidad],
    );
    return rows[0];
};

const actualizarMesa = async (idMesa, datos = {}) => {
    idMesa = validarId(idMesa, "mesa");
    const mesa = validarMesa(datos);
    const estado = String(datos.estado || "ACTIVA").trim().toUpperCase();
    if (!["ACTIVA", "FUERA_SERVICIO"].includes(estado)) {
        throw Object.assign(new Error("El estado de mesa no es válido"), { status: 400 });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const actual = await client.query("SELECT id_mesa FROM mesa WHERE id_mesa=$1 FOR UPDATE", [idMesa]);
        if (!actual.rowCount) throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
        if (estado === "FUERA_SERVICIO") {
            const abierta = await client.query(
                "SELECT 1 FROM atencion_mesa WHERE id_mesa=$1 AND estado='ABIERTA' FOR UPDATE",
                [idMesa],
            );
            if (abierta.rowCount) throw Object.assign(new Error("No se puede retirar una mesa que tiene una atención abierta"), { status: 409 });
        }
        const { rows } = await client.query(
            `UPDATE mesa SET numero=$1,capacidad=$2,estado=$3,actualizada_en=NOW()
             WHERE id_mesa=$4
             RETURNING id_mesa,numero,capacidad,estado,creada_en,actualizada_en`,
            [mesa.numero, mesa.capacidad, estado, idMesa],
        );
        await client.query("COMMIT");
        return rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const abrirAtencion = async (idMesa, idUsuario) => {
    idMesa = validarId(idMesa, "mesa");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const mesaResult = await client.query(
            "SELECT id_mesa,estado FROM mesa WHERE id_mesa=$1 FOR UPDATE",
            [idMesa],
        );
        if (!mesaResult.rowCount) throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
        if (mesaResult.rows[0].estado !== "ACTIVA") throw Object.assign(new Error("La mesa está fuera de servicio"), { status: 409 });
        const actual = await client.query(
            "SELECT id_atencion FROM atencion_mesa WHERE id_mesa=$1 AND estado='ABIERTA' FOR UPDATE",
            [idMesa],
        );
        if (actual.rowCount) throw Object.assign(new Error("La mesa ya tiene una atención abierta"), { status: 409 });
        const insertada = await client.query(
            `INSERT INTO atencion_mesa (id_mesa,id_usuario_apertura)
             VALUES ($1,$2)
             RETURNING id_atencion,id_mesa,id_usuario_apertura,estado,abierta_en`,
            [idMesa, idUsuario],
        );
        await client.query(
            `INSERT INTO historial_atencion_mesa (id_atencion,id_usuario,accion,detalle)
             VALUES ($1,$2,'APERTURA',$3::jsonb)`,
            [insertada.rows[0].id_atencion, idUsuario, JSON.stringify({ id_mesa: Number(idMesa) })],
        );
        await client.query("COMMIT");
        return insertada.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") throw Object.assign(new Error("La mesa ya tiene una atención abierta"), { status: 409 });
        throw error;
    } finally {
        client.release();
    }
};

const listarAtencionesAbiertas = async () => {
    await assertReady();
    const { rows } = await pool.query(
        `SELECT a.id_atencion,a.id_mesa,m.numero AS mesa,m.capacidad,
                a.id_usuario_apertura,u.usuario AS responsable,a.abierta_en,
                COUNT(p.id_pedido)::int AS cantidad_pedidos,
                COALESCE(SUM(GREATEST(p.total-COALESCE(pg.pagado,0),0)),0) AS saldo_pendiente
         FROM atencion_mesa a
         INNER JOIN mesa m ON m.id_mesa=a.id_mesa
         INNER JOIN usuario u ON u.id_usuario=a.id_usuario_apertura
         LEFT JOIN pedido p ON p.id_atencion=a.id_atencion
         LEFT JOIN LATERAL (
             SELECT SUM(monto) AS pagado FROM pago
             WHERE id_pedido=p.id_pedido AND estado='CONFIRMADO'
         ) pg ON TRUE
         WHERE a.estado='ABIERTA'
         GROUP BY a.id_atencion,m.numero,m.capacidad,u.usuario
         ORDER BY a.abierta_en`,
    );
    return rows;
};

const obtenerAtencion = async (idAtencion) => {
    idAtencion = validarId(idAtencion, "atención");
    await assertReady();
    const { rows } = await pool.query(
        `SELECT a.id_atencion,a.id_mesa,m.numero AS mesa,m.capacidad,
                a.estado,a.id_usuario_apertura,ua.usuario AS responsable,
                a.abierta_en,a.cerrada_en,a.id_usuario_cierre,uc.usuario AS usuario_cierre,
                COALESCE(json_agg(json_build_object(
                    'id_pedido',p.id_pedido,'estado',p.estado,'total',p.total,
                    'pagado',p.pagado,'pagado_confirmado',COALESCE(pg.pagado,0),
                    'saldo_pendiente',GREATEST(p.total-COALESCE(pg.pagado,0),0)
                )) FILTER (WHERE p.id_pedido IS NOT NULL),'[]') AS pedidos
         FROM atencion_mesa a
         INNER JOIN mesa m ON m.id_mesa=a.id_mesa
         INNER JOIN usuario ua ON ua.id_usuario=a.id_usuario_apertura
         LEFT JOIN usuario uc ON uc.id_usuario=a.id_usuario_cierre
         LEFT JOIN pedido p ON p.id_atencion=a.id_atencion
         LEFT JOIN LATERAL (
             SELECT SUM(monto) AS pagado FROM pago
             WHERE id_pedido=p.id_pedido AND estado='CONFIRMADO'
         ) pg ON TRUE
         WHERE a.id_atencion=$1
         GROUP BY a.id_atencion,m.numero,m.capacidad,ua.usuario,uc.usuario`,
        [idAtencion],
    );
    if (!rows[0]) throw Object.assign(new Error("Atención no encontrada"), { status: 404 });
    return rows[0];
};

const cerrarAtencion = async (idAtencion, idUsuario) => {
    idAtencion = validarId(idAtencion, "atención");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const atencion = await client.query(
            "SELECT id_atencion,estado FROM atencion_mesa WHERE id_atencion=$1 FOR UPDATE",
            [idAtencion],
        );
        if (!atencion.rowCount) throw Object.assign(new Error("Atención no encontrada"), { status: 404 });
        if (atencion.rows[0].estado !== "ABIERTA") throw Object.assign(new Error("La atención ya está cerrada"), { status: 409 });

        const pedidos = await client.query(
            `SELECT p.id_pedido,p.total,p.estado,
                    COALESCE(pg.confirmados,0) AS confirmados,
                    COALESCE(pg.pendientes,0) AS pagos_pendientes
             FROM pedido p
             LEFT JOIN LATERAL (
                 SELECT SUM(monto) FILTER (WHERE estado='CONFIRMADO') AS confirmados,
                        SUM(monto) FILTER (WHERE estado='PENDIENTE') AS pendientes
                 FROM pago WHERE id_pedido=p.id_pedido
             ) pg ON TRUE
             WHERE p.id_atencion=$1
             ORDER BY p.id_pedido
             FOR UPDATE OF p`,
            [idAtencion],
        );
        if (!pedidos.rowCount) throw Object.assign(new Error("No se puede cerrar una atención sin pedidos"), { status: 409 });
        for (const pedido of pedidos.rows) {
            if (String(pedido.estado).toUpperCase() === "CANCELADO") {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} está cancelado y requiere revisión`), { status: 409 });
            }
            if (Number(pedido.pagos_pendientes) > 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} tiene pagos pendientes de confirmación`), { status: 409 });
            }
            const saldo = Number(pedido.total) - Number(pedido.confirmados);
            if (saldo > 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} mantiene un saldo de ${saldo.toFixed(2)}`), { status: 409 });
            }
            if (saldo < 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} presenta pagos superiores al total; requiere conciliación`), { status: 409 });
            }
            if (String(pedido.estado).toUpperCase() !== "ENTREGADO") {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} aún no está entregado`), { status: 409 });
            }
        }
        const adicionales = await client.query(
            `SELECT sa.id_solicitud
             FROM solicitud_adicional sa
             INNER JOIN pedido p ON p.id_pedido=sa.id_pedido
             WHERE p.id_atencion=$1 AND sa.estado IN ('PENDIENTE','APROBADO')
             FOR UPDATE OF sa`,
            [idAtencion],
        );
        if (adicionales.rowCount) throw Object.assign(new Error("La atención tiene adicionales pendientes de incorporar o cobrar"), { status: 409 });

        const cierre = await client.query(
            `UPDATE atencion_mesa
             SET estado='CERRADA',cerrada_en=NOW(),id_usuario_cierre=$1
             WHERE id_atencion=$2
             RETURNING id_atencion,id_mesa,estado,abierta_en,cerrada_en,id_usuario_apertura,id_usuario_cierre`,
            [idUsuario, idAtencion],
        );
        await client.query(
            `INSERT INTO historial_atencion_mesa (id_atencion,id_usuario,accion,detalle)
             VALUES ($1,$2,'CIERRE',$3::jsonb)`,
            [idAtencion, idUsuario, JSON.stringify({ pedidos: pedidos.rows.map((pedido) => Number(pedido.id_pedido)) })],
        );
        await client.query("COMMIT");
        return cierre.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const historialAtencion = async (idAtencion) => {
    idAtencion = validarId(idAtencion, "atención");
    await assertReady();
    const { rows } = await pool.query(
        `SELECT h.id_historial,h.fecha,h.accion,h.detalle,u.usuario
         FROM historial_atencion_mesa h
         INNER JOIN usuario u ON u.id_usuario=h.id_usuario
         WHERE h.id_atencion=$1 ORDER BY h.fecha,h.id_historial`,
        [idAtencion],
    );
    return rows;
};

export default {
    listarMesas,
    crearMesa,
    actualizarMesa,
    abrirAtencion,
    listarAtencionesAbiertas,
    obtenerAtencion,
    cerrarAtencion,
    historialAtencion,
};
