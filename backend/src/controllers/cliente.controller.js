import clienteService from "../services/cliente.service.js";

import response from "../utils/response.js";

export const listar = async (req, res) => {

    try {

        const datos = await clienteService.listar();

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const obtener = async (req, res) => {

    try {

        const datos = await clienteService.obtener(req.params.id);

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const crear = async (req, res) => {

    try {

        const datos = await clienteService.crear(req.body);

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const actualizar = async (req, res) => {

    try {

        const datos = await clienteService.actualizar(req.params.id, req.body);

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const eliminar = async (req, res) => {

    try {

        const datos = await clienteService.eliminar(req.params.id);

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const listarParaPedidos = async (req, res) => {
    try {
        response.ok(res, await clienteService.listarParaPedidos());
    } catch (error) {
        response.error(res, error.message);
    }
};

export const miPortal = async (req, res) => {
    try {
        response.ok(res, await clienteService.obtenerPortal(req.usuario.id));
    } catch (error) {
        response.error(res, error.message, error.status || 400);
    }
};

export const crearReserva = async (req, res) => {
    try {
        response.ok(res, await clienteService.crearReserva(req.usuario.id, req.body), "Solicitud de reserva enviada");
    } catch (error) {
        response.error(res, error.message, error.status || 400);
    }
};

export const vincularCuenta = async (req, res) => {
    try {
        response.ok(res, await clienteService.vincularCuenta(req.params.id, req.body.usuario), "Cuenta vinculada al cliente");
    } catch (error) {
        response.error(res, error.message, error.status || 400);
    }
};