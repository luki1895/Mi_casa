import reporteModel from "../models/reporte.model.js";
import produccionModel from "../models/produccion.model.js";

const dashboard=async()=>{

const ventas=await reporteModel.ventasHoy();

const gastos=await reporteModel.gastosHoy();

const pensionados=await reporteModel.pensionadosHoy();

const eventuales=await reporteModel.eventualesHoy();

const pedidosActivos=await reporteModel.pedidosActivosHoy();

const menu=await produccionModel.listarMenu(new Date().toISOString().slice(0,10), undefined, true);

const produccion={
	preparados:menu.reduce((total,plato)=>total+Number(plato.preparados||0),0),
	vendidos:menu.reduce((total,plato)=>total+Number(plato.vendidos||0),0),
	reservados:menu.reduce((total,plato)=>total+Number(plato.reservados||0),0),
	disponibles:menu.reduce((total,plato)=>total+Number(plato.stock||0),0),
};

return{

ventas,

gastos,

pensionados,

eventuales

 ,pedidosActivos,

 menu,

 produccion

};

};

export default{

dashboard

};