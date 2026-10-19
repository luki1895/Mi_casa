import pool from "../config/db.js";
import produccionModel from "./produccion.model.js";

const agruparProductosSolicitados = (detalle) => {
    const cantidades = new Map();
    for (const item of detalle) {
        const idProducto = Number(item.id_producto);
        const cantidad = Number(item.cantidad);
        if (!Number.isInteger(idProducto) || idProducto < 1 || !Number.isInteger(cantidad) || cantidad < 1) {
            throw Object.assign(new Error("El detalle contiene productos o cantidades inválidas"), { status: 400 });
        }
        cantidades.set(idProducto, (cantidades.get(idProducto) || 0) + cantidad);
    }
    return Array.from(cantidades, ([id_producto, cantidad]) => ({ id_producto, cantidad }));
};

const verificarCajaAbierta = async (client, bloquearCierre = false) => {
    const { rowCount } = await client.query(
        `SELECT a.id_apertura
         FROM apertura_caja a
         LEFT JOIN cierre_caja c ON c.fecha::date=a.fecha
         WHERE a.fecha=CURRENT_DATE AND c.id_cierre IS NULL
         FOR ${bloquearCierre ? "UPDATE" : "SHARE"} OF a`
    );
    if (!rowCount) throw Object.assign(new Error("La caja no está abierta para el turno de hoy"), { status: 409 });
};

const abrirCaja = async (datos, idUsuario) => {
    const montoInicial = Number(datos.monto_inicial);
    if (!Number.isFinite(montoInicial) || montoInicial < 0) {
        throw Object.assign(new Error("El monto inicial debe ser válido y no negativo"), { status: 400 });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext('cierre-caja:' || CURRENT_DATE::text))");
        const cierre = await client.query("SELECT id_cierre FROM cierre_caja WHERE fecha::date=CURRENT_DATE LIMIT 1");
        if (cierre.rowCount) throw Object.assign(new Error("La caja de hoy ya fue cerrada y no se puede volver a abrir"), { status: 409 });
        const apertura = await client.query(
            `INSERT INTO apertura_caja (id_usuario,monto_inicial)
             VALUES ($1,$2) ON CONFLICT (fecha) DO NOTHING
             RETURNING id_apertura,fecha,id_usuario,monto_inicial,abierta_en`,
            [idUsuario, montoInicial]
        );
        if (!apertura.rowCount) throw Object.assign(new Error("Ya existe una apertura de caja para hoy"), { status: 409 });
        await client.query(
            "INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario) VALUES (NOW(),'Apertura de caja',$1,0,$1,$2)",
            [montoInicial,idUsuario]
        );
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'ABRIR','caja',$2,$3)",
            [idUsuario,apertura.rows[0].id_apertura,JSON.stringify(apertura.rows[0])]
        );
        await client.query("COMMIT");
        return apertura.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const listarPedidosCaja = async () => {
    const { rows } = await pool.query(
        `SELECT p.id_pedido, c.nombre AS cliente, c.tipo_cliente, p.fecha, p.estado,
                p.total, p.pagado, p.observaciones,
                COALESCE((SELECT SUM(pg.monto) FROM pago pg WHERE pg.id_pedido=p.id_pedido AND pg.estado='CONFIRMADO'),0) AS pagado_total,
                COALESCE(json_agg(json_build_object(
                    'id_producto', pr.id_producto, 'nombre', pr.nombre,
                    'cantidad', dp.cantidad, 'precio', dp.precio, 'subtotal', dp.subtotal
                )) FILTER (WHERE dp.id_pedido IS NOT NULL), '[]') AS detalle
         FROM pedido p
         INNER JOIN cliente c ON c.id_cliente=p.id_cliente
         LEFT JOIN detalle_pedido dp ON dp.id_pedido=p.id_pedido
         LEFT JOIN producto pr ON pr.id_producto=dp.id_producto
         WHERE UPPER(p.estado) NOT LIKE 'CANCEL%'
         GROUP BY p.id_pedido,c.nombre,c.tipo_cliente
         ORDER BY p.fecha DESC, p.id_pedido DESC`
    );
    return rows.map((pedido) => ({
        ...pedido,
        saldo_pendiente: Math.max(Number(pedido.total) - Number(pedido.pagado_total), 0),
    }));
};

const listarPagos = async () => {
    const { rows } = await pool.query(
        `SELECT pg.id_pago, pg.id_pedido, c.nombre AS cliente, pg.fecha,
                pg.monto, pg.metodo, pg.recibido, pg.cambio, pg.estado, u.usuario
         FROM pago pg
         INNER JOIN pedido p ON p.id_pedido=pg.id_pedido
         INNER JOIN cliente c ON c.id_cliente=p.id_cliente
         INNER JOIN usuario u ON u.id_usuario=pg.id_usuario
         ORDER BY pg.fecha DESC LIMIT 200`
    );
    return rows;
};

const registrarGasto = async (datos, idUsuario) => {
    const concepto = String(datos.concepto || "").trim();
    const descripcion = String(datos.descripcion || "").trim();
    const total = Number(datos.total);
    const metodoPago = String(datos.metodo_pago || "EFECTIVO").toUpperCase();
    if (!concepto || !(total > 0) || !Number.isFinite(total)) {
        throw Object.assign(new Error("Indica un concepto y un importe mayor que cero"), { status: 400 });
    }
    if (!["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"].includes(metodoPago)) {
        throw Object.assign(new Error("Método de salida no válido"), { status: 400 });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await verificarCajaAbierta(client);
        const gasto = await client.query(
            `INSERT INTO gasto (fecha,concepto,descripcion,cantidad,precio_unitario,total,id_usuario,metodo_pago)
             VALUES (COALESCE($1::timestamptz,NOW()),$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [datos.fecha || null, concepto, descripcion || null, Number(datos.cantidad || 1), Number(datos.precio_unitario || total), total, idUsuario, metodoPago]
        );
        if (metodoPago === "EFECTIVO") {
            const saldoResult = await client.query("SELECT COALESCE(SUM(ingreso-egreso),0) AS saldo FROM caja WHERE fecha::date=CURRENT_DATE");
            const saldo = Number(saldoResult.rows[0].saldo) - total;
            await client.query(
                "INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario) VALUES (NOW(),$1,0,$2,$3,$4)",
                [`Gasto: ${concepto}`, total, saldo, idUsuario]
            );
        }
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'REGISTRAR','gasto',$2,$3)",
            [idUsuario, gasto.rows[0].id_gasto, JSON.stringify({ ...gasto.rows[0], metodo_pago: metodoPago })]
        );
        await client.query("COMMIT");
        return gasto.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const listarGastos = async () => {
    const { rows } = await pool.query("SELECT * FROM gasto ORDER BY fecha DESC LIMIT 200");
    return rows;
};

const panelCaja = async () => {
    const [ventas, gastos, saldo, pedidos, cierre, apertura] = await Promise.all([
        pool.query("SELECT COALESCE(SUM(monto),0) AS total FROM pago WHERE fecha::date=CURRENT_DATE AND estado='CONFIRMADO'"),
        pool.query("SELECT COALESCE(SUM(total),0) AS total FROM gasto WHERE fecha::date=CURRENT_DATE"),
        pool.query("SELECT COALESCE(SUM(ingreso-egreso),0) AS total FROM caja WHERE fecha::date=CURRENT_DATE"),
        pool.query("SELECT COUNT(*)::int AS total FROM pedido WHERE fecha::date=CURRENT_DATE AND pagado=FALSE AND UPPER(estado) NOT LIKE 'CANCEL%'"),
        pool.query("SELECT id_cierre,fecha,saldo_esperado,monto_contado,diferencia FROM cierre_caja WHERE fecha::date=CURRENT_DATE ORDER BY fecha DESC LIMIT 1"),
        pool.query(
            `SELECT a.id_apertura,a.fecha,a.id_usuario,a.monto_inicial,a.abierta_en,u.usuario AS responsable
             FROM apertura_caja a INNER JOIN usuario u ON u.id_usuario=a.id_usuario
             WHERE a.fecha=CURRENT_DATE LIMIT 1`
        ),
    ]);
    const aperturaActual = apertura.rows[0] || null;
    const cierreActual = cierre.rows[0] || null;
    return {
        ventas: Number(ventas.rows[0].total),
        gastos: Number(gastos.rows[0].total),
        saldo_esperado: Number(saldo.rows[0].total),
        pedidos_pendientes: pedidos.rows[0].total,
        cierre: cierreActual,
        apertura: aperturaActual,
        estado_caja: cierreActual ? "CERRADA" : aperturaActual ? "ABIERTA" : "SIN_ABRIR",
    };
};

const reporteCaja = async () => {
    const [pagos, gastos] = await Promise.all([
        pool.query(
            `SELECT metodo,COALESCE(SUM(monto),0) AS total,COUNT(*)::int AS cantidad
             FROM pago
             WHERE fecha::date=CURRENT_DATE AND estado='CONFIRMADO'
             GROUP BY metodo ORDER BY metodo`
        ),
        pool.query(
            `SELECT COALESCE(metodo_pago,'EFECTIVO') AS metodo,COALESCE(SUM(total),0) AS total,COUNT(*)::int AS cantidad
             FROM gasto
             WHERE fecha::date=CURRENT_DATE
             GROUP BY COALESCE(metodo_pago,'EFECTIVO')
             ORDER BY COALESCE(metodo_pago,'EFECTIVO')`
        ),
    ]);
    return {
        fecha: new Date().toISOString().slice(0, 10),
        pagos: pagos.rows,
        gastos: gastos.rows,
        total_pagos: pagos.rows.reduce((sum, item) => sum + Number(item.total), 0),
        total_gastos: gastos.rows.reduce((sum, item) => sum + Number(item.total), 0),
    };
};

const cerrarCaja = async (datos, idUsuario) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext('cierre-caja:' || CURRENT_DATE::text))");
        await verificarCajaAbierta(client, true);
        const yaCerrada = await client.query("SELECT id_cierre FROM cierre_caja WHERE fecha::date=CURRENT_DATE LIMIT 1");
        if (yaCerrada.rowCount) throw Object.assign(new Error("La caja de hoy ya fue cerrada"), { status: 409 });
        const pendientes = await client.query(
            `SELECT
                (SELECT COUNT(*) FROM pedido
                 WHERE fecha::date=CURRENT_DATE AND pagado=FALSE AND UPPER(estado) NOT LIKE 'CANCEL%') AS pedidos,
                (SELECT COUNT(*) FROM solicitud_adicional WHERE estado='PENDIENTE') AS adicionales`
        );
        if (Number(pendientes.rows[0].pedidos) > 0 || Number(pendientes.rows[0].adicionales) > 0) {
            throw Object.assign(new Error("Resuelve los pedidos pendientes de cobro y los adicionales antes de cerrar la caja"), { status: 409 });
        }
        const saldo = await client.query("SELECT COALESCE(SUM(ingreso-egreso),0) AS total FROM caja WHERE fecha::date=CURRENT_DATE");
        const esperado = Number(saldo.rows[0].total);
        const contado = Number(datos.monto_contado);
        if (!Number.isFinite(contado) || contado < 0) throw Object.assign(new Error("El monto contado debe ser válido y no negativo"), { status: 400 });
        const diferencia = contado - esperado;
        const cierre = await client.query(
            `INSERT INTO cierre_caja (id_usuario,saldo_esperado,monto_contado,diferencia,observaciones)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [idUsuario, esperado, contado, diferencia, String(datos.observaciones || "").trim() || null]
        );
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'CERRAR','caja',$2,$3)",
            [idUsuario, cierre.rows[0].id_cierre, JSON.stringify(cierre.rows[0])]
        );
        await client.query("COMMIT");
        return cierre.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const registrarPago = async (idPedido, datos, idUsuario) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await verificarCajaAbierta(client);
        const result = await client.query("SELECT id_pedido,total,pagado,estado FROM pedido WHERE id_pedido=$1 FOR UPDATE", [idPedido]);
        if (!result.rowCount) throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        const pedido = result.rows[0];
        if (String(pedido.estado).toUpperCase().startsWith("CANCEL")) throw Object.assign(new Error("No se puede cobrar un pedido cancelado"), { status: 409 });
        const sum = await client.query("SELECT COALESCE(SUM(monto),0) AS total FROM pago WHERE id_pedido=$1 AND estado='CONFIRMADO'", [idPedido]);
        const saldo = Math.max(Number(pedido.total) - Number(sum.rows[0].total), 0);
        const monto = datos.monto == null ? saldo : Number(datos.monto);
        const recibido = Number(datos.recibido);
        const metodo = String(datos.metodo || "EFECTIVO").toUpperCase();
        if (!(monto > 0) || monto > saldo || !Number.isFinite(recibido) || recibido < monto) {
            throw Object.assign(new Error("El importe recibido debe cubrir el cobro y no superar el saldo pendiente"), { status: 400 });
        }
        if (!["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"].includes(metodo)) throw Object.assign(new Error("Método de pago no válido"), { status: 400 });
        const pago = await client.query(
            `INSERT INTO pago (id_pedido,id_usuario,monto,metodo,recibido,cambio)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [idPedido, idUsuario, monto, metodo, recibido, metodo === "EFECTIVO" ? recibido - monto : 0]
        );
        const pagado = Number(sum.rows[0].total) + monto >= Number(pedido.total);
        if (pagado) await client.query("UPDATE pedido SET pagado=TRUE,estado=CASE WHEN UPPER(estado)='PENDIENTE' THEN 'EN_PREPARACION' ELSE estado END WHERE id_pedido=$1", [idPedido]);
        if (metodo === "EFECTIVO") {
            const saldoCaja = await client.query("SELECT COALESCE(SUM(ingreso-egreso),0) AS total FROM caja WHERE fecha::date=CURRENT_DATE");
            await client.query(
                "INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario) VALUES (NOW(),$1,$2,0,$3,$4)",
                [`Pago pedido #${idPedido}`, monto, Number(saldoCaja.rows[0].total) + monto, idUsuario]
            );
        }
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'COBRAR','pago',$2,$3)",
            [idUsuario, pago.rows[0].id_pago, JSON.stringify({ id_pedido: idPedido, monto, metodo, pagado })]
        );
        await client.query("COMMIT");
        return { ...pago.rows[0], saldo_pendiente: Math.max(saldo - monto, 0), pedido_pagado: pagado };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const agregarDetallePedido = async (idPedido, datos, idUsuario) => {
    if (!Array.isArray(datos.detalle) || !datos.detalle.length) {
        throw Object.assign(new Error("Agrega al menos un producto al pedido"), { status: 400 });
    }
    const fecha = new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
        const pedidoResult = await client.query(
            "SELECT id_pedido,total,pagado,estado,observaciones FROM pedido WHERE id_pedido=$1 FOR UPDATE",
            [idPedido]
        );
        if (!pedidoResult.rowCount) throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
        const pedido = pedidoResult.rows[0];
        if (pedido.pagado || String(pedido.estado).toUpperCase() !== "PENDIENTE") {
            throw Object.assign(new Error("Solo se pueden editar pedidos pendientes y aún no pagados"), { status: 409 });
        }
        const solicitados = agruparProductosSolicitados(datos.detalle);
        const menu = await produccionModel.listarMenu(fecha, client, true);
        const detalle = solicitados.map(({ id_producto, cantidad }) => {
            const plato = menu.find((producto) => Number(producto.id_producto) === id_producto);
            if (!plato || Number(plato.stock) < cantidad) {
                throw Object.assign(new Error("Cantidad inválida o disponibilidad insuficiente"), { status: 409 });
            }
            return { id_producto, nombre: plato.nombre, cantidad, precio: Number(plato.precio), subtotal: Number(plato.precio) * cantidad };
        });
        for (const item of detalle) {
            await client.query(
                "INSERT INTO detalle_pedido (id_pedido,id_producto,cantidad,precio,subtotal) VALUES ($1,$2,$3,$4,$5)",
                [idPedido,item.id_producto,item.cantidad,item.precio,item.subtotal]
            );
        }
        const totalAgregado = detalle.reduce((suma, item) => suma + item.subtotal, 0);
        const observaciones = String(datos.observaciones || "").trim();
        await client.query(
            `UPDATE pedido
             SET total=total+$1, observaciones=COALESCE(NULLIF($2,''),observaciones)
             WHERE id_pedido=$3`,
            [totalAgregado,observaciones,idPedido]
        );
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'MODIFICAR','pedido',$2,$3)",
            [idUsuario,idPedido,JSON.stringify({ detalle, total_agregado: totalAgregado, observaciones })]
        );
        await client.query("COMMIT");
        return { id_pedido: Number(idPedido), total_agregado: totalAgregado };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const listarAdicionales = async () => {
    const { rows } = await pool.query(
        `SELECT sa.id_solicitud,sa.id_pedido,sa.id_mesero,sa.fecha,sa.detalle,
                sa.observaciones,sa.estado,sa.total,c.nombre AS cliente
         FROM solicitud_adicional sa
         INNER JOIN pedido p ON p.id_pedido=sa.id_pedido
         INNER JOIN cliente c ON c.id_cliente=p.id_cliente
         WHERE sa.estado='PENDIENTE'
         ORDER BY sa.fecha ASC`
    );
    return rows;
};

const crearAdicional = async (idPedido, datos, idMesero) => {
    if (!Array.isArray(datos.detalle) || !datos.detalle.length) {
        throw Object.assign(new Error("Agrega al menos un producto adicional"), { status: 400 });
    }
    const fecha = new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
        await verificarCajaAbierta(client);
        const pedido = await client.query("SELECT id_pedido,estado,pagado FROM pedido WHERE id_pedido=$1 FOR UPDATE", [idPedido]);
        if (!pedido.rowCount || String(pedido.rows[0].estado).toUpperCase().startsWith("CANCEL")) {
            throw Object.assign(new Error("El pedido no existe o ya está cancelado"), { status: 404 });
        }
        if (!pedido.rows[0].pagado) {
            throw Object.assign(new Error("Los pedidos sin pagar se modifican directamente en el pedido, no como adicional de Caja"), { status: 409 });
        }
        const solicitados = agruparProductosSolicitados(datos.detalle);
        const menu = await produccionModel.listarMenu(fecha, client, true);
        const detalle = solicitados.map(({ id_producto, cantidad }) => {
            const plato = menu.find((producto) => Number(producto.id_producto) === id_producto);
            if (!plato || Number(plato.stock) < cantidad) {
                throw Object.assign(new Error("Cantidad inválida o disponibilidad insuficiente"), { status: 409 });
            }
            return { id_producto, nombre: plato.nombre, cantidad, precio: Number(plato.precio), subtotal: Number(plato.precio) * cantidad };
        });
        const total = detalle.reduce((suma, item) => suma + item.subtotal, 0);
        const result = await client.query(
            `INSERT INTO solicitud_adicional (id_pedido,id_mesero,detalle,observaciones,total)
             VALUES ($1,$2,$3::jsonb,$4,$5) RETURNING id_solicitud,estado,total`,
            [idPedido, idMesero, JSON.stringify(detalle), String(datos.observaciones || "").trim() || null, total]
        );
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'SOLICITAR_ADICIONAL','pedido',$2,$3)",
            [idMesero, idPedido, JSON.stringify({ id_solicitud: result.rows[0].id_solicitud, total, detalle })]
        );
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const cobrarAdicional = async (idSolicitud, datos, idUsuario) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const fecha = new Date().toISOString().slice(0, 10);
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
        await verificarCajaAbierta(client);
        const solicitudResult = await client.query("SELECT * FROM solicitud_adicional WHERE id_solicitud=$1 FOR UPDATE", [idSolicitud]);
        if (!solicitudResult.rowCount || solicitudResult.rows[0].estado !== "PENDIENTE") {
            throw Object.assign(new Error("La solicitud no está pendiente de cobro"), { status: 409 });
        }
        const solicitud = solicitudResult.rows[0];
        const recibido = Number(datos.recibido);
        const total = Number(solicitud.total);
        const metodo = String(datos.metodo || "EFECTIVO").toUpperCase();
        if (!Number.isFinite(recibido) || recibido < total) throw Object.assign(new Error("El importe recibido no cubre el adicional"), { status: 400 });
        if (!["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"].includes(metodo)) throw Object.assign(new Error("Método de pago no válido"), { status: 400 });
        const pago = await client.query(
            `INSERT INTO pago (id_pedido,id_usuario,monto,metodo,recibido,cambio)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_pago`,
            [solicitud.id_pedido,idUsuario,total,metodo,recibido,metodo === "EFECTIVO" ? recibido-total : 0]
        );
        for (const item of solicitud.detalle) {
            await client.query(
                "INSERT INTO detalle_pedido (id_pedido,id_producto,cantidad,precio,subtotal) VALUES ($1,$2,$3,$4,$5)",
                [solicitud.id_pedido,item.id_producto,item.cantidad,item.precio,item.subtotal]
            );
        }
        await client.query("UPDATE pedido SET total=total+$1 WHERE id_pedido=$2", [total,solicitud.id_pedido]);
        await client.query("UPDATE solicitud_adicional SET estado='COBRADO',id_pago=$1 WHERE id_solicitud=$2", [pago.rows[0].id_pago,idSolicitud]);
        if (metodo === "EFECTIVO") {
            const saldoCaja = await client.query("SELECT COALESCE(SUM(ingreso-egreso),0) AS total FROM caja WHERE fecha::date=CURRENT_DATE");
            await client.query(
                "INSERT INTO caja (fecha,concepto,ingreso,egreso,saldo,id_usuario) VALUES (NOW(),$1,$2,0,$3,$4)",
                [`Adicional pedido #${solicitud.id_pedido}`,total,Number(saldoCaja.rows[0].total)+total,idUsuario]
            );
        }
        await client.query(
            "INSERT INTO bitacora_operaciones (id_usuario,accion,entidad,id_entidad,detalle) VALUES ($1,'COBRAR_ADICIONAL','solicitud_adicional',$2,$3)",
            [idUsuario,idSolicitud,JSON.stringify({ id_pedido: solicitud.id_pedido, total, id_pago: pago.rows[0].id_pago })]
        );
        await client.query("COMMIT");
        return { id_pago: pago.rows[0].id_pago, id_pedido: solicitud.id_pedido, total, detalle: solicitud.detalle };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export default { listarPedidosCaja, listarPagos, registrarGasto, listarGastos, panelCaja, reporteCaja, abrirCaja, cerrarCaja, registrarPago, agregarDetallePedido, listarAdicionales, crearAdicional, cobrarAdicional, verificarCajaAbierta };
