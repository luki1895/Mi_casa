import gastoModel from "../models/gasto.model.js";

const listar=()=>gastoModel.listar();

const crear=(datos)=>gastoModel.crear(datos);

export default{

listar,

crear

};