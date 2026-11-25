import pedidoModel from "../models/pedido.model.js";

import detalleModel from "../models/detalle_pedido.model.js";

import pool from "../config/db.js";

import produccionModel from "../models/produccion.model.js";

import clienteModel from "../models/cliente.model.js";
import operacionesModel from "../models/operaciones.model.js";
import { normalizarRol } from "../middlewares/autorizarRoles.js";
import fechaRestaurante from "../utils/fechaRestaurante.js";
import { guardarResultado, obtenerReintento, validarSolicitudId } from "../utils/idempotencia.js";
import { agruparDetalleVenta, resolverDetalleVenta } from "../utils/detalleVenta.js";

const listar=()=>pedidoModel.listar();

const listarPorUsuario=(idUsuario)=>pedidoModel.listarPorUsuario(idUsuario);

const listarActivos=()=>pedidoModel.listarActivos();

const obtener=(idPedido)=>pedidoModel.obtener(idPedido);

const actualizarEstado=(idPedido,estado,idUsuario,rol)=>pedidoModel.actualizarEstado(idPedido,estado,idUsuario,rol);

const registrarImpresion=(idPedido,idUsuario,idSolicitud)=>pedidoModel.registrarImpresion(idPedido,idUsuario,idSolicitud);

const solicitarAdicional=(idPedido,datos,idMesero,solicitudId)=>operacionesModel.crearAdicional(idPedido,datos,idMesero,solicitudId);

const agregarDetalle=(idPedido,datos,idUsuario,solicitudId)=>operacionesModel.agregarDetallePedido(idPedido,datos,idUsuario,solicitudId);

const crear=async(datos = {}, idUsuario, rol, solicitudId)=>{
	if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
		throw Object.assign(new Error("Los datos del pedido no son válidos"), { status: 400 });
	}
	const clave = validarSolicitudId(solicitudId);
	const eventual = String(datos.tipo_cliente || "").toUpperCase() === "EVENTUAL";
	if ((!datos.id_cliente && !(eventual && String(datos.cliente_nombre || "").trim())) || !Array.isArray(datos.detalle) || datos.detalle.length === 0) {
		throw Object.assign(new Error("El pedido debe incluir un cliente válido y al menos un plato"), { status: 400 });
	}

	const fecha = datos.fecha || fechaRestaurante();
	if (datos.detalle.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
		throw Object.assign(new Error("El detalle del pedido contiene datos inválidos"), { status: 400 });
	}
	const detalleSolicitado = agruparDetalleVenta(datos.detalle);
	const idClienteSolicitado = datos.id_cliente ? Number(datos.id_cliente) : null;
	const payloadIdempotente = {
		id_cliente: idClienteSolicitado,
		tipo_cliente: String(datos.tipo_cliente || "").toUpperCase(),
		cliente_nombre: eventual ? String(datos.cliente_nombre || "").trim() : null,
		cliente_telefono: eventual ? String(datos.cliente_telefono || "").trim() : null,
		id_atencion: datos.id_atencion == null ? null : Number(datos.id_atencion),
		fecha: datos.fecha || null,
		observaciones: String(datos.observaciones || "").trim(),
		detalle: detalleSolicitado,
	};

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const reintento = await obtenerReintento(client, idUsuario, clave, "CREAR_PEDIDO", payloadIdempotente);
		if (reintento.resultado) {
			await client.query("COMMIT");
			return reintento.resultado;
		}
		if (normalizarRol(rol) === "caja") {
			await operacionesModel.verificarCajaAbierta(client);
		}
		await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`menu:${fecha}`]);
		if (datos.id_atencion !== undefined && datos.id_atencion !== null) {
			const schema = await client.query("SELECT to_regclass('public.atencion_mesa') IS NOT NULL AS disponible");
			if (!schema.rows[0].disponible) {
				throw Object.assign(new Error("La gestión de atenciones requiere aplicar la migración local preparada"), { status: 503 });
			}
			const atencion = await client.query(
				"SELECT id_atencion,estado FROM atencion_mesa WHERE id_atencion=$1 FOR UPDATE",
				[datos.id_atencion],
			);
			if (!atencion.rowCount || atencion.rows[0].estado !== "ABIERTA") {
				throw Object.assign(new Error("La atención seleccionada no existe o ya está cerrada"), { status: 409 });
			}
		}
		let idCliente = idClienteSolicitado;
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
		if (!clienteResult.rowCount) {
			throw Object.assign(new Error("El cliente seleccionado no existe"), { status: 404 });
		}

		const menu = await produccionModel.listarMenu(fecha, client, true);
		const detalle = resolverDetalleVenta(detalleSolicitado, menu);
		const total = Math.round(detalle.reduce((suma, item) => suma + item.subtotal, 0) * 100) / 100;
		const tipoCliente = String(clienteResult.rows[0].tipo_cliente || "EVENTUAL").toUpperCase();
		const idPedido = await pedidoModel.crear({
			...datos,
			id_cliente: idCliente,
			fecha: new Date(),
			tipo_cliente: tipoCliente,
			id_usuario: idUsuario,
			total,
			observaciones: datos.observaciones,
			id_atencion: datos.id_atencion,
		}, client);
		await detalleModel.crear(idPedido, detalle, client);
		await client.query(
			"INSERT INTO bitacora_operaciones (id_usuario, accion, entidad, id_entidad, detalle) VALUES ($1, $2, $3, $4, $5)",
			[idUsuario, "CREAR", "pedido", idPedido, JSON.stringify({ id_cliente: idCliente, total, detalle })]
		);
		const resultado = { id_pedido: idPedido, total, mensaje: "Pedido registrado" };
		await guardarResultado(client, idUsuario, reintento, "CREAR_PEDIDO", resultado);
		await client.query("COMMIT");
		return resultado;
	} catch (error) {
		await client.query("ROLLBACK");
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

registrarImpresion,

solicitarAdicional,

agregarDetalle,

crear

};