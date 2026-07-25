import reporteModel from "../models/reporte.model.js";

const dashboard=async()=>{

const ventas=await reporteModel.ventasHoy();

const gastos=await reporteModel.gastosHoy();

const pensionados=await reporteModel.pensionadosHoy();

const eventuales=await reporteModel.eventualesHoy();

return{

ventas,

gastos,

pensionados,

eventuales

};

};

export default{

dashboard

};