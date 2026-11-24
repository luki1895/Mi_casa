import produccionService from "../services/produccion.service.js";

import response from "../utils/response.js";
import responderErrorControlador from "../utils/responderErrorControlador.js";
import fechaRestaurante from "../utils/fechaRestaurante.js";

export const listarMenu = async (req, res) => {
	try {
		const fecha = req.query.fecha || fechaRestaurante();
		const datos = await produccionService.listarMenu(fecha);
		response.ok(res, datos);
	} catch (error) {
		responderErrorControlador(res, error, "producción");
	}
};

export const listarProductos = async (req, res) => {
	try {
		response.ok(res, await produccionService.listarProductos());
	} catch (error) {
		responderErrorControlador(res, error, "productos de producción");
	}
};

export const listar=async(req,res)=>{

const datos=await produccionService.listar(req.query.fecha);

response.ok(res,datos);

};

export const crear=async(req,res)=>{
	try {
		const datos=await produccionService.crear(req.body, req.usuario.id);
		response.ok(res,datos);
	} catch (error) {
		responderErrorControlador(res, error, "producción");
	}

};