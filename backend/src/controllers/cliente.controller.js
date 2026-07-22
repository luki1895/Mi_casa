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