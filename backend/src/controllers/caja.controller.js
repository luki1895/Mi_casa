import cajaService from "../services/caja.service.js";

import response from "../utils/response.js";

export const listar=async(req,res)=>{

const datos=await cajaService.listar();

response.ok(res,datos);

};

export const registrar=async(req,res)=>{

const datos=await cajaService.registrar(req.body);

response.ok(res,datos);

};