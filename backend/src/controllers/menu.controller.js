import produccionModel from "../models/produccion.model.js";
import response from "../utils/response.js";

const validarFecha = (fecha) => {
    if (!fecha) return new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
        throw Object.assign(new Error("La fecha no tiene el formato YYYY-MM-DD"), { status: 400 });
    }
    return String(fecha);
};

export const publico = async (req, res) => {
    try {
        const fecha = validarFecha(req.query.fecha);
        const productos = await produccionModel.listarMenu(fecha, undefined, true);
        const publicos = productos
            .filter((producto) => Number(producto.stock) > 0)
            .map(({ id_producto, nombre, categoria, precio, imagen_url }) => ({
                id_producto,
                nombre,
                categoria,
                precio,
                imagen_url: imagen_url || null,
                disponible: true,
            }));
        response.ok(res, publicos);
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const interno = async (req, res) => {
    try {
        const fecha = validarFecha(req.query.fecha);
        const productos = await produccionModel.listarMenu(fecha, undefined, true);
        response.ok(res, productos);
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};
