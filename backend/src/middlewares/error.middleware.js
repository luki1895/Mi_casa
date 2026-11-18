import { esErrorConexion, mensajeErrorConexion } from "../utils/databaseError.js";

const errorMiddleware = (error, _req, res, _next) => {
    if (esErrorConexion(error)) {
        return res.status(503).json({
            ok: false,
            mensaje: mensajeErrorConexion(error),
        });
    }

    console.error(error);
    return res.status(500).json({
        ok: false,
        mensaje: "Error interno del servidor",
    });
};

export default errorMiddleware;