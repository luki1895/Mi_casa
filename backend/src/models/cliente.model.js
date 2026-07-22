import pool from "../config/db.js";

const listar = async () => {

    const [rows] = await pool.query(

        `

        SELECT *

        FROM cliente

        ORDER BY nombre ASC

        `

    );

    return rows;

};

const obtener = async (id) => {

    const [rows] = await pool.query(

        `

        SELECT *

        FROM cliente

        WHERE id_cliente=?

        `,

        [id]

    );

    return rows[0];

};

const crear = async (datos) => {

    const {

        nombre,

        telefono,

        tipo_cliente,

        saldo_pensiones,

        estado

    } = datos;

    const [resultado] = await pool.query(

        `

        INSERT INTO cliente

        (

            nombre,

            telefono,

            tipo_cliente,

            saldo_pensiones,

            estado

        )

        VALUES

        (?, ?, ?, ?, ?)

        `,

        [

            nombre,

            telefono,

            tipo_cliente,

            saldo_pensiones,

            estado

        ]

    );

    return resultado;

};

const actualizar = async (id, datos) => {

    const {

        nombre,

        telefono,

        tipo_cliente,

        saldo_pensiones,

        estado

    } = datos;

    const [resultado] = await pool.query(

        `

        UPDATE cliente

        SET

        nombre=?,

        telefono=?,

        tipo_cliente=?,

        saldo_pensiones=?,

        estado=?

        WHERE id_cliente=?

        `,

        [

            nombre,

            telefono,

            tipo_cliente,

            saldo_pensiones,

            estado,

            id

        ]

    );

    return resultado;

};

const eliminar = async (id) => {

    const [resultado] = await pool.query(

        `

        DELETE FROM cliente

        WHERE id_cliente=?

        `,

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