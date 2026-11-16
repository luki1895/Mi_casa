import pool from "../config/db.js";

const categorias = new Set(["SOPA", "SEGUNDO", "ENTRADA", "REFRESCO", "EXTRA", "OTRO"]);

const validar = (datos) => {
    const nombre = String(datos.nombre || "").trim();
    const categoria = String(datos.categoria || "").trim().toUpperCase();
    if (!nombre || nombre.length > 180) {
        throw Object.assign(new Error("El nombre es obligatorio y no debe superar 180 caracteres"), { status: 400 });
    }
    if (!categorias.has(categoria)) {
        throw Object.assign(new Error("La categoría del producto no es válida"), { status: 400 });
    }
    return {
        nombre,
        categoria,
        descripcion: String(datos.descripcion || "").trim() || null,
    };
};

const listar = async () => {
    const { rows } = await pool.query(
        `SELECT id_producto,nombre,categoria,descripcion,precio_unitario,activo,creado_en
         FROM producto ORDER BY nombre`
    );
    return rows;
};

const obtener = async (id) => {
    const { rows } = await pool.query(
        `SELECT id_producto,nombre,categoria,descripcion,precio_unitario,activo,creado_en
         FROM producto WHERE id_producto=$1`,
        [id],
    );
    return rows[0] || null;
};

const crear = async (datos) => {
    const producto = validar(datos);
    const { rows } = await pool.query(
        `INSERT INTO producto (nombre,categoria,descripcion,precio_unitario,activo)
         VALUES ($1,$2,$3,0,TRUE)
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,activo,creado_en`,
        [producto.nombre, producto.categoria, producto.descripcion],
    );
    return rows[0];
};

const actualizar = async (id, datos) => {
    const producto = validar(datos);
    const { rows } = await pool.query(
        `UPDATE producto SET nombre=$1,categoria=$2,descripcion=$3
         WHERE id_producto=$4
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,activo,creado_en`,
        [producto.nombre, producto.categoria, producto.descripcion, id],
    );
    if (!rows[0]) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    return rows[0];
};

const cambiarEstado = async (id, activo) => {
    const { rows } = await pool.query(
        `UPDATE producto SET activo=$1
         WHERE id_producto=$2
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,activo,creado_en`,
        [activo, id],
    );
    if (!rows[0]) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    return rows[0];
};

export default { listar, obtener, crear, actualizar, cambiarEstado };
