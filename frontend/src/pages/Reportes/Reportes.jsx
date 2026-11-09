import { useEffect, useState } from "react";
import api from "../../api/axios";

function Reportes() {
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    api.get("/reportes/dashboard")
      .then(({ data }) => {
        if (!cancelado) setReporte(data.data || null);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el reporte del día desde PostgreSQL.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return <p className="text-sm text-gray-500">Cargando reportes...</p>;
  }

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ventas</p>
          <h3 className="mt-2 text-3xl font-black">Bs {Number(reporte?.ventas?.total || 0).toFixed(2)}</h3>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Gastos</p>
          <h3 className="mt-2 text-3xl font-black">Bs {Number(reporte?.gastos?.total || 0).toFixed(2)}</h3>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos activos</p>
          <h3 className="mt-2 text-3xl font-black">{(reporte?.pedidosActivos || []).length}</h3>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-lg font-bold">Clientes</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex justify-between"><span>Pensionados</span><strong>{Number(reporte?.pensionados?.total || 0)}</strong></li>
            <li className="flex justify-between"><span>Eventuales</span><strong>{Number(reporte?.eventuales?.total || 0)}</strong></li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-lg font-bold">Producción</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex justify-between"><span>Preparados</span><strong>{Number(reporte?.produccion?.preparados || 0)}</strong></li>
            <li className="flex justify-between"><span>Vendidos</span><strong>{Number(reporte?.produccion?.vendidos || 0)}</strong></li>
            <li className="flex justify-between"><span>Disponibles</span><strong>{Number(reporte?.produccion?.disponibles || 0)}</strong></li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h4 className="mb-3 text-lg font-bold">Pedidos activos</h4>
        <div className="space-y-2">
          {(reporte?.pedidosActivos || []).map((pedido) => (
            <div key={pedido.id_pedido} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{pedido.cliente}</p>
                <p className="text-gray-500">{pedido.estado}</p>
              </div>
              <strong className="text-slate-900">Bs {Number(pedido.total || 0).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reportes;
