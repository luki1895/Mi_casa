import produccionService from "../services/produccion.service.js";

import response from "../utils/response.js";

export const listarMenu = async (req, res) => {
	try {
		const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
		const datos = await produccionService.listarMenu(fecha);
		response.ok(res, datos);
	} catch (error) {
		response.error(res, error.message);
	}
};

export const listarProductos = async (req, res) => {
	try {
		response.ok(res, await produccionService.listarProductos());
	} catch (error) {
		response.error(res, error.message);
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
		response.error(res,error.message,400);
	}

};