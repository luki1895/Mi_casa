import produccionModel from "../models/produccion.model.js";

const listar=(fecha)=>produccionModel.listar(fecha);

const listarMenu=(fecha)=>produccionModel.listarMenu(fecha);

const listarProductos=()=>produccionModel.listarProductos();

const crear=(datos,idUsuario)=>produccionModel.crear(datos,idUsuario);

export default{

listar,

listarProductos,

listarMenu,

crear

};