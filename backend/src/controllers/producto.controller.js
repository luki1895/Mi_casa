import productoService from "../services/producto.service.js";
import response from "../utils/response.js";

export const listar = async (req, res) => {
    try {
        response.ok(res, await productoService.listar());
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const obtener = async (req, res) => {
    try {
        const producto = await productoService.obtener(req.params.id);
        if (!producto) return response.error(res, "Producto no encontrado", 404);
        return response.ok(res, producto);
    } catch (error) {
        return response.error(res, error.message, error.status || 500);
    }
};

export const crear = async (req, res) => {
    try {
        response.ok(res, await productoService.crear(req.body), "Producto creado");
    } catch (error) {
        response.error(res, error.code === "23505" ? "Ya existe un producto con ese nombre" : error.message, error.status || (error.code === "23505" ? 409 : 500));
    }
};

export const actualizar = async (req, res) => {
    try {
        response.ok(res, await productoService.actualizar(req.params.id, req.body));
    } catch (error) {
        response.error(res, error.code === "23505" ? "Ya existe un producto con ese nombre" : error.message, error.status || (error.code === "23505" ? 409 : 500));
    }
};

export const cambiarEstado = async (req, res) => {
    try {
        if (typeof req.body.activo !== "boolean") {
            return response.error(res, "El estado activo debe ser booleano", 400);
        }
        return response.ok(res, await productoService.cambiarEstado(req.params.id, req.body.activo));
    } catch (error) {
        return response.error(res, error.message, error.status || 500);
    }
};

export const eliminar = async (req, res) => {
    try {
        response.ok(res, await productoService.cambiarEstado(req.params.id, false), "Producto desactivado");
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};
