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

export const panel=async(req,res)=>{
try { response.ok(res,await cajaService.panel()); }
catch(error) { response.error(res,error.message); }
};

export const reportes=async(req,res)=>{
try { response.ok(res,await cajaService.reportes()); }
catch(error) { response.error(res,error.message); }
};

export const pedidos=async(req,res)=>{
try { response.ok(res,await cajaService.pedidos()); }
catch(error) { response.error(res,error.message); }
};

export const abrir=async(req,res)=>{
try { response.ok(res,await cajaService.abrir(req.body,req.usuario.id)); }
catch(error) { response.error(res,error.message,error.status||400); }
};

export const pagos=async(req,res)=>{
try { response.ok(res,await cajaService.pagos()); }
catch(error) { response.error(res,error.message); }
};

export const cobrar=async(req,res)=>{
try { response.ok(res,await cajaService.cobrar(req.params.id,req.body,req.usuario.id)); }
catch(error) { response.error(res,error.message,error.status||400); }
};

export const cerrar=async(req,res)=>{
try { response.ok(res,await cajaService.cerrar(req.body,req.usuario.id)); }
catch(error) { response.error(res,error.message,error.status||400); }
};

export const gastos=async(req,res)=>{
try { response.ok(res,await cajaService.gastos()); }
catch(error) { response.error(res,error.message); }
};

export const registrarGasto=async(req,res)=>{
try { response.ok(res,await cajaService.registrarGasto(req.body,req.usuario.id)); }
catch(error) { response.error(res,error.message,error.status||400); }
};

export const adicionales=async(req,res)=>{
try { response.ok(res,await cajaService.adicionales()); }
catch(error) { response.error(res,error.message); }
};

export const cobrarAdicional=async(req,res)=>{
try { response.ok(res,await cajaService.cobrarAdicional(req.params.id,req.body,req.usuario.id)); }
catch(error) { response.error(res,error.message,error.status||400); }
};