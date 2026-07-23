import produccionModel from "../models/produccion.model.js";

const listar=(fecha)=>produccionModel.listar(fecha);

const crear=(datos)=>produccionModel.crear(datos);

export default{

listar,

crear

};