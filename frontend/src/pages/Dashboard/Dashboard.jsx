import { dashboardCards } from "../../data/dashboardData";
import DashboardCard from "../../components/dashboard/DashboardCard";

function Dashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {dashboardCards.map((item, index) => (
                <DashboardCard
                    key={index}
                    title={item.title}
                    value={item.value}
                    icon={item.icon}
                    color={item.color}
                />
            ))}

        </div>
    );
}

export default Dashboard;