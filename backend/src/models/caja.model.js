import pool from "../config/db.js";

const listar = async () => {

    const [rows] = await pool.query(

        `

        SELECT

        c.id_caja,

        c.fecha,

        c.concepto,

        c.ingreso,

        c.egreso,

        c.saldo,

        u.usuario

        FROM caja c

        INNER JOIN usuario u

        ON c.id_usuario=u.id_usuario

        ORDER BY c.id_caja DESC

        `

    );

    return rows;

};

const registrar = async (datos) => {

    const [resultado] = await pool.query(

        `

        INSERT INTO caja

        (

        fecha,

        concepto,

        ingreso,

        egreso,

        saldo,

        id_usuario

        )

        VALUES

        (NOW(),?,?,?,?,?)

        `,

        [

            datos.concepto,

            datos.ingreso,

            datos.egreso,

            datos.saldo,

            datos.id_usuario

        ]

    );

    return resultado;

};

export default{

listar,

registrar

};