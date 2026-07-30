import { dashboardCards } from "../../data/DashboardData";
import DashboardCard from "../../components/dashboard/DashboardCard";

function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff3b30]">Vista general</p>
                        <h2 className="text-2xl font-bold text-slate-900">Resumen del día</h2>
                    </div>
                    <p className="text-sm text-slate-500">Información clave para tomar decisiones rápidas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {dashboardCards.map((item) => (
                    <DashboardCard
                        key={item.id}
                        titulo={item.titulo}
                        valor={item.valor}
                        color={item.color}
                        accent={item.accent}
                    />
                ))}
            </div>
        </div>
    );
}

export default Dashboard;