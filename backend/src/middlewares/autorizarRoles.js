const normalizarRol = (rol = "") => {
    const valor = String(rol)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, " ");
    const roles = {
        admin: "admin",
        administrador: "admin",
        administrator: "admin",
        caja: "caja",
        cajero: "caja",
        mesero: "mesero",
        mesera: "mesero",
        cliente: "cliente",
        empleado: "empleado",
    };
    return roles[valor] || valor;
};

const autorizarRoles = (...rolesPermitidos) => (req, res, next) => {
    const rol = normalizarRol(req.usuario?.rol ?? req.usuario?.role);
    if (!rolesPermitidos.map(normalizarRol).includes(rol)) {
        return res.status(403).json({
            ok: false,
            mensaje: "No tienes permiso para realizar esta operación",
        });
    }
    return next();
};

export { normalizarRol };
export default autorizarRoles;
