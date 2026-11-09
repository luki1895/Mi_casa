import { normalizarRol } from "./autorizarRoles.js";

const responderDenegado = (res) => res.status(403).json({
    ok: false,
    mensaje: "No puedes cambiar tus propios privilegios ni desactivar o eliminar tu cuenta",
});

export const impedirCambioPrivilegiosPropios = (req, res, next) => {
    if (String(req.params.id) !== String(req.usuario?.id)) return next();

    const rolSolicitado = req.body?.rol;
    const cambiaRol = rolSolicitado !== undefined
        && normalizarRol(rolSolicitado) !== normalizarRol(req.usuario?.rol);
    const desactivaCuenta = req.body?.estado !== undefined
        && ["false", "inactivo", "disabled", "0", "no"].includes(String(req.body.estado).trim().toLowerCase());

    if (cambiaRol || desactivaCuenta) return responderDenegado(res);
    return next();
};

export const impedirAutoeliminacion = (req, res, next) => {
    if (String(req.params.id) === String(req.usuario?.id)) return responderDenegado(res);
    return next();
};
