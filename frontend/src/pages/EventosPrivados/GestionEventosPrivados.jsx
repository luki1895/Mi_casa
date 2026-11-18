import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]));
const uuid = () => window.crypto.randomUUID();

function GestionEventosPrivados() {
    const { usuario } = useAuth();
    const [eventos, setEventos] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [horarios, setHorarios] = useState([]);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [filtro, setFiltro] = useState("PENDIENTE_REVISION");
    const [accion, setAccion] = useState("APROBAR");
    const [cotizacion, setCotizacion] = useState({ detalle: [], costos_adicionales: 0, anticipo_requerido: 0, observaciones: "" });

    const cargarEventos = useCallback(async () => {
        setError("");
        try {
            const { data } = await api.get("/eventos-privados", { params: filtro ? { estado: filtro } : {} });
            setEventos(data.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudieron cargar los eventos.");
        }
    }, [filtro]);

    const cargarSeleccionado = useCallback(async (id) => {
        if (!id) return;
        try {
            const { data } = await api.get(`/eventos-privados/${id}`);
            setSeleccionado(data.data);
            setCotizacion({
                detalle: data.data.detalle.map((item) => ({
                    id_producto: item.id_producto,
                    preparacion: item.preparacion,
                    cantidad_personas: item.cantidad_personas,
                    precio_unitario: item.precio_unitario,
                    es_adicional: item.es_adicional,
                })),
                costos_adicionales: data.data.costos_adicionales || 0,
                anticipo_requerido: data.data.anticipo_requerido || 0,
                observaciones: data.data.condiciones_cancelacion || "",
            });
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo consultar el evento.");
        }
    }, []);

    useEffect(() => { Promise.resolve().then(cargarEventos); }, [cargarEventos]);
    useEffect(() => {
        if (usuario?.role === "admin") {
            api.get("/eventos-privados/horarios")
                .then(({ data }) => setHorarios(data.data || []))
                .catch((requestError) => setError(requestError.response?.data?.mensaje || "No se pudieron cargar los horarios."));
        }
    }, [usuario]);

    const guardarRevision = async (event) => {
        event.preventDefault();
        if (!seleccionado) return;
        setGuardando(true); setError(""); setAviso("");
        try {
            const { data } = await api.patch(`/eventos-privados/${seleccionado.id_evento}/revision`, {
                ...cotizacion,
                accion,
                costos_adicionales: Number(cotizacion.costos_adicionales),
                anticipo_requerido: Number(cotizacion.anticipo_requerido),
                detalle: cotizacion.detalle.map((item) => ({
                    ...item,
                    cantidad_personas: Number(item.cantidad_personas),
                    precio_unitario: Number(item.precio_unitario),
                })),
            });
            setSeleccionado(data.data);
            setAviso("Decisión y presupuesto guardados en el historial.");
            await cargarEventos();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo guardar la revisión.");
        } finally { setGuardando(false); }
    };

    const verificarPago = async (pago, aprobado) => {
        if (aprobado && !window.confirm("¿Confirmaste el pago con el medio correspondiente?")) return;
        setGuardando(true); setError(""); setAviso("");
        try {
            await api.post(`/eventos-privados/pagos/${pago.id_pago_evento}/verificar`, { aprobado });
            await Promise.all([cargarEventos(), cargarSeleccionado(seleccionado.id_evento)]);
            setAviso(aprobado ? "Pago verificado." : "Pago rechazado; la decisión quedó auditada.");
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo revisar el pago.");
        } finally { setGuardando(false); }
    };

    const imprimir = async (tipo = "COMANDA", reimpresion = false) => {
        if (!seleccionado) return;
        const ventana = window.open("", "_blank");
        if (!ventana) {
            setError("Permite ventanas emergentes para imprimir la comanda.");
            return;
        }
        try {
            const { data } = await api.post(`/eventos-privados/${seleccionado.id_evento}/impresiones`, {
                tipo,
                reimpresion,
                solicitud_id: uuid(),
            });
            const evento = data.data.evento;
            const detalle = data.data.detalle.map((item) => `<li>${escaparHtml(item.cantidad_personas)} × ${escaparHtml(item.preparacion)}</li>`).join("");
            ventana.document.write(`<!doctype html><html><head><title>Comanda ${escaparHtml(evento.codigo)}</title><style>body{font:16px sans-serif;padding:24px}h1{font-size:22px}li{margin:8px 0}</style></head><body><h1>Evento ${escaparHtml(evento.codigo)}</h1><p>${escaparHtml(evento.fecha)} · ${escaparHtml(evento.hora_inicio)}–${escaparHtml(evento.hora_fin)}</p><p>Responsable: ${escaparHtml(evento.nombre_responsable)} · Invitados: ${escaparHtml(evento.invitados)}</p><ul>${detalle}</ul><p>${escaparHtml(evento.observaciones || "")}</p></body></html>`);
            ventana.document.close();
            window.setTimeout(() => {
                if (!ventana.closed) {
                    ventana.focus();
                    ventana.print();
                }
            }, 50);
            setAviso("Comanda generada. El resultado depende del diálogo de impresión del navegador.");
        } catch (requestError) {
            ventana.close();
            setError(requestError.response?.data?.mensaje || "No se pudo generar la comanda.");
        }
    };

    const guardarHorarios = async () => {
        setGuardando(true); setError(""); setAviso("");
        try {
            const { data } = await api.put("/eventos-privados/horarios", { horarios });
            setHorarios(data.data || []);
            setAviso("Horarios disponibles actualizados.");
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudieron guardar los horarios.");
        } finally { setGuardando(false); }
    };

    const agregarHorario = () => setHorarios((actuales) => [...actuales, {
        id_horario: `nuevo-${Date.now()}`, dia_semana: "", hora_inicio: "", hora_fin: "", activo: true,
    }]);

    return (
        <main className="space-y-6 p-4 sm:p-6">
            <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Administración y Caja</p><h1 className="text-3xl font-black">Eventos privados</h1></header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {aviso && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{aviso}</p>}
            {usuario?.role === "admin" && <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Horarios habilitados</h2><p className="text-sm text-slate-500">Configura los días y rangos reales de atención para eventos.</p></div><button type="button" onClick={agregarHorario} className="rounded-lg border px-3 py-2 text-sm font-bold">Agregar horario</button></div>
                <div className="mt-4 space-y-3">{horarios.map((horario, index) => <div key={horario.id_horario} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                    <select aria-label="Día de atención" value={horario.dia_semana} onChange={(event) => setHorarios((actuales) => actuales.map((item, pos) => pos === index ? { ...item, dia_semana: event.target.value === "" ? "" : Number(event.target.value) } : item))} className="rounded-lg border p-2"><option value="">Selecciona un día</option>{dias.map((dia, value) => <option key={dia} value={value}>{dia}</option>)}</select>
                    <input aria-label="Hora inicial" type="time" value={String(horario.hora_inicio).slice(0, 5)} onChange={(event) => setHorarios((actuales) => actuales.map((item, pos) => pos === index ? { ...item, hora_inicio: event.target.value } : item))} className="rounded-lg border p-2" />
                    <input aria-label="Hora final" type="time" value={String(horario.hora_fin).slice(0, 5)} onChange={(event) => setHorarios((actuales) => actuales.map((item, pos) => pos === index ? { ...item, hora_fin: event.target.value } : item))} className="rounded-lg border p-2" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={horario.activo} onChange={(event) => setHorarios((actuales) => actuales.map((item, pos) => pos === index ? { ...item, activo: event.target.checked } : item))} />Activo</label>
                    <button type="button" onClick={() => setHorarios((actuales) => actuales.filter((_, pos) => pos !== index))} className="rounded-lg border px-3 text-rose-700">Quitar</button>
                </div>)}</div>
                <button type="button" disabled={guardando} onClick={guardarHorarios} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Guardar horarios</button>
            </section>}
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Solicitudes</h2><select value={filtro} onChange={(event) => setFiltro(event.target.value)} className="rounded-lg border p-2 text-sm"><option value="">Todas</option>{["PENDIENTE_REVISION", "REQUIERE_CAMBIOS", "APROBADO_PENDIENTE_ANTICIPO", "CONFIRMADO", "RECHAZADO", "CANCELADO", "REALIZADO"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
                    <div className="mt-4 space-y-2">{eventos.map((item) => <button key={item.id_evento} type="button" onClick={() => cargarSeleccionado(item.id_evento)} className={`w-full rounded-xl border p-3 text-left ${seleccionado?.id_evento === item.id_evento ? "border-amber-500 bg-amber-50" : "border-slate-100"}`}>
                        <span className="flex justify-between gap-2 font-bold"><span>{item.codigo} · {item.nombre_responsable}</span><span>{item.estado.replaceAll("_", " ")}</span></span>
                        <span className="mt-1 block text-xs text-slate-500">{item.fecha} · {String(item.hora_inicio).slice(0, 5)} · {item.invitados} invitados</span>
                    </button>)}{!eventos.length && <p className="py-5 text-sm text-slate-500">No hay eventos para este filtro.</p>}</div>
                </section>
                {seleccionado && <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                    <div><h2 className="text-xl font-black">{seleccionado.codigo} · {seleccionado.nombre_responsable}</h2><p className="text-sm text-slate-500">{seleccionado.tipo_evento} · {seleccionado.celular} · {seleccionado.correo || "Sin correo"}</p><p className="text-sm text-slate-500">{seleccionado.fecha} · {String(seleccionado.hora_inicio).slice(0, 5)}–{String(seleccionado.hora_fin).slice(0, 5)} · {seleccionado.invitados} invitados · decoración: {seleccionado.decoracion}</p><p className="mt-1 text-sm">{seleccionado.observaciones}</p></div>
                    {usuario?.role === "admin" && ["PENDIENTE_REVISION", "REQUIERE_CAMBIOS"].includes(seleccionado.estado) && <form onSubmit={guardarRevision} className="space-y-3 rounded-xl border p-4">
                        <h3 className="font-black">Revisión y presupuesto</h3>
                        {cotizacion.detalle.map((item, index) => <div key={`${item.id_detalle || index}`} className="grid gap-2 sm:grid-cols-[1fr_90px_120px]">
                            <input aria-label="Preparación presupuestada" value={item.preparacion} onChange={(event) => setCotizacion({ ...cotizacion, detalle: cotizacion.detalle.map((actual, pos) => pos === index ? { ...actual, preparacion: event.target.value } : actual) })} className="rounded-lg border p-2" />
                            <input aria-label="Cantidad de personas" type="number" min="1" value={item.cantidad_personas} onChange={(event) => setCotizacion({ ...cotizacion, detalle: cotizacion.detalle.map((actual, pos) => pos === index ? { ...actual, cantidad_personas: event.target.value } : actual) })} className="rounded-lg border p-2" />
                            <input aria-label="Precio unitario" type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(event) => setCotizacion({ ...cotizacion, detalle: cotizacion.detalle.map((actual, pos) => pos === index ? { ...actual, precio_unitario: event.target.value } : actual) })} className="rounded-lg border p-2" />
                        </div>)}
                        <button type="button" onClick={() => setCotizacion({ ...cotizacion, detalle: [...cotizacion.detalle, { preparacion: "", cantidad_personas: 1, precio_unitario: 0 }] })} className="rounded-lg border px-3 py-2 text-sm font-bold">Agregar preparación</button>
                        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Costos adicionales<input type="number" min="0" step="0.01" value={cotizacion.costos_adicionales} onChange={(event) => setCotizacion({ ...cotizacion, costos_adicionales: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-sm font-semibold">Anticipo requerido<input type="number" min="0" step="0.01" value={cotizacion.anticipo_requerido} onChange={(event) => setCotizacion({ ...cotizacion, anticipo_requerido: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label></div>
                        <label className="block text-sm font-semibold">Condiciones de cancelación o comentario<textarea rows="2" value={cotizacion.observaciones} onChange={(event) => setCotizacion({ ...cotizacion, observaciones: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <div className="flex flex-wrap gap-2"><select value={accion} onChange={(event) => setAccion(event.target.value)} className="rounded-lg border p-2"><option value="APROBAR">Aprobar propuesta</option><option value="SOLICITAR_CAMBIOS">Solicitar cambios</option><option value="RECHAZAR">Rechazar solicitud</option></select><button disabled={guardando} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Guardar decisión</button></div>
                    </form>}
                    <section><h3 className="font-black">Pagos</h3><div className="mt-2 space-y-2">{seleccionado.pagos.map((pago) => <article key={pago.id_pago_evento} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>Bs {Number(pago.importe).toFixed(2)} · {pago.metodo} · {pago.estado}{pago.referencia && ` · ${pago.referencia}`}</span>{pago.estado === "PENDIENTE" && <div className="flex gap-2"><button disabled={guardando} onClick={() => verificarPago(pago, true)} className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Verificar</button><button disabled={guardando} onClick={() => verificarPago(pago, false)} className="rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-700">Rechazar</button></div>}</article>)}{!seleccionado.pagos.length && <p className="text-sm text-slate-500">No hay pagos registrados.</p>}</div></section>
                    {seleccionado.estado === "CONFIRMADO" && <button type="button" disabled={guardando} onClick={() => imprimir()} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white">Imprimir comanda</button>}
                    <section><h3 className="font-black">Historial</h3><ol className="mt-2 space-y-2">{seleccionado.historial.map((item) => <li key={item.id_historial} className="rounded-lg bg-slate-50 p-3 text-sm">{item.accion} · {item.estado_anterior || "—"} → {item.estado_nuevo || "—"} · {new Date(item.fecha).toLocaleString("es-BO")}</li>)}</ol></section>
                </section>}
            </div>
        </main>
    );
}

export default GestionEventosPrivados;
