import { dashboardCards } from "../../data/DashboardData";
import DashboardCard from "../../components/dashboard/DashboardCard";

const disponibilidadProduccion = [
    { nombre: "Disponibles", valor: "32 platos", color: "bg-[#dcfce7] text-[#166534]" },
    { nombre: "Pendientes", valor: "8 pedidos", color: "bg-[#fef3c7] text-[#92400e]" },
    { nombre: "En cocina", valor: "5 en preparación", color: "bg-[#ede9fe] text-[#6d28d9]" }
];

function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Vista general</p>
                        <h2 className="text-2xl font-bold text-slate-900">Resumen del día</h2>
                    </div>
                    <p className="text-sm text-slate-500">Información clave para tomar decisiones rápidas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboardCards.map((item) => (
                    <DashboardCard
                        key={item.id}
                        titulo={item.titulo}
                        valor={item.valor}
                        color={item.color}
                        accent={item.accent}
                        icono={item.icono || "↗"}
                    />
                ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Producción</p>
                        <h3 className="text-xl font-bold text-slate-900">Disponibilidad del día</h3>
                    </div>
                    <span className="rounded-full bg-[#fef2f2] px-3 py-1 text-xs font-semibold text-[#b91c1c]">Actualizado hace 10 min</span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {disponibilidadProduccion.map((item) => (
                        <div key={item.nombre} className={`rounded-2xl border border-slate-200 p-5 ${item.color}`}>
                            <p className="text-sm font-medium">{item.nombre}</p>
                            <h4 className="mt-3 text-2xl font-black">{item.valor}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;