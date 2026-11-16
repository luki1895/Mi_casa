import reservaService from "../services/reserva.service.js";
import response from "../utils/response.js";

export const listar = async (req, res) => {
    try {
        response.ok(res, await reservaService.listar(req.query));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const obtener = async (req, res) => {
    try {
        response.ok(res, await reservaService.obtener(req.params.id));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const actualizar = async (req, res) => {
    try {
        response.ok(res, await reservaService.actualizar(req.params.id, req.usuario.id, req.body), "Reserva actualizada");
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};
