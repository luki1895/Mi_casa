import cajaModel from "../models/caja.model.js";
import operacionesModel from "../models/operaciones.model.js";

const listar=()=>cajaModel.listar();

const registrar=(datos)=>cajaModel.registrar(datos);

const panel=()=>operacionesModel.panelCaja();

const reportes=()=>operacionesModel.reporteCaja();

const pedidos=()=>operacionesModel.listarPedidosCaja();

const abrir=(datos,idUsuario)=>operacionesModel.abrirCaja(datos,idUsuario);

const pagos=()=>operacionesModel.listarPagos();

const cobrar=(idPedido,datos,idUsuario)=>operacionesModel.registrarPago(idPedido,datos,idUsuario);

const cerrar=(datos,idUsuario)=>operacionesModel.cerrarCaja(datos,idUsuario);

const gastos=()=>operacionesModel.listarGastos();

const registrarGasto=(datos,idUsuario)=>operacionesModel.registrarGasto(datos,idUsuario);

const adicionales=()=>operacionesModel.listarAdicionales();

const cobrarAdicional=(idSolicitud,datos,idUsuario)=>operacionesModel.cobrarAdicional(idSolicitud,datos,idUsuario);

export default{

listar,

registrar,

panel,

reportes,

pedidos,

abrir,

pagos,

cobrar,

cerrar,

gastos,

registrarGasto,

adicionales,

cobrarAdicional

};