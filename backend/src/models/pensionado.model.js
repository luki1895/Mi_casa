import pool from "../config/db.js";

const camposSaldo = {
    SOPA: "saldo_sopas",
    SEGUNDO: "saldo_segundos",
};

const obtenerDetalle = async (idCliente) => {
    const cliente = await pool.query(
        `SELECT id_cliente,nombre,tipo_cliente,saldo_sopas,saldo_segundos
         FROM cliente
         WHERE id_cliente=$1 AND UPPER(estado::text) NOT IN ('INACTIVO','FALSE')`,
        [idCliente],
    );
    if (!cliente.rowCount) throw Object.assign(new Error("Cliente no encontrado o inactivo"), { status: 404 });
    if (cliente.rows[0].tipo_cliente !== "PENSIONADO") {
        throw Object.assign(new Error("Los saldos están disponibles únicamente para clientes pensionados"), { status: 400 });
    }

    const movimientos = await pool.query(
        `SELECT mp.id_movimiento,mp.fecha,mp.tipo_producto,mp.tipo_movimiento,
                mp.cantidad,mp.saldo_resultante,mp.observaciones,u.usuario
         FROM movimiento_pensionado mp
         LEFT JOIN usuario u ON u.id_usuario=mp.id_usuario
         WHERE mp.id_cliente=$1
         ORDER BY mp.fecha DESC,mp.id_movimiento DESC
         LIMIT 100`,
        [idCliente],
    );

    return { ...cliente.rows[0], movimientos: movimientos.rows };
};

const registrarMovimiento = async (idCliente, idUsuario, datos, tipoMovimiento) => {
    const tipoProducto = String(datos.tipo_producto || "").trim().toUpperCase();
    const campoSaldo = camposSaldo[tipoProducto];
    const cantidad = Number(datos.cantidad);
    const observaciones = String(datos.observaciones || "").trim();

    if (!campoSaldo) {
        throw Object.assign(new Error("El producto debe ser SOPA o SEGUNDO"), { status: 400 });
    }
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) {
        throw Object.assign(new Error("La cantidad debe ser un entero positivo"), { status: 400 });
    }
    if (observaciones.length > 500) {
        throw Object.assign(new Error("Las observaciones no deben superar 500 caracteres"), { status: 400 });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const resultadoCliente = await client.query(
            `SELECT id_cliente,tipo_cliente,${campoSaldo} AS saldo
             FROM cliente
             WHERE id_cliente=$1 AND UPPER(estado::text) NOT IN ('INACTIVO','FALSE')
             FOR UPDATE`,
            [idCliente],
        );
        const cliente = resultadoCliente.rows[0];
        if (!cliente) throw Object.assign(new Error("Cliente no encontrado o inactivo"), { status: 404 });
        if (cliente.tipo_cliente !== "PENSIONADO") {
            throw Object.assign(new Error("Los saldos están disponibles únicamente para clientes pensionados"), { status: 400 });
        }

        const saldoActual = cliente.saldo === null ? null : Number(cliente.saldo);
        if (tipoMovimiento === "CONSUMO" && (saldoActual === null || saldoActual < cantidad)) {
            throw Object.assign(new Error(saldoActual === null
                ? `El saldo de ${tipoProducto.toLowerCase()} todavía no está asignado`
                : `Saldo insuficiente de ${tipoProducto.toLowerCase()}`), { status: 409 });
        }
        const saldoResultante = tipoMovimiento === "CONSUMO"
            ? saldoActual - cantidad
            : (saldoActual ?? 0) + cantidad;
        if (saldoResultante > 2147483647) {
            throw Object.assign(new Error("El saldo resultante excede el máximo permitido"), { status: 400 });
        }

        await client.query(
            `UPDATE cliente SET ${campoSaldo}=$1 WHERE id_cliente=$2`,
            [saldoResultante, idCliente],
        );
        const movimiento = await client.query(
            `INSERT INTO movimiento_pensionado
                (id_cliente,id_usuario,tipo_producto,tipo_movimiento,cantidad,saldo_resultante,observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''))
             RETURNING id_movimiento,fecha,tipo_producto,tipo_movimiento,cantidad,saldo_resultante,observaciones`,
            [idCliente, idUsuario, tipoProducto, tipoMovimiento, cantidad, saldoResultante, observaciones],
        );
        await client.query("COMMIT");
        return { movimiento: movimiento.rows[0], saldo: saldoResultante };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export default { obtenerDetalle, registrarMovimiento };
