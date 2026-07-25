import reporteService from "../services/reporte.service.js";

import response from "../utils/response.js";

export const dashboard=async(req,res)=>{

const datos=await reporteService.dashboard();

response.ok(res,datos);

};