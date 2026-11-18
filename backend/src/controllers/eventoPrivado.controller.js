import eventoPrivadoModel from "../models/eventoPrivado.model.js";
import response from "../utils/response.js";

const manejarError = (res, error) => response.error(res, error.message, error.status || 500);

export const crear = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.crear(req.body), "Solicitud enviada para revisión", 201); }
    catch (error) { manejarError(res, error); }
};

export const obtenerPrivado = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.obtenerPorAcceso(req.params.codigo, req.get("x-event-token"))); }
    catch (error) { manejarError(res, error); }
};

export const cancelarPrivado = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.cancelarPorAcceso(req.params.codigo, req.get("x-event-token"), req.body)); }
    catch (error) { manejarError(res, error); }
};

export const responderPrivado = async (req, res) => {
    try {
        response.ok(
            res,
            await eventoPrivadoModel.responderSolicitud(req.params.codigo, req.get("x-event-token"), req.body),
            "Solicitud reenviada para revisión",
        );
    } catch (error) { manejarError(res, error); }
};

export const registrarPago = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.registrarPago(req.params.codigo, req.get("x-event-token"), req.body), "Pago registrado para verificación", 201); }
    catch (error) { manejarError(res, error); }
};

export const listar = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.listar(req.query)); }
    catch (error) { manejarError(res, error); }
};

export const obtenerInterno = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.obtenerInterno(req.params.id)); }
    catch (error) { manejarError(res, error); }
};

export const revisar = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.revisar(req.params.id, req.body, req.usuario.id)); }
    catch (error) { manejarError(res, error); }
};

export const cancelarAdministrativamente = async (req, res) => {
    try {
        response.ok(
            res,
            await eventoPrivadoModel.cancelarAdministrativamente(req.params.id, req.body, req.usuario.id),
            "Cancelación registrada y devolución autorizada cuando corresponde",
        );
    } catch (error) { manejarError(res, error); }
};

export const registrarDevolucion = async (req, res) => {
    try {
        response.ok(
            res,
            await eventoPrivadoModel.registrarDevolucion(req.params.id, req.body, req.usuario.id),
            "Devolución registrada",
        );
    } catch (error) { manejarError(res, error); }
};

export const verificarPago = async (req, res) => {
    if (typeof req.body.aprobado !== "boolean") {
        return response.error(res, "Indica si el pago fue verificado o rechazado", 400);
    }
    try {
        response.ok(res, await eventoPrivadoModel.verificarPago(
            req.params.id,
            req.usuario.id,
            req.body.aprobado,
            req.body.observaciones || "",
        ));
    } catch (error) { manejarError(res, error); }
};

export const imprimir = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.registrarImpresion(req.params.id, req.usuario.id, req.body)); }
    catch (error) { manejarError(res, error); }
};

export const listarHorarios = async (_req, res) => {
    try { response.ok(res, await eventoPrivadoModel.listarHorarios()); }
    catch (error) { manejarError(res, error); }
};

export const actualizarHorarios = async (req, res) => {
    try { response.ok(res, await eventoPrivadoModel.actualizarHorarios(req.body.horarios, req.usuario.id)); }
    catch (error) { manejarError(res, error); }
};
