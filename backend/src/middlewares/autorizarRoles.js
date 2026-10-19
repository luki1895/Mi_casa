const normalizarRol = (rol = "") => {
    const valor = String(rol).trim().toLowerCase();
    if (valor.includes("admin")) return "admin";
    if (valor.includes("caja")) return "caja";
    if (valor.includes("mesero")) return "mesero";
    if (valor.includes("cliente")) return "cliente";
    if (valor.includes("empleado")) return "empleado";
    return valor;
};

const autorizarRoles = (...rolesPermitidos) => (req, res, next) => {
    const rol = normalizarRol(req.usuario?.rol);
    if (!rolesPermitidos.includes(rol)) {
        return res.status(403).json({
            ok: false,
            mensaje: "No tienes permiso para realizar esta operación",
        });
    }
    return next();
};

export { normalizarRol };
export default autorizarRoles;
