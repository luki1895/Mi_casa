import { useState } from "react";
import { produccionInicial } from "../../data/produccionMock";
import SelectorFecha from "../../components/produccion/SelectorFecha";
import FormularioProduccion from "../../components/produccion/FormularioProduccion";
import TablaProduccion from "../../components/produccion/TablaProduccion";
import ResumenProduccion from "../../components/produccion/ResumenProduccion";
import BotonesProduccion from "../../components/produccion/BotonesProduccion";
import DashboardCard from "../../components/dashboard/DashboardCard";

const disponibilidad = [
  { id: 1, titulo: "Preparados", valor: 32, color: "bg-slate-50", accent: "bg-[#dcfce7] text-[#166534]" },
  { id: 2, titulo: "Vendidos", valor: 24, color: "bg-slate-50", accent: "bg-[#fef3c7] text-[#92400e]" },
  { id: 3, titulo: "Reservados", valor: 8, color: "bg-slate-50", accent: "bg-[#ede9fe] text-[#6d28d9]" },
  { id: 4, titulo: "Disponibles", valor: 12, color: "bg-slate-50", accent: "bg-[#f0fdf4] text-[#166534]" }
];

function Produccion() {
  const [produccion] = useState(produccionInicial);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Producción</p>
            <h2 className="text-2xl font-bold text-slate-900">Disponibilidad de producción</h2>
          </div>
          <p className="text-sm text-slate-500">Monitoriza platos preparados, vendidos y disponibles del día.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {disponibilidad.map((item) => (
          <DashboardCard
            key={item.id}
            titulo={item.titulo}
            valor={item.valor}
            color={item.color}
            accent={item.accent}
            icono="↗"
          />
        ))}
      </div>

      <SelectorFecha />
      <ResumenProduccion produccion={produccion} />
      <FormularioProduccion produccion={produccion} actualizar={() => {}} />
      <TablaProduccion produccion={produccion} />
      <BotonesProduccion />
    </div>
  );
}

export default Produccion;
