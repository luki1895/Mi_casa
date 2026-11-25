import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import fechaRestaurante from "../../utils/fechaRestaurante";
import claveDeIdempotencia from "../../utils/idempotency";
import { claveDetalleVenta, inventarioAgotado, precioConfigurado, serializarDetalleVenta } from "../../utils/detalleVenta";

const moneda = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;

function Pedidos() {
    const [clientes, setClientes] = useState([]);
    const [menu, setMenu] = useState([]);
    const [menuConfirmado, setMenuConfirmado] = useState(false);
    const [pedidos, setPedidos] = useState([]);
    const [tipoCliente, setTipoCliente] = useState("PENSIONADO");
    const [clienteId, setClienteId] = useState("");
    const [nombreEventual, setNombreEventual] = useState("");
    const [telefonoEventual, setTelefonoEventual] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [carrito, setCarrito] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const idempotenciaRef = useRef(null);

    const obtenerDatos = useCallback(async () => {
        const fecha = fechaRestaurante();
        const [clientesResponse, menuResponse, pedidosResponse] = await Promise.all([
            api.get("/clientes/para-pedidos"),
            api.get(`/produccion/menu?fecha=${fecha}`),
            api.get("/pedidos"),
        ]);
        return {
            clientes: (clientesResponse.data.data || []).filter((cliente) => (
                cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO"
            )),
            menu: menuResponse.data.data || [],
            pedidos: pedidosResponse.data.data || [],
        };
    }, []);

    useEffect(() => {
        let cancelado = false;
        obtenerDatos()
            .then((datos) => {
                if (cancelado) return;
                setClientes(datos.clientes);
                setMenu(datos.menu);
                setMenuConfirmado(true);
                setPedidos(datos.pedidos);
            })
            .catch((requestError) => {
                if (!cancelado) {
                    setMenu([]);
                    setMenuConfirmado(false);
                    setError(requestError.response?.data?.mensaje || "No se pudieron cargar los datos de pedidos.");
                }
            })
            .finally(() => {
                if (!cancelado) setCargando(false);
            });
        return () => { cancelado = true; };
    }, [obtenerDatos]);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        setMenu([]);
        setMenuConfirmado(false);
        try {
            const datos = await obtenerDatos();
            setClientes(datos.clientes);
            setMenu(datos.menu);
            setMenuConfirmado(true);
            setPedidos(datos.pedidos);
        } catch (requestError) {
            setMenu([]);
            setMenuConfirmado(false);
            setError(requestError.response?.data?.mensaje || "No se pudieron cargar los datos de pedidos.");
        } finally {
            setCargando(false);
        }
    }, [obtenerDatos]);

    const total = useMemo(
        () => carrito.reduce((suma, item) => suma + Number(item.precio) * item.cantidad, 0),
        [carrito]
    );

    const menuFiltrado = menu.filter((producto) => (
        producto.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    ));

    const agregarProducto = (producto) => {
        setAviso("");
        if (!precioConfigurado(producto)) {
            setAviso(`El precio de ${producto.nombre} todavía no está configurado por administración.`);
            return;
        }
        const stock = Number(producto.stock);
        const key = claveDetalleVenta(producto);
        const existente = carrito.find((item) => claveDetalleVenta(item) === key);
        if (producto.stock !== null && producto.stock !== undefined && (!Number.isFinite(stock) || stock < 1)) {
            setAviso(`No se pudo confirmar la disponibilidad de ${producto.nombre}.`);
            return;
        }
        if (inventarioAgotado(producto, existente?.cantidad || 0)) {
            setAviso(`No hay más unidades disponibles de ${producto.nombre}.`);
            return;
        }
        setCarrito((actual) => {
            const yaAgregado = actual.some((item) => claveDetalleVenta(item) === key);
            return yaAgregado
                ? actual.map((item) => claveDetalleVenta(item) === key
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item)
                : [...actual, { ...producto, cantidad: 1 }];
        });
    };

    const cambiarCantidad = (key, cantidad) => {
        setCarrito((actual) => actual
            .map((item) => claveDetalleVenta(item) === key
                ? { ...item, cantidad: item.stock == null ? cantidad : Math.min(Number(item.stock), cantidad) }
                : item)
            .filter((item) => item.cantidad > 0));
    };

    const limpiar = () => {
        setClienteId("");
        setTipoCliente("PENSIONADO");
        setNombreEventual("");
        setTelefonoEventual("");
        setObservaciones("");
        setCarrito([]);
        setAviso("");
    };

    const guardarPedido = async (event) => {
        event.preventDefault();
        setAviso("");
        setError("");
        if (tipoCliente === "PENSIONADO" && !clienteId) {
            setError("Selecciona un cliente pensionado.");
            return;
        }
        if (tipoCliente === "EVENTUAL" && !nombreEventual.trim()) {
            setError("Indica el nombre del cliente eventual.");
            return;
        }
        if (!carrito.length) {
            setError("Agrega al menos un producto disponible.");
            return;
        }

        setGuardando(true);
        try {
            const pedido = {
                tipo_cliente: tipoCliente,
                id_cliente: tipoCliente === "PENSIONADO" ? Number(clienteId) : undefined,
                cliente_nombre: tipoCliente === "EVENTUAL" ? nombreEventual.trim() : undefined,
                cliente_telefono: tipoCliente === "EVENTUAL" ? telefonoEventual.trim() : undefined,
                fecha: fechaRestaurante(),
                observaciones: observaciones.trim(),
                detalle: carrito.map(serializarDetalleVenta),
            };
            const solicitudId = claveDeIdempotencia(idempotenciaRef, pedido);
            const { data } = await api.post("/pedidos", pedido, {
                headers: { "Idempotency-Key": solicitudId },
            });
            idempotenciaRef.current = null;
            limpiar();
            setAviso(`Pedido #${data.data.id_pedido} registrado por ${moneda(data.data.total)}.`);
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo registrar el pedido.");
            await cargar();
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Operación diaria</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Pedidos</h1>
                    <p className="mt-1 text-sm text-slate-500">Registra pedidos con disponibilidad y precios del menú de hoy.</p>
                </div>
                <button type="button" onClick={() => { setCargando(true); setError(""); void cargar(); }} className="rounded-xl border bg-white px-4 py-2 font-semibold">
                    Actualizar
                </button>
            </header>

            {(error || aviso) && (
                <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {error || aviso}
                </p>
            )}

            <form onSubmit={guardarPedido} className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <div className="space-y-6">
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold">Cliente</h2>
                        <div className="mt-4 flex flex-wrap gap-4">
                            {["PENSIONADO", "EVENTUAL"].map((tipo) => (
                                <label key={tipo} className="flex items-center gap-2 text-sm font-medium">
                                    <input type="radio" value={tipo} checked={tipoCliente === tipo} onChange={(event) => {
                                        setTipoCliente(event.target.value);
                                        setClienteId("");
                                    }} />
                                    {tipo === "PENSIONADO" ? "Pensionado" : "Eventual"}
                                </label>
                            ))}
                        </div>
                        {tipoCliente === "PENSIONADO" ? (
                            <select required value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="mt-4 w-full rounded-lg border p-3">
                                <option value="">Seleccionar cliente</option>
                                {clientes.filter((cliente) => String(cliente.tipo_cliente).toUpperCase() === "PENSIONADO").map((cliente) => (
                                    <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <input required value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente" className="rounded-lg border p-3" />
                                <input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" className="rounded-lg border p-3" />
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-bold">Menú de hoy</h2>
                            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar plato" className="rounded-lg border px-3 py-2 text-sm" />
                        </div>
                        {cargando ? (
                            <p className="py-6 text-center text-slate-500">Cargando menú…</p>
                        ) : !menuConfirmado ? (
                            <p className="py-6 text-center text-slate-500">No se pudo confirmar la disponibilidad del menú.</p>
                        ) : menuFiltrado.length ? (
                            <div className="divide-y">
                                {menuFiltrado.map((producto) => (
                                    <div key={claveDetalleVenta(producto)} className="flex items-center justify-between gap-4 py-3">
                                        <div>
                                            <p className="font-semibold">{producto.nombre}</p>
                                            <p className="text-sm text-slate-500">
                                                {producto.categoria}
                                                {producto.tipo_venta === "ALMUERZO_COMPLETO" && ` · Segundo: ${producto.segundo_elegido}`}
                                                {producto.tipo_venta === "ALMUERZO_COMPLETO" && producto.refresco_acompanamiento && ` · Refresco incluido: ${producto.refresco_acompanamiento}`}
                                                {producto.tipo_venta === "VASO_EXTRA_REFRESCO" ? " · Sin descuento de producción" : producto.stock !== null && producto.stock !== undefined && producto.stock !== "" && Number.isFinite(Number(producto.stock)) ? ` · ${Number(producto.stock)} disponibles` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <strong>{precioConfigurado(producto) ? moneda(producto.precio) : "Precio no configurado"}</strong>
                                            <button type="button" disabled={!precioConfigurado(producto) || inventarioAgotado(producto)} onClick={() => agregarProducto(producto)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Agregar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-6 text-center text-slate-500">No hay productos disponibles para esa búsqueda.</p>
                        )}
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold">Detalle del pedido</h2>
                        {carrito.length ? (
                            <div className="mt-4 divide-y">
                                {carrito.map((item) => (
                                    <div key={claveDetalleVenta(item)} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{item.nombre}</p>
                                            <p className="text-sm text-slate-500">{moneda(item.precio)} c/u</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(claveDetalleVenta(item), item.cantidad - 1)} className="h-8 w-8 rounded border">−</button>
                                            <span className="w-5 text-center">{item.cantidad}</span>
                                            <button type="button" aria-label={`Agregar una unidad de ${item.nombre}`} disabled={inventarioAgotado(item, item.cantidad)} onClick={() => cambiarCantidad(claveDetalleVenta(item), item.cantidad + 1)} className="h-8 w-8 rounded border disabled:opacity-40">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-slate-500">Todavía no agregaste productos.</p>
                        )}
                        <label className="mt-4 block text-sm font-semibold">Observaciones
                            <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} rows="3" placeholder="Indicaciones del pedido" className="mt-1 w-full resize-y rounded-lg border p-3 font-normal" />
                        </label>
                        <div className="mt-4 flex justify-between border-t pt-4 text-lg">
                            <span>Total</span><strong>{moneda(total)}</strong>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={limpiar} className="flex-1 rounded-xl border px-4 py-3 font-bold">Limpiar</button>
                            <button type="submit" disabled={guardando || cargando || !carrito.length} className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">
                                {guardando ? "Registrando…" : "Registrar pedido"}
                            </button>
                        </div>
                    </section>

                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold">Pedidos recientes</h2>
                        {pedidos.slice(0, 6).map((pedido) => (
                            <div key={pedido.id_pedido} className="flex justify-between gap-3 border-b py-3 text-sm last:border-0">
                                <div><p className="font-semibold">#{pedido.id_pedido} · {pedido.nombre}</p><p className="text-slate-500">{String(pedido.estado).replaceAll("_", " ")}</p></div>
                                <strong>{moneda(pedido.total)}</strong>
                            </div>
                        ))}
                        {!pedidos.length && !cargando && <p className="mt-3 text-sm text-slate-500">Aún no hay pedidos registrados.</p>}
                    </section>
                </aside>
            </form>
        </div>
    );
}

export default Pedidos;
