import pool from "../config/db.js";

const ventasHoy = async () => {

    const [rows] = await pool.query(

        `

        SELECT

        COUNT(*) cantidad,

        SUM(total) total

        FROM pedido

        WHERE DATE(fecha)=CURDATE()

        `

    );

    return rows[0];

};

const gastosHoy = async () => {

    const [rows] = await pool.query(

        `

        SELECT

        IFNULL(SUM(total),0) total

        FROM gasto

        WHERE DATE(fecha)=CURDATE()

        `

    );

    return rows[0];

};

const pensionadosHoy = async () => {

    const [rows] = await pool.query(

        `

        SELECT

        COUNT(*) total

        FROM pedido

        WHERE tipo_cliente='PENSIONADO'

        AND DATE(fecha)=CURDATE()

        `

    );

    return rows[0];

};

const eventualesHoy = async () => {

    const [rows] = await pool.query(

        `

        SELECT

        COUNT(*) total

        FROM pedido

        WHERE tipo_cliente='EVENTUAL'

        AND DATE(fecha)=CURDATE()

        `

    );

    return rows[0];

};

export default{

ventasHoy,

gastosHoy,

pensionadosHoy,

eventualesHoy

};