import usuarioService from "../services/usuario.service.js";

import response from "../utils/response.js";

export const listar = async (req, res) => {

    try {

        const datos = await usuarioService.listar();

        response.ok(res, datos);

    } catch (err) {

        response.error(res, err.message);

    }

};

export const obtener = async (req, res) => {

    try {

        const datos = await usuarioService.obtener(req.params.id);

        response.ok(res, datos);

    } catch (err) {

        response.error(res, err.message);

    }

};

export const crear = async (req, res) => {

    try {

        const datos = await usuarioService.crear(req.body);

        response.ok(res, datos);

    } catch (err) {

        response.error(res, err.message);

    }

};

export const actualizar = async (req, res) => {

    try {

        const datos = await usuarioService.actualizar(

            req.params.id,

            req.body

        );

        response.ok(res, datos);

    } catch (err) {

        response.error(res, err.message);

    }

};

export const eliminar = async (req, res) => {

    try {

        const datos = await usuarioService.eliminar(req.params.id);

        response.ok(res, datos);

    } catch (err) {

        response.error(res, err.message);

    }

};