import cajaService from "../services/caja.service.js";

import response from "../utils/response.js";
import responderErrorControlador from "../utils/responderErrorControlador.js";

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
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const reportes=async(req,res)=>{
try { response.ok(res,await cajaService.reportes()); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const historial=async(req,res)=>{
try { response.ok(res,await cajaService.historial(req.query.fecha)); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const pedidos=async(req,res)=>{
try { response.ok(res,await cajaService.pedidos()); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const abrir=async(req,res)=>{
try { response.ok(res,await cajaService.abrir(req.body,req.usuario.id)); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const pagos=async(req,res)=>{
try { response.ok(res,await cajaService.pagos()); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const cobrar=async(req,res)=>{
try { response.ok(res,await cajaService.cobrar(req.params.id,req.body,req.usuario.id,req.get("Idempotency-Key"))); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const anularPago=async(req,res)=>{
try { response.ok(res,await cajaService.anularPago(req.params.id,req.body,req.usuario.id),"Pago anulado"); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const cerrar=async(req,res)=>{
try { response.ok(res,await cajaService.cerrar(req.body,req.usuario.id)); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const gastos=async(req,res)=>{
try { response.ok(res,await cajaService.gastos()); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const registrarGasto=async(req,res)=>{
try { response.ok(res,await cajaService.registrarGasto(req.body,req.usuario.id)); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const adicionales=async(req,res)=>{
try { response.ok(res,await cajaService.adicionales()); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};

export const cobrarAdicional=async(req,res)=>{
try { response.ok(res,await cajaService.cobrarAdicional(req.params.id,req.body,req.usuario.id,req.get("Idempotency-Key"))); }
catch(error) { responderErrorControlador(res,error,"Caja"); }
};