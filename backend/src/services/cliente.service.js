import clienteModel from "../models/cliente.model.js";

const listar = () => clienteModel.listar();

const obtener = (id) => clienteModel.obtener(id);

const crear = (datos) => clienteModel.crear(datos);

const actualizar = (id, datos) => clienteModel.actualizar(id, datos);

const eliminar = (id) => clienteModel.eliminar(id);

export default {

    listar,

    obtener,

    crear,

    actualizar,

    eliminar

};