import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const fechaLaPaz = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/La_Paz",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
};
const uuid = () => window.crypto.randomUUID();
const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]));

function GestionReservasPlatos() {
    const [reservas, setReservas] = useState([]);
    const [atenciones, setAtenciones] = useState([]);
    const [fecha, setFecha] = useState(fechaLaPaz());
    const [estado, setEstado] = useState("PENDIENTE");
    const [seleccionId, setSeleccionId] = useState(null);
    const [atencionId, setAtencionId] = useState("");
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const seleccionada = reservas.find((item) => String(item.id_reserva) === String(seleccionId)) || null;

    const cargar = useCallback(async () => {
        setError("");
        try {
            const [reservasResponse, atencionesResponse] = await Promise.all([
                api.get("/reservas-platos", { params: { fecha, estado: estado || undefined } }),
                api.get("/atenciones-mesa"),
            ]);
            const items = reservasResponse.data.data || [];
            setReservas(items);
            setAtenciones(atencionesResponse.data.data || []);
        } catch (requestError) {
            if (requestError.response?.status === 503) {
                setError(requestError.response?.data?.mensaje || "Las reservas requieren aplicar la migración local preparada.");
            } else {
                setError(requestError.response?.data?.mensaje || "No se pudieron cargar las reservas y atenciones.");
            }
        }
    }, [fecha, estado]);

    useEffect(() => { Promise.resolve().then(cargar); }, [cargar]);

    const recibir = async () => {
        if (!seleccionada || !window.confirm("¿Confirmar la llegada y crear un pedido con estos platos?")) return;
        setGuardando(true); setError(""); setAviso("");
        try {
            const { data } = await api.post(`/reservas-platos/${seleccionada.id_reserva}/recibir`, {
                id_atencion: atencionId ? Number(atencionId) : null,
            });
            setAviso(`Reserva recibida. Pedido #${data.data.id_pedido} creado en el flujo normal de Caja y cocina.`);
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo recibir la reserva.");
        } finally { setGuardando(false); }
    };

    const noPresentada = async () => {
        if (!seleccionada || !window.confirm("Confirma manualmente que venció la tolerancia y el cliente no se presentó. Se liberarán las unidades.")) return;
        setGuardando(true); setError(""); setAviso("");
        try {
            await api.post(`/reservas-platos/${seleccionada.id_reserva}/no-presentada`);
            setAviso("Inasistencia confirmada; las unidades se liberaron y el movimiento quedó auditado.");
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo confirmar la inasistencia.");
        } finally { setGuardando(false); }
    };

    const imprimir = async (reimpresion = false) => {
        if (!seleccionada) return;
        const ventana = window.open("", "_blank");
        if (!ventana) {
            setError("Permite ventanas emergentes para imprimir el aviso de reserva.");
            return;
        }
        try {
            const { data } = await api.post(`/reservas-platos/${seleccionada.id_reserva}/impresiones`, {
                tipo: reimpresion ? "REIMPRESION" : "NOVEDAD",
                reimpresion,
                solicitud_id: uuid(),
            });
            const reserva = data.data;
            const items = reserva.detalle.map((item) => `<li>${escaparHtml(item.cantidad)} × ${escaparHtml(item.nombre_producto)}</li>`).join("");
            ventana.document.write(`<!doctype html><html><head><title>Reserva ${escaparHtml(reserva.codigo)}</title><style>body{font:16px sans-serif;padding:24px}h1{font-size:22px}li{margin:8px 0}.nota{font-weight:bold;border:2px solid;padding:12px}</style></head><body><h1>Reserva ${escaparHtml(reserva.codigo)}</h1><p>${escaparHtml(reserva.fecha)} · ${escaparHtml(reserva.hora)}</p><p>Cliente: ${escaparHtml(reserva.nombre_cliente)} · ${escaparHtml(reserva.celular)}</p><div class="nota">AVISO DE RESERVA: no preparar ni registrar venta hasta confirmar la llegada del cliente.</div><ul>${items}</ul><p>${escaparHtml(reserva.observaciones || "")}</p></body></html>`);
            ventana.document.close();
            window.setTimeout(() => {
                if (!ventana.closed) {
                    ventana.focus();
                    ventana.print();
                }
            }, 50);
            setAviso("Aviso de reserva generado; la impresión física depende del navegador.");
        } catch (requestError) {
            ventana.close();
            setError(requestError.response?.data?.mensaje || "No se pudo generar el aviso.");
        }
    };

    return (
        <main className="space-y-6 p-4 sm:p-6">
            <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Caja</p><h1 className="text-3xl font-black">Reservas de platos</h1><p className="text-sm text-slate-500">Recibir crea un pedido normal; la inasistencia solo libera stock tras confirmación manual.</p></header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {aviso && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{aviso}</p>}
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold">Fecha<input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
                        <label className="text-sm font-semibold">Estado<select value={estado} onChange={(event) => setEstado(event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">Todos</option>{["PENDIENTE", "RECIBIDA", "EN_PREPARACION", "ATENDIDA", "CANCELADA", "NO_PRESENTADA"].map((item) => <option key={item}>{item}</option>)}</select></label>
                    </div>
                    <div className="mt-4 space-y-2">{reservas.map((reserva) => <button key={reserva.id_reserva} type="button" onClick={() => { setSeleccionId(reserva.id_reserva); setAtencionId(""); }} className={`w-full rounded-xl border p-3 text-left ${String(seleccionId) === String(reserva.id_reserva) ? "border-amber-500 bg-amber-50" : "border-slate-100"}`}>
                        <span className="flex justify-between gap-2 font-bold"><span>{reserva.codigo} · {reserva.nombre_cliente}</span><span>{reserva.estado}</span></span>
                        <span className="mt-1 block text-xs text-slate-500">{String(reserva.hora).slice(0, 5)} · {reserva.celular} · {reserva.detalle.reduce((sum, item) => sum + Number(item.cantidad), 0)} platos</span>
                        {reserva.requiere_revision_inasistencia && <span className="mt-1 block text-xs font-bold text-rose-700">Requiere decisión manual de inasistencia</span>}
                    </button>)}{!reservas.length && <p className="py-6 text-center text-sm text-slate-500">No hay reservas con estos filtros.</p>}</div>
                </section>
                {seleccionada && <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                    <div><h2 className="text-xl font-black">{seleccionada.codigo} · {seleccionada.nombre_cliente}</h2><p className="text-sm text-slate-500">{seleccionada.fecha} · {String(seleccionada.hora).slice(0, 5)} · {seleccionada.celular} · {seleccionada.correo || "Sin correo"}</p><p className="mt-1 text-sm">Estado: <strong>{seleccionada.estado}</strong> · Revisión {seleccionada.version}</p>{seleccionada.observaciones && <p className="mt-2 text-sm">Observaciones: {seleccionada.observaciones}</p>}</div>
                    <ul className="space-y-2">{seleccionada.detalle.map((item) => <li key={item.id_producto} className="rounded-lg bg-slate-50 p-3 text-sm">{item.cantidad} × {item.nombre} · Bs {Number(item.precio).toFixed(2)}</li>)}</ul>
                    {seleccionada.estado === "PENDIENTE" && !seleccionada.id_pedido && <div className="space-y-3 rounded-xl border p-4">
                        <label className="block text-sm font-semibold">Asociar al servicio de mesa (opcional)
                            <select value={atencionId} onChange={(event) => setAtencionId(event.target.value)} className="mt-1 w-full rounded-lg border p-3">
                                <option value="">Sin mesa / pedido para llevar</option>
                                {atenciones.map((atencion) => <option key={atencion.id_atencion} value={atencion.id_atencion}>Mesa {atencion.mesa} · atención #{atencion.id_atencion}</option>)}
                            </select>
                        </label>
                        <button disabled={guardando} onClick={recibir} className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">Confirmar llegada y crear pedido</button>
                    </div>}
                    {seleccionada.id_pedido && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Pedido #{seleccionada.id_pedido} · <Link to="/caja" className="font-bold underline">Ir a Caja</Link></p>}
                    {seleccionada.requiere_revision_inasistencia && <button disabled={guardando} onClick={noPresentada} className="rounded-lg border border-rose-300 px-4 py-2 font-bold text-rose-700 disabled:opacity-50">Confirmar no presentación y liberar stock</button>}
                    <div className="flex flex-wrap gap-2"><button disabled={guardando} onClick={() => imprimir()} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Imprimir aviso</button><button disabled={guardando} onClick={() => imprimir(true)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">Reimprimir aviso</button></div>
                    <section><h3 className="font-black">Historial</h3><ol className="mt-2 space-y-2">{seleccionada.historial.map((item, index) => <li key={`${item.accion}-${item.fecha}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">{item.accion} · {item.estado_anterior || "—"} → {item.estado_nuevo} · {new Date(item.fecha).toLocaleString("es-BO")} {item.usuario && `· ${item.usuario}`}</li>)}</ol></section>
                    <section><h3 className="font-black">Revisiones</h3><ol className="mt-2 space-y-2">{seleccionada.revisiones.map((item) => <li key={item.version} className="rounded-lg bg-slate-50 p-3 text-sm">Versión {item.version} · {item.accion} · {new Date(item.fecha).toLocaleString("es-BO")}</li>)}</ol></section>
                </section>}
            </div>
        </main>
    );
}

export default GestionReservasPlatos;
