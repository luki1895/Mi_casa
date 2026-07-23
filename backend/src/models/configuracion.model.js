import pool from "../config/db.js";

const obtener = async () => {

    const [rows] = await pool.query(

        "SELECT * FROM configuracion LIMIT 1"

    );

    return rows[0];

};

const actualizar = async (datos) => {

    const {

        precio_almuerzo,

        precio_sopa,

        precio_segundo,

        precio_plato_extra

    } = datos;

    const [resultado] = await pool.query(

        `

        UPDATE configuracion

        SET

        precio_almuerzo = ?,

        precio_sopa = ?,

        precio_segundo = ?,

        precio_plato_extra = ?

        WHERE id_configuracion = 1

        `,

        [

            precio_almuerzo,

            precio_sopa,

            precio_segundo,

            precio_plato_extra

        ]

    );

    return resultado;

};

export default {

    obtener,

    actualizar

};