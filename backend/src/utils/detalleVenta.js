const agruparDetalleVenta = (detalle) => {
    const lineas = new Map();
    for (const item of detalle) {
        const idProducto = Number(item.id_producto);
        const cantidad = Number(item.cantidad);
        const tipoVenta = String(item.tipo_venta || "PRODUCTO").trim().toUpperCase();
        if (!Number.isInteger(idProducto) || idProducto < 1
            || !Number.isInteger(cantidad) || cantidad < 1
            || !["PRODUCTO", "ALMUERZO_COMPLETO", "VASO_EXTRA_REFRESCO"].includes(tipoVenta)) {
            throw Object.assign(new Error("El detalle contiene productos, tipos o cantidades inválidas"), { status: 400 });
        }
        const idSegundo = tipoVenta === "ALMUERZO_COMPLETO" ? Number(item.id_segundo_elegido) : null;
        if (tipoVenta === "ALMUERZO_COMPLETO" && (!Number.isSafeInteger(idSegundo) || idSegundo < 1)) {
            throw Object.assign(new Error("Selecciona pollo o carne para el almuerzo completo"), { status: 400 });
        }
        const llave = `${tipoVenta}:${idProducto}:${idSegundo || ""}`;
        const actual = lineas.get(llave);
        lineas.set(llave, {
            id_producto: idProducto,
            cantidad: (actual?.cantidad || 0) + cantidad,
            tipo_venta: tipoVenta,
            id_segundo_elegido: idSegundo,
        });
    }
    return Array.from(lineas.values());
};

const resolverDetalleVenta = (solicitados, menu) => solicitados.map((item) => {
    const plato = menu.find((producto) => (
        Number(producto.id_producto) === item.id_producto
        && String(producto.tipo_venta || "PRODUCTO") === item.tipo_venta
        && (item.tipo_venta !== "ALMUERZO_COMPLETO"
            || Number(producto.id_segundo_elegido) === item.id_segundo_elegido)
    ));
    if (!plato) {
        throw Object.assign(new Error("El producto o la opción elegida no pertenece al menú vigente"), { status: 409 });
    }
    if (item.tipo_venta !== "VASO_EXTRA_REFRESCO"
        && (!Number.isFinite(Number(plato.stock)) || Number(plato.stock) < item.cantidad)) {
        throw Object.assign(new Error(`Disponibilidad insuficiente para ${plato.nombre}${plato.segundo_elegido ? ` con ${plato.segundo_elegido}` : ""}`), { status: 409 });
    }
    if (plato.precio === null || plato.precio === undefined || !Number.isFinite(Number(plato.precio))) {
        throw Object.assign(new Error(`No hay precio vigente configurado para ${plato.nombre}`), { status: 409 });
    }
    return {
        ...item,
        nombre: plato.nombre,
        precio: Number(plato.precio),
        subtotal: Number(plato.precio) * item.cantidad,
        id_sopa_componente: item.tipo_venta === "ALMUERZO_COMPLETO" ? Number(plato.id_sopa_componente) : null,
        id_segundo_componente: item.tipo_venta === "ALMUERZO_COMPLETO" ? Number(plato.id_segundo_elegido) : null,
        segundo_elegido: plato.segundo_elegido || null,
        refresco_acompanamiento: plato.refresco_acompanamiento || null,
    };
});

export { agruparDetalleVenta, resolverDetalleVenta };
