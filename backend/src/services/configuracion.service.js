import configuracionModel from "../models/configuracion.model.js";

const obtener = () => configuracionModel.obtener();

const actualizar = (datos) => configuracionModel.actualizar(datos);

export default {

    obtener,

    actualizar

};