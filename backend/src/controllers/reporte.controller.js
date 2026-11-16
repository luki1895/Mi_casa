import reporteService from "../services/reporte.service.js";

import response from "../utils/response.js";

export const dashboard=async(req,res)=>{

const datos=await reporteService.dashboard();

response.ok(res,datos);

};

export const operativo=async(req,res)=>{
try {
response.ok(res,await reporteService.operativo(req.query.desde,req.query.hasta));
} catch(error) {
response.error(res,error.message,error.status||500);
}
};