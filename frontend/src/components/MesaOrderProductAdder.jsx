import { useMemo, useState } from "react";
import { Button, Input, Textarea } from "./ui";
import { claveDetalleVenta, inventarioAgotado, precioConfigurado, serializarDetalleVenta } from "../utils/detalleVenta";

const importe = (value) => {
    const amount = Number(value);
    return value === null || value === undefined || value === "" || !Number.isFinite(amount)
        ? "No disponible"
        : `Bs ${amount.toFixed(2)}`;
};

function MesaOrderProductAdder({ pedido, menu = [], loading = false, onCancel, onSubmit }) {
    const [busqueda, setBusqueda] = useState("");
    const [productos, setProductos] = useState([]);
    const [observaciones, setObservaciones] = useState("");

    const disponibles = useMemo(
        () => menu.filter((item) => precioConfigurado(item)
            && (item.stock === null || item.stock === undefined || Number(item.stock) > 0)
            && String(item.nombre || "").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())),
        [busqueda, menu]
    );
    const total = productos.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0);

    const agregar = (producto) => {
        setProductos((actuales) => {
            const clave = claveDetalleVenta(producto);
            const existente = actuales.find((item) => claveDetalleVenta(item) === clave);
            if (inventarioAgotado(producto, existente?.cantidad || 0)) return actuales;
            return existente
                ? actuales.map((item) => claveDetalleVenta(item) === clave
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item)
                : [...actuales, { ...producto, cantidad: 1 }];
        });
    };

    const cambiarCantidad = (clave, delta) => {
        setProductos((actuales) => actuales
            .map((item) => claveDetalleVenta(item) === clave
                ? { ...item, cantidad: item.stock == null ? item.cantidad + delta : Math.min(Number(item.stock), item.cantidad + delta) }
                : item)
            .filter((item) => item.cantidad > 0));
    };

    const enviar = (event) => {
        event.preventDefault();
        if (!productos.length) return;
        onSubmit({
            detalle: productos.map(serializarDetalleVenta),
            observaciones: observaciones.trim(),
        });
    };

    return (
        <form onSubmit={enviar} className="mt-4 space-y-4 rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] p-4">
            <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B85C3B]">
                        {pedido.pagado ? "Solicitud de adicional" : "Agregar al pedido pendiente"}
                    </p>
                    <h4 className="mt-1 font-bold text-[#342820]">Pedido #{pedido.id_pedido}</h4>
                    <p className="mt-1 text-xs text-[#75675C]">
                        {pedido.pagado
                            ? "Se enviará una solicitud a Caja; no se alterará la comanda original."
                            : "Se anexarán productos al pedido. Las líneas actuales no se editan ni eliminan."}
                    </p>
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={onCancel}>Cerrar</Button>
            </header>

            <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                aria-label="Buscar producto para agregar"
                placeholder="Buscar producto..."
            />

            {disponibles.length ? (
                <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {disponibles.map((producto) => {
                        const clave = claveDetalleVenta(producto);
                        const agregado = productos.find((item) => claveDetalleVenta(item) === clave);
                        const agotadoEnBorrador = inventarioAgotado(producto, agregado?.cantidad || 0);
                        const nombre = producto.tipo_venta === "ALMUERZO_COMPLETO"
                            ? `${producto.nombre} · segundo de ${producto.segundo_elegido}`
                            : producto.nombre;
                        return (
                            <button
                                key={clave}
                                type="button"
                                disabled={agotadoEnBorrador || loading}
                                onClick={() => agregar(producto)}
                                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#E8DDD1] bg-white px-3 py-2 text-left text-sm hover:border-[#B85C3B]/60 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold text-[#342820]">{nombre}</span>
                                    <span className="text-xs text-[#75675C]">
                                        {importe(producto.precio)}
                                        {producto.refresco_acompanamiento ? ` · Refresco gratuito: ${producto.refresco_acompanamiento}` : ""}
                                        {producto.tipo_venta === "VASO_EXTRA_REFRESCO"
                                            ? " · adicional configurable, sin descuento de producción"
                                            : ` · ${producto.stock} disponibles`}
                                    </span>
                                </span>
                                <span aria-hidden="true" className="font-bold text-[#B85C3B]">+</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="rounded-lg bg-white p-3 text-sm text-[#75675C]">No hay productos disponibles para esa búsqueda.</p>
            )}

            {productos.length > 0 && (
                <div className="space-y-2 border-t border-[#E8DDD1] pt-3">
                    <h5 className="text-sm font-bold text-[#342820]">Productos que se agregarán</h5>
                    <ul className="space-y-2">
                        {productos.map((item) => (
                            <li key={claveDetalleVenta(item)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold text-[#342820]">
                                        {item.nombre}{item.segundo_elegido ? ` · segundo de ${item.segundo_elegido}` : ""}
                                    </span>
                                    <span className="text-xs text-[#75675C]">{importe(item.precio)} c/u</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button type="button" size="sm" variant="secondary" aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(claveDetalleVenta(item), -1)}>-</Button>
                                    <span className="min-w-6 text-center font-bold">{item.cantidad}</span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        aria-label={`Agregar una unidad de ${item.nombre}`}
                                        disabled={inventarioAgotado(item, item.cantidad) || loading}
                                        onClick={() => cambiarCantidad(claveDetalleVenta(item), 1)}
                                    >
                                        +
                                    </Button>
                                    <strong className="min-w-20 text-right">{importe(item.precio * item.cantidad)}</strong>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="text-right text-sm font-bold text-[#342820]">Total a agregar: {importe(total)}</p>
                </div>
            )}

            <Textarea
                label="Nota para cocina (opcional)"
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                rows="2"
                placeholder="Indicaciones para estos productos"
            />

            <Button type="submit" variant="warning" loading={loading} disabled={!productos.length} className="w-full sm:w-auto">
                {pedido.pagado ? "Enviar solicitud a Caja" : "Agregar al pedido"}
            </Button>
        </form>
    );
}

export default MesaOrderProductAdder;
