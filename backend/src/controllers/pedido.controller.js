import pedidoService from "../services/pedido.service.js";

import response from "../utils/response.js";

export const listar=async(req,res)=>{

const datos=await pedidoService.listar();

response.ok(res,datos);

};

export const crear=async(req,res)=>{

const datos=await pedidoService.crear(req.body);

response.ok(res,datos);

};