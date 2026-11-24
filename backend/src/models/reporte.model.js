import pool from "../config/db.js";

const validarRango = (desde, hasta) => {
    const validarFecha = (fecha, nombre) => {
        const texto = String(fecha || "");
        const fechaParsed = new Date(`${texto}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)
            || Number.isNaN(fechaParsed.getTime())
            || fechaParsed.toISOString().slice(0, 10) !== texto) {
            throw Object.assign(new Error(`La fecha ${nombre} no es válida`), { status: 400 });
        }
        return texto;
    };
    const inicio = validarFecha(desde, "inicial");
    const fin = validarFecha(hasta, "final");
    if (inicio > fin) throw Object.assign(new Error("La fecha inicial no puede ser posterior a la fecha final"), { status: 400 });
    const dias = (Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000;
    if (dias > 366) throw Object.assign(new Error("El intervalo del reporte no puede superar 366 días"), { status: 400 });
    return [inicio, fin];
};

const operativo = async (desde, hasta) => {
    const [inicio, fin] = validarRango(desde, hasta);
    const [resumen, pagos, gastos, pedidos, produccion, adicionales, reservas, movimientosPensionado] = await Promise.all([
        pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM pedido WHERE fecha >= $1::date AND fecha < $2::date + INTERVAL '1 day') AS pedidos,
                (SELECT COUNT(*)::int FROM pedido WHERE fecha >= $1::date AND fecha < $2::date + INTERVAL '1 day' AND pagado IS TRUE) AS pedidos_pagados,
                (SELECT COALESCE(SUM(monto),0) FROM pago WHERE fecha >= $1::date AND fecha < $2::date + INTERVAL '1 day' AND estado='CONFIRMADO') AS ingresos_confirmados,
                (SELECT COALESCE(SUM(total),0) FROM gasto WHERE fecha >= $1::date AND fecha < $2::date + INTERVAL '1 day') AS gastos,
                (SELECT COUNT(*)::int FROM reserva_plato WHERE fecha BETWEEN $1::date AND $2::date) AS reservas`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT pg.id_pago,pg.id_pedido,pg.fecha,pg.monto,pg.metodo,pg.estado,
                    pg.motivo_anulacion,c.nombre AS cliente
             FROM pago pg INNER JOIN pedido p ON p.id_pedido=pg.id_pedido
             INNER JOIN cliente c ON c.id_cliente=p.id_cliente
             WHERE pg.fecha >= $1::date AND pg.fecha < $2::date + INTERVAL '1 day'
             ORDER BY pg.fecha,pg.id_pago`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT id_gasto,fecha,concepto,descripcion,total,metodo_pago,id_usuario
             FROM gasto WHERE fecha >= $1::date AND fecha < $2::date + INTERVAL '1 day'
             ORDER BY fecha,id_gasto`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT p.id_pedido,p.fecha,p.estado,p.tipo_cliente,p.total,p.pagado,c.nombre AS cliente,
                    COALESCE(json_agg(json_build_object(
                        'nombre',pr.nombre,'cantidad',dp.cantidad,'precio',dp.precio,'subtotal',dp.subtotal
                    )) FILTER (WHERE dp.id_pedido IS NOT NULL),'[]') AS detalle
             FROM pedido p INNER JOIN cliente c ON c.id_cliente=p.id_cliente
             LEFT JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
             LEFT JOIN producto pr ON pr.id_producto=dp.id_producto
             WHERE p.fecha >= $1::date AND p.fecha < $2::date + INTERVAL '1 day'
             GROUP BY p.id_pedido,c.nombre ORDER BY p.fecha,p.id_pedido`,
            [inicio, fin],
        ),
        pool.query(
            `WITH unidades AS (
                SELECT pd.fecha,unidades.id_producto,SUM(unidades.preparados) AS preparados
                FROM produccion_diaria pd
                CROSS JOIN LATERAL (VALUES
                    (pd.id_sopa,pd.cantidad_sopa),
                    (pd.id_segundo1,pd.cantidad_segundo1),
                    (pd.id_segundo2,pd.cantidad_segundo2),
                    (pd.id_entrada,pd.cantidad_entrada),
                    (pd.id_refresco,pd.cantidad_refresco),
                    (pd.id_plato_extra,pd.cantidad_extra)
                ) AS unidades(id_producto,preparados)
                WHERE pd.fecha BETWEEN $1::date AND $2::date
                GROUP BY pd.fecha,unidades.id_producto
             )
             SELECT unidades.fecha,producto.id_producto,producto.nombre,producto.categoria,
                    unidades.preparados,
                    COALESCE(SUM(dp.cantidad) FILTER (WHERE UPPER(p.estado) NOT LIKE 'CANCEL%'),0)
                        + adicionales.cantidad AS comprometidos,
                    adicionales.cantidad AS adicionales_pendientes,
                    GREATEST(unidades.preparados-COALESCE(SUM(dp.cantidad) FILTER (WHERE UPPER(p.estado) NOT LIKE 'CANCEL%'),0)
                        - adicionales.cantidad,0) AS disponibles
             FROM unidades
             INNER JOIN producto ON producto.id_producto=unidades.id_producto
             LEFT JOIN detalle_pedido dp ON dp.id_producto=producto.id_producto
             LEFT JOIN pedido p ON p.id_pedido=dp.id_pedido AND p.fecha::date=unidades.fecha
             LEFT JOIN LATERAL (
                SELECT COALESCE(SUM((item->>'cantidad')::integer),0) AS cantidad
                FROM solicitud_adicional sa
                CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
                WHERE sa.estado='PENDIENTE' AND sa.fecha::date=unidades.fecha
                  AND (item->>'id_producto')::bigint=producto.id_producto
             ) adicionales ON TRUE
             GROUP BY unidades.fecha,producto.id_producto,producto.nombre,producto.categoria,unidades.preparados,adicionales.cantidad
             ORDER BY unidades.fecha,producto.categoria,producto.nombre`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT sa.id_solicitud,sa.id_pedido,sa.fecha,sa.estado,sa.total,c.nombre AS cliente
             FROM solicitud_adicional sa INNER JOIN pedido p ON p.id_pedido=sa.id_pedido
             INNER JOIN cliente c ON c.id_cliente=p.id_cliente
             WHERE sa.fecha >= $1::date AND sa.fecha < $2::date + INTERVAL '1 day'
             ORDER BY sa.fecha,sa.id_solicitud`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT r.id_reserva,r.fecha,r.hora,r.estado,r.nombre_cliente AS cliente,
                    COALESCE(SUM(dr.cantidad),0)::int AS cantidad_platos
             FROM reserva_plato r
             LEFT JOIN detalle_reserva_plato dr ON dr.id_reserva=r.id_reserva
             WHERE r.fecha BETWEEN $1::date AND $2::date
             GROUP BY r.id_reserva,r.fecha,r.hora,r.estado,r.nombre_cliente
             ORDER BY r.fecha,r.hora,r.id_reserva`,
            [inicio, fin],
        ),
        pool.query(
            `SELECT mp.id_movimiento,mp.fecha,mp.tipo_producto,mp.tipo_movimiento,
                    mp.cantidad,mp.saldo_resultante,c.nombre AS cliente,u.usuario
             FROM movimiento_pensionado mp INNER JOIN cliente c ON c.id_cliente=mp.id_cliente
             INNER JOIN usuario u ON u.id_usuario=mp.id_usuario
             WHERE mp.fecha >= $1::date AND mp.fecha < $2::date + INTERVAL '1 day'
             ORDER BY mp.fecha,mp.id_movimiento`,
            [inicio, fin],
        ),
    ]);
    return {
        periodo: { desde: inicio, hasta: fin },
        resumen: resumen.rows[0],
        pagos: pagos.rows,
        gastos: gastos.rows,
        pedidos: pedidos.rows,
        produccion: produccion.rows,
        adicionales: adicionales.rows,
        reservas: reservas.rows,
        movimientos_pensionados: movimientosPensionado.rows,
    };
};

const ventasHoy = async () => {

    const { rows } = await pool.query(

        `

        SELECT
            (SELECT COUNT(*)::int
             FROM pedido
             WHERE DATE(fecha)=CURRENT_DATE AND pagado IS TRUE) AS cantidad,
            (SELECT COALESCE(SUM(monto),0)
             FROM pago
             WHERE DATE(fecha)=CURRENT_DATE AND estado='CONFIRMADO') AS total,
            (SELECT COALESCE(SUM(GREATEST(p.total-COALESCE(pagos.total,0),0)),0)
             FROM pedido p
             LEFT JOIN (
                 SELECT id_pedido,SUM(monto) AS total
                 FROM pago
                 WHERE estado='CONFIRMADO'
                 GROUP BY id_pedido
             ) pagos ON pagos.id_pedido=p.id_pedido
             WHERE DATE(p.fecha)=CURRENT_DATE AND UPPER(p.estado) NOT LIKE 'CANCEL%') AS pendiente
        `

    );

    return rows[0];

};

const gastosHoy = async () => {

    const { rows } = await pool.query(

        `

        SELECT

        COALESCE(SUM(total),0) total

        FROM gasto

        WHERE DATE(fecha)=CURRENT_DATE

        `

    );

    return rows[0];

};

const pensionadosHoy = async () => {

    const { rows } = await pool.query(

        `

        SELECT

        COUNT(*) total

        FROM pedido

        WHERE tipo_cliente='PENSIONADO'

        AND DATE(fecha)=CURRENT_DATE

        `

    );

    return rows[0];

};

const eventualesHoy = async () => {

    const { rows } = await pool.query(

        `

        SELECT

        COUNT(*) total

        FROM pedido

        WHERE tipo_cliente='EVENTUAL'

        AND DATE(fecha)=CURRENT_DATE

        `

    );

    return rows[0];

};

const pedidosActivosHoy = async () => {
    const { rows } = await pool.query(
        `SELECT p.id_pedido,c.nombre AS cliente,p.fecha,p.tipo_cliente,p.estado,p.total,
                COALESCE(json_agg(json_build_object(
                    'nombre',pr.nombre,'cantidad',dp.cantidad,'precio',dp.precio,'subtotal',dp.subtotal
                )) FILTER (WHERE dp.id_pedido IS NOT NULL),'[]') AS detalle
         FROM pedido p INNER JOIN cliente c ON c.id_cliente=p.id_cliente
         LEFT JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
         LEFT JOIN producto pr ON pr.id_producto=dp.id_producto
         WHERE DATE(p.fecha)=CURRENT_DATE AND UPPER(p.estado) NOT IN ('ENTREGADO','CANCELADO','CANCELADA')
         GROUP BY p.id_pedido,c.nombre ORDER BY p.fecha DESC LIMIT 10`
    );
    return rows;
};

export default{

operativo,

ventasHoy,

gastosHoy,

pensionadosHoy,

eventualesHoy,

pedidosActivosHoy

};