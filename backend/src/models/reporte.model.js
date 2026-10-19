import pool from "../config/db.js";

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

ventasHoy,

gastosHoy,

pensionadosHoy,

eventualesHoy,

pedidosActivosHoy

};