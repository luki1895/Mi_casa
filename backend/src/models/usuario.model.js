import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { normalizarRol } from "../middlewares/autorizarRoles.js";

const rolesPermitidos = new Set(["admin", "caja", "mesero", "cliente"]);
const columnasPublicas = "id_usuario, id_persona, id_cliente, usuario, rol, estado, creado_en";
const columnasConPersona = "u.id_usuario, u.id_persona, u.id_cliente, u.usuario, u.rol, u.estado, u.creado_en, p.nombre AS nombre_completo, p.ci, p.email AS correo, p.telefono";

const normalizarTexto = (valor) => {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim();
};

const normalizarEstado = (valor) => {
    if (valor === undefined) return undefined;
    if (valor === null) throw Object.assign(new Error("El estado del usuario no es válido"), { status: 400 });
    if (typeof valor === "boolean") return valor;
    const texto = String(valor).trim().toLowerCase();
    if (["true", "activo", "enabled", "1", "si", "yes"].includes(texto)) return true;
    if (["false", "inactivo", "disabled", "0", "no"].includes(texto)) return false;
    throw Object.assign(new Error("El estado del usuario no es válido"), { status: 400 });
};

const guardarDatosPersona = async (idUsuario, datos = {}) => {
    const nombreCompleto = normalizarTexto(datos.nombre_completo || datos.nombre || "");
    const ci = normalizarTexto(datos.ci || "");
    const correo = normalizarTexto(datos.correo || datos.email || "");
    const telefono = normalizarTexto(datos.telefono || "");

    if (!nombreCompleto && !ci && !correo && !telefono) return;

    const { rows: usuarioActualRows } = await pool.query(
        "SELECT id_persona FROM usuario WHERE id_usuario = $1",
        [idUsuario]
    );
    const idPersona = usuarioActualRows[0]?.id_persona;

    if (!idPersona) {
        const { rows } = await pool.query(
            `INSERT INTO persona (nombre, ci, email, telefono) VALUES ($1, $2, $3, $4) RETURNING id_persona`,
            [nombreCompleto || "Sin nombre", ci || null, correo || null, telefono || null]
        );
        await pool.query("UPDATE usuario SET id_persona = $1 WHERE id_usuario = $2", [rows[0].id_persona, idUsuario]);
        return;
    }

    const campos = [];
    const params = [];

    if (nombreCompleto) {
        params.push(nombreCompleto);
        campos.push(`nombre = $${params.length}`);
    }
    if (ci) {
        params.push(ci);
        campos.push(`ci = $${params.length}`);
    }
    if (correo) {
        params.push(correo);
        campos.push(`email = $${params.length}`);
    }
    if (telefono) {
        params.push(telefono);
        campos.push(`telefono = $${params.length}`);
    }

    if (!campos.length) return;

    params.push(idPersona);
    await pool.query(
        `UPDATE persona SET ${campos.join(", ")} WHERE id_persona = $${params.length}`,
        params
    );
};

const listar = async () => {
    const { rows } = await pool.query(
        `SELECT ${columnasConPersona}
         FROM usuario u
         LEFT JOIN persona p ON p.id_persona=u.id_persona
         ORDER BY u.id_usuario DESC`
    );
    return rows;
};

const obtener = async (id) => {
    const { rows } = await pool.query(
        `SELECT ${columnasConPersona}
         FROM usuario u
         LEFT JOIN persona p ON p.id_persona=u.id_persona
         WHERE u.id_usuario=$1`,
        [id]
    );
    return rows[0];
};

const crear = async (datos = {}) => {
    const {
        id_persona = null,
        usuario,
        password,
        rol,
        estado = true,
    } = datos;

    const nombreUsuario = String(usuario || "").trim();
    const clave = String(password || "").trim();
    const rolNormalizado = normalizarRol(rol);

    if (!nombreUsuario) {
        throw Object.assign(new Error("El nombre de usuario es obligatorio"), { status: 400 });
    }
    if (nombreUsuario.length > 80) {
        throw Object.assign(new Error("El nombre de usuario no debe superar 80 caracteres"), { status: 400 });
    }
    if (!clave) {
        throw Object.assign(new Error("La contraseña es obligatoria"), { status: 400 });
    }
    if (!rolesPermitidos.has(rolNormalizado)) {
        throw Object.assign(new Error("El rol seleccionado no es válido"), { status: 400 });
    }

    const passwordHash = await bcrypt.hash(clave, 10);
    const estadoNormalizado = normalizarEstado(estado);

    const resultado = await pool.query(
        `
        INSERT INTO usuario
        (id_persona, usuario, password, rol, estado)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${columnasPublicas}
        `,
        [id_persona, nombreUsuario, passwordHash, rolNormalizado, estadoNormalizado !== undefined ? estadoNormalizado : true]
    );

    if (resultado.rows[0]?.id_usuario) {
        await guardarDatosPersona(resultado.rows[0].id_usuario, datos);
    }

    return obtener(resultado.rows[0].id_usuario);
};

const actualizar = async (id, datos = {}) => {
    const { usuario, password, rol, estado } = datos;
    const existente = await pool.query(
        "SELECT rol, estado FROM usuario WHERE id_usuario=$1",
        [id]
    );
    if (!existente.rows[0]) {
        throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
    }

    const rolActual = normalizarRol(existente.rows[0].rol);
    const cuentaEmpleadoLegada = rolActual === "empleado";
    const estadoActual = normalizarEstado(existente.rows[0].estado);
    const campos = [];
    const params = [];
    let rolNormalizado;

    if (usuario !== undefined && String(usuario).trim()) {
        const nombreUsuario = String(usuario).trim();
        if (nombreUsuario.length > 80) {
            throw Object.assign(new Error("El nombre de usuario no debe superar 80 caracteres"), { status: 400 });
        }
        params.push(nombreUsuario);
        campos.push(`usuario = $${params.length}`);
    }

    if (password !== undefined && String(password).trim()) {
        params.push(await bcrypt.hash(String(password).trim(), 10));
        campos.push(`password = $${params.length}`);
    }

    if (rol !== undefined && String(rol).trim()) {
        rolNormalizado = normalizarRol(rol);
        if (cuentaEmpleadoLegada && rolNormalizado !== "empleado") {
            throw Object.assign(
                new Error("El rol de esta cuenta histórica está protegido durante la transición"),
                { status: 400 },
            );
        }
        if (!cuentaEmpleadoLegada && !rolesPermitidos.has(rolNormalizado)) {
            throw Object.assign(new Error("El rol seleccionado no es válido"), { status: 400 });
        }
        if (!cuentaEmpleadoLegada) {
            params.push(rolNormalizado);
            campos.push(`rol = $${params.length}`);
        }
    }

    if (estado !== undefined) {
        const estadoNormalizado = normalizarEstado(estado);
        if (estadoNormalizado === true) {
            if (cuentaEmpleadoLegada && estadoActual !== true) {
                throw Object.assign(
                    new Error("No se puede reactivar una cuenta con rol empleado"),
                    { status: 400 },
                );
            }
            if (!cuentaEmpleadoLegada && !rolesPermitidos.has(rolNormalizado || rolActual)) {
                throw Object.assign(
                    new Error("Asigna un rol vigente antes de reactivar esta cuenta"),
                    { status: 400 },
                );
            }
        }
        params.push(estadoNormalizado);
        campos.push(`estado = $${params.length}`);
    }

    if (!campos.length) {
        if (datos.nombre_completo || datos.nombre || datos.ci || datos.correo || datos.email || datos.telefono) {
            await guardarDatosPersona(id, datos);
        }
        return obtener(id);
    }

    params.push(id);
    const resultado = await pool.query(
        `UPDATE usuario SET ${campos.join(", ")} WHERE id_usuario = $${params.length} RETURNING ${columnasPublicas}`,
        params
    );
    if (!resultado.rows[0]) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
    if (datos.nombre_completo || datos.nombre || datos.ci || datos.correo || datos.email || datos.telefono) {
        await guardarDatosPersona(id, datos);
    }

    return obtener(id);
};

const eliminar = async (id) => {
    const resultado = await pool.query(
        `UPDATE usuario SET estado=FALSE
         WHERE id_usuario=$1
         RETURNING ${columnasPublicas}`,
        [id]
    );
    if (!resultado.rows[0]) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
    return resultado.rows[0];
};

export default {
    listar,
    obtener,
    crear,
    actualizar,
    eliminar,
};
