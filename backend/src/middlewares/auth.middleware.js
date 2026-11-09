import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const responderNoAutorizado = (res, mensaje) => res.status(401).json({ mensaje });

const verificarToken = async (req, res, next) => {
    const autorizacion = req.get("authorization") || "";
    const coincidencia = autorizacion.match(/^Bearer\s+(.+)$/i);

    if (!coincidencia) {
        return responderNoAutorizado(res, "Se requiere autenticación");
    }

    let claims;
    try {
        claims = jwt.verify(coincidencia[1], process.env.JWT_SECRET);
    } catch {
        return responderNoAutorizado(res, "Token inválido o expirado");
    }

    if (!claims || typeof claims !== "object" || !claims.id) {
        return responderNoAutorizado(res, "Token inválido");
    }

    try {
        const resultado = await pool.query(
            "SELECT id_usuario, rol, estado FROM usuario WHERE id_usuario=$1",
            [claims.id]
        );
        const usuario = resultado.rows[0];
        if (!usuario || usuario.estado === false || String(usuario.estado).toUpperCase() === "INACTIVO") {
            return responderNoAutorizado(res, "La cuenta no existe o está desactivada");
        }

        req.usuario = {
            ...claims,
            id: usuario.id_usuario,
            rol: usuario.rol,
        };
        return next();
    } catch (error) {
        return next(error);
    }
};

export default verificarToken;
