import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { normalizarRol } from "../middlewares/autorizarRoles.js";

const rolesPermitidos = new Set(["admin", "caja", "mesero", "cliente", "empleado"]);
const columnasPublicas = "id_usuario, id_persona, id_cliente, usuario, rol, estado, creado_en";

const normalizarTexto = (valor) => {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim();
};

const normalizarEstado = (valor) => {
    if (valor === undefined || valor === null) return undefined;
    if (typeof valor === "boolean") return valor;
    const texto = String(valor).trim().toLowerCase();
    if (["true", "activo", "enabled", "1", "si", "yes"].includes(texto)) return true;
    if (["false", "inactivo", "disabled", "0", "no"].includes(texto)) return false;
    return Boolean(valor);
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
    const { rows } = await pool.query(`SELECT ${columnasPublicas} FROM usuario ORDER BY id_usuario DESC`);
    return rows;
};

const obtener = async (id) => {
    const { rows } = await pool.query(`SELECT ${columnasPublicas} FROM usuario WHERE id_usuario=$1`, [id]);
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
        throw new Error("El nombre de usuario es obligatorio");
    }
    if (!clave) {
        throw new Error("La contraseña es obligatoria");
    }
    if (!rolesPermitidos.has(rolNormalizado)) {
        throw new Error("El rol seleccionado no es válido");
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

    return resultado;
};

const actualizar = async (id, datos = {}) => {
    const { usuario, password, rol, estado } = datos;
    const campos = [];
    const params = [];

    if (usuario !== undefined && String(usuario).trim()) {
        params.push(String(usuario).trim());
        campos.push(`usuario = $${params.length}`);
    }

    if (password !== undefined && String(password).trim()) {
        params.push(await bcrypt.hash(String(password).trim(), 10));
        campos.push(`password = $${params.length}`);
    }

    if (rol !== undefined && String(rol).trim()) {
        const rolNormalizado = normalizarRol(rol);
        if (!rolesPermitidos.has(rolNormalizado)) {
            throw new Error("El rol seleccionado no es válido");
        }
        params.push(rolNormalizado);
        campos.push(`rol = $${params.length}`);
    }

    if (estado !== undefined) {
        params.push(normalizarEstado(estado));
        campos.push(`estado = $${params.length}`);
    }

    if (campos.length) {
        params.push(id);
        const resultado = await pool.query(
            `UPDATE usuario SET ${campos.join(", ")} WHERE id_usuario = $${params.length} RETURNING ${columnasPublicas}`,
            params
        );

        if (resultado.rows[0]?.id_usuario) {
            await guardarDatosPersona(resultado.rows[0].id_usuario, datos);
        }

        return resultado;
    }

    if (datos.nombre_completo || datos.nombre || datos.ci || datos.correo || datos.email || datos.telefono) {
        await guardarDatosPersona(id, datos);
    }

    return await pool.query(`SELECT ${columnasPublicas} FROM usuario WHERE id_usuario=$1`, [id]);
};

const eliminar = async (id) => {
    const resultado = await pool.query("DELETE FROM usuario WHERE id_usuario=$1", [id]);
    return resultado;
};

export default {
    listar,
    obtener,
    crear,
    actualizar,
    eliminar,
};
