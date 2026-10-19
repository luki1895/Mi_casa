import pedidoModel from "../models/pedido.model.js";

import detalleModel from "../models/detalle_pedido.model.js";

import pool from "../config/db.js";

import produccionModel from "../models/produccion.model.js";

import clienteModel from "../models/cliente.model.js";

import operacionesModel from "../models/operaciones.model.js";

const listar=()=>pedidoModel.listar();

const listarPorUsuario=(idUsuario)=>pedidoModel.listarPorUsuario(idUsuario);

const listarActivos=()=>pedidoModel.listarActivos();

const obtener=(idPedido)=>pedidoModel.obtener(idPedido);

const actualizarEstado=(idPedido,estado,idUsuario,rol)=>pedidoModel.actualizarEstado(idPedido,estado,idUsuario,rol);

const solicitarAdicional=(idPedido,datos,idMesero)=>operacionesModel.crearAdicional(idPedido,datos,idMesero);

const agregarDetalle=(idPedido,datos,idUsuario)=>operacionesModel.agregarDetallePedido(idPedido,datos,idUsuario);

const crear=async(datos, idUsuario, rol)=>{
	const eventual = String(datos.tipo_cliente || "").toUpperCase() === "EVENTUAL";
	if ((!datos.id_cliente && !(eventual && String(datos.cliente_nombre || "").trim())) || !Array.isArray(datos.detalle) || datos.detalle.length === 0) {
		throw new Error("El pedido debe incluir un cliente válido y al menos un plato");
	}

	const fecha = datos.fecha || new Date().toISOString().slice(0, 10);
	const cantidades = new Map();
	datos.detalle.forEach((item) => {
		const cantidad = Number(item.cantidad);
		const idProducto = Number(item.id_producto);
		if (!Number.isInteger(cantidad) || cantidad < 1 || !Number.isInteger(idProducto) || idProducto < 1) {
			throw new Error("El detalle del pedido contiene datos inválidos");
		}
		cantidades.set(idProducto, (cantidades.get(idProducto) || 0) + cantidad);
	});
	const detalleSolicitado = Array.from(cantidades, ([id_producto, cantidad]) => ({ id_producto, cantidad }));

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		if (String(rol || "").trim().toLowerCase().includes("caja")) {
			await operacionesModel.verificarCajaAbierta(client);
		}
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
		let idCliente = datos.id_cliente;
		if (!idCliente && eventual) {
			const nuevoCliente = await clienteModel.crear({
				nombre: String(datos.cliente_nombre).trim(),
				telefono: String(datos.cliente_telefono || "").trim() || null,
				tipo_cliente: "EVENTUAL",
				saldo_pensiones: 0,
				estado: true,
			}, client);
			idCliente = nuevoCliente.rows[0].id_cliente;
		}
		const clienteResult = await client.query(
			"SELECT id_cliente, tipo_cliente FROM cliente WHERE id_cliente = $1 FOR SHARE",
			[idCliente]
		);
		if (!clienteResult.rowCount) throw new Error("El cliente seleccionado no existe");

		const menu = await produccionModel.listarMenu(fecha, client, true);
		const detalle = detalleSolicitado.map((item) => {
			const plato = menu.find((producto) => Number(producto.id_producto) === item.id_producto);
			if (!plato || Number(plato.stock) < item.cantidad) {
				const error = new Error(`Disponibilidad insuficiente para el producto ${item.id_producto}`);
				error.status = 409;
				throw error;
			}
			return { ...item, precio: Number(plato.precio), subtotal: Number(plato.precio) * item.cantidad };
		});
		const total = detalle.reduce((suma, item) => suma + item.subtotal, 0);
		const tipoCliente = String(clienteResult.rows[0].tipo_cliente || "EVENTUAL").toUpperCase();
		const idPedido = await pedidoModel.crear({
			...datos,
			id_cliente: idCliente,
			fecha: new Date(),
			tipo_cliente: tipoCliente,
			id_usuario: idUsuario,
			total,
			observaciones: datos.observaciones,
		}, client);
		await detalleModel.crear(idPedido, detalle, client);
		await client.query(
			"INSERT INTO bitacora_operaciones (id_usuario, accion, entidad, id_entidad, detalle) VALUES ($1, $2, $3, $4, $5)",
			[idUsuario, "CREAR", "pedido", idPedido, JSON.stringify({ id_cliente: idCliente, total, detalle })]
		);
		await client.query("COMMIT");
		return { id_pedido: idPedido, total, mensaje: "Pedido registrado" };
	} catch (error) {
		await client.query("ROLLBACK");
		if (!error.status) error.status = 400;
		throw error;
	} finally {
		client.release();
	}
};

export default{

listar,

listarPorUsuario,

listarActivos,

obtener,

actualizarEstado,

solicitarAdicional,

agregarDetalle,

crear

};