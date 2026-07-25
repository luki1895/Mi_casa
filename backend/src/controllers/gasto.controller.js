import gastoService from "../services/gasto.service.js";

import response from "../utils/response.js";

export const listar=async(req,res)=>{

const datos=await gastoService.listar();

response.ok(res,datos);

};

export const crear=async(req,res)=>{

const datos=await gastoService.crear(req.body);

response.ok(res,datos);

};