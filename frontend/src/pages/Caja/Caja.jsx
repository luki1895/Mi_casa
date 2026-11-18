import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const obtenerFecha = () => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};
const importe = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;
const estadoBonito = (valor) => String(valor || "PENDIENTE").replaceAll("_", " ");
const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]));

function Caja() {
    const { usuario } = useAuth();
    const [seccionActiva, setSeccionActiva] = useState("RESUMEN");
    const [panel, setPanel] = useState({ ventas: 0, gastos: 0, saldo_esperado: 0, pedidos_pendientes: 0, cierre: null, apertura: null, estado_caja: "SIN_ABRIR" });
    const [pedidos, setPedidos] = useState([]);
    const [atenciones, setAtenciones] = useState([]);
    const [atencionId, setAtencionId] = useState("");
    const [clientes, setClientes] = useState([]);
    const [menu, setMenu] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [adicionales, setAdicionales] = useState([]);
    const [fechaHistorial, setFechaHistorial] = useState(obtenerFecha);
    const [historialCaja, setHistorialCaja] = useState(null);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
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
            setPedidos([]);
            setAtenciones([]);
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
            const [panelRes, pedidosRes, clientesRes, menuRes, gastosRes, pagosRes, adicionalesRes] = await Promise.all([
                api.get("/caja/panel"), api.get("/caja/pedidos"), api.get("/clientes/para-pedidos"),
                api.get(`/produccion/menu?fecha=${fecha}`), api.get("/caja/gastos"), api.get("/caja/pagos"),
                api.get("/caja/adicionales"),
            ]);
            setPanel(panelRes.data.data || {});
            setPedidos(pedidosRes.data.data || []);
            setClientes((clientesRes.data.data || []).filter((cliente) => cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO"));
            setMenu(menuRes.data.data || []);
            setGastos(gastosRes.data.data || []);
            setPagos(pagosRes.data.data || []);
            setAdicionales(adicionalesRes.data.data || []);
            try {
                const atencionesRes = await api.get("/atenciones-mesa");
                setAtenciones(atencionesRes.data.data || []);
            } catch (requestError) {
                if (requestError.response?.status !== 503) throw requestError;
                setAtenciones([]);
                setAviso("La asociación de pedidos a mesas estará disponible después de aplicar la migración local preparada.");
            }
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cargar Caja. Comprueba la conexión y que se haya aplicado la migración PostgreSQL 001.");
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    const cargarHistorial = useCallback(async () => {
        setCargandoHistorial(true);
        setError("");
        if (usuario?.demo) {
            setHistorialCaja(null);
            setAviso("El historial no está disponible en modo demostración.");
            setCargandoHistorial(false);
            return;
        }
        try {
            const { data } = await api.get("/caja/historial", { params: { fecha: fechaHistorial } });
            setHistorialCaja(data.data);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo consultar el historial de Caja.");
        } finally {
            setCargandoHistorial(false);
        }
    }, [fechaHistorial, usuario]);

    useEffect(() => {
        Promise.resolve().then(cargar);
    }, [cargar]);

    const totalPedido = useMemo(() => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0), [carrito]);
    const requiereCajaAbierta = usuario?.role === "caja" && panel.estado_caja !== "ABIERTA";
    const cajaAbierta = panel.estado_caja === "ABIERTA";
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
        if (usuario?.role === "caja" && panel.estado_caja !== "ABIERTA") {
            return setAviso("Abre la caja antes de confirmar un pedido.");
        }
        setGuardando(true);
        try {
            const respuesta = await api.post("/pedidos", {
                tipo_cliente: tipoCliente,
                fecha: obtenerFecha(),
                id_cliente: tipoCliente === "PENSIONADO" ? Number(clienteId) : undefined,
                cliente_nombre: tipoCliente === "EVENTUAL" ? nombreEventual.trim() : undefined,
                cliente_telefono: tipoCliente === "EVENTUAL" ? telefonoEventual.trim() : undefined,
                id_atencion: atencionId ? Number(atencionId) : undefined,
                observaciones: observaciones.trim(),
                detalle: carrito.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
            });
            setCarrito([]); setClienteId(""); setNombreEventual(""); setTelefonoEventual(""); setObservaciones(""); setAtencionId("");
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
                    id_solicitud: solicitudCobro.id_solicitud,
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

    const anularPago = async (pago) => {
        if (!window.confirm(`¿Anular el pago #${pago.id_pago} por ${importe(pago.monto)}?`)) return;
        const motivo = window.prompt("Motivo de anulación (obligatorio):");
        if (motivo === null) return;
        if (!motivo.trim()) {
            setAviso("Debes indicar el motivo de la anulación.");
            return;
        }
        setGuardando(true);
        setAviso("");
        try {
            await api.post(`/caja/pagos/${pago.id_pago}/anular`, { motivo: motivo.trim() });
            setAviso(`Pago #${pago.id_pago} anulado; se recalculó el saldo del pedido.`);
            await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo anular el pago.");
        } finally {
            setGuardando(false);
        }
    };

    const imprimir = async (pedido) => {
        const ventana = window.open("", "_blank", "width=600,height=700");
        if (!ventana) return setAviso("Permite las ventanas emergentes para imprimir la comanda.");
        try {
            const respuesta = await api.post(`/pedidos/${pedido.id_pedido}/comandas`, {
                id_solicitud: pedido.esAdicional ? pedido.id_solicitud : undefined,
            });
            const comanda = respuesta.data.data;
            const tipoComanda = comanda.tipo === "ADICIONAL" ? "COMANDA ADICIONAL" : "COMANDA";
            const productos = (comanda.detalle || []).map((item) => `<tr><td>${escaparHtml(item.cantidad)} × ${escaparHtml(item.nombre)}</td><td>${importe(item.precio || 0)}</td></tr>`).join("");
            const reimpresion = comanda.es_reimpresion ? "<p><strong>REIMPRESIÓN</strong></p>" : "";
            ventana.document.write(`<!DOCTYPE html>
                <html>
                  <head>
                    <title>${tipoComanda} #${escaparHtml(comanda.id_pedido)}</title>
                    <style>
                      @page { size: 58mm 80mm; margin: 0; }
                      html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; }
                      body { width: 58mm; min-height: 80mm; box-sizing: border-box; padding: 6mm 4mm; color: #111; }
                      h1 { font-size: 12px; font-weight: 700; text-align: center; margin: 0 0 4px; }
                      .meta { font-size: 9px; line-height: 1.5; margin-bottom: 4px; }
                      table { width: 100%; border-collapse: collapse; font-size: 9px; }
                      td { padding: 2px 0; vertical-align: top; }
                      td:last-child { text-align: right; white-space: nowrap; }
                      .divider { border-top: 1px dashed #333; margin: 4px 0; }
                      .total { font-size: 10px; font-weight: 700; text-align: right; }
                      .nota { font-size: 8.5px; line-height: 1.4; margin-top: 4px; }
                    </style>
                  </head>
                  <body>
                    <h1>${tipoComanda}</h1>
                    ${reimpresion}
                    <div class="meta">Pedido #${escaparHtml(comanda.id_pedido)}<br />Cliente: ${escaparHtml(comanda.cliente)}<br />Hora: ${escaparHtml(new Date(comanda.fecha).toLocaleString("es"))}</div>
                    <table>${productos}</table>
                    <div class="divider"></div>
                    <div class="total">TOTAL: ${importe(comanda.total || pedido.total || 0)}</div>
                    <div class="nota"><strong>Observaciones:</strong> ${escaparHtml(comanda.observaciones || "—")}</div>
                    <script>window.onload = () => window.print();</script>
                  </body>
                </html>`);
            ventana.document.close();
            if (comanda.es_reimpresion) setAviso("Reimpresión registrada en la bitácora.");
        } catch (requestError) {
            ventana.close();
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar la impresión de la comanda.");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Operaciones diarias</p><h1 className="mt-1 text-3xl font-black text-slate-900">Caja</h1><p className="mt-1 text-sm text-slate-500">Resumen, turno, cobros y movimientos financieros.</p></div><button onClick={cargar} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Actualizar</button></header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {aviso && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{aviso}</p>}
            <nav aria-label="Secciones de Caja" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                    ["RESUMEN", "Resumen"],
                    ["TURNO", "Turno de caja"],
                    ["COBROS", "Cobros"],
                    ["MOVIMIENTOS", "Movimientos"],
                    ["HISTORIAL", "Historial"],
                ].map(([seccion, titulo]) => (
                    <button
                        key={seccion}
                        type="button"
                        onClick={() => {
                            setSeccionActiva(seccion);
                            if (seccion === "HISTORIAL") cargarHistorial();
                        }}
                        aria-current={seccionActiva === seccion ? "page" : undefined}
                        className={`rounded-xl px-5 py-3 text-sm font-bold transition ${seccionActiva === seccion ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        {titulo}
                    </button>
                ))}
            </nav>
            {seccionActiva === "RESUMEN" && (
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
                            <button type="button" onClick={() => setSeccionActiva("TURNO")} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">Ir a Caja</button>
                        </section>
                    )}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Accesos rápidos</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Tareas del área</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setSeccionActiva("TURNO")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Gestionar turno</button>
                                <button type="button" onClick={() => setSeccionActiva("COBROS")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Registrar o cobrar pedidos</button>
                                <button type="button" onClick={() => setSeccionActiva("MOVIMIENTOS")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver movimientos</button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
            {seccionActiva === "TURNO" && (
                <>
            <section className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm text-slate-500">Estado de Caja</p>
                    <p className={`mt-1 text-xl font-black ${panel.estado_caja === "ABIERTA" ? "text-emerald-700" : "text-slate-800"}`}>{panel.estado_caja === "SIN_ABRIR" ? "Cerrada · sin apertura" : panel.estado_caja}</p>
                    {panel.apertura && <p className="mt-1 text-sm text-slate-600">Responsable: {panel.apertura.responsable} · {new Date(panel.apertura.abierta_en).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · Inicial: {importe(panel.apertura.monto_inicial)}</p>}
                </div>
                {!cajaAbierta && <form onSubmit={abrirCaja} className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="monto-inicial">Monto inicial en efectivo</label>
                    <input id="monto-inicial" required type="number" min="0" step="0.01" value={montoInicial} onChange={(event) => setMontoInicial(event.target.value)} placeholder="Monto inicial Bs" className="rounded-xl border border-slate-200 px-3 py-2.5" />
                    <button disabled={guardando || usuario?.demo} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Abrir caja</button>
                </form>}
            </section>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[['Ventas cobradas', panel.ventas], ['Gastos de hoy', panel.gastos], ['Saldo esperado en efectivo', panel.saldo_esperado]].map(([titulo, valor]) => <article key={titulo} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-2 text-2xl font-black text-slate-900">{importe(valor)}</p></article>)}
            </section>
            <div className="grid gap-6">
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
                            <button disabled={guardando || Number(panel.pedidos_pendientes) > 0 || adicionales.length > 0} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Cerrar caja</button>
                        </form>
                    )}
                </section>
            </div>
                </>
            )}
            {seccionActiva === "COBROS" && (
            <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-black">Registrar pedido</h2>
                    <form onSubmit={crearPedido} className="mt-4 space-y-4">
                        <div className="flex gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === 'PENSIONADO'} onChange={() => { setTipoCliente('PENSIONADO'); setClienteId(''); }} />Pensionado</label><label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === 'EVENTUAL'} onChange={() => { setTipoCliente('EVENTUAL'); setClienteId(''); }} />Eventual</label></div>
                        {tipoCliente === 'PENSIONADO' ? <select required value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecciona el pensionado</option>{clientes.filter((cliente) => String(cliente.tipo_cliente || '').toUpperCase().includes('PENSION')).map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>)}</select> : <div className="grid gap-3 sm:grid-cols-2"><input required value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente eventual" className="rounded-xl border border-slate-200 px-3 py-3" /><input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" className="rounded-xl border border-slate-200 px-3 py-3" /></div>}
                        <label className="block text-sm font-semibold">Atención de mesa (opcional)
                            <select value={atencionId} onChange={(event) => setAtencionId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3">
                                <option value="">Sin mesa / pedido para llevar</option>
                                {atenciones.map((atencion) => <option key={atencion.id_atencion} value={atencion.id_atencion}>Mesa {atencion.mesa} · atención #{atencion.id_atencion}</option>)}
                            </select>
                        </label>
                        <div><p className="mb-2 text-sm font-bold">Menú disponible hoy</p><div className="max-h-64 space-y-2 overflow-y-auto">{menu.length ? menu.map((plato) => <div key={`${plato.id_producto}-${plato.categoria}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="font-semibold">{plato.nombre} <span className="text-xs font-normal text-slate-500">· {plato.categoria}</span></p><p className="text-xs text-slate-500">{importe(plato.precio)} · {plato.stock} disponibles</p></div><button type="button" disabled={!Number(plato.stock)} onClick={() => agregar(plato)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300">Agregar</button></div>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Sin platos publicados para hoy.</p>}</div></div>
                        {carrito.length > 0 && <ul className="space-y-2">{carrito.map((item) => <li key={item.id_producto} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"><span>{item.nombre} × {item.cantidad}</span><span className="flex items-center gap-2"><b>{importe(item.precio * item.cantidad)}</b><button type="button" onClick={() => cambiarCantidad(item.id_producto, -1)} className="px-2 text-lg">−</button><button type="button" onClick={() => cambiarCantidad(item.id_producto, 1)} disabled={item.cantidad >= Number(item.stock)} className="px-2 text-lg disabled:opacity-30">+</button></span></li>)}</ul>}
                        <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Observaciones para cocina" rows="2" className="w-full rounded-xl border border-slate-200 px-3 py-3" />
                        <div className="flex items-center justify-between border-t pt-3"><span className="font-semibold">Total</span><b className="text-xl">{importe(totalPedido)}</b></div>
                        <button disabled={guardando || cargando || !menu.length || requiereCajaAbierta} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50">Confirmar pedido</button>
                    </form>
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Pedidos y seguimiento</h2><p className="text-sm text-slate-500">Estados, cobros y comandas</p></div><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cliente o # pedido" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
                    <div className="mt-4 space-y-3">{pedidosFiltrados.map((pedido) => <article key={pedido.id_pedido} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black">#{pedido.id_pedido} · {pedido.cliente}</p><p className="mt-1 text-xs text-slate-500">{new Date(pedido.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} · {estadoBonito(pedido.estado)}</p></div><b>{importe(pedido.total)}</b></div><ul className="mt-3 text-sm text-slate-600">{pedido.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>{pedido.observaciones && <p className="mt-2 text-xs text-slate-500">Nota cocina: {pedido.observaciones}</p>}                                        <div className="mt-3 flex flex-wrap gap-2">{Number(pedido.saldo_pendiente) > 0 && <button onClick={() => { setPedidoCobro(pedido); setSolicitudCobro(null); setRecibido(String(pedido.saldo_pendiente)); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Cobrar saldo</button>}{pedido.pagado && <button onClick={() => imprimir(pedido)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Imprimir comanda</button>}{pedido.estado === "PENDIENTE" && <>{pedido.pagado && <button onClick={() => actualizarEstadoPedido(pedido, "EN_PREPARACION")} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Enviar a preparación</button>}{!pedido.pagado && <button onClick={() => actualizarEstadoPedido(pedido, "CANCELADO")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Cancelar pedido</button>}</>}{pedido.estado === "EN_PREPARACION" && <button onClick={() => actualizarEstadoPedido(pedido, "LISTO")} className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-900">Marcar listo</button>}{pedido.estado === "LISTO" && <button onClick={() => actualizarEstadoPedido(pedido, "ENTREGADO")} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">Marcar entregado</button>}</div></article>)}{!pedidosFiltrados.length && <p className="py-8 text-center text-sm text-slate-500">No hay pedidos que coincidan.</p>}</div>
                </section>
            </div>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Solicitudes adicionales por cobrar</h2>
                <p className="mt-1 text-sm text-slate-500">Cobros adicionales solicitados por los meseros.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {adicionales.map((solicitud) => <article key={solicitud.id_solicitud} className="rounded-xl border border-slate-100 p-4"><div className="flex justify-between"><b>Pedido #{solicitud.id_pedido} · {solicitud.cliente}</b><b>{importe(solicitud.total)}</b></div><ul className="my-2 text-sm text-slate-600">{solicitud.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>{solicitud.observaciones && <p className="mb-3 text-xs text-slate-500">Nota de cocina: {solicitud.observaciones}</p>}<button onClick={() => { setPedidoCobro(null); setSolicitudCobro(solicitud); setRecibido(String(solicitud.total)); }} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black">Cobrar adicional</button></article>)}
                    {!adicionales.length && <p className="py-4 text-sm text-slate-500">No hay cobros adicionales pendientes.</p>}
                </div>
                {ultimaComandaAdicional && <button onClick={() => imprimir(ultimaComandaAdicional)} className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Imprimir última comanda adicional</button>}
            </section>
            </>
            )}
            {seccionActiva === "MOVIMIENTOS" && (
                <section className="space-y-5">
                    <article className="rounded-2xl bg-white p-5 shadow-sm">
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
                    </article>
                    <div className="grid gap-5 xl:grid-cols-2">
                    <article className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-black">Ingresos registrados</h2>
                        <div className="mt-3 max-h-96 overflow-auto">
                            {pagos.map((pago) => <div key={pago.id_pago} className="flex flex-wrap items-center justify-between gap-3 border-t py-2 text-sm"><span>Pago #{pago.id_pago} · Pedido #{pago.id_pedido} · {pago.metodo} · {new Date(pago.fecha).toLocaleString("es")} · {pago.estado}{pago.motivo_anulacion && <small className="block text-slate-500">Motivo: {pago.motivo_anulacion}</small>}</span><span className="flex items-center gap-3"><b>{importe(pago.monto)}</b>{panel.estado_caja === "ABIERTA" && pago.estado === "CONFIRMADO" && pago.estado_pedido !== "ENTREGADO" && <button type="button" disabled={guardando} onClick={() => anularPago(pago)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50">Anular</button>}</span></div>)}
                            {!pagos.length && <p className="py-4 text-sm text-slate-500">No hay pagos registrados.</p>}
                        </div>
                    </article>
                    <article className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-black">Egresos registrados</h2>
                        <div className="mt-3 max-h-96 overflow-auto">
                            {gastos.map((item) => <p key={item.id_gasto} className="flex justify-between gap-3 border-t py-2 text-sm"><span>{item.concepto} · {item.metodo_pago} · {new Date(item.fecha).toLocaleString("es")}</span><b>{importe(item.total)}</b></p>)}
                            {!gastos.length && <p className="py-4 text-sm text-slate-500">No hay gastos registrados.</p>}
                        </div>
                    </article>
                    </div>
                </section>
            )}
            {seccionActiva === "HISTORIAL" && (
                <section className="space-y-5">
                    <article className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
                        <div><h2 className="text-xl font-black">Historial diario de Caja</h2><p className="text-sm text-slate-500">Pagos y gastos no efectivos se muestran separados del saldo de efectivo.</p></div>
                        <div className="flex gap-2"><label className="text-sm font-semibold">Fecha<input type="date" value={fechaHistorial} onChange={(event) => setFechaHistorial(event.target.value)} className="mt-1 block rounded-lg border p-2" /></label><button type="button" onClick={cargarHistorial} className="rounded-lg border px-4 py-2 font-semibold">Consultar</button></div>
                    </article>
                    {cargandoHistorial ? <p className="rounded-xl bg-white p-5">Cargando historial…</p> : historialCaja && <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Efectivo esperado</p><p className="mt-2 text-2xl font-black">{importe(historialCaja.efectivo_esperado)}</p></article>
                            <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Apertura</p><p className="mt-2 font-bold">{historialCaja.apertura ? importe(historialCaja.apertura.monto_inicial) : "Sin apertura"}</p><p className="text-xs text-slate-500">{historialCaja.apertura?.responsable || ""}</p></article>
                            <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Cierre</p><p className="mt-2 font-bold">{historialCaja.cierre ? `Contado ${importe(historialCaja.cierre.monto_contado)} · Dif. ${importe(historialCaja.cierre.diferencia)}` : "Sin cierre"}</p><p className="text-xs text-slate-500">{historialCaja.cierre?.responsable || ""}</p></article>
                        </div>
                        <div className="grid gap-5 xl:grid-cols-2">
                            <article className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-black">Movimientos de efectivo</h3><div className="mt-3 max-h-96 overflow-auto">{historialCaja.movimientos.map((movimiento) => <p key={movimiento.id_caja} className="flex justify-between gap-3 border-t py-2 text-sm"><span>{movimiento.concepto} · {new Date(movimiento.fecha).toLocaleTimeString("es")}</span><b>{movimiento.egreso > 0 ? `−${importe(movimiento.egreso)}` : `+${importe(movimiento.ingreso)}`}</b></p>)}{!historialCaja.movimientos.length && <p className="py-3 text-sm text-slate-500">Sin movimientos de efectivo.</p>}</div></article>
                            <article className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-black">Pagos y gastos por método</h3><h4 className="mt-3 text-sm font-bold">Pagos</h4>{historialCaja.pagos_por_metodo.map((item) => <p key={`pago-${item.metodo}`} className="flex justify-between border-t py-2 text-sm"><span>{item.metodo} ({item.cantidad})</span><b>{importe(item.total)}</b></p>)}<h4 className="mt-3 text-sm font-bold">Gastos</h4>{historialCaja.gastos_por_metodo.map((item) => <p key={`gasto-${item.metodo_pago}`} className="flex justify-between border-t py-2 text-sm"><span>{item.metodo_pago} ({item.cantidad})</span><b>{importe(item.total)}</b></p>)}</article>
                        </div>
                    </>}
                </section>
            )}
            {(pedidoCobro || solicitudCobro) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={confirmarPago} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div><p className="text-xs uppercase tracking-widest text-amber-700">{solicitudCobro ? "Cobro adicional" : "Cobro de pedido"}</p><h2 className="mt-1 text-2xl font-black">#{pedidoCobro?.id_pedido || solicitudCobro?.id_pedido} · {pedidoCobro?.cliente || solicitudCobro?.cliente}</h2></div><p>Importe pendiente: <b>{importe(totalCobroActual)}</b></p><label className="block text-sm font-semibold">Método<select value={metodo} onChange={(event) => setMetodo(event.target.value)} className="mt-1 w-full rounded-lg border p-3">{['EFECTIVO','TARJETA','TRANSFERENCIA','QR'].map((opcion) => <option key={opcion}>{opcion}</option>)}</select></label><label className="block text-sm font-semibold">Importe recibido<input autoFocus required type="number" min={totalCobroActual} step="0.01" value={recibido} onChange={(event) => setRecibido(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><p className="text-sm">Cambio: <b>{metodo === 'EFECTIVO' ? importe(cambio) : importe(0)}</b></p><div className="flex gap-3"><button type="button" onClick={() => { setPedidoCobro(null); setSolicitudCobro(null); }} className="w-full rounded-xl border px-4 py-3 font-bold">Cancelar</button><button disabled={guardando} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white">Confirmar pago</button></div></form></div>}
        </div>
    );
}

export default Caja;
