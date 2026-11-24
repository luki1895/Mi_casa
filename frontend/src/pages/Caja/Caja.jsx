import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { Alert, Badge, Button, Card, ConfirmModal, Input, Modal, Select, Textarea } from "../../components/ui";
import MesaBoard from "../../components/MesaBoard";
import MesaAtencionDetail from "../../components/MesaAtencionDetail";
import MesaOrderProductAdder from "../../components/MesaOrderProductAdder";
import useMesaBoardData from "../../hooks/useMesaBoardData";
import fechaRestaurante from "../../utils/fechaRestaurante";

const importe = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;
const estadoBonito = (valor) => String(valor || "PENDIENTE").replaceAll("_", " ");
const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]));

function Caja() {
    const { usuario } = useAuth();
    const [seccionActiva, setSeccionActiva] = useState("MESAS");
    const [vistaCobros, setVistaCobros] = useState("NUEVO");
    const [panel, setPanel] = useState({ ventas: 0, gastos: 0, saldo_esperado: 0, pedidos_pendientes: 0, cierre: null, apertura: null, estado_caja: "SIN_ABRIR" });
    const [pedidos, setPedidos] = useState([]);
    const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState(null);
    const [atencionId, setAtencionId] = useState("");
    const [clientes, setClientes] = useState([]);
    const [menu, setMenu] = useState([]);
    const [menuConfirmado, setMenuConfirmado] = useState(false);
    const [gastos, setGastos] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [adicionales, setAdicionales] = useState([]);
    const [fechaHistorial, setFechaHistorial] = useState(fechaRestaurante);
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
    const [busquedaPedidos, setBusquedaPedidos] = useState("");
    const [pedidoCobro, setPedidoCobro] = useState(null);
    const [pedidoParaAgregar, setPedidoParaAgregar] = useState(null);
    const [mostrarPedidoMesa, setMostrarPedidoMesa] = useState(false);
    const [solicitudCobro, setSolicitudCobro] = useState(null);
    const [ultimaComandaAdicional, setUltimaComandaAdicional] = useState(null);
    const [pagoAnular, setPagoAnular] = useState(null);
    const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState("");
    const [confirmarCierre, setConfirmarCierre] = useState(false);
    const [montoPago, setMontoPago] = useState("");
    const [recibido, setRecibido] = useState("");
    const [metodo, setMetodo] = useState("EFECTIVO");
    const [gasto, setGasto] = useState({ concepto: "", descripcion: "", total: "", metodo_pago: "EFECTIVO" });
    const [montoContado, setMontoContado] = useState("");
    const [montoInicial, setMontoInicial] = useState("");
    const [observacionesCierre, setObservacionesCierre] = useState("");
    const [guardando, setGuardando] = useState(false);
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

    useEffect(() => {
        if (!mesaSeleccionadaId) return;
        if (cargandoAtencion) return;
        if (errorConsultaMesas || !idAtencionMesaSeleccionada) {
            if (atencionSeleccionada) clearAtencion();
            return;
        }
        if (Number(atencionSeleccionada?.id_atencion) !== Number(idAtencionMesaSeleccionada)) {
            consultarAtencion(idAtencionMesaSeleccionada);
        }
    }, [atencionSeleccionada, cargandoAtencion, clearAtencion, consultarAtencion, errorConsultaMesas, idAtencionMesaSeleccionada, mesaSeleccionadaId]);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        setMenu([]);
        setMenuConfirmado(false);
        if (usuario?.demo) {
            setPanel({ ventas: 0, gastos: 0, saldo_esperado: 0, pedidos_pendientes: 0, cierre: null, apertura: null, estado_caja: "SIN_ABRIR" });
            setPedidos([]);
            setClientes([]);
            setMenu([]);
            setMenuConfirmado(false);
            setGastos([]);
            setPagos([]);
            setAdicionales([]);
            setAviso("Vista de demostración: no se conecta ni se guardan operaciones en la base de datos.");
            setCargando(false);
            return;
        }
        try {
            const fecha = fechaRestaurante();
            const [panelRes, pedidosRes, clientesRes, menuRes, gastosRes, pagosRes, adicionalesRes] = await Promise.all([
                api.get("/caja/panel"), api.get("/caja/pedidos"), api.get("/clientes/para-pedidos"),
                api.get(`/produccion/menu?fecha=${fecha}`), api.get("/caja/gastos"), api.get("/caja/pagos"),
                api.get("/caja/adicionales"),
            ]);
            setPanel(panelRes.data.data || {});
            setPedidos(pedidosRes.data.data || []);
            setClientes((clientesRes.data.data || []).filter((cliente) => cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO"));
            setMenu(menuRes.data.data || []);
            setMenuConfirmado(true);
            setGastos(gastosRes.data.data || []);
            setPagos(pagosRes.data.data || []);
            setAdicionales(adicionalesRes.data.data || []);
        } catch (requestError) {
            setMenu([]);
            setMenuConfirmado(false);
            setError(requestError.response?.data?.mensaje || "No se pudo cargar Caja. Comprueba la conexión y que se haya aplicado la migración PostgreSQL 001.");
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    const seleccionarMesa = (mesa) => {
        setMesaSeleccionadaId(mesa.id_mesa);
        setAtencionId(mesa.id_atencion ? String(mesa.id_atencion) : "");
        setPedidoParaAgregar(null);
        setMostrarPedidoMesa(false);
    };

    const abrirAtencionSeleccionada = async () => {
        if (!mesaSeleccionada) return;
        setGuardando(true);
        setError("");
        setAviso("");
        try {
            await api.post(`/atenciones-mesa/mesas/${mesaSeleccionada.id_mesa}/atenciones`);
            setAviso(`Atención abierta para la mesa ${mesaSeleccionada.numero}.`);
            await refrescarMesas(true);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo abrir la atención. Actualiza el estado de la mesa e inténtalo nuevamente.");
            await refrescarMesas(true);
        } finally {
            setGuardando(false);
        }
    };

    const iniciarPedidoParaAtencion = (idAtencion) => {
        setAtencionId(String(idAtencion));
        setPedidoParaAgregar(null);
        setMostrarPedidoMesa(true);
    };

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
    const totalCobroActual = Number(solicitudCobro?.total ?? pedidoCobro?.saldo_pendiente ?? 0);
    const montoCobroActual = solicitudCobro ? totalCobroActual : Number(montoPago);
    const cambio = Number.isFinite(montoCobroActual)
        ? Math.max(Number(recibido || 0) - montoCobroActual, 0)
        : 0;
    const pagosPedidoActual = pedidoCobro
        ? pagos.filter((pago) => Number(pago.id_pedido) === Number(pedidoCobro.id_pedido))
        : [];
    const pedidosFiltrados = pedidos.filter((pedido) => `${pedido.id_pedido} ${pedido.cliente}`.toLowerCase().includes(busquedaPedidos.trim().toLowerCase()));
    const agregar = (producto) => setCarrito((actual) => {
        const existente = actual.find((item) => item.id_producto === producto.id_producto);
        if ((existente?.cantidad || 0) >= Number(producto.stock)) return actual;
        return existente
            ? actual.map((item) => item.id_producto === producto.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item)
            : [...actual, { ...producto, cantidad: 1 }];
    });
    const cambiarCantidad = (id, delta) => setCarrito((actual) => actual.map((item) => item.id_producto === id ? { ...item, cantidad: Math.min(Number(item.stock), item.cantidad + delta) } : item).filter((item) => item.cantidad > 0));

    const abrirCobroPedido = (pedido) => {
        const saldoPendiente = String(pedido.saldo_pendiente);
        setSolicitudCobro(null);
        setPedidoCobro(pedido);
        setMontoPago(saldoPendiente);
        setRecibido(saldoPendiente);
    };

    const abrirCobroAdicional = (solicitud) => {
        const total = String(solicitud.total);
        setPedidoCobro(null);
        setSolicitudCobro(solicitud);
        setMontoPago(total);
        setRecibido(total);
    };

    const crearPedido = async (event) => {
        event.preventDefault();
        setAviso("");
        const idAtencionDelPedido = atencionId ? Number(atencionId) : null;
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
                fecha: fechaRestaurante(),
                id_cliente: tipoCliente === "PENSIONADO" ? Number(clienteId) : undefined,
                cliente_nombre: tipoCliente === "EVENTUAL" ? nombreEventual.trim() : undefined,
                cliente_telefono: tipoCliente === "EVENTUAL" ? telefonoEventual.trim() : undefined,
                id_atencion: atencionId ? Number(atencionId) : undefined,
                observaciones: observaciones.trim(),
                detalle: carrito.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
            });
            setCarrito([]); setClienteId(""); setNombreEventual(""); setTelefonoEventual(""); setObservaciones(""); setAtencionId("");
            if (seccionActiva === "MESAS") setMostrarPedidoMesa(false);
            setAviso(`Pedido #${respuesta.data.data.id_pedido} registrado. Confirma el pago para emitir su comanda.`);
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (idAtencionDelPedido) await consultarAtencion(idAtencionDelPedido);
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo registrar el pedido; puede que la disponibilidad haya cambiado.");
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (idAtencionDelPedido) await consultarAtencion(idAtencionDelPedido);
        } finally { setGuardando(false); }
    };

    const confirmarPago = async (event) => {
        event.preventDefault();
        if (!pedidoCobro && !solicitudCobro) return;
        const monto = solicitudCobro ? totalCobroActual : montoCobroActual;
        const efectivoRecibido = metodo === "EFECTIVO" ? Number(recibido) : monto;
        if (!Number.isFinite(monto) || monto <= 0 || monto > totalCobroActual) {
            setAviso("El abono debe ser mayor que cero y no superar el saldo pendiente.");
            return;
        }
        if (metodo === "EFECTIVO" && (!Number.isFinite(efectivoRecibido) || efectivoRecibido < monto)) {
            setAviso("El efectivo recibido debe cubrir el importe a cobrar.");
            return;
        }
        const idAtencionActual = detalleAtencionSeleccionada?.id_atencion;
        setGuardando(true); setAviso("");
        try {
            if (solicitudCobro) {
                const adicionalPagado = await api.post(`/caja/adicionales/${solicitudCobro.id_solicitud}/cobrar`, { recibido: efectivoRecibido, metodo });
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
                await api.post(`/caja/pedidos/${pedidoCobro.id_pedido}/pagos`, {
                    monto,
                    recibido: efectivoRecibido,
                    metodo,
                });
                setAviso(`Pago registrado para el pedido #${pedidoCobro.id_pedido}.`);
                setPedidoCobro(null);
            }
            setMontoPago("");
            setRecibido("");
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (idAtencionActual) await consultarAtencion(idAtencionActual);
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

    const solicitarCierreCaja = (event) => {
        event.preventDefault();
        setConfirmarCierre(true);
    };

    const cerrarCaja = async () => {
        setGuardando(true); setAviso("");
        try {
            const resultado = await api.post("/caja/cerrar", { monto_contado: Number(montoContado), observaciones: observacionesCierre.trim() });
            setAviso(`Cierre guardado. Diferencia: ${importe(resultado.data.data.diferencia)}.`);
            setMontoContado(""); setObservacionesCierre(""); setConfirmarCierre(false); await cargar();
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo cerrar la caja.");
        } finally { setGuardando(false); }
    };

    const actualizarEstadoPedido = async (pedido, estado) => {
        setGuardando(true);
        try {
            await api.patch(`/pedidos/${pedido.id_pedido}/estado`, { estado });
            setAviso(`Pedido #${pedido.id_pedido}: ${estadoBonito(estado)}.`);
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (detalleAtencionSeleccionada?.id_atencion) {
                await consultarAtencion(detalleAtencionSeleccionada.id_atencion);
            }
            return true;
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo actualizar el estado del pedido.");
            return false;
        } finally {
            setGuardando(false);
        }
    };

    const agregarProductosPedido = async (cambios) => {
        if (!pedidoParaAgregar) return;
        const idAtencionActual = pedidoParaAgregar.id_atencion || detalleAtencionSeleccionada?.id_atencion;
        setGuardando(true);
        setAviso("");
        try {
            await api.post(`/pedidos/${pedidoParaAgregar.id_pedido}/detalle`, cambios);
            setPedidoParaAgregar(null);
            setAviso(`Productos agregados al pedido #${pedidoParaAgregar.id_pedido}.`);
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (idAtencionActual) await consultarAtencion(idAtencionActual);
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudieron agregar productos al pedido.");
        } finally {
            setGuardando(false);
        }
    };

    const abrirAnulacion = (pago) => {
        setPagoAnular(pago);
        setMotivoAnulacion("");
    };

    const anularPago = async () => {
        if (!pagoAnular) return;
        if (!motivoAnulacion.trim()) {
            setAviso("Debes indicar el motivo de la anulación.");
            return;
        }
        setGuardando(true);
        setAviso("");
        try {
            await api.post(`/caja/pagos/${pagoAnular.id_pago}/anular`, { motivo: motivoAnulacion.trim() });
            setAviso(`Pago #${pagoAnular.id_pago} anulado; se recalculó el saldo del pedido.`);
            setPagoAnular(null);
            setMotivoAnulacion("");
            await Promise.all([cargar(), refrescarMesas(true)]);
            if (detalleAtencionSeleccionada?.id_atencion) {
                await consultarAtencion(detalleAtencionSeleccionada.id_atencion);
            }
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
            const ubicacion = comanda.id_atencion
                ? `Mesa ${escaparHtml(comanda.mesa || "No identificada")} · Atención #${escaparHtml(comanda.id_atencion)}`
                : "Pedido sin mesa";
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
                    <div class="meta">Pedido #${escaparHtml(comanda.id_pedido)}<br />${ubicacion}<br />Cliente: ${escaparHtml(comanda.cliente)}<br />Hora: ${escaparHtml(new Date(comanda.fecha).toLocaleString("es"))}</div>
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

    const formularioNuevoPedido = (
        <section className="rounded-2xl border border-[#E8DDD1] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B85C3B]">Nuevo pedido</p>
                    <h2 className="mt-1 text-xl font-black text-[#342820]">
                        {seccionActiva === "MESAS" ? `Pedido para mesa ${mesaSeleccionada?.numero || ""}` : "Registrar pedido"}
                    </h2>
                    <p className="mt-1 text-sm text-[#75675C]">El pedido queda asociado a la atención seleccionada; el pago se registra por separado.</p>
                </div>
                {seccionActiva === "MESAS" && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMostrarPedidoMesa(false)}>
                        Volver al detalle
                    </Button>
                )}
            </div>
            <form onSubmit={crearPedido} className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-5 text-sm font-semibold text-[#594A3E]">
                    <label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === "PENSIONADO"} onChange={() => { setTipoCliente("PENSIONADO"); setClienteId(""); }} />Pensionado</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={tipoCliente === "EVENTUAL"} onChange={() => { setTipoCliente("EVENTUAL"); setClienteId(""); }} />Eventual</label>
                </div>
                {tipoCliente === "PENSIONADO" ? (
                    <Select required value={clienteId} onChange={(event) => setClienteId(event.target.value)} aria-label="Selecciona el pensionado">
                        <option value="">Selecciona el pensionado</option>
                        {clientes.filter((cliente) => String(cliente.tipo_cliente || "").toUpperCase().includes("PENSION")).map((cliente) => (
                            <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>
                        ))}
                    </Select>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input required value={nombreEventual} onChange={(event) => setNombreEventual(event.target.value)} placeholder="Nombre del cliente eventual" aria-label="Nombre del cliente eventual" />
                        <Input value={telefonoEventual} onChange={(event) => setTelefonoEventual(event.target.value)} placeholder="Teléfono (opcional)" aria-label="Teléfono opcional" />
                    </div>
                )}
                {seccionActiva === "MESAS" ? (
                    <p className="rounded-xl bg-[#FFF8F2] p-3 text-sm font-semibold text-[#594A3E]">
                        Mesa {mesaSeleccionada?.numero} · Atención #{atencionId}
                    </p>
                ) : (
                    <>
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#FFF8F2] p-4 sm:flex-row sm:items-center">
                            <div>
                                <p className="font-bold text-slate-900">¿El pedido es para una mesa?</p>
                                <p className="mt-1 text-sm text-slate-600">Abre una atención y elige una mesa antes de asociar el pedido.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => setSeccionActiva("MESAS")}>Elegir mesa</Button>
                        </div>
                        <label className="block text-sm font-semibold">Atención de mesa (opcional)
                            <Select value={atencionId} onChange={(event) => setAtencionId(event.target.value)} aria-label="Atención de mesa">
                                <option value="">Sin mesa / pedido para llevar</option>
                                {atenciones.map((atencion) => (
                                    <option key={atencion.id_atencion} value={atencion.id_atencion}>Mesa {atencion.mesa} · atención #{atencion.id_atencion}</option>
                                ))}
                            </Select>
                        </label>
                    </>
                )}
                <div>
                    <p className="mb-2 text-sm font-bold text-[#342820]">Menú disponible hoy</p>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                        {!menuConfirmado ? <p className="rounded-lg bg-[#FCFAF7] p-4 text-sm text-[#75675C]">No se pudo confirmar la disponibilidad del menú.</p> : menu.length ? menu.map((plato) => (
                            <div key={`${plato.id_producto}-${plato.categoria}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#FCFAF7] p-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{plato.nombre} <span className="text-xs font-normal text-slate-500">· {plato.categoria}</span></p>
                                    <p className="text-xs text-slate-500">{importe(plato.precio)} · {plato.stock !== null && plato.stock !== undefined && plato.stock !== "" && Number.isFinite(Number(plato.stock)) ? `${Number(plato.stock)} disponibles` : "Disponibilidad no confirmada"}</p>
                                </div>
                                <Button type="button" size="sm" disabled={!Number(plato.stock) || guardando} onClick={() => agregar(plato)}>Agregar</Button>
                            </div>
                        )) : <p className="rounded-lg bg-[#FCFAF7] p-4 text-sm text-[#75675C]">Sin platos publicados para hoy.</p>}
                    </div>
                </div>
                {carrito.length > 0 && (
                    <ul className="space-y-2">
                        {carrito.map((item) => (
                            <li key={item.id_producto} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F0E9E1] p-3 text-sm">
                                <span className="min-w-0 flex-1 font-semibold">{item.nombre} × {item.cantidad}</span>
                                <span className="flex items-center gap-2">
                                    <b>{importe(item.precio * item.cantidad)}</b>
                                    <Button type="button" size="sm" variant="secondary" aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id_producto, -1)}>−</Button>
                                    <Button type="button" size="sm" variant="secondary" aria-label={`Agregar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id_producto, 1)} disabled={item.cantidad >= Number(item.stock)}>+</Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <Textarea label="Observaciones para cocina" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} rows="2" placeholder="Indicaciones del pedido" />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DDD1] pt-3">
                    <span className="font-semibold text-[#594A3E]">Total <strong className="ml-2 text-xl text-[#342820]">{importe(totalPedido)}</strong></span>
                    <Button type="submit" variant="warning" loading={guardando} disabled={cargando || !menu.length || requiereCajaAbierta || !carrito.length}>Registrar pedido</Button>
                </div>
            </form>
        </section>
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Operaciones diarias</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Caja</h1>
                    <p className="mt-1 text-sm text-slate-500">Turno, pedidos, cobros y movimientos financieros.</p>
                </div>
                <Button variant="secondary" onClick={cargar} loading={cargando}>Actualizar</Button>
            </header>
            {error && <Alert type="error" onRetry={cargar}>{error}</Alert>}
            {aviso && <Alert type="warning">{aviso}</Alert>}
            <nav aria-label="Secciones de Caja" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                    ["MESAS", "Mesas"],
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
            {seccionActiva === "MESAS" && (
                <div className="space-y-5">
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
                    {mesaSeleccionada && !mesaSeleccionada.id_atencion && mesaSeleccionada.estado_atencion === "DISPONIBLE" && (
                        <Card title={`Mesa ${mesaSeleccionada.numero} disponible`} description="Abre una atención para asociar uno o varios pedidos a esta mesa.">
                            <Button variant="warning" loading={guardando} onClick={abrirAtencionSeleccionada}>
                                Abrir atención
                            </Button>
                        </Card>
                    )}
                    {mesaSeleccionada?.estado_atencion === "FUERA_SERVICIO" && (
                        <Alert type="warning">Esta mesa está fuera de servicio y no puede recibir una atención.</Alert>
                    )}
                    {mesaSeleccionada?.estado_atencion === "OCUPADA" && !mesaSeleccionada.id_atencion && (
                        <Alert type="warning" onRetry={() => refrescarMesas(true)}>
                            La mesa aparece ocupada, pero la API no devolvió el identificador de su atención. Actualiza la vista antes de continuar.
                        </Alert>
                    )}
                    {mesaSeleccionada?.id_atencion && (
                        <MesaAtencionDetail
                            atencion={detalleAtencionSeleccionada}
                            loading={cargandoAtencion}
                            error={errorAtencion}
                            onRetry={consultarAtencion}
                            paymentsForOrder={(pedido) => pagos.filter((pago) => Number(pago.id_pedido) === Number(pedido.id_pedido))}
                            actionsForOrder={(pedido) => (
                                <>
                                    {!pedido.detalleNoDisponible && pedido.estado === "PENDIENTE" && !pedido.pagado && (
                                        <Button size="sm" variant="outline" onClick={() => setPedidoParaAgregar(pedido)}>
                                            Agregar productos al pedido
                                        </Button>
                                    )}
                                    {pedido.estado !== "CANCELADO" && Number(pedido.saldo_pendiente) > 0 && (
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => abrirCobroPedido({ ...pedido, pagado_total: pedido.pagado_confirmado })}
                                        >
                                            Cobrar saldo
                                        </Button>
                                    )}
                                    {pedido.pagado && <Button size="sm" onClick={() => imprimir(pedido)}>Imprimir comanda</Button>}
                                    {pedido.estado === "PENDIENTE" && !pedido.pagado && (
                                        <Button size="sm" variant="outline" onClick={() => setPedidoParaCancelar(pedido)}>Cancelar pedido</Button>
                                    )}
                                    {pedido.estado === "EN_PREPARACION" && (
                                        <Button size="sm" variant="warning" loading={guardando} onClick={() => actualizarEstadoPedido(pedido, "LISTO")}>Marcar listo</Button>
                                    )}
                                    {pedido.estado === "LISTO" && (
                                        <Button size="sm" variant="success" loading={guardando} onClick={() => actualizarEstadoPedido(pedido, "ENTREGADO")}>Marcar entregado</Button>
                                    )}
                                </>
                            )}
                            renderOrderEditor={(pedido) => (
                                pedidoParaAgregar?.id_pedido === pedido.id_pedido
                                    && pedido.estado === "PENDIENTE"
                                    && !pedido.pagado
                                    && !pedido.detalleNoDisponible && (
                                    <MesaOrderProductAdder
                                        key={pedido.id_pedido}
                                        pedido={pedido}
                                        menu={menu}
                                        loading={guardando}
                                        onCancel={() => setPedidoParaAgregar(null)}
                                        onSubmit={agregarProductosPedido}
                                    />
                                )
                            )}
                        />
                    )}
                    {detalleAtencionSeleccionada?.pedidos?.some((pedido) => pedido.pagado && pedido.estado !== "CANCELADO") && (
                        <Alert type="info">
                            Los pedidos pagados se conservan; el Mesero solicita adicionales y Caja los gestiona desde la sección Adicionales. Para esta mesa puedes abrir otro pedido sin alterar la comanda pagada.
                        </Alert>
                    )}
                    {detalleAtencionSeleccionada && (
                        <div className="space-y-3">
                            <Button
                                variant="warning"
                                onClick={() => {
                                    if (mostrarPedidoMesa) setMostrarPedidoMesa(false);
                                    else iniciarPedidoParaAtencion(detalleAtencionSeleccionada.id_atencion);
                                }}
                            >
                                {mostrarPedidoMesa ? "Cerrar formulario" : "Crear pedido para esta atención"}
                            </Button>
                            {mostrarPedidoMesa && formularioNuevoPedido}
                        </div>
                    )}
                </div>
            )}
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
                            <Button type="button" variant="warning" onClick={() => setSeccionActiva("TURNO")}>Abrir turno</Button>
                        </section>
                    )}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Accesos rápidos</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Tareas del área</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => setSeccionActiva("TURNO")}>Gestionar turno</Button>
                                <Button variant="secondary" onClick={() => { setSeccionActiva("COBROS"); setVistaCobros("NUEVO"); }}>Nuevo pedido</Button>
                                <Button variant="secondary" onClick={() => { setSeccionActiva("COBROS"); setVistaCobros("PEDIDOS"); }}>Pedidos y cobros</Button>
                                <Button variant="secondary" onClick={() => setSeccionActiva("MESAS")}>Mesas y atenciones</Button>
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
                    <Input id="monto-inicial" aria-label="Monto inicial en Bs" required type="number" min="0" step="0.01" value={montoInicial} onChange={(event) => setMontoInicial(event.target.value)} placeholder="Monto inicial Bs" />
                    <Button type="submit" variant="success" loading={guardando} disabled={usuario?.demo}>Abrir caja</Button>
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
                        <form onSubmit={solicitarCierreCaja} className="mt-4 space-y-3">
                            <p className="text-sm text-slate-600">Saldo esperado: <b>{importe(panel.saldo_esperado)}</b></p>
                            {(Number(panel.pedidos_pendientes) > 0 || adicionales.length > 0) && <Alert type="warning">Resuelve los cobros pendientes antes de cerrar.</Alert>}
                            <Input label="Efectivo contado (Bs)" required type="number" min="0" step="0.01" value={montoContado} onChange={(event) => setMontoContado(event.target.value)} placeholder="Monto contado en caja" />
                            <p className="text-sm">Diferencia estimada: <b>{importe(Number(montoContado || 0) - Number(panel.saldo_esperado || 0))}</b></p>
                            <Textarea label="Observaciones del cierre (opcional)" value={observacionesCierre} onChange={(event) => setObservacionesCierre(event.target.value)} rows="2" />
                            <Button type="submit" loading={guardando} disabled={Number(panel.pedidos_pendientes) > 0 || adicionales.length > 0}>Revisar cierre de caja</Button>
                        </form>
                    )}
                </section>
            </div>
                </>
            )}
            {seccionActiva === "COBROS" && (
            <>
            <nav aria-label="Tareas de cobro" className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {[
                    ["NUEVO", "Nuevo pedido"],
                    ["PEDIDOS", "Pedidos y cobros"],
                    ["ADICIONALES", `Adicionales${adicionales.length ? ` · ${adicionales.length}` : ""}`],
                ].map(([vista, titulo]) => (
                    <button
                        key={vista}
                        type="button"
                        onClick={() => setVistaCobros(vista)}
                        aria-current={vistaCobros === vista ? "page" : undefined}
                        className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${vistaCobros === vista ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"}`}
                    >
                        {titulo}
                    </button>
                ))}
            </nav>
            <div className="grid gap-6">
                {vistaCobros === "NUEVO" && formularioNuevoPedido}
                {vistaCobros === "PEDIDOS" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div><h2 className="text-xl font-black">Pedidos y cobros</h2><p className="text-sm text-slate-500">Consulta saldo, pagos registrados y estado del pedido.</p></div>
                        <Input value={busquedaPedidos} onChange={(event) => setBusquedaPedidos(event.target.value)} placeholder="Buscar cliente o número de pedido" aria-label="Buscar pedidos por cliente o número" className="sm:max-w-xs" />
                    </div>
                    <div className="mt-4 space-y-3">
                        {pedidosFiltrados.map((pedido) => (
                            <Card key={pedido.id_pedido} className="border-slate-200">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-black text-slate-900">Pedido #{pedido.id_pedido} · {pedido.cliente}</p>
                                        <p className="mt-1 text-xs text-slate-500">{new Date(pedido.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    <Badge variant={pedido.estado === "ENTREGADO" ? "success" : pedido.estado === "PENDIENTE" ? "warning" : "info"}>
                                        {estadoBonito(pedido.estado)}
                                    </Badge>
                                </div>
                                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                                    {pedido.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}
                                </ul>
                                {pedido.observaciones && <p className="mt-2 text-xs text-slate-500">Nota cocina: {pedido.observaciones}</p>}
                                <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                                    <p>Total: <strong>{importe(pedido.total)}</strong></p>
                                    <p>Pagos confirmados: <strong>{importe(pedido.pagado_total)}</strong></p>
                                    <p>Saldo pendiente: <strong className={Number(pedido.saldo_pendiente) > 0 ? "text-rose-700" : "text-emerald-700"}>{importe(pedido.saldo_pendiente)}</strong></p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {Number(pedido.saldo_pendiente) > 0 && <Button size="sm" variant="success" onClick={() => abrirCobroPedido(pedido)}>Cobrar saldo</Button>}
                                    {pedido.pagado && <Button size="sm" onClick={() => imprimir(pedido)}>Imprimir comanda</Button>}
                                    {pedido.estado === "PENDIENTE" && !pedido.pagado && <Button size="sm" variant="outline" disabled={guardando} onClick={() => setPedidoParaCancelar(pedido)}>Cancelar pedido</Button>}
                                    {pedido.estado === "EN_PREPARACION" && <Button size="sm" variant="warning" loading={guardando} onClick={() => actualizarEstadoPedido(pedido, "LISTO")}>Marcar listo</Button>}
                                    {pedido.estado === "LISTO" && <Button size="sm" variant="success" loading={guardando} onClick={() => actualizarEstadoPedido(pedido, "ENTREGADO")}>Marcar entregado</Button>}
                                </div>
                            </Card>
                        ))}
                        {!pedidosFiltrados.length && <p className="py-8 text-center text-sm text-slate-500">No hay pedidos que coincidan.</p>}
                    </div>
                </section>}
            </div>
            {vistaCobros === "ADICIONALES" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black">Solicitudes adicionales por cobrar</h2>
                <p className="mt-1 text-sm text-slate-500">Cobros adicionales solicitados por los meseros.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {adicionales.map((solicitud) => <Card key={solicitud.id_solicitud} className="border-slate-200"><div className="flex flex-wrap justify-between gap-2"><b>Pedido #{solicitud.id_pedido} · {solicitud.cliente}</b><b>{importe(solicitud.total)}</b></div><ul className="my-3 space-y-1 text-sm text-slate-600">{solicitud.detalle.map((item, index) => <li key={`${item.id_producto}-${index}`}>{item.cantidad} × {item.nombre}</li>)}</ul>{solicitud.observaciones && <p className="mb-3 text-xs text-slate-500">Nota de cocina: {solicitud.observaciones}</p>}<Button size="sm" variant="warning" onClick={() => abrirCobroAdicional(solicitud)}>Cobrar adicional</Button></Card>)}
                    {!adicionales.length && <p className="py-4 text-sm text-slate-500">No hay cobros adicionales pendientes.</p>}
                </div>
                {ultimaComandaAdicional && <button onClick={() => imprimir(ultimaComandaAdicional)} className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Imprimir última comanda adicional</button>}
            </section>}
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
                            {pagos.map((pago) => <div key={pago.id_pago} className="flex flex-wrap items-center justify-between gap-3 border-t py-2 text-sm"><span>Pago #{pago.id_pago} · Pedido #{pago.id_pedido} · {pago.metodo} · {new Date(pago.fecha).toLocaleString("es")} · {pago.estado}{pago.motivo_anulacion && <small className="block text-slate-500">Motivo: {pago.motivo_anulacion}</small>}</span><span className="flex items-center gap-3"><b>{importe(pago.monto)}</b>{panel.estado_caja === "ABIERTA" && pago.estado === "CONFIRMADO" && pago.estado_pedido !== "ENTREGADO" && <Button type="button" size="sm" variant="outline" disabled={guardando} onClick={() => abrirAnulacion(pago)}>Anular</Button>}</span></div>)}
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
            <Modal
                open={Boolean(pedidoCobro || solicitudCobro)}
                title={solicitudCobro ? "Cobro adicional" : "Cobro de pedido"}
                onClose={() => {
                    if (guardando) return;
                    setPedidoCobro(null);
                    setSolicitudCobro(null);
                    setMontoPago("");
                    setRecibido("");
                }}
            >
                <form onSubmit={confirmarPago} className="space-y-4">
                    <div>
                        <p className="text-2xl font-black text-slate-900">
                            #{pedidoCobro?.id_pedido || solicitudCobro?.id_pedido} · {pedidoCobro?.cliente || solicitudCobro?.cliente}
                        </p>
                        {!solicitudCobro && pedidoCobro && (
                            <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                                <p>Total: <strong>{importe(pedidoCobro.total)}</strong></p>
                                <p>Pagos confirmados: <strong>{importe(pedidoCobro.pagado_total)}</strong></p>
                                <p>Saldo pendiente: <strong>{importe(pedidoCobro.saldo_pendiente)}</strong></p>
                            </div>
                        )}
                        {solicitudCobro && <p className="mt-2 text-sm text-slate-600">Importe adicional solicitado: <strong>{importe(solicitudCobro.total)}</strong></p>}
                    </div>
                    {!solicitudCobro && pedidoCobro && (
                        <section aria-label="Pagos del pedido">
                            <h3 className="text-sm font-bold text-slate-800">Pagos registrados</h3>
                            <ul className="mt-2 space-y-2 text-sm text-slate-600">
                                {pagosPedidoActual.map((pago) => (
                                    <li key={pago.id_pago} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                                        <span>#{pago.id_pago} · {pago.metodo} · {pago.estado}</span>
                                        <strong>{importe(pago.monto)}</strong>
                                    </li>
                                ))}
                                {!pagosPedidoActual.length && <li className="text-slate-500">Todavía no hay pagos registrados.</li>}
                            </ul>
                        </section>
                    )}
                    <p className="rounded-xl bg-[#FFF8F2] p-3 text-sm text-slate-800">
                        Saldo pendiente: <strong>{importe(totalCobroActual)}</strong>
                    </p>
                    {!solicitudCobro && (
                        <Input
                            label="Abono a aplicar (Bs)"
                            required
                            type="number"
                            min="0.01"
                            max={totalCobroActual}
                            step="0.01"
                            value={montoPago}
                            onChange={(event) => {
                                const value = event.target.value;
                                setMontoPago(value);
                                if (Number(recibido) < Number(value)) setRecibido(value);
                            }}
                        />
                    )}
                    <Select label="Método de pago" value={metodo} onChange={(event) => setMetodo(event.target.value)}>
                        {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"].map((opcion) => <option key={opcion}>{opcion}</option>)}
                    </Select>
                    {metodo === "EFECTIVO" && (
                        <>
                            <Input
                                label="Efectivo recibido (Bs)"
                                autoFocus
                                required
                                type="number"
                                min={montoCobroActual}
                                step="0.01"
                                value={recibido}
                                onChange={(event) => setRecibido(event.target.value)}
                            />
                            <p className="text-sm">Cambio: <strong>{importe(cambio)}</strong></p>
                        </>
                    )}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" disabled={guardando} onClick={() => { setPedidoCobro(null); setSolicitudCobro(null); setMontoPago(""); setRecibido(""); }}>Cancelar</Button>
                        <Button type="submit" variant="success" loading={guardando}>Confirmar pago</Button>
                    </div>
                </form>
            </Modal>
            <ConfirmModal
                open={confirmarCierre}
                title="Confirmar cierre de caja"
                message={`El cierre registrará ${importe(montoContado)} como efectivo contado. El efectivo esperado es ${importe(panel.saldo_esperado)} y la diferencia estimada es ${importe(Number(montoContado || 0) - Number(panel.saldo_esperado || 0))}. Esta acción cierra el turno diario de Caja.`}
                confirmText="Confirmar cierre"
                onCancel={() => { if (!guardando) setConfirmarCierre(false); }}
                onConfirm={cerrarCaja}
                loading={guardando}
            />
            <ConfirmModal
                open={Boolean(pedidoParaCancelar)}
                title="Confirmar cancelación de pedido"
                message={pedidoParaCancelar
                    ? `El pedido #${pedidoParaCancelar.id_pedido} de ${pedidoParaCancelar.cliente} se marcará como CANCELADO. La API aplicará las validaciones vigentes antes de cambiar su estado.`
                    : ""}
                confirmText="Cancelar pedido"
                onCancel={() => { if (!guardando) setPedidoParaCancelar(null); }}
                onConfirm={async () => {
                    if (await actualizarEstadoPedido(pedidoParaCancelar, "CANCELADO")) setPedidoParaCancelar(null);
                }}
                loading={guardando}
            />
            <ConfirmModal
                open={Boolean(pagoAnular)}
                title="Anular pago"
                confirmText="Anular pago"
                message={
                    <div className="space-y-3">
                        <p>El pago confirmado de {pagoAnular ? importe(pagoAnular.monto) : ""} dejará de contar para el saldo del pedido. Esta acción quedará registrada y requiere un motivo.</p>
                        <Textarea
                            label="Motivo de anulación"
                            required
                            value={motivoAnulacion}
                            onChange={(event) => setMotivoAnulacion(event.target.value)}
                            rows="3"
                        />
                    </div>
                }
                onCancel={() => { if (!guardando) setPagoAnular(null); }}
                onConfirm={anularPago}
                loading={guardando}
            />
        </div>
    );
}

export default Caja;
