import React from "react";

const DashboardCard = ({ title, value, icon: Icon, color }) => {
    return (
        <div
            className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4"
            style={{ borderLeft: `6px solid ${color}` }}
        >
            {/* Icono */}
            <div style={{ color: color }} className="text-3xl">
                <Icon />
            </div>

            {/* Texto */}
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <h2 className="text-xl font-bold">{value}</h2>
            </div>
        </div>
    );
};

export default DashboardCard;