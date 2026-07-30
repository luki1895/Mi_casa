import React from "react";

const DashboardCard = ({ titulo, valor, icono, color, accent }) => {
    return (
        <div className={`rounded-2xl border border-white/70 bg-white p-5 shadow-sm hover:shadow-md transition-all ${color}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">{titulo}</p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">{valor}</h2>
                </div>
                <div className={`rounded-2xl p-3 text-2xl ${accent}`}>{icono}</div>
            </div>
        </div>
    );
};

export default DashboardCard;