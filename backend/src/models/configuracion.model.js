import pool from "../config/db.js";

const obtener = async () => {
    const existente = await pool.query(
        "SELECT * FROM configuracion LIMIT 1",
    );

    if (existente.rows[0]) {
        return existente.rows[0];
    }

    const insertada = await pool.query(
        `INSERT INTO configuracion (
            id_configuracion,
            precio_almuerzo,
            precio_sopa,
            precio_segundo,
            precio_plato_extra,
            precio_entrada,
            precio_refresco
        )
        VALUES (1, 0, 0, 0, 0, 0, 0)
        ON CONFLICT (id_configuracion)
        DO NOTHING
        RETURNING *`
    );

    if (insertada.rows[0]) {
        return insertada.rows[0];
    }

    const resultado = await pool.query(
        "SELECT * FROM configuracion LIMIT 1",
    );

    return resultado.rows[0];

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