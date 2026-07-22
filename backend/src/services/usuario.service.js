import usuarioModel from "../models/usuario.model.js";

const listar = () => usuarioModel.listar();

const obtener = (id) => usuarioModel.obtener(id);

const crear = (datos) => usuarioModel.crear(datos);

const actualizar = (id, datos) => usuarioModel.actualizar(id, datos);

const eliminar = (id) => usuarioModel.eliminar(id);

export default {

    listar,

    obtener,

    crear,

    actualizar,

    eliminar

};