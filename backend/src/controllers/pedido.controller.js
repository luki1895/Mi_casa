import pedidoService from "../services/pedido.service.js";

import response from "../utils/response.js";
import responderErrorControlador from "../utils/responderErrorControlador.js";

export const listar=async(req,res)=>{

const datos=await pedidoService.listar();

response.ok(res,datos);

};

export const misServicios = async (req, res) => {

try {

const datos = await pedidoService.listarPorUsuario(req.usuario.id);

response.ok(res, datos);

} catch (error) {

responderErrorControlador(res, error, "Pedidos");

}

};

export const listarActivos = async (req, res) => {
	try {
		response.ok(res, await pedidoService.listarActivos());
	} catch (error) {
		responderErrorControlador(res, error, "Pedidos");
	}
};

export const obtener = async (req, res) => {
	try {
		const datos = await pedidoService.obtener(req.params.id);
		if (!datos) return response.error(res, "Pedido no encontrado", 404);
		return response.ok(res, datos);
	} catch (error) {
		return responderErrorControlador(res, error, "Pedidos");
	}
};

export const crear=async(req,res)=>{

try {

const datos=await pedidoService.crear(req.body, req.usuario.id, req.usuario.rol);

response.ok(res,datos);

} catch (error) {

responderErrorControlador(res, error, "Pedidos");

}

};

export const solicitarAdicional = async (req, res) => {
	try {
		const datos = await pedidoService.solicitarAdicional(req.params.id, req.body, req.usuario.id);
		response.ok(res, datos, "Solicitud enviada a Caja para su cobro");
	} catch (error) {
		responderErrorControlador(res, error, "Pedidos");
	}
};

export const agregarDetalle = async (req, res) => {
	try {
		const datos = await pedidoService.agregarDetalle(req.params.id, req.body, req.usuario.id);
		response.ok(res, datos, "Productos agregados al pedido");
	} catch (error) {
		responderErrorControlador(res, error, "Pedidos");
	}
};

export const actualizarEstado = async (req, res) => {
	try {
		response.ok(res, await pedidoService.actualizarEstado(req.params.id, req.body.estado, req.usuario.id, req.usuario.rol));
	} catch (error) {
		responderErrorControlador(res, error, "Pedidos");
	}
};

export const imprimirComanda = async (req, res) => {
	try {
		response.ok(res, await pedidoService.registrarImpresion(req.params.id, req.usuario.id, req.body.id_solicitud));
	} catch (error) {
		responderErrorControlador(res, error, "Pedidos");
	}
};