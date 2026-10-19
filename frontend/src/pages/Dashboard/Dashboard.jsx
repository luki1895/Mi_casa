import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const estadoColors = {
    ENTREGADO: "bg-emerald-100 text-emerald-700",
    LISTO: "bg-emerald-100 text-emerald-700",
    EN_PREPARACION: "bg-amber-100 text-amber-700",
    PENDIENTE: "bg-rose-100 text-rose-700",
};

const indicadores = [
    { id: "ventas", titulo: "Ventas cobradas", valor: (resumen) => `Bs ${Number(resumen?.ventas?.total || 0).toFixed(2)}`, icono: "Bs", tone: "bg-emerald-50 text-emerald-700" },
    { id: "pedidos", titulo: "Pedidos pagados", valor: (resumen) => resumen?.ventas?.cantidad || 0, icono: "↗", tone: "bg-sky-50 text-sky-700" },
    { id: "gastos", titulo: "Gastos del día", valor: (resumen) => `Bs ${Number(resumen?.gastos?.total || 0).toFixed(2)}`, icono: "−", tone: "bg-amber-50 text-amber-700" },
    { id: "activos", titulo: "Pedidos activos", valor: (resumen) => resumen?.pedidosActivos?.length || 0, icono: "◷", tone: "bg-violet-50 text-violet-700" },
];

function Dashboard() {
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelado = false;
        api.get("/reportes/dashboard")
            .then(({ data }) => {
                if (!cancelado) setResumen(data.data);
            })
            .catch((requestError) => {
                if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo cargar el resumen desde PostgreSQL.");
            })
            .finally(() => {
                if (!cancelado) setCargando(false);
            });
        return () => { cancelado = true; };
    }, []);

    const pedidosActivos = resumen?.pedidosActivos || [];
    const estadosPedidos = [
        { label: "Listos para servir", cantidad: pedidosActivos.filter((pedido) => pedido.estado === "LISTO").length, tone: "bg-emerald-500" },
        { label: "En preparación", cantidad: pedidosActivos.filter((pedido) => pedido.estado === "EN_PREPARACION").length, tone: "bg-amber-500" },
        { label: "Pendientes", cantidad: pedidosActivos.filter((pedido) => pedido.estado === "PENDIENTE").length, tone: "bg-rose-500" },
    ];
    const totalPedidosActivos = estadosPedidos.reduce((total, estado) => total + estado.cantidad, 0);
    const produccion = [
        { titulo: "Preparados", valor: resumen?.produccion?.preparados || 0, tone: "text-slate-900" },
        { titulo: "Vendidos", valor: resumen?.produccion?.vendidos || 0, tone: "text-amber-700" },
        { titulo: "Disponibles", valor: resumen?.produccion?.disponibles || 0, tone: "text-emerald-700" },
    ];

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-sm md:flex-row md:items-end md:justify-between md:p-8">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Administración · Hoy</p>
                    <h1 className="mt-2 text-3xl font-black">Resumen del restaurante</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-300">Ventas cobradas, actividad de pedidos y producción en un solo vistazo.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/produccion" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300">Ver producción</Link>
                    <Link to="/reportes" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white transition hover:border-slate-400">Abrir reportes</Link>
                </div>
            </header>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

            <section aria-label="Indicadores del día" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {indicadores.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{item.titulo}</p>
                                <p className="mt-3 text-2xl font-black text-slate-900">{cargando ? "—" : item.valor(resumen)}</p>
                            </div>
                            <span aria-hidden="true" className={`flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-black ${item.tone}`}>{item.icono}</span>
                        </div>
                    </article>
                ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Control operativo</p>
                        <h2 className="mt-1 text-xl font-black text-slate-900">Producción de hoy</h2>
                    </div>
                    <Link to="/produccion" className="text-sm font-bold text-amber-800 hover:text-amber-950">Gestionar producción →</Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {produccion.map((item) => (
                        <div key={item.titulo} className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">{item.titulo}</p>
                            <p className={`mt-2 text-2xl font-black ${item.tone}`}>{cargando ? "—" : item.valor}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Seguimiento</p>
                            <h2 className="mt-1 text-xl font-black text-slate-900">Pedidos activos</h2>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{pedidosActivos.length} activos</span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="min-w-full divide-y divide-slate-100 bg-white text-left">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Hora</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {pedidosActivos.map((pedido) => (
                                    <tr key={pedido.id_pedido}>
                                        <td className="whitespace-nowrap px-4 py-3">{new Date(pedido.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</td>
                                        <td className="px-4 py-3 font-medium">{pedido.cliente}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoColors[pedido.estado] || "bg-slate-100 text-slate-700"}`}>{String(pedido.estado).replaceAll("_", " ")}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">Bs {Number(pedido.total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {!cargando && pedidosActivos.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No hay pedidos activos hoy.</td></tr>}
                                {cargando && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Cargando actividad…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Estado actual</p>
                        <h2 className="mt-1 text-xl font-black text-slate-900">Flujo de pedidos</h2>
                    </div>
                    <div className="mt-6 space-y-5">
                        {estadosPedidos.map((estado) => (
                            <div key={estado.label}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                    <span className="text-slate-600">{estado.label}</span>
                                    <span className="font-bold text-slate-900">{cargando ? "—" : estado.cantidad}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100">
                                    <div className={`h-2.5 rounded-full ${estado.tone}`} style={{ width: `${totalPedidosActivos ? estado.cantidad / totalPedidosActivos * 100 : 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link to="/pedidos" className="mt-7 inline-flex text-sm font-bold text-amber-800 hover:text-amber-950">Ir a pedidos →</Link>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
