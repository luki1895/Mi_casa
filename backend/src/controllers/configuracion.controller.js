import configuracionService from "../services/configuracion.service.js";

import response from "../utils/response.js";

export const obtener = async (req, res) => {

    try {

        const datos = await configuracionService.obtener();

        response.ok(res, datos);

    } catch (error) {

        response.error(res, error.message);

    }

};

export const actualizar = async (req, res) => {

    try {

        const datos = await configuracionService.actualizar(req.body);

        response.ok(res, datos, "Configuración actualizada");

    } catch (error) {

        response.error(res, error.message);

    }

};