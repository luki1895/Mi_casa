import { dashboardCards, ultimosPedidos } from "../../data/DashboardData";
import DashboardCard from "../../components/dashboard/DashboardCard";

const estadoColors = {
    Entregado: "bg-emerald-100 text-emerald-700",
    Preparando: "bg-amber-100 text-amber-700",
    Pendiente: "bg-rose-100 text-rose-700",
};

function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Dashboard</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-900">Resumen del restaurante</h2>
                </div>
                <button className="premium-button">+ Nuevo pedido</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboardCards.map((item) => (
                    <DashboardCard
                        key={item.id}
                        titulo={item.titulo}
                        valor={item.valor}
                        color={item.color}
                        icono={item.id === 1 ? "👥" : item.id === 2 ? "🧾" : item.id === 3 ? "💰" : item.id === 4 ? "🍽️" : item.id === 5 ? "⏳" : item.id === 6 ? "👨‍🍳" : "✅"}
                    />
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="soft-card p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Últimos pedidos</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Hoy
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 bg-white">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Hora</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                                {ultimosPedidos.map((pedido) => (
                                    <tr key={pedido.id}>
                                        <td className="px-4 py-3 font-medium">{pedido.hora}</td>
                                        <td className="px-4 py-3">{pedido.cliente}</td>
                                        <td className="px-4 py-3">{pedido.tipo}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoColors[pedido.estado]}`}>
                                                {pedido.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-900">Bs {pedido.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="soft-card p-6">
                    <h3 className="text-xl font-bold text-slate-900">Estado de cocina</h3>

                    <div className="mt-6 space-y-5">
                        {[
                            { label: "Listos para servir", value: "12", tone: "bg-emerald-100 text-emerald-700" },
                            { label: "En preparación", value: "8", tone: "bg-amber-100 text-amber-700" },
                            { label: "Pendientes", value: "4", tone: "bg-rose-100 text-rose-700" },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>{item.label}</span>
                                    <span className="font-bold text-slate-900">{item.value}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100">
                                    <div
                                        className={`h-2.5 rounded-full ${item.tone}`}
                                        style={{ width: item.label === "Listos para servir" ? "80%" : item.label === "En preparación" ? "55%" : "35%" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;