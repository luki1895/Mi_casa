import cajaModel from "../models/caja.model.js";

const listar=()=>cajaModel.listar();

const registrar=(datos)=>cajaModel.registrar(datos);

export default{

listar,

registrar

};