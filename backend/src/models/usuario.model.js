import pool from "../config/db.js";

const listar = async () => {

    const { rows } = await pool.query(

        "SELECT * FROM usuario ORDER BY id_usuario DESC"

    );

    return rows;

};

const obtener = async (id) => {

    const { rows } = await pool.query(

        "SELECT * FROM usuario WHERE id_usuario=$1",

        [id]

    );

    return rows[0];

};

const crear = async (datos) => {

    const {

        id_persona,

        usuario,

        password,

        rol,

        estado

    } = datos;

    const resultado = await pool.query(

        `

        INSERT INTO usuario

        (

            id_persona,

            usuario,

            password,

            rol,

            estado

        )

        VALUES

        ($1, $2, $3, $4, $5)

        `,

        [

            id_persona,

            usuario,

            password,

            rol,

            estado

        ]

    );

    return resultado;

};

const actualizar = async (id, datos) => {

    const {

        usuario,

        password,

        rol,

        estado

    } = datos;

    const resultado = await pool.query(

        `

        UPDATE usuario

        SET

        usuario=$1,

        password=$2,

        rol=$3,

        estado=$4

        WHERE id_usuario=$5

        `,

        [

            usuario,

            password,

            rol,

            estado,

            id

        ]

    );

    return resultado;

};

const eliminar = async (id) => {

    const resultado = await pool.query(

        "DELETE FROM usuario WHERE id_usuario=$1",

        [id]

    );

    return resultado;

};

export default {

    listar,

    obtener,

    crear,

    actualizar,

    eliminar

};