import configuracionModel from "../models/configuracion.model.js";

const obtener = () => configuracionModel.obtener();

const actualizar = (datos, idUsuario) => configuracionModel.actualizar(datos, idUsuario);

export default {

    obtener,

    actualizar

};