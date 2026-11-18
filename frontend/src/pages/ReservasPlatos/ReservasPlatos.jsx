import { useEffect, useMemo, useState } from "react";
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
const fechaMinima = () => {
    const [year, month, day] = fechaLaPaz().split("-").map(Number);
    const manana = new Date(Date.UTC(year, month - 1, day + 1));
    return manana.toISOString().slice(0, 10);
};
const nuevaSolicitud = () => window.crypto.randomUUID();
const nuevoToken = () => `${window.crypto.randomUUID()}${window.crypto.randomUUID()}`;
const accesoInicial = () => {
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const codigo = fragmento.get("codigo");
    const token = fragmento.get("token");
    return codigo && token ? { codigo, token } : null;
};
const crearIntervalos = (inicio, fin, intervalo) => {
    if (!inicio || !fin || !intervalo) return [];
    const [horaInicio, minutoInicio] = String(inicio).slice(0, 5).split(":").map(Number);
    const [horaFin, minutoFin] = String(fin).slice(0, 5).split(":").map(Number);
    const comienzo = horaInicio * 60 + minutoInicio;
    const cierre = horaFin * 60 + minutoFin;
    const resultados = [];
    for (let minuto = comienzo; minuto <= cierre; minuto += Number(intervalo)) {
        resultados.push(`${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`);
    }
    return resultados;
};

function ReservasPlatos() {
    const [fecha, setFecha] = useState(fechaMinima());
    const [menu, setMenu] = useState([]);
    const [configuracion, setConfiguracion] = useState(null);
    const [form, setForm] = useState({ nombre: "", celular: "", correo: "", hora: "", observaciones: "", items: [] });
    const [resultado, setResultado] = useState(null);
    const [solicitudId, setSolicitudId] = useState(nuevaSolicitud);
    const [tokenReserva, setTokenReserva] = useState(nuevoToken);
    const [reservaPrivada, setReservaPrivada] = useState(null);
    const [acceso] = useState(accesoInicial);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(() => Boolean(accesoInicial()));
    const [guardando, setGuardando] = useState(false);

    const intervalos = useMemo(() => crearIntervalos(
        configuracion?.hora_inicio,
        configuracion?.hora_fin,
        configuracion?.intervalo_minutos,
    ), [configuracion]);
    const platosPresentados = useMemo(() => {
        const disponibles = [...menu];
        if (reservaPrivada) {
            for (const detalle of reservaPrivada.detalles) {
                if (!disponibles.some((plato) => Number(plato.id_producto) === Number(detalle.id_producto))) {
                    disponibles.push({
                        id_producto: Number(detalle.id_producto),
                        nombre: detalle.nombre_producto,
                        categoria: "Reservado",
                        precio: detalle.precio_unitario,
                        stock: 0,
                    });
                }
            }
        }
        return disponibles;
    }, [menu, reservaPrivada]);

    useEffect(() => {
        let cancelado = false;
        api.get("/reservas-platos/configuracion")
            .then(({ data }) => {
                if (!cancelado) setConfiguracion(data.data);
            })
            .catch((requestError) => {
                if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo consultar el horario de reservas.");
            });
        const credencial = accesoInicial();
        if (credencial) {
            api.get(`/reservas-platos/acceso/${encodeURIComponent(credencial.codigo)}`, {
                headers: { "x-reservation-token": credencial.token },
            })
                .then(({ data }) => {
                    if (cancelado) return;
                    const reserva = data.data;
                    setReservaPrivada(reserva);
                    setFecha(String(reserva.fecha).slice(0, 10));
                    setForm({
                        nombre: reserva.nombre_cliente,
                        celular: reserva.celular,
                        correo: reserva.correo || "",
                        hora: String(reserva.hora).slice(0, 5),
                        observaciones: reserva.observaciones || "",
                        items: reserva.detalles.map((item) => ({
                            id_producto: Number(item.id_producto),
                            cantidad: Number(item.cantidad),
                        })),
                    });
                })
                .catch((requestError) => {
                    if (!cancelado) setError(requestError.response?.data?.mensaje || "El enlace de reserva no es válido.");
                })
                .finally(() => {
                    if (!cancelado) setCargando(false);
                });
        }
        return () => { cancelado = true; };
    }, []);

    useEffect(() => {
        let cancelado = false;
        api.get("/menu", { params: { fecha } })
            .then(({ data }) => {
                if (!cancelado) setMenu(data.data || []);
            })
            .catch((requestError) => {
                if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo cargar el menú.");
            });
        return () => { cancelado = true; };
    }, [fecha]);

    const cambiarCantidad = (id, cantidad) => {
        setForm((actual) => {
            const filtrados = actual.items.filter((item) => item.id_producto !== id);
            const numero = Number(cantidad);
            return numero > 0
                ? { ...actual, items: [...filtrados, { id_producto: id, cantidad: numero }] }
                : { ...actual, items: filtrados };
        });
    };

    const enviar = async (event) => {
        event.preventDefault();
        setError("");
        setResultado(null);
        setGuardando(true);
        try {
            if (acceso) {
                const { data } = await api.patch(`/reservas-platos/acceso/${encodeURIComponent(acceso.codigo)}`, {
                    ...form,
                    fecha,
                }, { headers: { "x-reservation-token": acceso.token } });
                setReservaPrivada(data.data);
                setResultado({ mensaje: "Cambios guardados y registrados en el historial." });
            } else {
                const { data } = await api.post("/reservas-platos", {
                    ...form,
                    fecha,
                    solicitud_id: solicitudId,
                    access_token: tokenReserva,
                });
                setResultado(data.data);
                setSolicitudId(nuevaSolicitud());
                setTokenReserva(nuevoToken());
            }
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo guardar la reserva.");
        } finally {
            setGuardando(false);
        }
    };

    const cancelar = async () => {
        if (!acceso || !window.confirm("¿Cancelar esta reserva? Las unidades se liberarán al confirmar.")) return;
        setError("");
        setGuardando(true);
        try {
            await api.post(`/reservas-platos/acceso/${encodeURIComponent(acceso.codigo)}/cancelar`, {}, {
                headers: { "x-reservation-token": acceso.token },
            });
            const { data } = await api.get(`/reservas-platos/acceso/${encodeURIComponent(acceso.codigo)}`, {
                headers: { "x-reservation-token": acceso.token },
            });
            setReservaPrivada(data.data);
            setResultado({ mensaje: "Reserva cancelada; se liberaron las unidades y el cambio quedó registrado." });
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cancelar la reserva.");
        } finally {
            setGuardando(false);
        }
    };

    const enlacePrivado = resultado?.acceso
        ? `${window.location.origin}/reservar-platos#codigo=${encodeURIComponent(resultado.acceso.codigo)}&token=${encodeURIComponent(resultado.acceso.token)}`
        : "";

    return (
        <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-slate-50 p-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Reserva anticipada</p>
                <h1 className="text-3xl font-black">Reservar platos</h1>
                <p className="mt-2 text-sm text-slate-600">La reserva retiene disponibilidad, pero no es una venta ni un pago.</p>
            </header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            {resultado?.mensaje && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{resultado.mensaje}</p>}
            {resultado?.reserva && <section className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <p>Reserva creada. Guarda este enlace privado; el secreto no se muestra nuevamente.</p>
                <p><strong>Código:</strong> {resultado.reserva.codigo}</p>
                <a className="break-all font-semibold underline" href={enlacePrivado}>{enlacePrivado}</a>
            </section>}
            {reservaPrivada && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Reserva {reservaPrivada.codigo} · estado {reservaPrivada.estado} · revisión {reservaPrivada.version}</p>}
            {cargando && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Consultando enlace privado…</p>}
            <form onSubmit={enviar} className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2">
                <label className="text-sm font-semibold">Fecha
                    <input type="date" min={fechaMinima()} value={fecha} onChange={(event) => setFecha(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="text-sm font-semibold">Hora aproximada de llegada
                    <select required value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} className="mt-1 w-full rounded-lg border p-3">
                        <option value="">Selecciona un horario</option>
                        {intervalos.map((hora) => <option key={hora} value={hora}>{hora}</option>)}
                    </select>
                </label>
                <label className="text-sm font-semibold">Nombre completo
                    <input required maxLength="180" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="text-sm font-semibold">Teléfono
                    <input required maxLength="30" value={form.celular} onChange={(event) => setForm({ ...form, celular: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="text-sm font-semibold md:col-span-2">Correo electrónico (opcional)
                    <input type="email" maxLength="180" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="text-sm font-semibold md:col-span-2">Observaciones
                    <textarea rows="3" value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <section className="md:col-span-2">
                    <h2 className="mb-1 text-lg font-black">Platos disponibles</h2>
                    <p className="mb-3 text-sm text-slate-500">La disponibilidad se valida nuevamente al confirmar.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {platosPresentados.map((plato) => {
                            const cantidad = form.items.find((item) => item.id_producto === Number(plato.id_producto))?.cantidad || 0;
                            const cantidadOriginal = reservaPrivada?.detalles
                                .find((item) => Number(item.id_producto) === Number(plato.id_producto))?.cantidad || 0;
                            const cantidadDisponible = Number(plato.stock) + (
                                String(reservaPrivada?.fecha).slice(0, 10) === fecha ? Number(cantidadOriginal) : 0
                            );
                            return <label key={plato.id_producto} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                                <span><strong>{plato.nombre}</strong><small className="block text-slate-500">{plato.categoria} · Bs {plato.precio} · {cantidadDisponible} disponibles</small></span>
                                <input aria-label={`Cantidad de ${plato.nombre}`} type="number" min="0" max={cantidadDisponible} value={cantidad} onChange={(event) => cambiarCantidad(Number(plato.id_producto), event.target.value)} className="w-24 rounded-lg border p-2" />
                            </label>;
                        })}
                        {!platosPresentados.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay producción publicada y disponible para esta fecha.</p>}
                    </div>
                </section>
                <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button disabled={guardando || cargando || (!menu.length && !acceso)} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : acceso ? "Guardar cambios" : "Confirmar reserva"}</button>
                    {acceso && reservaPrivada?.estado === "PENDIENTE" && <button type="button" disabled={guardando} onClick={cancelar} className="rounded-xl border border-rose-300 px-5 py-3 font-bold text-rose-700 disabled:opacity-50">Cancelar reserva</button>}
                </div>
            </form>
            {reservaPrivada?.revisiones?.length > 0 && <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Historial de modificaciones</h2>
                <ol className="mt-3 space-y-2">{reservaPrivada.revisiones.map((revision) => <li key={revision.version} className="rounded-lg bg-slate-50 p-3 text-sm">Versión {revision.version} · {revision.accion} · {new Date(revision.creada_en).toLocaleString("es-BO")}</li>)}</ol>
            </section>}
        </main>
    );
}

export default ReservasPlatos;
