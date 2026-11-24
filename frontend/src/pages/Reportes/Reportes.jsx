import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import fechaRestaurante from "../../utils/fechaRestaurante";

const importe = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;
const celdaCsv = (valor) => {
  let texto = String(valor ?? "");
  if (/^[\t\r ]*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
};
const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[caracter]));

function Reportes() {
  const hoy = fechaRestaurante();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/reportes/operativo", { params: { desde, hasta } });
      setReporte(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo consultar el reporte operativo.");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    let cancelado = false;
    api.get("/reportes/operativo", { params: { desde, hasta } })
      .then(({ data }) => {
        if (!cancelado) setReporte(data.data);
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo consultar el reporte operativo.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [desde, hasta]);

  const exportarCsv = () => {
    if (!reporte) return;
    const secciones = [
      ["RESUMEN", ["Campo", "Valor"], Object.entries(reporte.resumen)],
      ["PAGOS", ["ID pago", "ID pedido", "Fecha", "Cliente", "Monto", "Método", "Estado", "Motivo anulación"], reporte.pagos.map((p) => [p.id_pago, p.id_pedido, p.fecha, p.cliente, p.monto, p.metodo, p.estado, p.motivo_anulacion])],
      ["GASTOS", ["ID gasto", "Fecha", "Concepto", "Descripción", "Total", "Método"], reporte.gastos.map((g) => [g.id_gasto, g.fecha, g.concepto, g.descripcion, g.total, g.metodo_pago])],
      ["PEDIDOS", ["ID pedido", "Fecha", "Cliente", "Tipo", "Estado", "Total", "Pagado"], reporte.pedidos.map((p) => [p.id_pedido, p.fecha, p.cliente, p.tipo_cliente, p.estado, p.total, p.pagado])],
      ["PRODUCCIÓN", ["Fecha", "Producto", "Categoría", "Preparados", "Comprometidos", "Disponibles"], reporte.produccion.map((p) => [p.fecha, p.nombre, p.categoria, p.preparados, p.comprometidos, p.disponibles])],
      ["ADICIONALES", ["ID solicitud", "ID pedido", "Fecha", "Cliente", "Estado", "Total"], reporte.adicionales.map((a) => [a.id_solicitud, a.id_pedido, a.fecha, a.cliente, a.estado, a.total])],
      ["RESERVAS DE PLATOS", ["ID reserva", "Fecha", "Hora", "Cliente", "Platos reservados", "Estado"], reporte.reservas.map((r) => [r.id_reserva, r.fecha, r.hora, r.cliente, r.cantidad_platos, r.estado])],
      ["MOVIMIENTOS PENSIONADOS", ["ID movimiento", "Fecha", "Cliente", "Producto", "Tipo", "Cantidad", "Saldo resultante", "Usuario"], reporte.movimientos_pensionados.map((m) => [m.id_movimiento, m.fecha, m.cliente, m.tipo_producto, m.tipo_movimiento, m.cantidad, m.saldo_resultante, m.usuario])],
    ];
    const lineas = [];
    for (const [titulo, encabezados, filas] of secciones) {
      lineas.push(celdaCsv(titulo));
      lineas.push(encabezados.map(celdaCsv).join(","));
      for (const fila of filas) lineas.push(fila.map(celdaCsv).join(","));
      lineas.push("");
    }
    const archivo = new Blob([`\uFEFF${lineas.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `mi-casa-reporte-${desde}-${hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const imprimirReporte = () => {
    if (!reporte) return;
    const ventana = window.open("", "_blank", "width=700,height=900");
    if (!ventana) {
      setError("Permite las ventanas emergentes para imprimir el reporte.");
      return;
    }

    const resumen = reporte.resumen || {};
    const pedidos = reporte.pedidos.map((pedido) => `<tr><td>#${escaparHtml(pedido.id_pedido)}</td><td>${escaparHtml(pedido.cliente)}</td><td>${escaparHtml(pedido.tipo_cliente)} · ${escaparHtml(pedido.estado)}</td><td>${importe(pedido.total)}</td></tr>`).join("");
    const pagos = reporte.pagos.map((pago) => `<tr><td>#${escaparHtml(pago.id_pago)}</td><td>${escaparHtml(pago.cliente)}</td><td>${escaparHtml(pago.metodo)} · ${escaparHtml(pago.estado)}</td><td>${importe(pago.monto)}</td></tr>`).join("");
    const reservas = reporte.reservas.map((reserva) => `<tr><td>#${escaparHtml(reserva.id_reserva)}</td><td>${escaparHtml(reserva.cliente)}</td><td>${escaparHtml(String(reserva.fecha).slice(0, 10))} ${escaparHtml(String(reserva.hora).slice(0, 5))}</td><td>${escaparHtml(reserva.estado)}</td></tr>`).join("");
    ventana.document.write(`<!DOCTYPE html>
      <html><head><title>Reporte Mi Casa</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #111827; }
        h1 { font-size: 20px; } h2 { margin-top: 24px; font-size: 16px; }
        .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .card { border: 1px solid #d1d5db; padding: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head><body>
        <h1>Reporte operativo Mi Casa</h1>
        <p>Periodo: ${escaparHtml(desde)} al ${escaparHtml(hasta)}</p>
        <div class="resumen">
          <div class="card">Pedidos: <strong>${escaparHtml(resumen.pedidos)}</strong></div>
          <div class="card">Pedidos pagados: <strong>${escaparHtml(resumen.pedidos_pagados)}</strong></div>
          <div class="card">Ingresos confirmados: <strong>${importe(resumen.ingresos_confirmados)}</strong></div>
          <div class="card">Gastos: <strong>${importe(resumen.gastos)}</strong></div>
          <div class="card">Reservas de platos: <strong>${escaparHtml(resumen.reservas)}</strong></div>
        </div>
        <h2>Pedidos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Tipo · Estado</th><th>Total</th></tr></thead><tbody>${pedidos}</tbody></table>
        <h2>Pagos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Método · Estado</th><th>Monto</th></tr></thead><tbody>${pagos}</tbody></table>
        <h2>Reservas de platos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Fecha y hora</th><th>Estado</th></tr></thead><tbody>${reservas}</tbody></table>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
    ventana.document.close();
  };

  const resumen = reporte?.resumen || {};
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administración</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Reportes operativos</h1>
        <p className="mt-1 text-sm text-slate-500">Información consolidada desde PostgreSQL para el periodo seleccionado.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold">Desde<input type="date" value={desde} onChange={(event) => { setCargando(true); setError(""); setDesde(event.target.value); }} className="mt-1 block rounded-lg border p-2" /></label>
        <label className="text-sm font-semibold">Hasta<input type="date" value={hasta} onChange={(event) => { setCargando(true); setError(""); setHasta(event.target.value); }} className="mt-1 block rounded-lg border p-2" /></label>
        <button type="button" onClick={consultar} disabled={cargando} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Consultar</button>
        <button type="button" onClick={exportarCsv} disabled={!reporte} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">Exportar CSV</button>
        <button type="button" onClick={imprimirReporte} disabled={!reporte} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">Imprimir reporte</button>
      </section>
      {cargando ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Consultando…</p> : reporte && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[["Pedidos", resumen.pedidos], ["Pedidos pagados", resumen.pedidos_pagados], ["Ingresos confirmados", importe(resumen.ingresos_confirmados)], ["Gastos", importe(resumen.gastos)], ["Reservas de platos", resumen.reservas]].map(([titulo, valor]) => <article key={titulo} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-2 text-2xl font-black">{valor}</p></article>)}
        </section>
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Pagos</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Fecha</th><th className="p-2">Pedido</th><th className="p-2">Cliente</th><th className="p-2">Método</th><th className="p-2">Estado</th><th className="p-2">Monto</th></tr></thead><tbody className="divide-y">{reporte.pagos.map((p) => <tr key={p.id_pago}><td className="p-2">{new Date(p.fecha).toLocaleString()}</td><td className="p-2">#{p.id_pedido}</td><td className="p-2">{p.cliente}</td><td className="p-2">{p.metodo}</td><td className="p-2">{p.estado}</td><td className="p-2">{importe(p.monto)}</td></tr>)}</tbody></table></div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Gastos</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Fecha</th><th className="p-2">Concepto</th><th className="p-2">Método</th><th className="p-2">Total</th></tr></thead><tbody className="divide-y">{reporte.gastos.map((g) => <tr key={g.id_gasto}><td className="p-2">{new Date(g.fecha).toLocaleString()}</td><td className="p-2">{g.concepto}</td><td className="p-2">{g.metodo_pago}</td><td className="p-2">{importe(g.total)}</td></tr>)}</tbody></table></div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Producción diaria</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.produccion.map((p, index) => <p key={`${p.fecha}-${p.id_producto}-${index}`} className="flex justify-between gap-3 border-t py-2 text-sm"><span>{String(p.fecha).slice(0, 10)} · {p.nombre} · {p.categoria}</span><span>{p.preparados} preparados · {p.comprometidos} comprometidos · {p.disponibles} libres</span></p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Pedidos</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.pedidos.map((p) => <p key={p.id_pedido} className="flex justify-between gap-3 border-t py-2 text-sm"><span>#{p.id_pedido} · {p.cliente} · {p.tipo_cliente} · {p.estado}</span><b>{importe(p.total)}</b></p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Reservas de platos y adicionales</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.reservas.map((r) => <p key={`r-${r.id_reserva}`} className="border-t py-2 text-sm">Reserva de platos #{r.id_reserva} · {r.cliente} · {String(r.fecha).slice(0, 10)} {String(r.hora).slice(0, 5)} · {r.estado}</p>)}{reporte.adicionales.map((a) => <p key={`a-${a.id_solicitud}`} className="border-t py-2 text-sm">Adicional #{a.id_solicitud} · Pedido #{a.id_pedido} · {a.cliente} · {a.estado} · {importe(a.total)}</p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Movimientos de pensionados</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.movimientos_pensionados.map((m) => <p key={m.id_movimiento} className="border-t py-2 text-sm">{new Date(m.fecha).toLocaleString()} · {m.cliente} · {m.tipo_movimiento} de {m.cantidad} {m.tipo_producto} · saldo {m.saldo_resultante} · {m.usuario}</p>)}</div></article>
        </section>
      </>}
    </div>
  );
}

export default Reportes;
