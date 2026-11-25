import reservaPlatoModel from "../models/reservaPlato.model.js";
import response from "../utils/response.js";

export const crear = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.crear(req.body), "Reserva creada", 201);
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const obtenerPrivado = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.obtenerPorAcceso(req.params.codigo, req.get("x-reservation-token")));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const modificarPrivado = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.modificar(req.params.codigo, req.get("x-reservation-token"), req.body));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const cancelarPrivado = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.cancelar(req.params.codigo, req.get("x-reservation-token")));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const listar = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.listarInterno(req.query));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const recibir = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.recibir(
            req.params.id,
            req.usuario.id,
            req.body.id_atencion || null,
            req.get("Idempotency-Key"),
        ));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const marcarNoPresentada = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.marcarNoPresentada(req.params.id, req.usuario.id));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const imprimir = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.registrarImpresion(req.params.id, req.usuario.id, req.body));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const obtenerConfiguracion = async (_req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.obtenerConfiguracion());
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const actualizarConfiguracion = async (req, res) => {
    try {
        response.ok(res, await reservaPlatoModel.actualizarConfiguracion(req.body, req.usuario.id));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};
