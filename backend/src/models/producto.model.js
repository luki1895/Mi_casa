import pool from "../config/db.js";

const categorias = new Set(["SOPA", "SEGUNDO", "ENTRADA", "REFRESCO", "EXTRA", "OTRO"]);

const validarImagen = (valor) => {
    const texto = String(valor || "").trim();
    if (!texto) return null;
    if (!/^https:\/\//i.test(texto) && !/^\/[^/]/.test(texto)) {
        throw Object.assign(new Error("La imagen debe usar una URL HTTPS o una ruta local"), { status: 400 });
    }
    return texto;
};

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
        imagen_url: validarImagen(datos.imagen_url),
    };
};

const listar = async () => {
    const { rows } = await pool.query(
        `SELECT id_producto,nombre,categoria,descripcion,precio_unitario,imagen_url,activo,creado_en
         FROM producto ORDER BY nombre`
    );
    return rows;
};

const obtener = async (id) => {
    const { rows } = await pool.query(
        `SELECT id_producto,nombre,categoria,descripcion,precio_unitario,imagen_url,activo,creado_en
         FROM producto WHERE id_producto=$1`,
        [id],
    );
    return rows[0] || null;
};

const crear = async (datos) => {
    const producto = validar(datos);
    const { rows } = await pool.query(
        `INSERT INTO producto (nombre,categoria,descripcion,precio_unitario,imagen_url,activo)
         VALUES ($1,$2,$3,0,$4,TRUE)
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,imagen_url,activo,creado_en`,
        [producto.nombre, producto.categoria, producto.descripcion, producto.imagen_url],
    );
    return rows[0];
};

const actualizar = async (id, datos) => {
    const producto = validar(datos);
    const { rows } = await pool.query(
        `UPDATE producto SET nombre=$1,categoria=$2,descripcion=$3,imagen_url=$4
         WHERE id_producto=$5
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,imagen_url,activo,creado_en`,
        [producto.nombre, producto.categoria, producto.descripcion, producto.imagen_url, id],
    );
    if (!rows[0]) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    return rows[0];
};

const cambiarEstado = async (id, activo) => {
    const { rows } = await pool.query(
        `UPDATE producto SET activo=$1
         WHERE id_producto=$2
         RETURNING id_producto,nombre,categoria,descripcion,precio_unitario,imagen_url,activo,creado_en`,
        [activo, id],
    );
    if (!rows[0]) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    return rows[0];
};

export default { listar, obtener, crear, actualizar, cambiarEstado };
