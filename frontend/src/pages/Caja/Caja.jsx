import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const obtenerFecha = () => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};
const importe = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;
const estadoBonito = (valor) => String(valor || "PENDIENTE").replaceAll("_", " ");

function Caja() {
    const { usuario } = useAuth();
    const [seccionActiva, setSeccionActiva] = useState("DASHBOARD");
    const [panel, setPanel] = useState({ ventas: 0, gastos: 0, saldo_esperado: 0, pedidos_pendientes: 0, cierre: null, apertura: null, estado_caja: "SIN_ABRIR" });
    const [reporte, setReporte] = useState({ fecha: "", pagos: [], gastos: [], total_pagos: 0, total_gastos: 0 });
    const [pedidos, setPedidos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [menu, setMenu] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [adicionales, setAdicionales] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [tipoCliente, setTipoCliente] = useState("PENSIONADO");
    const [clienteId, setClienteId] = useState("");
    const [nombreEventual, setNombreEventual] = useState("");
    const [telefonoEventual, setTelefonoEventual] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [carrito, setCarrito] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pedidoCobro, setPedidoCobro] = useState(null);
    const [solicitudCobro, setSolicitudCobro] = useState(null);
    const [ultimaComandaAdicional, setUltimaComandaAdicional] = useState(null);
    const [recibido, setRecibido] = useState("");
    const [metodo, setMetodo] = useState("EFECTIVO");
    const [gasto, setGasto] = useState({ concepto: "", descripcion: "", total: "", metodo_pago: "EFECTIVO" });
    const [montoContado, setMontoContado] = useState("");
    const [montoInicial, setMontoInicial] = useState("");
    const [observacionesCierre, setObservacionesCierre] = useState("");
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        if (usuario?.demo) {
            setPanel({ ventas: 0, gastos: 0, saldo_esperado: 0, pedidos_pendientes: 0, cierre: null, apertura: null, estado_caja: "SIN_ABRIR" });
            setReporte({ fecha: obtenerFecha(), pagos: [], gastos: [], total_pagos: 0, total_gastos: 0 });
            setPedidos([]);
            setClientes([]);
            setMenu([]);
            setGastos([]);
            setPagos([]);
            setAdicionales([]);
            setAviso("Vista de demostración: no se conecta ni se guardan operaciones en la base de datos.");
            setCargando(false);
            return;
        }
        try {
            const fecha = obtenerFecha();
            const [panelRes, pedidosRes, clientesRes, menuRes, gastosRes, pagosRes, adicionalesRes, reporteRes] = await Promise.all([
                api.get("/caja/panel"), api.get("/caja/pedidos"), api.get("/clientes/para-pedidos"),
                api.get(`/produccion/menu?fecha=${fecha}`), api.get("/caja/gastos"), api.get("/caja/pagos"),
                api.get("/caja/adicionales"), api.get("/caja/reportes"),
            ]);
            setPanel(panelRes.data.data || {});
            setPedidos(pedidosRes.data.data || []);
            setClientes((clientesRes.data.data || []).filter((cliente) => cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO"));
            setMenu(menuRes.data.data || []);
            setGastos(gastosRes.data.data || []);
            setPagos(pagosRes.data.data || []);
            setAdicionales(adicionalesRes.data.data || []);
            setReporte(reporteRes.data.data || { fecha, pagos: [], gastos: [], total_pagos: 0, total_gastos: 0 });
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cargar Caja. Comprueba la conexión y que se haya aplicado la migración PostgreSQL 001.");
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    useEffect(() => { cargar(); }, [cargar]);

    const totalPedido = useMemo(() => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0), [carrito]);
    const totalCobroActual = Number(solicitudCobro?.total || pedidoCobro?.saldo_pendiente || 0);
    const cambio = Math.max(Number(recibido || 0) - totalCobroActual, 0);
    const pedidosFiltrados = pedidos.filter((pedido) => `${pedido.id_pedido} ${pedido.cliente}`.toLowerCase().includes(busqueda.trim().toLowerCase()));
    const agregar = (producto) => setCarrito((actual) => {
        const existente = actual.find((item) => item.id_producto === producto.id_producto);
        if ((existente?.cantidad || 0) >= Number(producto.stock)) return actual;
        return existente
            ? actual.map((item) => item.id_producto === producto.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item)
            : [...actual, { ...producto, cantidad: 1 }];
    });
    const cambiarCantidad = (id, delta) => setCarrito((actual) => actual.map((item) => item.id_producto === id ? { ...item, cantidad: Math.min(Number(item.stock), item.cantidad + delta) } : item).filter((item) => item.cantidad > 0));

    const crearPedido = async (event) => {
        event.preventDefault();
        setAviso("");
        if (!carrito.length) return setAviso("Agrega al menos un producto disponible.");
        if (tipoCliente === "PENSIONADO" && !clienteId) return setAviso("Selecciona un cliente pensionado.");
        if (tipoCliente === "EVENTUAL" && !nombreEventual.trim()) return setAviso("Indica el nombre del cliente eventual.");
        setGuardando(true);
        try {
            const respuesta = await api.post("/pedidos", {
                tipo_cliente: tipoCliente,
                fecha: obtenerFecha(),
                id_cliente: tipoCliente === "PENSIONADO" ? Number(clienteId) : undefined,
                cliente_nombre: tipoCliente === "EVENTUAL" ? nombreEventual.trim() : undefined,
                cliente_telefono: tipoCliente === "EVENTUAL" ? telefonoEventual.trim() : undefined,
                observaciones: observaciones.trim(),
                detalle: carrito.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
            });
            setCarrito([]); setClienteId(""); setNombreEventual(""); setTelefonoEventual(""); setObservaciones("");
            setAviso(`Pedido #${respuesta.data.data.id_pedido} registrado. Confirma el pago para emitir su comanda.`);
            await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar el pedido; puede que la disponibilidad haya cambiado.");
            await cargar();
        } finally { setGuardando(false); }
    };

    const confirmarPago = async (event) => {
        event.preventDefault();
        if (!pedidoCobro && !solicitudCobro) return;
        setGuardando(true); setAviso("");
        try {
            if (solicitudCobro) {
                const adicionalPagado = await api.post(`/caja/adicionales/${solicitudCobro.id_solicitud}/cobrar`, { recibido: Number(recibido), metodo });
                setUltimaComandaAdicional({
                    id_pedido: adicionalPagado.data.data.id_pedido,
                    cliente: solicitudCobro.cliente,
                    fecha: new Date().toISOString(),
                    detalle: adicionalPagado.data.data.detalle,
                    observaciones: solicitudCobro.observaciones,
                    esAdicional: true,
                });
                setAviso(`Adicional cobrado para el pedido #${solicitudCobro.id_pedido}. Imprime la nueva comanda.`);
                setSolicitudCobro(null);
            } else {
                await api.post(`/caja/pedidos/${pedidoCobro.id_pedido}/pagos`, { recibido: Number(recibido), metodo });
                setAviso(`Pago registrado para el pedido #${pedidoCobro.id_pedido}.`);
                setPedidoCobro(null);
            }
            setRecibido("");
            await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar el pago.");
        } finally { setGuardando(false); }
    };

    const registrarGasto = async (event) => {
        event.preventDefault(); setGuardando(true); setAviso("");
        try {
            await api.post("/caja/gastos", { ...gasto, total: Number(gasto.total), cantidad: 1, precio_unitario: Number(gasto.total) });
            setGasto({ concepto: "", descripcion: "", total: "", metodo_pago: "EFECTIVO" });
            setAviso(gasto.metodo_pago === "EFECTIVO" ? "Gasto guardado y descontado del efectivo esperado." : "Gasto guardado; no afecta el efectivo esperado."); await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar el gasto.");
        } finally { setGuardando(false); }
    };

    const abrirCaja = async (event) => {
        event.preventDefault(); setGuardando(true); setAviso("");
        try {
            await api.post("/caja/abrir", { monto_inicial: Number(montoInicial) });
            setMontoInicial("");
            setAviso("Caja abierta. El monto inicial se agregó al efectivo esperado.");
            await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo abrir la caja.");
        } finally { setGuardando(false); }
    };

    const cerrarCaja = async (event) => {
        event.preventDefault(); setGuardando(true); setAviso("");
        try {
            const resultado = await api.post("/caja/cerrar", { monto_contado: Number(montoContado), observaciones: observacionesCierre.trim() });
            setAviso(`Cierre guardado. Diferencia: ${importe(resultado.data.data.diferencia)}.`);
            setMontoContado(""); setObservacionesCierre(""); await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo cerrar la caja.");
        } finally { setGuardando(false); }
    };

    const actualizarEstadoPedido = async (pedido, estado) => {
        try {
            await api.patch(`/pedidos/${pedido.id_pedido}/estado`, { estado });
            setAviso(`Pedido #${pedido.id_pedido}: ${estadoBonito(estado)}.`);
            await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo actualizar el estado del pedido.");
        }
    };

    const imprimir = (pedido) => {
        const productos = (pedido.detalle || []).map((item) => `<li>${item.cantidad} × ${item.nombre}</li>`).join("");
        const ventana = window.open("", "_blank", "width=600,height=700");
        if (!ventana) return setAviso("Permite las ventanas emergentes para imprimir la comanda.");
        const tipoComanda = pedido.esAdicional ? "COMANDA ADICIONAL" : "COMANDA";
        ventana.document.write(`<html><head><title>${tipoComanda} #${pedido.id_pedido}</title><style>body{font:16px Arial;padding:24px}h1{font-size:22px}li{padding:6px 0}.nota{border-top:1px dashed #333;margin-top:20px;padding-top:12px}</style></head><body><h1>${tipoComanda} · Pedido #${pedido.id_pedido}</h1><p>Cliente: ${pedido.cliente}</p><p>Hora: ${new Date(pedido.fecha).toLocaleString("es")}</p><ul>${productos}</ul><div class="nota"><b>Observaciones:</b> ${pedido.observaciones || "—"}</div><script>window.onload=()=>window.print()</script></body></html>`);
        ventana.document.close();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Operaciones diarias</p><h1 className="mt-1 text-3xl font-black text-slate-900">Panel de Caja</h1><p className="mt-1 text-sm text-slate-500">Resumen del turno, gestión de Caja, pedidos y reportes por separado.</p></div><button onClick={cargar} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Actualizar</button></header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {aviso && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{aviso}</p>}
            <nav aria-label="Secciones de Caja" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                    ["DASHBOARD", "Dashboard"],
                    ["CAJA", "1. Caja"],
                    ["PEDIDOS", "2. Pedidos"],
                    ["REPORTES", "3. Reportes"],
                ].map(([seccion, titulo]) => (
                    <button
                        key={seccion}
                        type="button"
                        onClick={() => setSeccionActiva(seccion)}
                        aria-current={seccionActiva === seccion ? "page" : undefined}
                        className={`rounded-xl px-5 py-3 text-sm font-bold transition ${seccionActiva === seccion ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        {titulo}
                    </button>
                ))}
            </nav>
            {seccionActiva === "DASHBOARD" && (
                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Resumen de turno</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-900">Estado de Caja</h2>
                                <p className="mt-2 text-sm text-slate-500">
                                    {panel.apertura
                                        ? `Responsable: ${panel.apertura.responsable} · Apertura ${new Date(panel.apertura.abierta_en).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`
                                        : "Aún no se ha registrado una apertura para este turno."}
                                </p>
                            </div>
                            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${panel.estado_caja === "ABIERTA" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                                {panel.estado_caja === "SIN_ABRIR" ? "CERRADA · SIN APERTURA" : panel.estado_caja}
                            </span>
                        </div>
                    </section>
                    <section aria-label="Resumen financiero del turno" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            ["Ventas cobradas", importe(panel.ventas), "text-emerald-700", "Ingresos confirmados en este turno"],
                            ["Gastos registrados", importe(panel.gastos), "text-rose-700", "Salidas del turno"],
                            ["Efectivo esperado", importe(panel.saldo_esperado), "text-slate-900", "Considera efectivo y gastos en efectivo"],
                            ["Monto inicial", importe(panel.apertura?.monto_inicial), "text-amber-700", "Efectivo registrado al abrir"],
                        ].map(([titulo, valor, tono, detalle]) => (
                            <article key={titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-medium text-slate-500">{titulo}</p>
                                <p className={`mt-3 text-2xl font-black ${tono}`}>{cargando ? "—" : valor}</p>
                                <p className="mt-2 text-xs text-slate-500">{detalle}</p>
                            </article>
                        ))}
                    </section>
                    {panel.estado_caja !== "ABIERTA" && (
                        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
                            <div>
                                <h3 className="font-black text-amber-950">Inicia el turno de Caja</h3>
                                <p className="mt-1 text-sm text-amber-900">Registra el efectivo inicial desde la sección Caja para habilitar las operaciones del turno.</p>
                            </div>
                            <button type="button" onClick={() => setSeccionActiva("CAJA")} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">Ir a Caja</button>
                        </section>
                    )}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Accesos rápidos</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Tareas del área</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setSeccionActiva("CAJA")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Apertura, gastos y cierre</button>
                                <button type="button" onClick={() => setSeccionActiva("PEDIDOS")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Registrar o cobrar pedidos</button>
                                <button type="button" onClick={() => setSeccionActiva("REPORTES")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Consultar reportes</button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
            {seccionActiva === "CAJA" && (
                <>
            <section className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm text-slate-500">Estado de Caja</p>
                    <p className={`mt-1 text-xl font-black ${panel.estado_caja === "ABIERTA" ? "text-emerald-700" : "text-slate-800"}`}>{panel.estado_caja === "SIN_ABRIR" ? "Cerrada · sin apertura" : panel.estado_caja}</p>
                    {panel.apertura && <p className="mt-1 text-sm text-slate-600">Responsable: {panel.apertura.responsable} · {new Date(panel.apertura.abierta_en).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · Inicial: {importe(panel.apertura.monto_inicial)}</p>}
                </div>
                {panel.estado_caja === "SIN_ABRIR" && <form onSubmit={abrirCaja} className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="monto-inicial">Monto inicial en efectivo</label>
                    <input id="monto-inicial" required type="number" min="0" step="0.01" value={montoInicial} onChange={(event) => setMontoInicial(event.target.value)} placeholder="Monto inicial Bs" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                    <button disabled={guardando || usuario?.demo} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Abrir caja</button>
                </form>}
            </section>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[['Ventas cobradas', panel.ventas], ['Gastos de hoy', panel.gastos], ['Saldo esperado en efectivo', panel.saldo_esperado]].map(([titulo, valor]) => <article key={titulo} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-2 text-2xl font-black text-slate-900">{importe(valor)}</p></article>)}
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Solicitudes adicionales por cobrar</h2>
                <p className="mt-1 text-sm text-slate-500">Cobros adicionales solicitados por los meseros.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {adicionales.map((solicitud) => <article key={solicitud.id_solicitud} className="rounded-xl border border-slate-100 p-4"><div className="flex justify-between"><b>Pedido #{solicitud.id_pedido} · {solicitud.cliente}</b><b>{importe(solicitud.total)}</b></div><ul className="my-2 text-sm text-slate-600">{solicitud.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>{solicitud.observaciones && <p className="mb-3 text-xs text-slate-500">Nota de cocina: {solicitud.observaciones}</p>}<button onClick={() => { setPedidoCobro(null); setSolicitudCobro(solicitud); setRecibido(String(solicitud.total)); }} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black">Cobrar adicional</button></article>)}
                    {!adicionales.length && <p className="py-4 text-sm text-slate-500">No hay cobros adicionales pendientes.</p>}
                </div>
                {ultimaComandaAdicional && <button onClick={() => imprimir(ultimaComandaAdicional)} className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Imprimir última comanda adicional</button>}
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-black">Registrar gasto</h2>
                    <form onSubmit={registrarGasto} className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input required value={gasto.concepto} onChange={(event) => setGasto({ ...gasto, concepto: event.target.value })} placeholder="Concepto" className="rounded-xl border border-slate-200 px-3 py-3" />
                        <input required type="number" min="0.01" step="0.01" value={gasto.total} onChange={(event) => setGasto({ ...gasto, total: event.target.value })} placeholder="Importe Bs" className="rounded-xl border border-slate-200 px-3 py-3" />
                        <select value={gasto.metodo_pago} onChange={(event) => setGasto({ ...gasto, metodo_pago: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3">
                            <option value="EFECTIVO">Salida de efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="QR">QR</option>
                        </select>
                        <input value={gasto.descripcion} onChange={(event) => setGasto({ ...gasto, descripcion: event.target.value })} placeholder="Descripción opcional" className="rounded-xl border border-slate-200 px-3 py-3" />
                        <button disabled={guardando || panel.estado_caja !== "ABIERTA"} className="rounded-xl bg-rose-700 px-4 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">Guardar gasto</button>
                    </form>
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-black">Cierre de caja</h2>
                    {panel.cierre ? (
                        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm">
                            <p className="font-bold">Caja cerrada</p>
                            <p>Esperado: {importe(panel.cierre.saldo_esperado)} · Contado: {importe(panel.cierre.monto_contado)}</p>
                            <p>Diferencia: {importe(panel.cierre.diferencia)}</p>
                        </div>
                    ) : panel.estado_caja !== "ABIERTA" ? (
                        <p className="mt-4 text-sm text-slate-600">Abre la caja para iniciar y cerrar el turno.</p>
                    ) : (
                        <form onSubmit={cerrarCaja} className="mt-4 space-y-3">
                            <p className="text-sm text-slate-600">Saldo esperado: <b>{importe(panel.saldo_esperado)}</b></p>
                            {(Number(panel.pedidos_pendientes) > 0 || adicionales.length > 0) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Resuelve los cobros pendientes antes de cerrar.</p>}
                            <input required type="number" min="0" step="0.01" value={montoContado} onChange={(event) => setMontoContado(event.target.value)} placeholder="Monto contado en caja" className="w-full rounded-xl border border-slate-200 px-3 py-3" />
                            <p className="text-sm">Diferencia estimada: <b>{importe(Number(montoContado || 0) - Number(panel.saldo_esperado || 0))}</b></p>
                            <textarea value={observacionesCierre} onChange={(event) => setObservacionesCierre(event.target.value)} rows="2" placeholder="Observaciones del cierre (opcional)" className="w-full rounded-xl border border-slate-200 px-3 py-3" />
                            <button disabled={guardando || Number(panel.pedidos_pendientes) > 0 || adicionales.length > 0} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Confirmar cierre</button>
                        </form>
                    )}
                </section>
            </div>
                </>
            )}
            {seccionActiva === "PEDIDOS" && (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-black">Registrar pedido</h2>
                    <form onSubmit={crearPedido} className="mt-4 space-y-4">
                        <div className="flex gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === 'PENSIONADO'} onChange={() => { setTipoCliente('PENSIONADO'); setClienteId(''); }} />Pensionado</label><label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === 'EVENTUAL'} onChange={() => { setTipoCliente('EVENTUAL'); setClienteId(''); }} />Eventual</label></div>
                        {tipoCliente === 'PENSIONADO' ? <select required value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecciona el pensionado</option>{clientes.filter((cliente) => String(cliente.tipo_cliente || '').toUpperCase().includes('PENSION')).map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>)}</select> : <div className="grid gap-3 sm:grid-cols-2"><input required value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente eventual" className="rounded-xl border border-slate-200 px-3 py-3" /><input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" className="rounded-xl border border-slate-200 px-3 py-3" /></div>}
                        <div><p className="mb-2 text-sm font-bold">Menú disponible hoy</p><div className="max-h-64 space-y-2 overflow-y-auto">{menu.length ? menu.map((plato) => <div key={`${plato.id_producto}-${plato.categoria}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="font-semibold">{plato.nombre} <span className="text-xs font-normal text-slate-500">· {plato.categoria}</span></p><p className="text-xs text-slate-500">{importe(plato.precio)} · {plato.stock} disponibles</p></div><button type="button" disabled={!Number(plato.stock)} onClick={() => agregar(plato)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300">Agregar</button></div>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Sin platos publicados para hoy.</p>}</div></div>
                        {carrito.length > 0 && <ul className="space-y-2">{carrito.map((item) => <li key={item.id_producto} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"><span>{item.nombre} × {item.cantidad}</span><span className="flex items-center gap-2"><b>{importe(item.precio * item.cantidad)}</b><button type="button" onClick={() => cambiarCantidad(item.id_producto, -1)} className="px-2 text-lg">−</button><button type="button" onClick={() => cambiarCantidad(item.id_producto, 1)} disabled={item.cantidad >= Number(item.stock)} className="px-2 text-lg disabled:opacity-30">+</button></span></li>)}</ul>}
                        <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Observaciones para cocina" rows="2" className="w-full rounded-xl border border-slate-200 px-3 py-3" />
                        <div className="flex items-center justify-between border-t pt-3"><span className="font-semibold">Total</span><b className="text-xl">{importe(totalPedido)}</b></div>
                        <button disabled={guardando || cargando || !menu.length || panel.estado_caja !== "ABIERTA"} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50">Confirmar pedido</button>
                    </form>
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Pedidos y seguimiento</h2><p className="text-sm text-slate-500">Estados, cobros y comandas</p></div><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cliente o # pedido" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
                    <div className="mt-4 space-y-3">{pedidosFiltrados.map((pedido) => <article key={pedido.id_pedido} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black">#{pedido.id_pedido} · {pedido.cliente}</p><p className="mt-1 text-xs text-slate-500">{new Date(pedido.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} · {estadoBonito(pedido.estado)}</p></div><b>{importe(pedido.total)}</b></div><ul className="mt-3 text-sm text-slate-600">{pedido.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>{pedido.observaciones && <p className="mt-2 text-xs text-slate-500">Nota cocina: {pedido.observaciones}</p>}<div className="mt-3 flex flex-wrap gap-2">{Number(pedido.saldo_pendiente) > 0 && <button onClick={() => { setPedidoCobro(pedido); setSolicitudCobro(null); setRecibido(String(pedido.saldo_pendiente)); setSeccionActiva("CAJA"); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Pasar cobro a Caja</button>}{pedido.pagado && <button onClick={() => imprimir(pedido)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Imprimir comanda</button>}{pedido.estado === "PENDIENTE" && <button onClick={() => actualizarEstadoPedido(pedido, "EN_PREPARACION")} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Enviar a preparación</button>}{pedido.estado === "EN_PREPARACION" && <button onClick={() => actualizarEstadoPedido(pedido, "LISTO")} className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-900">Marcar listo</button>}{pedido.estado === "LISTO" && <button onClick={() => actualizarEstadoPedido(pedido, "ENTREGADO")} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">Marcar entregado</button>}</div></article>)}{!pedidosFiltrados.length && <p className="py-8 text-center text-sm text-slate-500">No hay pedidos que coincidan.</p>}</div>
                </section>
            </div>
            )}
            {seccionActiva === "REPORTES" && (
                <section className="space-y-5">
                    <p className="text-sm text-slate-500">Resumen financiero del {reporte.fecha ? new Date(`${reporte.fecha}T12:00:00`).toLocaleDateString("es") : "día actual"}.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Pagos recibidos hoy</p><p className="mt-2 text-2xl font-black">{importe(reporte.total_pagos)}</p></article>
                        <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Gastos registrados hoy</p><p className="mt-2 text-2xl font-black">{importe(reporte.total_gastos)}</p></article>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Pagos por método</h2><div className="mt-3 space-y-2">{reporte.pagos.map((item) => <p key={item.metodo} className="flex justify-between border-b py-2 text-sm"><span>{item.metodo} · {item.cantidad} pagos</span><b>{importe(item.total)}</b></p>)}{!reporte.pagos.length && <p className="py-3 text-sm text-slate-500">No hay pagos registrados hoy.</p>}</div></article>
                        <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Gastos por método de salida</h2><div className="mt-3 space-y-2">{reporte.gastos.map((item) => <p key={item.metodo} className="flex justify-between border-b py-2 text-sm"><span>{item.metodo} · {item.cantidad} gastos</span><b>{importe(item.total)}</b></p>)}{!reporte.gastos.length && <p className="py-3 text-sm text-slate-500">No hay gastos registrados hoy.</p>}</div></article>
                    </div>
                    <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Movimientos de pago recientes</h2><div className="mt-3 max-h-96 overflow-auto">{pagos.map((pago) => <p key={pago.id_pago} className="flex justify-between gap-3 border-t py-2 text-sm"><span>Pedido #{pago.id_pedido} · {pago.metodo} · {new Date(pago.fecha).toLocaleString("es")}</span><b>{importe(pago.monto)}</b></p>)}{!pagos.length && <p className="py-4 text-sm text-slate-500">No hay pagos registrados en el periodo consultado.</p>}</div></article>
                </section>
            )}
            {seccionActiva === "CAJA" && (pedidoCobro || solicitudCobro) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={confirmarPago} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div><p className="text-xs uppercase tracking-widest text-amber-700">{solicitudCobro ? "Cobro adicional" : "Cobro de pedido"}</p><h2 className="mt-1 text-2xl font-black">#{pedidoCobro?.id_pedido || solicitudCobro?.id_pedido} · {pedidoCobro?.cliente || solicitudCobro?.cliente}</h2></div><p>Importe pendiente: <b>{importe(totalCobroActual)}</b></p><label className="block text-sm font-semibold">Método<select value={metodo} onChange={(event) => setMetodo(event.target.value)} className="mt-1 w-full rounded-lg border p-3">{['EFECTIVO','TARJETA','TRANSFERENCIA','QR'].map((opcion) => <option key={opcion}>{opcion}</option>)}</select></label><label className="block text-sm font-semibold">Importe recibido<input autoFocus required type="number" min={totalCobroActual} step="0.01" value={recibido} onChange={(event) => setRecibido(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><p className="text-sm">Cambio: <b>{metodo === 'EFECTIVO' ? importe(cambio) : importe(0)}</b></p><div className="flex gap-3"><button type="button" onClick={() => { setPedidoCobro(null); setSolicitudCobro(null); }} className="w-full rounded-xl border px-4 py-3 font-bold">Cancelar</button><button disabled={guardando} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white">Confirmar pago</button></div></form></div>}
        </div>
    );
}

export default Caja;
