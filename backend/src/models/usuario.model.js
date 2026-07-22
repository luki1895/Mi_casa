import pool from "../config/db.js";

const listar = async () => {

    const [rows] = await pool.query(

        "SELECT * FROM usuario ORDER BY id_usuario DESC"

    );

    return rows;

};

const obtener = async (id) => {

    const [rows] = await pool.query(

        "SELECT * FROM usuario WHERE id_usuario=?",

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

    const [resultado] = await pool.query(

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

        (?, ?, ?, ?, ?)

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

    const [resultado] = await pool.query(

        `

        UPDATE usuario

        SET

        usuario=?,

        password=?,

        rol=?,

        estado=?

        WHERE id_usuario=?

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

    const [resultado] = await pool.query(

        "DELETE FROM usuario WHERE id_usuario=?",

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