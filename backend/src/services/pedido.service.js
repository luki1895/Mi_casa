import pedidoModel from "../models/pedido.model.js";

import detalleModel from "../models/detalle_pedido.model.js";

const listar=()=>pedidoModel.listar();

const crear=async(datos)=>{

const idPedido=await pedidoModel.crear(datos);

await detalleModel.crear(

idPedido,

datos.detalle

);

return{

mensaje:"Pedido registrado"

};

};

export default{

listar,

crear

};