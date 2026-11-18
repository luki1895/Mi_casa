import atencionMesaService from "../services/atencionMesa.service.js";
import response from "../utils/response.js";

const manejarError = (res, error) => response.error(res, error.message, error.status || 500);

export const listarMesas = async (_req, res) => {
    try { response.ok(res, await atencionMesaService.listarMesas()); }
    catch (error) { manejarError(res, error); }
};

export const crearMesa = async (req, res) => {
    try { response.ok(res, await atencionMesaService.crearMesa(req.body), "Mesa registrada", 201); }
    catch (error) { manejarError(res, error); }
};

export const actualizarMesa = async (req, res) => {
    try { response.ok(res, await atencionMesaService.actualizarMesa(req.params.id, req.body)); }
    catch (error) { manejarError(res, error); }
};

export const abrirAtencion = async (req, res) => {
    try { response.ok(res, await atencionMesaService.abrirAtencion(req.params.idMesa, req.usuario.id), "Atención abierta", 201); }
    catch (error) { manejarError(res, error); }
};

export const listarAtenciones = async (_req, res) => {
    try { response.ok(res, await atencionMesaService.listarAtencionesAbiertas()); }
    catch (error) { manejarError(res, error); }
};

export const obtenerAtencion = async (req, res) => {
    try {
        const atencion = await atencionMesaService.obtenerAtencion(req.params.id);
        const historial = await atencionMesaService.historialAtencion(req.params.id);
        response.ok(res, { ...atencion, historial });
    } catch (error) { manejarError(res, error); }
};

export const cerrarAtencion = async (req, res) => {
    try { response.ok(res, await atencionMesaService.cerrarAtencion(req.params.id, req.usuario.id)); }
    catch (error) { manejarError(res, error); }
};
