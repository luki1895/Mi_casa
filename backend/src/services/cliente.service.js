import clienteModel from "../models/cliente.model.js";

const listar = () => clienteModel.listar();

const listarParaPedidos = () => clienteModel.listarParaPedidos();

const obtenerPortal = (idUsuario) => clienteModel.obtenerPortal(idUsuario);

const vincularCuenta = (idCliente, usuario) => clienteModel.vincularCuenta(idCliente, usuario);

const obtener = (id) => clienteModel.obtener(id);

const crear = (datos) => clienteModel.crear(datos);

const actualizar = (id, datos) => clienteModel.actualizar(id, datos);

const eliminar = (id) => clienteModel.eliminar(id);

export default {

    listar,

    listarParaPedidos,
    obtenerPortal,
    vincularCuenta,

    obtener,

    crear,

    actualizar,

    eliminar

};