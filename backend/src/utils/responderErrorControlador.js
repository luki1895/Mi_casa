import response from "./response.js";
import { esErrorConexion, mensajeErrorConexion } from "./databaseError.js";

const responderErrorControlador = (res, error, modulo) => {
    if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599) {
        return response.error(res, error.message, error.status);
    }

    if (esErrorConexion(error)) {
        return response.error(res, mensajeErrorConexion(error), 503);
    }

    console.error(`Error en el módulo ${modulo}:`, error);
    return response.error(res, `Error interno del servidor en ${modulo}.`, 500);
};

export default responderErrorControlador;
