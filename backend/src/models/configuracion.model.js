import pool from "../config/db.js";

const obtener = async () => {

    const { rows } = await pool.query(

        "SELECT * FROM configuracion LIMIT 1"

    );

    return rows[0];

};

const actualizar = async (datos) => {

    const {

        precio_almuerzo,

        precio_sopa,

        precio_segundo,

        precio_plato_extra,

        precio_entrada,

        precio_refresco

    } = datos;

    const resultado = await pool.query(

        `

        UPDATE configuracion

        SET

        precio_almuerzo = $1,

        precio_sopa = $2,

        precio_segundo = $3,

        precio_plato_extra = $4,

        precio_entrada = $5,

        precio_refresco = $6

        WHERE id_configuracion = 1

        `,

        [

            precio_almuerzo,

            precio_sopa,

            precio_segundo,

            precio_plato_extra

            ,precio_entrada

            ,precio_refresco

        ]

    );

    return resultado;

};

export default {

    obtener,

    actualizar

};