import atencionMesaModel from "../models/atencionMesa.model.js";

export default {
    listarMesas: () => atencionMesaModel.listarMesas(),
    listarMesasConfiguracion: () => atencionMesaModel.listarMesas(true),
    crearMesa: (datos) => atencionMesaModel.crearMesa(datos),
    actualizarMesa: (id, datos) => atencionMesaModel.actualizarMesa(id, datos),
    listarSectores: () => atencionMesaModel.listarSectores(),
    crearSector: (datos) => atencionMesaModel.crearSector(datos),
    actualizarSector: (id, datos) => atencionMesaModel.actualizarSector(id, datos),
    guardarDistribucion: (datos) => atencionMesaModel.guardarDistribucion(datos),
    abrirAtencion: (idMesa, idUsuario) => atencionMesaModel.abrirAtencion(idMesa, idUsuario),
    listarAtencionesAbiertas: () => atencionMesaModel.listarAtencionesAbiertas(),
    obtenerAtencion: (id) => atencionMesaModel.obtenerAtencion(id),
    cerrarAtencion: (id, idUsuario) => atencionMesaModel.cerrarAtencion(id, idUsuario),
    historialAtencion: (id) => atencionMesaModel.historialAtencion(id),
};
