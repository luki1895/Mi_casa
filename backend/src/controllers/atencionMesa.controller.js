import atencionMesaService from "../services/atencionMesa.service.js";
import response from "../utils/response.js";
import { esErrorConexion, mensajeErrorConexion } from "../utils/databaseError.js";

const manejarError = (res, error) => {
    if (error.status) return response.error(res, error.message, error.status);
    if (esErrorConexion(error)) {
        return response.error(res, mensajeErrorConexion(error), 503);
    }
    if (["42P01", "42703"].includes(error.code)) {
        return response.error(res, "El esquema de mesas no está actualizado. Revisa las migraciones 006_mesas_atenciones.sql, 010_configuracion_mesas.sql, 011_distribucion_plano_mesas.sql y 013_operacion_comercial_y_sectores.sql.", 503);
    }
    console.error("Error en el módulo de mesas:", error);
    return response.error(res, "Error interno del servidor al gestionar mesas y atenciones.", 500);
};

export const listarMesas = async (req, res) => {
    try { response.ok(res, await atencionMesaService.listarMesas(req.query.sector)); }
    catch (error) { manejarError(res, error); }
};

export const listarMesasConfiguracion = async (_req, res) => {
    try { response.ok(res, await atencionMesaService.listarMesasConfiguracion()); }
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

export const listarSectores = async (_req, res) => {
    try { response.ok(res, await atencionMesaService.listarSectores()); }
    catch (error) { manejarError(res, error); }
};

export const listarSectoresConfiguracion = async (_req, res) => {
    try { response.ok(res, await atencionMesaService.listarSectoresConfiguracion()); }
    catch (error) { manejarError(res, error); }
};

export const crearSector = async (req, res) => {
    try { response.ok(res, await atencionMesaService.crearSector(req.body), "Sector registrado", 201); }
    catch (error) { manejarError(res, error); }
};

export const actualizarSector = async (req, res) => {
    try { response.ok(res, await atencionMesaService.actualizarSector(req.params.id, req.body)); }
    catch (error) { manejarError(res, error); }
};

export const guardarDistribucion = async (req, res) => {
    try { response.ok(res, await atencionMesaService.guardarDistribucion(req.body?.mesas), "Distribución guardada"); }
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
