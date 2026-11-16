import { useEffect, useState } from "react";
import api from "../../api/axios";

function Reportes() {
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const imprimirReporte = () => {
    const ventana = window.open("", "_blank", "width=700,height=900");
    if (!ventana) {
      setError("Permite las ventanas emergentes para imprimir el reporte.");
      return;
    }

    const ingresos = Number(reporte?.ventas?.total || 0);
    const gastos = Number(reporte?.gastos?.total || 0);
    const activos = (reporte?.pedidosActivos || []).length;

    ventana.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Mi Casa</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #111827; padding: 0; margin: 0; }
            .wrap { width: 100%; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 10px; }
            .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
            .label { font-size: 11px; color: #6b7280; }
            .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 7px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>Reporte del día</h1>
            <div class="grid">
              <div class="card"><div class="label">Ventas</div><div class="value">Bs ${ingresos.toFixed(2)}</div></div>
              <div class="card"><div class="label">Gastos</div><div class="value">Bs ${gastos.toFixed(2)}</div></div>
              <div class="card"><div class="label">Pedidos activos</div><div class="value">${activos}</div></div>
              <div class="card"><div class="label">Pensionados</div><div class="value">${Number(reporte?.pensionados?.total || 0)}</div></div>
            </div>
            <table>
              <thead><tr><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
              <tbody>
                ${(reporte?.pedidosActivos || []).map((pedido) => `
                  <tr>
                    <td>${pedido.cliente}</td>
                    <td>${pedido.estado}</td>
                    <td>Bs ${Number(pedido.total || 0).toFixed(2)}</td>
                  </tr>`).join("") || '<tr><td colspan="3">Sin pedidos activos</td></tr>'}
              </tbody>
            </table>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>`);
    ventana.document.close();
  };

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
      <div className="flex justify-end">
        <button type="button" onClick={imprimirReporte} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Imprimir reporte</button>
      </div>
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
