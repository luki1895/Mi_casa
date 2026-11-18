import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { Alert, Badge, Button, Card, ConfirmModal, Input, Select, Textarea } from "../../components/ui";
import MesaBoard from "../../components/MesaBoard";
import MesaAtencionDetail from "../../components/MesaAtencionDetail";
import MesaOrderProductAdder from "../../components/MesaOrderProductAdder";
import useMesaBoardData from "../../hooks/useMesaBoardData";

const menuDemo = [
    { id_producto: 1, nombre: "Silpancho", categoria: "Segundo", precio: 15, stock: 30 },
    { id_producto: 2, nombre: "Fricasé", categoria: "Segundo", precio: 15, stock: 20 },
    { id_producto: 3, nombre: "Sopa de Maní", categoria: "Sopa", precio: 8, stock: 50 },
    { id_producto: 4, nombre: "Mocochinchi", categoria: "Refresco", precio: 5, stock: 80 },
];

const clientesDemo = [
    { id_cliente: 1, nombre: "Ana Flores", tipo_cliente: "REGISTRADO", estado: true },
    { id_cliente: 2, nombre: "Carlos Vega", tipo_cliente: "REGISTRADO", estado: true },
    { id_cliente: 3, nombre: "Rosa Quispe", tipo_cliente: "EVENTUAL", estado: true },
];

const DEMO_SERVICES_KEY = "mi_casa_servicios_demo";
const money = (value) => `Bs ${Number(value || 0).toFixed(2)}`;

function Mesero() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [menu, setMenu] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [pedidosActivos, setPedidosActivos] = useState([]);
    const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState(null);
    const [atencionParaCerrar, setAtencionParaCerrar] = useState(null);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [carrito, setCarrito] = useState([]);
    const [idCliente, setIdCliente] = useState("");
    const [tipoCliente, setTipoCliente] = useState("REGISTRADO");
    const [nombreEventual, setNombreEventual] = useState("");
    const [telefonoEventual, setTelefonoEventual] = useState("");
    const [observacionesPedido, setObservacionesPedido] = useState("");
    const [pedidoMesaId, setPedidoMesaId] = useState("");
    const [busquedaPedidos, setBusquedaPedidos] = useState("");
    const [busquedaMenu, setBusquedaMenu] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const {
        mesas,
        atenciones,
        cargando: cargandoMesas,
        actualizando: actualizandoMesas,
        error: errorMesas,
        errorMesas: errorConsultaMesas,
        errorAtenciones: errorConsultaAtenciones,
        atencion: atencionSeleccionada,
        cargandoAtencion,
        errorAtencion,
        refresh: refrescarMesas,
        loadAtencion: consultarAtencion,
        clearAtencion,
    } = useMesaBoardData({ paused: guardando, enabled: !usuario?.demo });

    const mesaSeleccionada = mesas.find((mesa) => Number(mesa.id_mesa) === Number(mesaSeleccionadaId));
    const idAtencionMesaSeleccionada = mesaSeleccionada?.id_atencion;
    const detalleAtencionSeleccionada = atencionSeleccionada
        && Number(atencionSeleccionada.id_atencion) === Number(idAtencionMesaSeleccionada)
        ? atencionSeleccionada
        : null;

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError("");
        if (usuario?.demo) {
            await Promise.resolve();
            setMenu(menuDemo);
            setClientes(clientesDemo);
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
        Promise.resolve().then(cargarDatos);
    }, [cargarDatos]);

    const seleccionarMesa = (mesa) => {
        setMesaSeleccionadaId(mesa.id_mesa);
        setPedidoMesaId(mesa.id_atencion ? String(mesa.id_atencion) : "");
        if (!mesa.id_atencion) clearAtencion();
    };

    useEffect(() => {
        if (!mesaSeleccionadaId) return;
        if (cargandoAtencion) return;
        if (!idAtencionMesaSeleccionada) {
            if (atencionSeleccionada) clearAtencion();
            return;
        }
        if (Number(atencionSeleccionada?.id_atencion) !== Number(idAtencionMesaSeleccionada)) {
            consultarAtencion(idAtencionMesaSeleccionada);
        }
    }, [atencionSeleccionada, cargandoAtencion, clearAtencion, consultarAtencion, idAtencionMesaSeleccionada, mesaSeleccionadaId]);

    const refrescarDatosOperativos = async (idAtencion = atencionSeleccionada?.id_atencion) => {
        await Promise.all([
            cargarDatos(),
            usuario?.demo ? Promise.resolve() : refrescarMesas(true),
        ]);
        if (idAtencion && !usuario?.demo) await consultarAtencion(idAtencion);
    };

    const total = useMemo(
        () => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
        [carrito]
    );

    const platosFiltrados = menu.filter((plato) =>
        plato.nombre.toLowerCase().includes(busquedaMenu.trim().toLowerCase())
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
                id_atencion: pedidoMesaId ? Number(pedidoMesaId) : undefined,
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
                await refrescarDatosOperativos(pedidoMesaId);
            }

            setCarrito([]);
            setIdCliente("");
            setTipoCliente("REGISTRADO");
            setNombreEventual("");
            setTelefonoEventual("");
            setObservacionesPedido("");
            setPedidoMesaId("");
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

    const solicitarAdicionales = async (cambios) => {
        if (!pedidoSeleccionado) return;
        if (usuario?.demo) {
            setAviso("Solicitud de demostración: el cobro y la comanda se gestionan en Caja con una cuenta conectada.");
            return;
        }
        setGuardando(true);
        try {
            if (pedidoSeleccionado.pagado) {
                await api.post(`/pedidos/${pedidoSeleccionado.id_pedido}/adicionales`, cambios);
                setAviso("Solicitud enviada a Caja para confirmar el cobro y emitir una nueva comanda.");
            } else {
                await api.post(`/pedidos/${pedidoSeleccionado.id_pedido}/detalle`, cambios);
                setAviso("Productos agregados al pedido pendiente.");
            }
            const idAtencionActual = pedidoSeleccionado.id_atencion || detalleAtencionSeleccionada?.id_atencion;
            setPedidoSeleccionado(null);
            await refrescarDatosOperativos(idAtencionActual);
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo enviar la solicitud adicional.");
            await refrescarDatosOperativos(pedidoSeleccionado?.id_atencion);
        } finally {
            setGuardando(false);
        }
    };

    const marcarEntregado = async (pedido) => {
        setAviso("");
        setGuardando(true);
        try {
            if (usuario?.demo) {
                const actualizados = servicios.map((servicio) =>
                    servicio.id_pedido === pedido.id_pedido ? { ...servicio, estado: "ENTREGADO" } : servicio
                );
                localStorage.setItem(DEMO_SERVICES_KEY, JSON.stringify(actualizados));
                setServicios(actualizados);
                setPedidosActivos(actualizados.filter((servicio) => !["ENTREGADO", "CANCELADO"].includes(servicio.estado)));
                setAviso(`Pedido #${pedido.id_pedido} marcado como entregado.`);
            } else {
                await api.patch(`/pedidos/${pedido.id_pedido}/estado`, { estado: "ENTREGADO" });
                setAviso(`Pedido #${pedido.id_pedido} marcado como entregado.`);
                await refrescarDatosOperativos(pedido.id_atencion);
            }
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo marcar el pedido como entregado.");
        } finally {
            setGuardando(false);
        }
    };

    const pedidosActivosFiltrados = pedidosActivos.filter((pedido) =>
        `${pedido.id_pedido} ${pedido.cliente || pedido.nombre || ""}`.toLowerCase().includes(busquedaPedidos.trim().toLowerCase())
    );
    const pedidosListos = pedidosActivos.filter((pedido) => String(pedido.estado).toUpperCase() === "LISTO").length;
    const platosDisponibles = menu.filter((plato) => Number(plato.stock) > 0).length;

    const cerrarAtencion = async () => {
        if (!atencionParaCerrar) return;
        setGuardando(true);
        setError("");
        setAviso("");
        try {
            await api.post(`/atenciones-mesa/${atencionParaCerrar.id_atencion}/cerrar`);
            setAviso(`Atención de la mesa ${atencionParaCerrar.mesa} cerrada.`);
            setAtencionParaCerrar(null);
            setMesaSeleccionadaId(null);
            clearAtencion();
            await Promise.all([cargarDatos(), refrescarMesas(true)]);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cerrar la atención. Verifica los pedidos y pagos confirmados.");
        } finally {
            setGuardando(false);
        }
    };

    const fechaHoy = new Intl.DateTimeFormat("es", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());

    return (
        <div className="min-h-screen space-y-6 bg-[#f8f5f2] p-4 text-slate-800 sm:p-7">
            <header className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-8">
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
                    <Button variant="outline" onClick={cerrarSesion} className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
                        Cerrar sesión
                    </Button>
                </div>
            </header>

            {error && (
                <Alert type="error" onRetry={cargarDatos}>{error}</Alert>
            )}
            {aviso && <Alert type="warning">{aviso}</Alert>}

            <section aria-label="Mesas y atenciones" className="space-y-4">
                <MesaBoard
                    mesas={mesas}
                    atenciones={atenciones}
                    selectedMesaId={mesaSeleccionadaId}
                    loading={cargandoMesas}
                    refreshing={actualizandoMesas}
                    error={errorMesas}
                    mesaQueryError={errorConsultaMesas}
                    atencionQueryError={errorConsultaAtenciones}
                    onRetry={() => refrescarMesas(true)}
                    onSelectMesa={seleccionarMesa}
                    emptyMessage={usuario?.demo ? "Las mesas reales no se consultan en modo demostración." : undefined}
                />
                {errorMesas && (
                    <Alert type="warning">
                        La consulta de mesas o atenciones no está disponible. Puedes seguir consultando el menú y los pedidos activos; las operaciones asociadas a mesas requieren que el servicio vuelva a responder.
                    </Alert>
                )}
                {mesaSeleccionada?.estado_atencion === "DISPONIBLE" && (
                    <Alert type="info">Esta mesa está libre. La apertura de atenciones corresponde a Caja.</Alert>
                )}
                {mesaSeleccionada?.estado_atencion === "OCUPADA" && !mesaSeleccionada.id_atencion && (
                    <Alert type="warning" onRetry={() => refrescarMesas(true)}>
                        La mesa figura ocupada, pero no se recibió el identificador de su atención. Actualiza la vista antes de continuar.
                    </Alert>
                )}
                {mesaSeleccionada?.id_atencion && (
                    <MesaAtencionDetail
                        atencion={detalleAtencionSeleccionada}
                        loading={cargandoAtencion}
                        error={errorAtencion}
                        onRetry={consultarAtencion}
                        actionsForOrder={(pedido) => (
                            <>
                                {!pedido.detalleNoDisponible && ((!pedido.pagado && pedido.estado === "PENDIENTE") || (pedido.pagado && pedido.estado !== "CANCELADO")) && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setPedidoSeleccionado(pedido);
                                        }}
                                    >
                                        {pedido.pagado ? "Solicitar adicional" : "Agregar productos"}
                                    </Button>
                                )}
                                {pedido.estado === "LISTO" && (
                                    <Button size="sm" variant="success" loading={guardando} onClick={() => marcarEntregado(pedido)}>
                                        Marcar entregado
                                    </Button>
                                )}
                            </>
                        )}
                        renderOrderEditor={(pedido) => (
                            pedidoSeleccionado?.id_pedido === pedido.id_pedido
                                && !pedido.detalleNoDisponible
                                && ((!pedido.pagado && pedido.estado === "PENDIENTE") || (pedido.pagado && pedido.estado !== "CANCELADO")) && (
                                <MesaOrderProductAdder
                                    key={pedido.id_pedido}
                                    pedido={pedido}
                                    menu={menu}
                                    loading={guardando}
                                    onCancel={() => setPedidoSeleccionado(null)}
                                    onSubmit={solicitarAdicionales}
                                />
                            )
                        )}
                    />
                )}
                {detalleAtencionSeleccionada && (
                    <div className="space-y-3">
                        <Alert type="info">
                            El servidor valida pagos confirmados, saldos y pedidos antes de cerrar la atención. Los pedidos pagados, cerrados o anulados conservan sus restricciones.
                        </Alert>
                        <Button
                            variant="outline"
                            disabled={!detalleAtencionSeleccionada.pedidos?.length}
                            onClick={() => setAtencionParaCerrar(detalleAtencionSeleccionada)}
                        >
                            Solicitar cierre de atención
                        </Button>
                    </div>
                )}
                {detalleAtencionSeleccionada && (
                    <Button
                        variant="warning"
                        onClick={() => {
                            setPedidoMesaId(String(detalleAtencionSeleccionada.id_atencion));
                            document.getElementById("mesero-nuevo-pedido")?.scrollIntoView({ behavior: "smooth" });
                        }}
                    >
                        Crear otro pedido para esta atención
                    </Button>
                )}
            </section>

            <section aria-label="Resumen del turno" className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Dashboard del mesero</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">Resumen del turno</h2>
                        <p className="mt-1 text-sm text-slate-500">Pedidos que requieren atención y disponibilidad para tomar nuevas órdenes.</p>
                    </div>
                    <Button variant="secondary" onClick={cargarDatos} loading={cargando}>Actualizar</Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ["Pedidos activos", pedidosActivos.length, "En seguimiento"],
                        ["Listos para entregar", pedidosListos, "Requieren atención"],
                        ["Platos disponibles", platosDisponibles, "Opciones del menú de hoy"],
                        ["Servicios registrados", servicios.length, "Actividad de tu turno"],
                    ].map(([titulo, valor, detalle]) => (
                        <Card key={titulo} className="border-slate-200">
                            <p className="text-sm font-medium text-slate-500">{titulo}</p>
                            <p className="mt-3 text-3xl font-black text-slate-900">{cargando ? "—" : valor}</p>
                            <p className="mt-1 text-xs text-slate-500">{detalle}</p>
                        </Card>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <a href="#mesero-nuevo-pedido" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">Crear pedido</a>
                    <a href="#mesero-pedidos" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver pedidos activos</a>
                    <a href="#mesero-menu" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Consultar menú</a>
                </div>
            </section>

            <section id="mesero-pedidos" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Seguimiento del restaurante</p><h2 className="mt-1 text-2xl font-black text-slate-900">Pedidos activos</h2><p className="mt-1 text-sm text-slate-500">Consulta cliente, hora, productos y estado actualizado por Caja.</p></div>
                    <Input value={busquedaPedidos} onChange={(event) => setBusquedaPedidos(event.target.value)} placeholder="Buscar cliente o número de pedido" aria-label="Buscar pedidos por cliente o número" className="sm:max-w-xs" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pedidosActivosFiltrados.map((pedido) => (
                        <Card key={pedido.id_pedido} className="border-slate-200">
                            <div className="flex justify-between gap-2">
                                <div><h3 className="font-black">Pedido #{pedido.id_pedido}</h3><p className="text-sm text-slate-600">{pedido.cliente || pedido.nombre}</p></div>
                                <Badge variant={pedido.estado === "LISTO" ? "success" : pedido.estado === "EN_PREPARACION" ? "info" : "warning"}>{String(pedido.estado).replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{pedido.fecha ? new Date(pedido.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—"} · {money(pedido.total)}</p>
                            <ul className="mt-3 space-y-1 text-sm text-slate-700">{(pedido.detalle || []).map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>
                            {pedido.observaciones && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Nota: {pedido.observaciones}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {String(pedido.estado).toUpperCase() === "LISTO" && <Button size="sm" variant="success" loading={guardando} onClick={() => marcarEntregado(pedido)}>Marcar entregado</Button>}
                                {!pedido.detalleNoDisponible && ((!pedido.pagado && pedido.estado === "PENDIENTE") || (pedido.pagado && pedido.estado !== "CANCELADO")) && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setPedidoSeleccionado(pedido);
                                        }}
                                    >
                                        {pedido.pagado ? "Solicitar productos adicionales" : "Agregar productos"}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                    {!pedidosActivosFiltrados.length && <p className="py-6 text-sm text-slate-500">No hay pedidos activos que coincidan con la búsqueda.</p>}
                </div>
                {pedidoSeleccionado && !detalleAtencionSeleccionada?.pedidos?.some((pedido) => pedido.id_pedido === pedidoSeleccionado.id_pedido) && (
                    <MesaOrderProductAdder
                        key={pedidoSeleccionado.id_pedido}
                        pedido={pedidoSeleccionado}
                        menu={menu}
                        loading={guardando}
                        onCancel={() => setPedidoSeleccionado(null)}
                        onSubmit={solicitarAdicionales}
                    />
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
                <section id="mesero-menu" className="scroll-mt-6 space-y-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Disponible hoy</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-900">Menú del día</h2>
                        </div>
                        <label className="w-full sm:max-w-xs">
                            <span className="sr-only">Buscar plato</span>
                            <Input value={busquedaMenu} onChange={(event) => setBusquedaMenu(event.target.value)} placeholder="Buscar plato..." aria-label="Buscar platos disponibles" className="bg-white sm:max-w-xs" />
                        </label>
                    </div>

                    {cargando ? (
                        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">Cargando menú y servicios...</div>
                    ) : platosFiltrados.length === 0 ? (
                        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
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
                        <ul className="mt-5 space-y-3 sm:hidden">
                            {servicios.map((servicio) => (
                                <li key={servicio.id_pedido} className="rounded-xl border border-slate-100 p-4 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-slate-800">Pedido #{servicio.id_pedido}</span>
                                        <Badge variant={servicio.estado === "ENTREGADO" ? "success" : servicio.estado === "CANCELADO" ? "danger" : "warning"}>{servicio.estado}</Badge>
                                    </div>
                                    <p className="mt-2 text-slate-600">{servicio.cliente || servicio.nombre || "Cliente"}</p>
                                    <p className="mt-1 text-slate-500">{servicio.fecha ? new Date(servicio.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                                    <p className="mt-2 font-bold">{money(servicio.total)}</p>
                                </li>
                            ))}
                            {!servicios.length && <li className="py-5 text-center text-sm text-slate-500">Todavía no registras servicios en este turno.</li>}
                        </ul>
                        <div className="mt-5 hidden overflow-x-auto sm:block">
                            <table className="w-full text-left text-sm">
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
                                            <td className="py-3"><Badge variant={servicio.estado === "ENTREGADO" ? "success" : servicio.estado === "CANCELADO" ? "danger" : "warning"}>{servicio.estado}</Badge></td>
                                            <td className="py-3 text-right font-bold">{money(servicio.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </section>

                <aside id="mesero-nuevo-pedido" className="scroll-mt-6 h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
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
                                <Select value={idCliente} onChange={(event) => setIdCliente(event.target.value)} aria-label="Selecciona un cliente">
                                    <option value="">Selecciona un cliente</option>
                                    {clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre} · {cliente.tipo_cliente}</option>)}
                                </Select>
                            </label>
                        ) : (
                            <div className="grid gap-3">
                                <Input value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente eventual" aria-label="Nombre del cliente eventual" />
                                <Input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" aria-label="Teléfono opcional" />
                            </div>
                        )}

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">Atención de mesa (opcional)</span>
                            <Select value={pedidoMesaId} onChange={(event) => setPedidoMesaId(event.target.value)} aria-label="Atención de mesa">
                                <option value="">Sin mesa / pedido para llevar</option>
                                {pedidoMesaId && !atenciones.some((atencion) => String(atencion.id_atencion) === String(pedidoMesaId)) && (
                                    <option value={pedidoMesaId}>Atención seleccionada #{pedidoMesaId}</option>
                                )}
                                {atenciones.map((atencion) => <option key={atencion.id_atencion} value={atencion.id_atencion}>Mesa {atencion.mesa} · atención #{atencion.id_atencion}</option>)}
                            </Select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">Observaciones para cocina</span>
                            <Textarea value={observacionesPedido} onChange={(event) => setObservacionesPedido(event.target.value)} rows="2" placeholder="Indicaciones del pedido" />
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
                        <Button type="submit" variant="warning" loading={guardando} disabled={cargando} className="w-full">Registrar pedido</Button>
                    </form>
                </aside>
                <ConfirmModal
                    open={Boolean(atencionParaCerrar)}
                    title="Solicitar cierre de atención"
                    message={atencionParaCerrar
                        ? `Se solicitará el cierre de la atención de la mesa ${atencionParaCerrar.mesa}. El servidor verificará que no haya saldos o pagos pendientes y que los pedidos cumplan las condiciones de cierre.`
                        : ""}
                    confirmText="Solicitar cierre"
                    variant="success"
                    onCancel={() => { if (!guardando) setAtencionParaCerrar(null); }}
                    onConfirm={cerrarAtencion}
                    loading={guardando}
                />
            </div>
        </div>
    );
}

export default Mesero;
