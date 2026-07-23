import produccionService from "../services/produccion.service.js";

import response from "../utils/response.js";

export const listar=async(req,res)=>{

const datos=await produccionService.listar(req.query.fecha);

response.ok(res,datos);

};

export const crear=async(req,res)=>{

const datos=await produccionService.crear(req.body);

response.ok(res,datos);

};