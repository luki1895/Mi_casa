import { useEffect, useState } from "react";
import api from "../../api/axios";

const mananaLaPaz = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/La_Paz",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const manana = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1));
    return manana.toISOString().slice(0, 10);
};
const nuevaSolicitud = () => window.crypto.randomUUID();
const nuevoToken = () => `${window.crypto.randomUUID()}${window.crypto.randomUUID()}`;
const respuestaInicial = (evento) => ({
    nombre_responsable: evento.nombre_responsable || "",
    celular: evento.celular || "",
    correo: evento.correo || "",
    tipo_evento: evento.tipo_evento || "",
    fecha: String(evento.fecha || "").slice(0, 10),
    hora_inicio: String(evento.hora_inicio || "").slice(0, 5),
    hora_fin: String(evento.hora_fin || "").slice(0, 5),
    invitados: evento.invitados || "",
    decoracion: evento.decoracion || "CONSULTAR",
    observaciones: evento.observaciones || "",
    detalle: (evento.detalle || []).map((item) => ({
        preparacion: item.preparacion,
        cantidad_personas: item.cantidad_personas,
    })),
});
const accesoInicial = () => {
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const codigo = fragmento.get("codigo");
    const token = fragmento.get("token");
    return codigo && token ? { codigo, token } : null;
};

function EventosPrivados() {
    const [horarios, setHorarios] = useState([]);
    const [evento, setEvento] = useState(null);
    const [acceso] = useState(accesoInicial);
    const [resultado, setResultado] = useState(null);
    const [respuesta, setRespuesta] = useState(null);
    const [solicitudRespuesta, setSolicitudRespuesta] = useState(nuevaSolicitud);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [pago, setPago] = useState({ importe: "", metodo: "TRANSFERENCIA", referencia: "" });
    const [solicitudPago, setSolicitudPago] = useState(nuevaSolicitud);
    const [solicitudEvento, setSolicitudEvento] = useState(nuevaSolicitud);
    const [tokenEvento, setTokenEvento] = useState(nuevoToken);
    const [form, setForm] = useState({
        nombre_responsable: "",
        celular: "",
        correo: "",
        tipo_evento: "",
        fecha: mananaLaPaz(),
        hora_inicio: "",
        hora_fin: "",
        invitados: "",
        decoracion: "CONSULTAR",
        observaciones: "",
        detalle: [{ preparacion: "", cantidad_personas: "" }],
    });

    const cargarEvento = async (credencial) => {
        const { data } = await api.get(`/eventos-privados/acceso/${encodeURIComponent(credencial.codigo)}`, {
            headers: { "x-event-token": credencial.token },
        });
        setEvento(data.data);
        setRespuesta(respuestaInicial(data.data));
        setSolicitudRespuesta(nuevaSolicitud());
    };

    useEffect(() => {
        let cancelado = false;
        api.get("/eventos-privados/horarios")
            .then(({ data }) => {
                if (!cancelado) setHorarios(data.data || []);
            })
            .catch((requestError) => {
                if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudieron consultar los horarios aprobados.");
            });
        const credencial = accesoInicial();
        if (credencial) {
            Promise.resolve().then(() => cargarEvento(credencial))
                .catch((requestError) => {
                    if (!cancelado) setError(requestError.response?.data?.mensaje || "El enlace privado no es válido.");
                });
        }
        return () => { cancelado = true; };
    }, []);

    const enviarSolicitud = async (eventForm) => {
        eventForm.preventDefault();
        setError("");
        setGuardando(true);
        try {
            const { data } = await api.post("/eventos-privados", {
                ...form,
                solicitud_id: solicitudEvento,
                access_token: tokenEvento,
            });
            setResultado(data.data);
            setSolicitudEvento(nuevaSolicitud());
            setTokenEvento(nuevoToken());
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo enviar la solicitud.");
        } finally {
            setGuardando(false);
        }
    };

    const registrarPago = async (eventForm) => {
        eventForm.preventDefault();
        if (!acceso) return;
        setError("");
        setGuardando(true);
        try {
            await api.post(`/eventos-privados/acceso/${encodeURIComponent(acceso.codigo)}/pagos`, {
                ...pago,
                importe: Number(pago.importe),
                solicitud_id: solicitudPago,
            }, { headers: { "x-event-token": acceso.token } });
            setSolicitudPago(nuevaSolicitud());
            await cargarEvento(acceso);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo registrar el pago.");
        } finally {
            setGuardando(false);
        }
    };

    const responderSolicitud = async (eventForm) => {
        eventForm.preventDefault();
        if (!acceso || !respuesta) return;
        setError("");
        setGuardando(true);
        try {
            await api.patch(`/eventos-privados/acceso/${encodeURIComponent(acceso.codigo)}/responder`, {
                ...respuesta,
                invitados: Number(respuesta.invitados),
                solicitud_id: solicitudRespuesta,
            }, { headers: { "x-event-token": acceso.token } });
            await cargarEvento(acceso);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo reenviar la solicitud.");
        } finally {
            setGuardando(false);
        }
    };

    const cancelar = async () => {
        if (!acceso || !window.confirm("¿Cancelar esta solicitud de evento?")) return;
        setError("");
        setGuardando(true);
        try {
            await api.post(`/eventos-privados/acceso/${encodeURIComponent(acceso.codigo)}/cancelar`, {}, {
                headers: { "x-event-token": acceso.token },
            });
            await cargarEvento(acceso);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cancelar la solicitud.");
        } finally {
            setGuardando(false);
        }
    };

    const enlacePrivado = resultado?.acceso
        ? `${window.location.origin}/eventos-privados#codigo=${encodeURIComponent(resultado.acceso.codigo)}&token=${encodeURIComponent(resultado.acceso.token)}`
        : "";
    const horariosActivos = horarios.filter((horario) => horario.activo);
    const pagosRegistrados = evento
        ? evento.pagos.filter((item) => ["PENDIENTE", "VERIFICADO"].includes(item.estado)).reduce((sum, item) => sum + Number(item.importe), 0)
        : 0;
    const saldoAnticipo = evento?.estado === "CONFIRMADO"
        ? Math.max(Number(evento.total) - pagosRegistrados, 0)
        : Math.max(Number(evento?.anticipo_requerido || 0) - pagosRegistrados, 0);

    return (
        <main className="mx-auto min-h-screen max-w-4xl space-y-6 bg-slate-50 p-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Eventos privados</p>
                <h1 className="text-3xl font-black">Solicita una propuesta para tu evento</h1>
                <p className="mt-2 text-sm text-slate-600">La solicitud requiere revisión y aprobación administrativa. No se confirma hasta verificar el anticipo.</p>
            </header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {resultado && <section className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <p>Solicitud recibida. Guarda el enlace privado para consultar las revisiones y el presupuesto.</p>
                <p><strong>Código:</strong> {resultado.evento.codigo}</p>
                <a className="break-all font-semibold underline" href={enlacePrivado}>{enlacePrivado}</a>
            </section>}
            {evento && <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
                <div>
                    <h2 className="text-xl font-black">Solicitud {evento.codigo}</h2>
                    <p className="mt-1 text-sm text-slate-600">Estado: <strong>{evento.estado.replaceAll("_", " ")}</strong></p>
                    <p className="mt-1 text-sm text-slate-600">{evento.fecha} · {String(evento.hora_inicio).slice(0, 5)}–{String(evento.hora_fin).slice(0, 5)}</p>
                </div>
                <ul className="space-y-2">{evento.detalle.map((item, index) => <li key={`${item.preparacion}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                    {item.cantidad_personas} × {item.preparacion}
                    {Number(item.subtotal) > 0 && <span className="float-right font-semibold">Bs {Number(item.subtotal).toFixed(2)}</span>}
                </li>)}</ul>
                {evento.observaciones_admin && evento.estado === "REQUIERE_CAMBIOS" && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                    <h3 className="font-bold text-amber-950">Cambios solicitados por Administración</h3>
                    <p className="mt-1 whitespace-pre-wrap text-amber-900">{evento.observaciones_admin}</p>
                </div>}
                {Number(evento.total) > 0 && <div className="space-y-1 border-t pt-3 text-sm">
                    <p>Subtotal: <strong>Bs {Number(evento.subtotal).toFixed(2)}</strong></p>
                    <p>Costos adicionales: <strong>Bs {Number(evento.costos_adicionales).toFixed(2)}</strong></p>
                    <p>Total: <strong>Bs {Number(evento.total).toFixed(2)}</strong></p>
                    <p>Anticipo requerido: <strong>Bs {Number(evento.anticipo_requerido).toFixed(2)}</strong></p>
                    {evento.condiciones_cancelacion && <p>Condiciones: {evento.condiciones_cancelacion}</p>}
                </div>}
                {evento.propuestas?.length > 0 && <section className="space-y-3 border-t pt-4">
                    <h3 className="font-bold">Versiones de la solicitud y presupuestos</h3>
                    {evento.propuestas.map((version) => <article key={`${version.version}-${version.fecha}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-semibold">Versión {version.version} · {version.accion.replaceAll("_", " ")} · {new Date(version.fecha).toLocaleString("es-BO")}</p>
                        {version.observaciones_admin && <p className="mt-1 whitespace-pre-wrap">Observaciones: {version.observaciones_admin}</p>}
                        {version.propuesta && <div className="mt-2 space-y-1">
                            <p>Subtotal Bs {Number(version.propuesta.subtotal || 0).toFixed(2)} · adicionales Bs {Number(version.propuesta.costos_adicionales || 0).toFixed(2)} · total Bs {Number(version.propuesta.total || 0).toFixed(2)}</p>
                            <p>Anticipo solicitado: Bs {Number(version.propuesta.anticipo_requerido || 0).toFixed(2)}</p>
                            {version.propuesta.condiciones_cancelacion && <p>Condiciones acordadas: {version.propuesta.condiciones_cancelacion}</p>}
                            <ul className="mt-1">{(version.propuesta.detalle || []).map((item, index) => <li key={`${item.preparacion}-${index}`}>{item.cantidad_personas} × {item.preparacion} · Bs {Number(item.precio_unitario || 0).toFixed(2)} c/u</li>)}</ul>
                        </div>}
                    </article>)}
                </section>}
                {evento.pagos.length > 0 && <section><h3 className="font-bold">Pagos registrados</h3><ul className="mt-2 space-y-2">{evento.pagos.map((item, index) => <li key={`${item.registrado_en}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">Bs {Number(item.importe).toFixed(2)} · {item.metodo} · {item.estado}</li>)}</ul></section>}
                {["APROBADO_PENDIENTE_ANTICIPO", "CONFIRMADO"].includes(evento.estado) && saldoAnticipo > 0 && <form onSubmit={registrarPago} className="space-y-3 rounded-xl border p-4">
                    <h3 className="font-bold">{evento.estado === "CONFIRMADO" ? "Registrar pago pendiente" : "Registrar anticipo para verificación"}</h3>
                    <p className="text-sm text-slate-600">Importe pendiente de verificación: Bs {saldoAnticipo.toFixed(2)}</p>
                    <label className="block text-sm font-semibold">Importe<input required type="number" min="0.01" max={saldoAnticipo} step="0.01" value={pago.importe} onChange={(eventForm) => setPago({ ...pago, importe: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                    <label className="block text-sm font-semibold">Método<select value={pago.metodo} onChange={(eventForm) => setPago({ ...pago, metodo: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3">{["EFECTIVO", "TRANSFERENCIA", "TARJETA", "QR"].map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label className="block text-sm font-semibold">Referencia (opcional)<input maxLength="500" value={pago.referencia} onChange={(eventForm) => setPago({ ...pago, referencia: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                    <button disabled={guardando} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Enviar pago a verificación</button>
                </form>}
                {evento.cancelacion && <section className="rounded-xl border p-4 text-sm">
                    <h3 className="font-bold">Cancelación y devolución</h3>
                    <p className="mt-1">Estado: {evento.cancelacion.estado.replaceAll("_", " ")}</p>
                    <p>Motivo: {evento.cancelacion.motivo}</p>
                    <p>Recibido Bs {Number(evento.cancelacion.monto_recibido).toFixed(2)} · devuelto Bs {Number(evento.cancelacion.monto_devuelto).toFixed(2)} · retenido Bs {Number(evento.cancelacion.monto_retenido).toFixed(2)}</p>
                    {evento.cancelacion.referencia_devolucion && <p>Referencia: {evento.cancelacion.referencia_devolucion}</p>}
                </section>}
                {evento.estado === "REQUIERE_CAMBIOS" && respuesta && <form onSubmit={responderSolicitud} className="space-y-4 rounded-xl border border-amber-200 p-4">
                    <h3 className="font-bold">Actualizar y reenviar la solicitud</h3>
                    <p className="text-sm text-slate-600">Puedes corregir los datos solicitados. El presupuesto y el anticipo no se modifican desde este enlace; Administración volverá a cotizarlos.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold">Responsable<input required maxLength="180" value={respuesta.nombre_responsable} onChange={(eventForm) => setRespuesta({ ...respuesta, nombre_responsable: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Teléfono<input required maxLength="30" value={respuesta.celular} onChange={(eventForm) => setRespuesta({ ...respuesta, celular: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Correo<input type="email" maxLength="180" value={respuesta.correo} onChange={(eventForm) => setRespuesta({ ...respuesta, correo: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Tipo de evento<input required maxLength="100" value={respuesta.tipo_evento} onChange={(eventForm) => setRespuesta({ ...respuesta, tipo_evento: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Fecha<input required type="date" min={mananaLaPaz()} value={respuesta.fecha} onChange={(eventForm) => setRespuesta({ ...respuesta, fecha: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Invitados<input required type="number" min="1" step="1" value={respuesta.invitados} onChange={(eventForm) => setRespuesta({ ...respuesta, invitados: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Hora de inicio<input required type="time" value={respuesta.hora_inicio} onChange={(eventForm) => setRespuesta({ ...respuesta, hora_inicio: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Hora de fin<input required type="time" value={respuesta.hora_fin} onChange={(eventForm) => setRespuesta({ ...respuesta, hora_fin: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm font-semibold">Decoración<select value={respuesta.decoracion} onChange={(eventForm) => setRespuesta({ ...respuesta, decoracion: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2"><option value="CONSULTAR">Consultar</option><option value="SI">Sí</option><option value="NO">No</option></select></label>
                    </div>
                    <section className="space-y-2">
                        <div className="flex items-center justify-between"><h4 className="font-semibold">Preparaciones solicitadas</h4><button type="button" onClick={() => setRespuesta({ ...respuesta, detalle: [...respuesta.detalle, { preparacion: "", cantidad_personas: 1 }] })} className="rounded-lg border px-3 py-2 text-sm">Agregar</button></div>
                        {respuesta.detalle.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                            <input required maxLength="240" aria-label="Preparación solicitada" value={item.preparacion} onChange={(eventForm) => setRespuesta({ ...respuesta, detalle: respuesta.detalle.map((actual, pos) => pos === index ? { ...actual, preparacion: eventForm.target.value } : actual) })} className="rounded-lg border p-2" />
                            <input required type="number" min="1" step="1" aria-label="Cantidad solicitada" value={item.cantidad_personas} onChange={(eventForm) => setRespuesta({ ...respuesta, detalle: respuesta.detalle.map((actual, pos) => pos === index ? { ...actual, cantidad_personas: eventForm.target.value } : actual) })} className="rounded-lg border p-2" />
                            {respuesta.detalle.length > 1 && <button type="button" onClick={() => setRespuesta({ ...respuesta, detalle: respuesta.detalle.filter((_, pos) => pos !== index) })} className="rounded-lg border px-3 text-rose-700">Quitar</button>}
                        </div>)}
                    </section>
                    <label className="block text-sm font-semibold">Observaciones<textarea rows="3" maxLength="4000" value={respuesta.observaciones} onChange={(eventForm) => setRespuesta({ ...respuesta, observaciones: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                    <button disabled={guardando} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">{guardando ? "Enviando…" : "Reenviar a Administración"}</button>
                </form>}
                {["PENDIENTE_REVISION", "REQUIERE_CAMBIOS", "APROBADO_PENDIENTE_ANTICIPO"].includes(evento.estado) && <button type="button" disabled={guardando} onClick={cancelar} className="rounded-xl border border-rose-300 px-5 py-3 font-bold text-rose-700 disabled:opacity-50">Cancelar solicitud</button>}
                <section><h3 className="font-bold">Historial de la solicitud</h3><ol className="mt-2 space-y-2">{evento.historial.map((item, index) => <li key={`${item.accion}-${item.fecha}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">{item.accion} · {item.estado_anterior || "—"} → {item.estado_nuevo || "—"} · {new Date(item.fecha).toLocaleString("es-BO")}</li>)}</ol></section>
            </section>}
            {!evento && !acceso && <form onSubmit={enviarSolicitud} className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2">
                <label className="text-sm font-semibold">Responsable<input required maxLength="180" value={form.nombre_responsable} onChange={(eventForm) => setForm({ ...form, nombre_responsable: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Teléfono<input required maxLength="30" value={form.celular} onChange={(eventForm) => setForm({ ...form, celular: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Correo (opcional)<input type="email" maxLength="180" value={form.correo} onChange={(eventForm) => setForm({ ...form, correo: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Tipo de evento<input required maxLength="100" value={form.tipo_evento} onChange={(eventForm) => setForm({ ...form, tipo_evento: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Fecha<input required type="date" min={mananaLaPaz()} value={form.fecha} onChange={(eventForm) => setForm({ ...form, fecha: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Invitados<input required type="number" min="1" step="1" value={form.invitados} onChange={(eventForm) => setForm({ ...form, invitados: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Hora de inicio<input required type="time" value={form.hora_inicio} onChange={(eventForm) => setForm({ ...form, hora_inicio: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Hora de fin<input required type="time" value={form.hora_fin} onChange={(eventForm) => setForm({ ...form, hora_fin: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <label className="text-sm font-semibold">Decoración<select value={form.decoracion} onChange={(eventForm) => setForm({ ...form, decoracion: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3"><option value="CONSULTAR">Consultar</option><option value="SI">Sí</option><option value="NO">No</option></select></label>
                <section className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between"><h2 className="text-lg font-black">Preparaciones solicitadas</h2><button type="button" onClick={() => setForm({ ...form, detalle: [...form.detalle, { preparacion: "", cantidad_personas: "" }] })} className="rounded-lg border px-3 py-2 text-sm font-bold">Agregar</button></div>
                    {form.detalle.map((item, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                        <input required maxLength="240" aria-label="Descripción de preparación" placeholder="Preparación o servicio" value={item.preparacion} onChange={(eventForm) => setForm({ ...form, detalle: form.detalle.map((current, position) => position === index ? { ...current, preparacion: eventForm.target.value } : current) })} className="rounded-lg border p-3" />
                        <input required type="number" min="1" step="1" aria-label="Cantidad de personas" placeholder="Personas" value={item.cantidad_personas} onChange={(eventForm) => setForm({ ...form, detalle: form.detalle.map((current, position) => position === index ? { ...current, cantidad_personas: eventForm.target.value } : current) })} className="rounded-lg border p-3" />
                        {form.detalle.length > 1 && <button type="button" aria-label="Quitar preparación" onClick={() => setForm({ ...form, detalle: form.detalle.filter((_, position) => position !== index) })} className="rounded-lg border px-3 text-rose-700">Quitar</button>}
                    </div>)}
                </section>
                <label className="text-sm font-semibold md:col-span-2">Observaciones<textarea rows="3" maxLength="4000" value={form.observaciones} onChange={(eventForm) => setForm({ ...form, observaciones: eventForm.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                <section className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">
                    <h2 className="font-bold text-slate-800">Horarios habilitados</h2>
                    {horariosActivos.length
                        ? <ul className="mt-2 grid gap-1 sm:grid-cols-2">{horariosActivos.map((item) => <li key={item.id_horario}>Día {item.dia_semana}: {String(item.hora_inicio).slice(0, 5)}–{String(item.hora_fin).slice(0, 5)}</li>)}</ul>
                        : <p className="mt-2">Administración aún no configuró horarios disponibles.</p>}
                    <p className="mt-2">La fecha debe respetar al menos 24 horas de anticipación. La confirmación depende de aprobación y verificación del anticipo.</p>
                </section>
                <button disabled={guardando || !horariosActivos.length} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50 md:col-span-2">{guardando ? "Enviando…" : "Enviar solicitud"}</button>
            </form>}
        </main>
    );
}

export default EventosPrivados;
