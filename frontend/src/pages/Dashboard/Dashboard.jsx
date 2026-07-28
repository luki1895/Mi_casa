import { dashboardCards } from "../../data/DashboardData";
import DashboardCard from "../../components/dashboard/DashboardCard";

function Dashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardCards.map((item) => (
                <DashboardCard
                    key={item.id}
                    titulo={item.titulo}
                    valor={item.valor}
                    color={item.color}
                />
            ))}
        </div>
    );
}

export default Dashboard;