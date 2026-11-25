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
                       'id_producto',dp.id_producto,'nombre',pr.nombre,'categoria',pr.categoria,
                       'cantidad',dp.cantidad,'precio',dp.precio,'subtotal',dp.subtotal,
                       'tipo_venta',CASE
                           WHEN dp.id_sopa_componente IS NOT NULL THEN 'ALMUERZO_COMPLETO'
                           WHEN pr.codigo_venta='VASO_EXTRA_REFRESCO' THEN 'VASO_EXTRA_REFRESCO'
                           ELSE 'PRODUCTO'
                       END,
                       'tipo_producto',CASE
                           WHEN dp.id_sopa_componente IS NOT NULL THEN 'ALMUERZO_COMPLETO'
                           WHEN pr.codigo_venta='VASO_EXTRA_REFRESCO' THEN 'VASO_EXTRA_REFRESCO'
                           WHEN pr.id_producto=pd.id_sopa THEN 'SOPA'
                           WHEN pr.id_producto=pd.id_segundo1 THEN 'SEGUNDO_POLLO'
                           WHEN pr.id_producto=pd.id_segundo2 THEN 'SEGUNDO_CARNE'
                           ELSE 'PRODUCTO'
                       END,
                       'sopa_incluida',sopa.nombre,
                       'segundo_elegido',segundo.nombre,
                       'refresco_incluido',dp.id_sopa_componente IS NOT NULL,
                       'refresco_acompanamiento',CASE
                           WHEN dp.id_sopa_componente IS NOT NULL THEN refresco.nombre
                           ELSE NULL
                       END
                    )) FILTER (WHERE dp.id_pedido IS NOT NULL),'[]') AS detalle
             FROM pedido p INNER JOIN cliente c ON c.id_cliente=p.id_cliente
             LEFT JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
             LEFT JOIN producto pr ON pr.id_producto=dp.id_producto
             LEFT JOIN produccion_diaria pd ON pd.fecha=p.fecha::date
             LEFT JOIN producto sopa ON sopa.id_producto=dp.id_sopa_componente
             LEFT JOIN producto segundo ON segundo.id_producto=dp.id_segundo_componente
             LEFT JOIN producto refresco ON refresco.id_producto=pd.id_refresco
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
             ),
             consumos_pedido AS (
                SELECT dp.id_producto,p.id_pedido,p.fecha::date AS fecha,dp.cantidad
                FROM detalle_pedido dp
                INNER JOIN pedido p ON p.id_pedido=dp.id_pedido
                WHERE dp.id_sopa_componente IS NULL AND dp.id_segundo_componente IS NULL
                  AND p.fecha >= $1::date AND p.fecha < $2::date + INTERVAL '1 day'
                UNION ALL
                SELECT dp.id_sopa_componente,p.id_pedido,p.fecha::date,dp.cantidad
                FROM detalle_pedido dp
                INNER JOIN pedido p ON p.id_pedido=dp.id_pedido
                WHERE dp.id_sopa_componente IS NOT NULL
                  AND p.fecha >= $1::date AND p.fecha < $2::date + INTERVAL '1 day'
                UNION ALL
                SELECT dp.id_segundo_componente,p.id_pedido,p.fecha::date,dp.cantidad
                FROM detalle_pedido dp
                INNER JOIN pedido p ON p.id_pedido=dp.id_pedido
                WHERE dp.id_segundo_componente IS NOT NULL
                  AND p.fecha >= $1::date AND p.fecha < $2::date + INTERVAL '1 day'
             ),
             pedidos AS (
                SELECT cp.fecha,cp.id_producto,
                       SUM(cp.cantidad) FILTER (WHERE UPPER(p.estado) NOT LIKE 'CANCEL%') AS cantidad
                FROM consumos_pedido cp
                INNER JOIN pedido p ON p.id_pedido=cp.id_pedido
                GROUP BY cp.fecha,cp.id_producto
             ),
             consumos_adicionales AS (
                SELECT (item->>'id_producto')::bigint AS id_producto,sa.fecha::date AS fecha,
                       (item->>'cantidad')::integer AS cantidad
                FROM solicitud_adicional sa
                CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
                WHERE sa.estado='PENDIENTE' AND sa.fecha >= $1::date AND sa.fecha < $2::date + INTERVAL '1 day'
                  AND item->>'id_sopa_componente' IS NULL
                UNION ALL
                SELECT (item->>'id_sopa_componente')::bigint,sa.fecha::date,
                       (item->>'cantidad')::integer
                FROM solicitud_adicional sa
                CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
                WHERE sa.estado='PENDIENTE' AND sa.fecha >= $1::date AND sa.fecha < $2::date + INTERVAL '1 day'
                  AND item->>'id_sopa_componente' IS NOT NULL
                UNION ALL
                SELECT (item->>'id_segundo_componente')::bigint,sa.fecha::date,
                       (item->>'cantidad')::integer
                FROM solicitud_adicional sa
                CROSS JOIN LATERAL jsonb_array_elements(sa.detalle) item
                WHERE sa.estado='PENDIENTE' AND sa.fecha >= $1::date AND sa.fecha < $2::date + INTERVAL '1 day'
                  AND item->>'id_segundo_componente' IS NOT NULL
             ),
             adicionales AS (
                SELECT fecha,id_producto,SUM(cantidad) AS cantidad
                FROM consumos_adicionales
                GROUP BY fecha,id_producto
             ),
             pensionados AS (
                SELECT consumo.fecha,consumo.id_producto,SUM(consumo.cantidad) AS cantidad
                FROM movimiento_pensionado mp
                INNER JOIN produccion_diaria pd ON pd.fecha=mp.fecha::date
                CROSS JOIN LATERAL (
                    VALUES
                        (CASE WHEN mp.tipo_producto='SOPA' THEN pd.id_sopa END,mp.fecha::date,mp.cantidad),
                        (CASE WHEN mp.tipo_producto='SEGUNDO_POLLO' THEN pd.id_segundo1 END,mp.fecha::date,mp.cantidad),
                        (CASE WHEN mp.tipo_producto='SEGUNDO_CARNE' THEN pd.id_segundo2 END,mp.fecha::date,mp.cantidad)
                ) AS consumo(id_producto,fecha,cantidad)
                WHERE mp.tipo_movimiento='CONSUMO'
                  AND mp.fecha >= $1::date AND mp.fecha < $2::date + INTERVAL '1 day'
                  AND mp.tipo_producto IN ('SOPA','SEGUNDO_POLLO','SEGUNDO_CARNE')
                  AND consumo.id_producto IS NOT NULL
                GROUP BY consumo.fecha,consumo.id_producto
             )
             SELECT unidades.fecha,producto.id_producto,producto.nombre,producto.categoria,
                    unidades.preparados,
                    COALESCE(pedidos.cantidad,0)+COALESCE(adicionales.cantidad,0)
                        +COALESCE(pensionados.cantidad,0) AS comprometidos,
                    COALESCE(adicionales.cantidad,0) AS adicionales_pendientes,
                    COALESCE(pensionados.cantidad,0) AS consumos_pensionados,
                    GREATEST(unidades.preparados-COALESCE(pedidos.cantidad,0)
                        -COALESCE(adicionales.cantidad,0)-COALESCE(pensionados.cantidad,0),0) AS disponibles
             FROM unidades
             INNER JOIN producto ON producto.id_producto=unidades.id_producto
             LEFT JOIN pedidos ON pedidos.id_producto=producto.id_producto AND pedidos.fecha=unidades.fecha
             LEFT JOIN adicionales ON adicionales.id_producto=producto.id_producto AND adicionales.fecha=unidades.fecha
             LEFT JOIN pensionados ON pensionados.id_producto=producto.id_producto AND pensionados.fecha=unidades.fecha
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