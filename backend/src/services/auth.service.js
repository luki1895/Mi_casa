import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import authModel from "../models/auth.model.js";

const login = async (datos) => {
    const usuario = await authModel.buscarUsuario(datos.usuario);

    if (!usuario) {
        throw Object.assign(new Error("Usuario o contraseña incorrectos"), { status: 401 });
    }

    if (usuario.estado === false || String(usuario.estado).toUpperCase() === "INACTIVO") {
        throw Object.assign(new Error("El usuario está desactivado"), { status: 403 });
    }

    const valido = await bcrypt.compare(datos.password, usuario.password);

    if (!valido) {
        throw Object.assign(new Error("Usuario o contraseña incorrectos"), { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw Object.assign(new Error("JWT_SECRET no está configurado. Define la variable de entorno para autenticar."), { status: 500 });
    }

    const token = jwt.sign({
        id: usuario.id_usuario,
        rol: usuario.rol,
    }, jwtSecret, {
        expiresIn: "12h",
    });

    const usuarioPublico = { ...usuario };
    delete usuarioPublico.password;

    return {
        token,
        usuario: usuarioPublico,
    };
};

export default { login };
