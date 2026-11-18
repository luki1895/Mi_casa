import atencionMesaModel from "../models/atencionMesa.model.js";

export default {
    listarMesas: () => atencionMesaModel.listarMesas(),
    crearMesa: (datos) => atencionMesaModel.crearMesa(datos),
    actualizarMesa: (id, datos) => atencionMesaModel.actualizarMesa(id, datos),
    abrirAtencion: (idMesa, idUsuario) => atencionMesaModel.abrirAtencion(idMesa, idUsuario),
    listarAtencionesAbiertas: () => atencionMesaModel.listarAtencionesAbiertas(),
    obtenerAtencion: (id) => atencionMesaModel.obtenerAtencion(id),
    cerrarAtencion: (id, idUsuario) => atencionMesaModel.cerrarAtencion(id, idUsuario),
    historialAtencion: (id) => atencionMesaModel.historialAtencion(id),
};
