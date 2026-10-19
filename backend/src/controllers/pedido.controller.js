import pedidoService from "../services/pedido.service.js";

import response from "../utils/response.js";

export const listar=async(req,res)=>{

const datos=await pedidoService.listar();

response.ok(res,datos);

};

export const misServicios = async (req, res) => {

try {

const datos = await pedidoService.listarPorUsuario(req.usuario.id);

response.ok(res, datos);

} catch (error) {

response.error(res, error.message);

}

};

export const listarActivos = async (req, res) => {
	try {
		response.ok(res, await pedidoService.listarActivos());
	} catch (error) {
		response.error(res, error.message);
	}
};

export const obtener = async (req, res) => {
	try {
		const datos = await pedidoService.obtener(req.params.id);
		if (!datos) return response.error(res, "Pedido no encontrado", 404);
		return response.ok(res, datos);
	} catch (error) {
		return response.error(res, error.message);
	}
};

export const crear=async(req,res)=>{

try {

const datos=await pedidoService.crear(req.body, req.usuario.id, req.usuario.rol);

response.ok(res,datos);

} catch (error) {

response.error(res, error.message, error.status || 400);

}

};

export const solicitarAdicional = async (req, res) => {
	try {
		const datos = await pedidoService.solicitarAdicional(req.params.id, req.body, req.usuario.id);
		response.ok(res, datos, "Solicitud enviada a Caja para su cobro");
	} catch (error) {
		response.error(res, error.message, error.status || 400);
	}
};

export const agregarDetalle = async (req, res) => {
	try {
		const datos = await pedidoService.agregarDetalle(req.params.id, req.body, req.usuario.id);
		response.ok(res, datos, "Productos agregados al pedido");
	} catch (error) {
		response.error(res, error.message, error.status || 400);
	}
};

export const actualizarEstado = async (req, res) => {
	try {
		response.ok(res, await pedidoService.actualizarEstado(req.params.id, req.body.estado, req.usuario.id, req.usuario.rol));
	} catch (error) {
		response.error(res, error.message, error.status || 400);
	}
};