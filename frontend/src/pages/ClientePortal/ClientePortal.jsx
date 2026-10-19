import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const obtenerFechaLocal = (fecha = new Date()) => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${año}-${mes}-${dia}`;
};

const fechasSemana = () => {
    const hoy = new Date();
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, indice) => {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + indice);
        return obtenerFechaLocal(fecha);
    });
};

const presentarFecha = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
});

const moneda = (importe) => `Bs ${Number(importe || 0).toFixed(2)}`;
const estadoBonito = (estado) => String(estado || "PENDIENTE").replaceAll("_", " ");

function ClientePortal() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const hoy = obtenerFechaLocal();
    const semana = useMemo(() => fechasSemana(), []);
    const [cuenta, setCuenta] = useState(null);
    const [menusSemana, setMenusSemana] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [reserva, setReserva] = useState({ hora: "", cantidad_personas: "2", observaciones: "" });

    useEffect(() => {
        let cancelado = false;
        const cargar = async () => {
            setCargando(true);
            setError("");
            if (usuario?.demo) {
                setCuenta(null);
                setMenusSemana({});
                setAviso("Cuenta de demostración: el contenido personal y las reservas requieren una cuenta vinculada a un cliente real.");
                setCargando(false);
                return;
            }
            const resultados = await Promise.allSettled([
                api.get("/clientes/mi-cuenta"),
                ...semana.map((fecha) => api.get(`/produccion/menu?fecha=${fecha}`)),
            ]);
            if (cancelado) return;
            if (resultados[0].status === "fulfilled") {
                setCuenta(resultados[0].value.data.data);
            } else {
                setCuenta(null);
                setError(resultados[0].reason.response?.data?.mensaje || "No se pudo cargar la información de tu cuenta.");
            }
            const menus = {};
            resultados.slice(1).forEach((resultado, indice) => {
                menus[semana[indice]] = resultado.status === "fulfilled"
                    ? resultado.value.data.data || []
                    : [];
            });
            setMenusSemana(menus);
            setCargando(false);
        };
        cargar();
        return () => { cancelado = true; };
    }, [usuario?.demo, semana]);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const solicitarReserva = async (event) => {
        event.preventDefault();
        setAviso("");
        if (!reserva.hora || Number(reserva.cantidad_personas) < 1) {
            setAviso("Indica la hora y una cantidad válida de personas.");
            return;
        }
        if (usuario?.demo) {
            setAviso("Las reservas no se guardan desde una cuenta de demostración.");
            return;
        }
        setGuardando(true);
        try {
            const { data } = await api.post("/clientes/mis-reservas", {
                fecha: hoy,
                hora: reserva.hora,
                cantidad_personas: Number(reserva.cantidad_personas),
                observaciones: reserva.observaciones.trim(),
            });
            setCuenta((actual) => ({
                ...actual,
                reservas: [data.data, ...(actual?.reservas || [])],
            }));
            setReserva({ hora: "", cantidad_personas: "2", observaciones: "" });
            setAviso("Solicitud enviada. La reserva queda pendiente de confirmación del restaurante.");
        } catch (requestError) {
            setAviso(requestError.response?.data?.mensaje || "No se pudo enviar la solicitud de reserva.");
        } finally {
            setGuardando(false);
        }
    };

    const menuHoy = menusSemana[hoy] || [];
    const reservaHoy = (cuenta?.reservas || []).find((item) => String(item.fecha).slice(0, 10) === hoy);

    return (
        <div className="min-h-screen bg-[#f8f5f2] text-slate-800">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
                    <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Mi Casa</p>
                        <h1 className="text-2xl font-black text-slate-900">Mi cuenta</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="hidden text-sm text-slate-600 sm:block">{cuenta?.nombre || usuario?.name || usuario?.username}</p>
                        <button
                            onClick={handleLogout}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
                {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
                {aviso && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{aviso}</p>}
                {cargando ? (
                    <p className="rounded-2xl bg-white p-6 text-slate-500">Cargando cuenta y menú de la semana…</p>
                ) : (
                    <>
                    <section id="cliente-dashboard" aria-label="Resumen de cliente" className="scroll-mt-6 space-y-5">
                        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Dashboard del cliente</p>
                            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-3xl font-black">Hola, {cuenta?.nombre || usuario?.name || usuario?.username || "Cliente"}</h2>
                                    <p className="mt-2 text-sm text-slate-300">{cuenta?.telefono || "Teléfono no registrado"}{cuenta?.tipo_cliente ? ` · ${cuenta.tipo_cliente}` : ""}</p>
                                </div>
                                <p className="text-sm capitalize text-slate-300">{presentarFecha(hoy)}</p>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                ["Almuerzos restantes", cuenta ? Number(cuenta.saldo_pensiones || 0) : "—", "Saldo de tu cuenta"],
                                ["Platos disponibles hoy", menuHoy.length, "Opciones publicadas"],
                                ["Reserva de hoy", reservaHoy ? estadoBonito(reservaHoy.estado) : "Sin reserva", reservaHoy ? `${String(reservaHoy.hora).slice(0, 5)} · ${reservaHoy.cantidad_personas} personas` : "Puedes solicitar una reserva"],
                                ["Pedidos recientes", (cuenta?.pedidos || []).length, "Pedidos asociados a tu cuenta"],
                            ].map(([titulo, valor, detalle]) => (
                                <article key={titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <p className="text-sm font-medium text-slate-500">{titulo}</p>
                                    <p className="mt-3 text-2xl font-black capitalize text-slate-900">{valor}</p>
                                    <p className="mt-1 text-xs text-slate-500">{detalle}</p>
                                </article>
                            ))}
                        </div>
                        <nav aria-label="Accesos del cliente" className="flex flex-wrap gap-2">
                            <a href="#cliente-menu-hoy" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">Ver menú de hoy</a>
                            <a href="#cliente-reservas" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Realizar reserva</a>
                            <a href="#cliente-menu-semanal" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Menú semanal</a>
                            <a href="#cliente-pedidos" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Mis pedidos</a>
                        </nav>
                    </section>

                    <section id="cliente-menu-hoy" className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Disponibilidad de hoy</p>
                                    <h2 className="mt-1 text-2xl font-black">Platos disponibles</h2>
                                </div>
                                <p className="text-sm text-slate-500">{menuHoy.length} opciones disponibles</p>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {menuHoy.map((plato) => (
                                    <article key={`${plato.id_producto}-${plato.categoria}`} className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase text-amber-700">{plato.categoria}</p>
                                        <h3 className="mt-1 font-bold">{plato.nombre}</h3>
                                        <p className="mt-2 text-sm text-slate-600">{plato.stock} disponibles</p>
                                        <p className="font-black">{moneda(plato.precio)}</p>
                                    </article>
                                ))}
                                {!menuHoy.length && <p className="py-4 text-sm text-slate-500">No hay platos disponibles publicados para hoy.</p>}
                            </div>
                        </section>

                        <section id="cliente-menu-semanal" className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Planificación</p>
                            <h2 className="mt-1 text-2xl font-black">Menú semanal</h2>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {semana.map((fecha) => (
                                    <article key={fecha} className="rounded-xl border border-slate-100 p-4">
                                        <h3 className="font-bold capitalize">{presentarFecha(fecha)}</h3>
                                        <ul className="mt-3 space-y-2 text-sm">
                                            {(menusSemana[fecha] || []).map((plato) => (
                                                <li key={`${plato.id_producto}-${plato.categoria}`} className="flex justify-between gap-3">
                                                    <span>{plato.nombre} <span className="text-slate-500">· {plato.categoria}</span></span>
                                                    <span className="whitespace-nowrap text-slate-500">{plato.stock} disp.</span>
                                                </li>
                                            ))}
                                            {!(menusSemana[fecha] || []).length && <li className="text-slate-500">Menú aún no publicado</li>}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section id="cliente-reservas" className="scroll-mt-6 grid gap-6 lg:grid-cols-2">
                            <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Hoy · {presentarFecha(hoy)}</p>
                                <h2 className="mt-1 text-2xl font-black">Solicitar una reserva</h2>
                                <p className="mt-2 text-sm text-slate-600">Tu solicitud queda pendiente hasta que el restaurante la confirme.</p>
                                <form onSubmit={solicitarReserva} className="mt-5 space-y-4">
                                    <label className="block text-sm font-semibold">Fecha
                                        <input type="date" value={hoy} min={hoy} max={hoy} readOnly className="mt-1 w-full rounded-lg border bg-slate-50 p-3" />
                                    </label>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-sm font-semibold">Hora
                                            <input required type="time" value={reserva.hora} onChange={(event) => setReserva({ ...reserva, hora: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                                        </label>
                                        <label className="block text-sm font-semibold">Personas
                                            <input required type="number" min="1" step="1" value={reserva.cantidad_personas} onChange={(event) => setReserva({ ...reserva, cantidad_personas: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                                        </label>
                                    </div>
                                    <label className="block text-sm font-semibold">Observación opcional
                                        <textarea rows="2" value={reserva.observaciones} onChange={(event) => setReserva({ ...reserva, observaciones: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                                    </label>
                                    <button disabled={guardando || usuario?.demo || !cuenta} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">
                                        {guardando ? "Enviando solicitud…" : "Solicitar reserva"}
                                    </button>
                                </form>
                            </article>

                            <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                <h2 className="text-2xl font-black">Mis reservas</h2>
                                <div className="mt-4 space-y-3">
                                    {(cuenta?.reservas || []).map((item) => (
                                        <div key={item.id_reserva} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-4">
                                            <div>
                                                <p className="font-semibold capitalize">{presentarFecha(String(item.fecha).slice(0, 10))} · {String(item.hora).slice(0, 5)}</p>
                                                <p className="text-sm text-slate-600">{item.cantidad_personas} personas{item.observaciones ? ` · ${item.observaciones}` : ""}</p>
                                            </div>
                                            <span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{item.estado}</span>
                                        </div>
                                    ))}
                                    {!(cuenta?.reservas || []).length && <p className="py-4 text-sm text-slate-500">Aún no tienes reservas.</p>}
                                </div>
                            </article>
                        </section>

                        <section id="cliente-pedidos" className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                            <h2 className="text-2xl font-black">Mis pedidos recientes</h2>
                            <div className="mt-4 space-y-3">
                                {(cuenta?.pedidos || []).map((pedido) => (
                                    <article key={pedido.id_pedido} className="rounded-xl bg-slate-50 p-4">
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <p className="font-bold">Pedido #{pedido.id_pedido} · {new Date(pedido.fecha).toLocaleDateString("es")}</p>
                                            <span className="text-sm font-semibold">{pedido.pagado ? "Pagado" : "Pendiente de pago"} · {estadoBonito(pedido.estado)}</span>
                                        </div>
                                        <ul className="mt-2 text-sm text-slate-600">{(pedido.detalle || []).map((item, indice) => <li key={`${item.nombre}-${indice}`}>{item.cantidad} × {item.nombre}</li>)}</ul>
                                    </article>
                                ))}
                                {!(cuenta?.pedidos || []).length && <p className="py-4 text-sm text-slate-500">No hay pedidos asociados a tu cuenta.</p>}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default ClientePortal;
