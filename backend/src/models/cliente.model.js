import pool from "../config/db.js";

const validarSaldo = (campo, valor) => {
    if (valor === undefined || valor === null || valor === "") return;
    const saldo = Number(valor);
    if (!Number.isInteger(saldo) || saldo < 0) {
        throw Object.assign(new Error(`El campo ${campo} debe ser un entero no negativo`), { status: 400 });
    }
};

const listar = async () => {

    const { rows } = await pool.query(

        `

        SELECT *

        FROM cliente

        ORDER BY nombre ASC

        `

    );

    return rows;

};

const listarParaPedidos = async () => {
    const { rows } = await pool.query(
        `SELECT id_cliente, nombre, telefono, tipo_cliente, estado
                 FROM cliente
                 WHERE UPPER(estado::text) NOT IN ('INACTIVO', 'FALSE')
         ORDER BY nombre ASC`
    );
    return rows;
};

const obtenerPortal = async (idUsuario) => {
    const clienteResult = await pool.query(
        `SELECT c.id_cliente, c.nombre, c.telefono, c.tipo_cliente, c.saldo_pensiones,
                c.saldo_sopas, c.saldo_segundos
         FROM usuario u
         INNER JOIN cliente c ON c.id_cliente=u.id_cliente
         WHERE u.id_usuario=$1 AND UPPER(c.estado::text) NOT IN ('INACTIVO','FALSE')`,
        [idUsuario]
    );
    if (!clienteResult.rowCount) {
        throw Object.assign(new Error("Esta cuenta no está vinculada a un cliente activo. Solicita al administrador que la vincule."), { status: 404 });
    }
    const cliente = clienteResult.rows[0];
    const [pedidosResult, reservasResult] = await Promise.all([
        pool.query(
            `SELECT p.id_pedido,p.fecha,p.estado,p.total,p.pagado,p.observaciones,
                    COALESCE(json_agg(json_build_object(
                        'nombre',pr.nombre,'cantidad',dp.cantidad,'precio',dp.precio,'subtotal',dp.subtotal
                    )) FILTER (WHERE dp.id_pedido IS NOT NULL),'[]') AS detalle
             FROM pedido p
             LEFT JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
             LEFT JOIN producto pr ON pr.id_producto=dp.id_producto
             WHERE p.id_cliente=$1
             GROUP BY p.id_pedido
             ORDER BY p.fecha DESC,p.id_pedido DESC
             LIMIT 50`,
            [cliente.id_cliente]
        ),
        pool.query(
            `SELECT id_reserva,fecha,hora,cantidad_personas,observaciones,estado
             FROM reserva WHERE id_cliente=$1
             ORDER BY fecha DESC,hora DESC LIMIT 50`,
            [cliente.id_cliente]
        ),
    ]);
    return { ...cliente, pedidos: pedidosResult.rows, reservas: reservasResult.rows };
};

const crearReserva = async (idUsuario, datos) => {
    const fecha = String(datos.fecha || "");
    const hora = String(datos.hora || "");
    const personas = Number(datos.cantidad_personas);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora) || !Number.isInteger(personas) || personas < 1) {
        throw Object.assign(new Error("Indica una hora y una cantidad válida de personas para la reserva"), { status: 400 });
    }
    const cliente = await pool.query(
        `SELECT c.id_cliente FROM usuario u
         INNER JOIN cliente c ON c.id_cliente=u.id_cliente
         WHERE u.id_usuario=$1 AND UPPER(c.estado::text) NOT IN ('INACTIVO','FALSE')`,
        [idUsuario]
    );
    if (!cliente.rowCount) {
        throw Object.assign(new Error("Esta cuenta no está vinculada a un cliente activo"), { status: 404 });
    }
    const resultado = await pool.query(
        `INSERT INTO reserva (id_cliente,fecha,hora,cantidad_personas,observaciones)
         SELECT $1,$2::date,$3::time,$4,NULLIF(BTRIM($5),'')
         WHERE $2::date=CURRENT_DATE
         RETURNING id_reserva,fecha,hora,cantidad_personas,observaciones,estado`,
        [cliente.rows[0].id_cliente,fecha,hora,personas,String(datos.observaciones || "")]
    );
    if (!resultado.rowCount) {
        throw Object.assign(new Error("Por ahora solo se aceptan solicitudes de reserva para hoy"), { status: 400 });
    }
    return resultado.rows[0];
};

const vincularCuenta = async (idCliente, nombreUsuario) => {
    const resultado = await pool.query(
        `UPDATE usuario
         SET id_cliente=$1
         WHERE LOWER(usuario)=LOWER($2)
           AND LOWER(rol) LIKE '%cliente%'
           AND id_cliente IS NULL
         RETURNING id_usuario,usuario`,
        [idCliente,String(nombreUsuario || "").trim()]
    );
    if (!resultado.rowCount) {
        throw Object.assign(new Error("No se encontró una cuenta de cliente sin vínculo con ese usuario"), { status: 404 });
    }
    return resultado.rows[0];
};

const obtener = async (id) => {

    const { rows } = await pool.query(

        `

        SELECT *

        FROM cliente

        WHERE id_cliente=$1

        `,

        [id]

    );

    return rows[0];

};

const crear = async (datos, db = pool) => {
    const {
        nombre,
        telefono,
        tipo_cliente,
        saldo_pensiones,
        saldo_sopas,
        saldo_segundos,
        estado,
    } = datos;

    validarSaldo("saldo_sopas", saldo_sopas);
    validarSaldo("saldo_segundos", saldo_segundos);

    const resultado = await db.query(
        `INSERT INTO cliente
            (nombre, telefono, tipo_cliente, saldo_pensiones, saldo_sopas, saldo_segundos, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_cliente`,
        [
            nombre,
            telefono,
            tipo_cliente,
            saldo_pensiones ?? 0,
            saldo_sopas === "" ? null : saldo_sopas ?? null,
            saldo_segundos === "" ? null : saldo_segundos ?? null,
            estado ?? true,
        ]
    );

    return resultado;

};

const actualizar = async (id, datos) => {
    const camposPermitidos = [
        "nombre",
        "telefono",
        "tipo_cliente",
        "saldo_pensiones",
        "saldo_sopas",
        "saldo_segundos",
        "estado",
    ];
    const campos = [];
    const valores = [];

    for (const campo of camposPermitidos) {
        if (!Object.prototype.hasOwnProperty.call(datos, campo)) continue;
        const valor = datos[campo];
        if (campo === "saldo_sopas" || campo === "saldo_segundos") validarSaldo(campo, valor);
        valores.push(valor === "" && (campo === "saldo_sopas" || campo === "saldo_segundos") ? null : valor);
        campos.push(`${campo}=$${valores.length}`);
    }

    if (!campos.length) {
        return pool.query("SELECT id_cliente FROM cliente WHERE id_cliente=$1", [id]);
    }

    valores.push(id);
    const resultado = await pool.query(
        `UPDATE cliente SET ${campos.join(", ")} WHERE id_cliente=$${valores.length}
         RETURNING id_cliente`,
        valores
    );

    return resultado;

};

const eliminar = async (id) => {

    const resultado = await pool.query(

        `

        DELETE FROM cliente

        WHERE id_cliente=$1

        `,

        [id]

    );

    return resultado;

};

export default {

    listar,

    listarParaPedidos,
    obtenerPortal,
    crearReserva,
    vincularCuenta,
    obtener,

    crear,

    actualizar,

    eliminar

};