import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { menuHoy } from "../../data/menuMock";
import { clientesMock } from "../../data/clientesMock";
import useAuth from "../../hooks/useAuth";

const DEMO_SERVICES_KEY = "mi_casa_servicios_demo";
const money = (value) => `Bs ${Number(value || 0).toFixed(2)}`;

function Mesero() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [menu, setMenu] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [pedidosActivos, setPedidosActivos] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [adicionalesCarrito, setAdicionalesCarrito] = useState([]);
    const [observacionesAdicionales, setObservacionesAdicionales] = useState("");
    const [carrito, setCarrito] = useState([]);
    const [idCliente, setIdCliente] = useState("");
    const [tipoCliente, setTipoCliente] = useState("REGISTRADO");
    const [nombreEventual, setNombreEventual] = useState("");
    const [telefonoEventual, setTelefonoEventual] = useState("");
    const [observacionesPedido, setObservacionesPedido] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError("");

        if (usuario?.demo) {
            setMenu(menuHoy.map((plato) => ({
                id_producto: plato.id,
                nombre: plato.nombre,
                categoria: plato.categoria,
                precio: plato.precio,
                stock: 20,
            })));
            setClientes(clientesMock.map((cliente) => ({
                id_cliente: cliente.id,
                nombre: cliente.nombre,
                tipo_cliente: cliente.tipo,
                estado: cliente.estado,
            })));
            setServicios(JSON.parse(localStorage.getItem(DEMO_SERVICES_KEY) || "[]"));
            setPedidosActivos(JSON.parse(localStorage.getItem(DEMO_SERVICES_KEY) || "[]").filter((pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado)));
            setCargando(false);
            return;
        }

        try {
            const hoy = new Date();
            const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
            const [menuResponse, clientesResponse, serviciosResponse, activosResponse] = await Promise.all([
                api.get(`/produccion/menu?fecha=${fecha}`),
                api.get("/clientes/para-pedidos"),
                api.get("/pedidos/mis-servicios"),
                api.get("/pedidos/activos"),
            ]);
            setMenu(menuResponse.data.data || []);
            setClientes((clientesResponse.data.data || []).filter((cliente) => cliente.estado !== false));
            setServicios(serviciosResponse.data.data || []);
            setPedidosActivos(activosResponse.data.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cargar el menú y la bitácora. Revisa la conexión con el servidor.");
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const total = useMemo(
        () => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
        [carrito]
    );

    const platosFiltrados = menu.filter((plato) =>
        plato.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    );

    const agregarPlato = (plato) => {
        setAviso("");
        const existente = carrito.find((item) => item.id_producto === plato.id_producto);
        if (plato.stock !== undefined && (existente?.cantidad || 0) >= Number(plato.stock)) {
            setAviso(`No hay más unidades disponibles de ${plato.nombre}.`);
            return;
        }

        setCarrito((actual) => {
            const yaAgregado = actual.some((item) => item.id_producto === plato.id_producto);
            return yaAgregado
                ? actual.map((item) => item.id_producto === plato.id_producto
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item)
                : [...actual, { ...plato, cantidad: 1 }];
        });
    };

    const cambiarCantidad = (idProducto, delta) => {
        setCarrito((actual) => actual
            .map((item) => item.id_producto === idProducto
                ? { ...item, cantidad: Math.min(Number(item.stock ?? Infinity), item.cantidad + delta) }
                : item)
            .filter((item) => item.cantidad > 0));
    };

    const guardarPedido = async (event) => {
        event.preventDefault();
        setAviso("");
        if ((tipoCliente === "REGISTRADO" && !idCliente) || (tipoCliente === "EVENTUAL" && !nombreEventual.trim()) || carrito.length === 0) {
            setAviso("Identifica al cliente y agrega al menos un plato para registrar el pedido.");
            return;
        }

        const cliente = tipoCliente === "REGISTRADO"
            ? clientes.find((item) => String(item.id_cliente) === String(idCliente))
            : null;
        if (tipoCliente === "REGISTRADO" && !cliente) {
            setAviso("Selecciona un cliente válido.");
            return;
        }

        setGuardando(true);
        try {
            const detalle = carrito.map((item) => ({
                id_producto: item.id_producto,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: Number(item.precio),
                subtotal: Number(item.precio) * item.cantidad,
            }));
            const pedido = {
                id_cliente: cliente?.id_cliente,
                tipo_cliente: tipoCliente === "EVENTUAL" ? "EVENTUAL" : cliente.tipo_cliente,
                cliente_nombre: tipoCliente === "EVENTUAL" ? nombreEventual.trim() : undefined,
                cliente_telefono: tipoCliente === "EVENTUAL" ? telefonoEventual.trim() : undefined,
                fecha: new Date().toISOString().slice(0, 10),
                observaciones: observacionesPedido.trim(),
                total,
                detalle,
            };

            if (usuario?.demo) {
                const nuevosServicios = [{
                    id_pedido: Date.now(),
                    cliente: cliente?.nombre || nombreEventual.trim(),
                    fecha: new Date().toISOString(),
                    estado: "PENDIENTE",
                    total,
                    platos: carrito.reduce((cantidad, item) => cantidad + item.cantidad, 0),
                }, ...servicios];
                localStorage.setItem(DEMO_SERVICES_KEY, JSON.stringify(nuevosServicios));
                setServicios(nuevosServicios);
                setPedidosActivos(nuevosServicios.filter((pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado)));
            } else {
                await api.post("/pedidos", pedido);
                await cargarDatos();
            }

            setCarrito([]);
            setIdCliente("");
            setTipoCliente("REGISTRADO");
            setNombreEventual("");
            setTelefonoEventual("");
            setObservacionesPedido("");
            setAviso("Pedido registrado y agregado a tu bitácora de servicios.");
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar el pedido. Verifica los datos y vuelve a intentarlo.");
        } finally {
            setGuardando(false);
        }
    };

    const cerrarSesion = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const solicitarAdicionales = async (event) => {
        event.preventDefault();
        if (!pedidoSeleccionado || adicionalesCarrito.length === 0) {
            setAviso("Selecciona un pedido activo y agrega los productos adicionales.");
            return;
        }
        if (usuario?.demo) {
            setAviso("Solicitud de demostración: el cobro y la comanda se gestionan en Caja con una cuenta conectada.");
            return;
        }
        setGuardando(true);
        try {
            const cambios = {
                detalle: adicionalesCarrito.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
                observaciones: observacionesAdicionales.trim(),
            };
            if (pedidoSeleccionado.pagado) {
                await api.post(`/pedidos/${pedidoSeleccionado.id_pedido}/adicionales`, cambios);
                setAviso("Solicitud enviada a Caja para confirmar el cobro y emitir una nueva comanda.");
            } else {
                await api.post(`/pedidos/${pedidoSeleccionado.id_pedido}/detalle`, cambios);
                setAviso("Productos agregados al pedido pendiente.");
            }
            setAdicionalesCarrito([]);
            setObservacionesAdicionales("");
            await cargarDatos();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo enviar la solicitud adicional.");
            await cargarDatos();
        } finally {
            setGuardando(false);
        }
    };

    const marcarEntregado = async (pedido) => {
        setAviso("");
        try {
            if (usuario?.demo) {
                const actualizados = servicios.map((servicio) =>
                    servicio.id_pedido === pedido.id_pedido ? { ...servicio, estado: "ENTREGADO" } : servicio
                );
                localStorage.setItem(DEMO_SERVICES_KEY, JSON.stringify(actualizados));
                setServicios(actualizados);
                setPedidosActivos(actualizados.filter((servicio) => !["ENTREGADO", "CANCELADO"].includes(servicio.estado)));
                setAviso(`Pedido #${pedido.id_pedido} marcado como entregado.`);
                return;
            }
            await api.patch(`/pedidos/${pedido.id_pedido}/estado`, { estado: "ENTREGADO" });
            setAviso(`Pedido #${pedido.id_pedido} marcado como entregado.`);
            await cargarDatos();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo marcar el pedido como entregado.");
        }
    };

    const pedidosActivosFiltrados = pedidosActivos.filter((pedido) =>
        `${pedido.id_pedido} ${pedido.cliente || pedido.nombre || ""}`.toLowerCase().includes(busqueda.trim().toLowerCase())
    );

    const fechaHoy = new Intl.DateTimeFormat("es", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());

    return (
        <div className="min-h-screen space-y-6 bg-[#f8f5f2] p-4 text-slate-800 sm:p-7">
            <header className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:px-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Mi Casa · Servicio</p>
                    <h1 className="mt-2 text-3xl font-black">Panel del mesero</h1>
                    <p className="mt-1 text-sm capitalize text-slate-300">{fechaHoy}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                        <p className="text-xs text-slate-400">Sesión activa</p>
                        <p className="font-semibold">{usuario?.name || usuario?.username || "Mesero"}</p>
                    </div>
                    <button onClick={cerrarSesion} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold transition hover:border-amber-300 hover:text-amber-200">
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {error && (
                <div role="alert" className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center">
                    <span>{error}</span>
                    <button onClick={cargarDatos} className="font-bold underline">Reintentar</button>
                </div>
            )}

            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Seguimiento del restaurante</p><h2 className="mt-1 text-2xl font-black text-slate-900">Pedidos activos</h2><p className="mt-1 text-sm text-slate-500">Consulta cliente, hora, productos y estado actualizado por Caja.</p></div>
                    <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cliente o número de pedido" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm sm:max-w-xs" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pedidosActivosFiltrados.map((pedido) => (
                        <article key={pedido.id_pedido} className="rounded-xl border border-slate-100 p-4">
                            <div className="flex justify-between gap-2"><div><h3 className="font-black">Pedido #{pedido.id_pedido}</h3><p className="text-sm text-slate-600">{pedido.cliente || pedido.nombre}</p></div><span className="h-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{String(pedido.estado).replaceAll("_", " ")}</span></div>
                            <p className="mt-2 text-xs text-slate-500">{pedido.fecha ? new Date(pedido.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—"} · {money(pedido.total)}</p>
                            <ul className="mt-3 space-y-1 text-sm text-slate-700">{(pedido.detalle || []).map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>
                            {pedido.observaciones && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Nota: {pedido.observaciones}</p>}
                            {String(pedido.estado).toUpperCase() === "LISTO" && <button onClick={() => marcarEntregado(pedido)} className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">Marcar entregado</button>}
                            <button onClick={() => { setPedidoSeleccionado(pedido); setAdicionalesCarrito([]); }} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Solicitar productos adicionales</button>
                        </article>
                    ))}
                    {!pedidosActivosFiltrados.length && <p className="py-6 text-sm text-slate-500">No hay pedidos activos que coincidan con la búsqueda.</p>}
                </div>
                {pedidoSeleccionado && <form onSubmit={solicitarAdicionales} className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase text-amber-700">Solicitud a Caja</p><h3 className="font-black">Pedido #{pedidoSeleccionado.id_pedido} · {pedidoSeleccionado.cliente || pedidoSeleccionado.nombre}</h3></div><button type="button" onClick={() => setPedidoSeleccionado(null)} aria-label="Cerrar solicitud" className="rounded-lg px-3 py-1 font-bold">✕</button></div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{menu.filter((plato) => Number(plato.stock) > 0).map((plato) => { const selected = adicionalesCarrito.find((item) => item.id_producto === plato.id_producto); return <button key={plato.id_producto} type="button" onClick={() => setAdicionalesCarrito((actual) => selected ? actual.map((item) => item.id_producto === plato.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item) : [...actual, { ...plato, cantidad: 1 }])} className="flex justify-between rounded-lg bg-white p-3 text-left text-sm ring-1 ring-slate-200"><span>{plato.nombre} · Bs {plato.precio}</span><b>{selected ? `×${selected.cantidad}` : "+"}</b></button>; })}</div>
                    {adicionalesCarrito.length > 0 && <ul className="mt-3 text-sm">{adicionalesCarrito.map((item) => <li key={item.id_producto}>{item.nombre} × {item.cantidad} · {money(item.precio * item.cantidad)}</li>)}</ul>}
                    <textarea value={observacionesAdicionales} onChange={(event) => setObservacionesAdicionales(event.target.value)} placeholder="Observaciones para la nueva comanda" className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm" rows="2" />
                    <button disabled={guardando || !adicionalesCarrito.length} className="mt-3 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black disabled:opacity-50">{pedidoSeleccionado.pagado ? "Enviar a Caja para cobro" : "Agregar al pedido pendiente"}</button>
                </form>}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
                <section className="space-y-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Disponible hoy</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-900">Menú del día</h2>
                        </div>
                        <label className="w-full sm:max-w-xs">
                            <span className="sr-only">Buscar plato</span>
                            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar plato..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500" />
                        </label>
                    </div>

                    {cargando ? (
                        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">Cargando menú y servicios...</div>
                    ) : platosFiltrados.length === 0 ? (
                        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                            <p className="text-3xl">🍽️</p>
                            <p className="mt-3 font-bold text-slate-800">No hay platos disponibles</p>
                            <p className="mt-1 text-sm text-slate-500">La producción todavía no publicó platos para hoy.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {platosFiltrados.map((plato) => (
                                <article key={plato.id_producto} className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{plato.categoria}</span>
                                            <h3 className="mt-3 text-lg font-bold text-slate-900">{plato.nombre}</h3>
                                        </div>
                                        <span className="text-xl" aria-hidden="true">🥘</span>
                                    </div>
                                    <div className="mt-5 flex items-end justify-between">
                                        <div>
                                            <p className="font-black text-slate-900">{money(plato.precio)}</p>
                                            <p className="mt-1 text-xs text-slate-500">{plato.stock} disponibles</p>
                                        </div>
                                        <button onClick={() => agregarPlato(plato)} disabled={Number(plato.stock) <= 0} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                            Agregar +
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Actividad del turno</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Bitácora de servicios</h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{servicios.length} pedidos</span>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                                    <tr><th className="pb-3">Pedido</th><th className="pb-3">Cliente</th><th className="pb-3">Hora</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Total</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {servicios.length === 0 ? (
                                        <tr><td colSpan="5" className="py-7 text-center text-slate-500">Todavía no registras servicios en este turno.</td></tr>
                                    ) : servicios.map((servicio) => (
                                        <tr key={servicio.id_pedido}>
                                            <td className="py-3 font-bold text-slate-800">#{servicio.id_pedido}</td>
                                            <td className="py-3">{servicio.cliente || servicio.nombre || "Cliente"}</td>
                                            <td className="py-3">{servicio.fecha ? new Date(servicio.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                                            <td className="py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{servicio.estado}</span></td>
                                            <td className="py-3 text-right font-bold">{money(servicio.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </section>

                <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Nuevo servicio</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-900">Crear pedido</h2>
                        </div>
                        <span className="text-2xl" aria-hidden="true">🧾</span>
                    </div>
                    <form onSubmit={guardarPedido} className="mt-6 space-y-5">
                        <div className="flex gap-5 text-sm font-semibold">
                            <label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === "REGISTRADO"} onChange={() => { setTipoCliente("REGISTRADO"); setNombreEventual(""); }} />Cliente registrado</label>
                            <label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === "EVENTUAL"} onChange={() => { setTipoCliente("EVENTUAL"); setIdCliente(""); }} />Cliente eventual</label>
                        </div>
                        {tipoCliente === "REGISTRADO" ? (
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-slate-700">Cliente</span>
                                <select value={idCliente} onChange={(event) => setIdCliente(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-500">
                                    <option value="">Selecciona un cliente</option>
                                    {clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre} · {cliente.tipo_cliente}</option>)}
                                </select>
                            </label>
                        ) : (
                            <div className="grid gap-3">
                                <input value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente eventual" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                                <input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
                            </div>
                        )}

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">Observaciones para cocina</span>
                            <textarea value={observacionesPedido} onChange={(event) => setObservacionesPedido(event.target.value)} rows="2" placeholder="Indicaciones del pedido" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-amber-500" />
                        </label>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-700">Detalle del pedido</h3>
                                <span className="text-xs text-slate-400">{carrito.length} productos</span>
                            </div>
                            {carrito.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Agrega platos del menú para comenzar.</div>
                            ) : (
                                <ul className="space-y-3">
                                    {carrito.map((item) => (
                                        <li key={item.id_producto} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-800">{item.nombre}</p>
                                                <p className="text-xs text-slate-500">{money(item.precio)} c/u</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => cambiarCantidad(item.id_producto, -1)} aria-label={`Quitar una unidad de ${item.nombre}`} className="h-8 w-8 rounded-lg bg-white font-bold text-slate-700 ring-1 ring-slate-200">−</button>
                                                <span className="w-5 text-center text-sm font-bold">{item.cantidad}</span>
                                                <button type="button" onClick={() => cambiarCantidad(item.id_producto, 1)} aria-label={`Agregar una unidad de ${item.nombre}`} className="h-8 w-8 rounded-lg bg-white font-bold text-slate-700 ring-1 ring-slate-200">+</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <span className="font-semibold text-slate-600">Total</span>
                            <span className="text-2xl font-black text-slate-900">{money(total)}</span>
                        </div>
                        {aviso && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{aviso}</p>}
                        <button type="submit" disabled={guardando || cargando} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
                            {guardando ? "Registrando pedido..." : "Registrar pedido"}
                        </button>
                    </form>
                </aside>
            </div>
        </div>
    );
}

export default Mesero;
