export const claveDetalleVenta = (item) => (
    `${item.tipo_venta || "PRODUCTO"}:${item.id_producto}:${item.id_segundo_elegido || ""}`
);

export const precioConfigurado = (item) => (
    item.precio !== null
    && item.precio !== undefined
    && item.precio !== ""
    && Number.isFinite(Number(item.precio))
    && Number(item.precio) >= 0
);

export const inventarioAgotado = (item, cantidadActual = 0) => (
    item.stock !== null
    && item.stock !== undefined
    && (!Number.isFinite(Number(item.stock)) || cantidadActual >= Number(item.stock))
);

export const serializarDetalleVenta = (item) => ({
    id_producto: Number(item.id_producto),
    cantidad: Number(item.cantidad),
    tipo_venta: item.tipo_venta || "PRODUCTO",
    ...(item.tipo_venta === "ALMUERZO_COMPLETO"
        ? { id_segundo_elegido: Number(item.id_segundo_elegido) }
        : {}),
});
