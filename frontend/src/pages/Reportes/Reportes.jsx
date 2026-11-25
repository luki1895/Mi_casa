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
const lineasVenta = (pedidos = []) => pedidos.flatMap((pedido) => (
  Array.isArray(pedido.detalle)
    ? pedido.detalle.map((detalle) => ({ ...detalle, pedido }))
    : []
));
const etiquetaTipoProducto = (detalle) => ({
  ALMUERZO_COMPLETO: "Almuerzo completo",
  VASO_EXTRA_REFRESCO: "Vaso extra de refresco",
  SOPA: "Sopa independiente",
  SEGUNDO_POLLO: "Segundo de pollo",
  SEGUNDO_CARNE: "Segundo de carne",
}[detalle.tipo_producto] || detalle.categoria || "Producto");
const componentesCompleto = (detalle) => [
  detalle.sopa_incluida ? `Sopa: ${detalle.sopa_incluida}` : "Sopa incluida",
  detalle.segundo_elegido ? `Segundo: ${detalle.segundo_elegido}` : null,
  detalle.refresco_incluido
    ? `Refresco gratuito${detalle.refresco_acompanamiento ? `: ${detalle.refresco_acompanamiento}` : ""}`
    : null,
].filter(Boolean).join(" · ");

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
    const detallesVenta = lineasVenta(reporte.pedidos);
    const consumosGenericos = (reporte.movimientos_pensionados || [])
      .filter((movimiento) => movimiento.tipo_producto === "SEGUNDO" && movimiento.tipo_movimiento === "CONSUMO")
      .reduce((total, movimiento) => total + Number(movimiento.cantidad || 0), 0);
    const secciones = [
      ["RESUMEN", ["Campo", "Valor"], Object.entries(reporte.resumen)],
      ["PAGOS", ["ID pago", "ID pedido", "Fecha", "Cliente", "Monto", "Método", "Estado", "Motivo anulación"], reporte.pagos.map((p) => [p.id_pago, p.id_pedido, p.fecha, p.cliente, p.monto, p.metodo, p.estado, p.motivo_anulacion])],
      ["GASTOS", ["ID gasto", "Fecha", "Concepto", "Descripción", "Total", "Método"], reporte.gastos.map((g) => [g.id_gasto, g.fecha, g.concepto, g.descripcion, g.total, g.metodo_pago])],
      ["PEDIDOS", ["ID pedido", "Fecha", "Cliente", "Tipo", "Estado", "Total", "Pagado"], reporte.pedidos.map((p) => [p.id_pedido, p.fecha, p.cliente, p.tipo_cliente, p.estado, p.total, p.pagado])],
      ["DETALLE DE VENTAS", ["ID pedido", "Fecha", "Cliente", "Tipo de producto", "Producto", "Cantidad", "Sopa incluida", "Segundo elegido", "Refresco incluido (gratuito)", "Precio aplicado", "Subtotal"], detallesVenta.map(({ pedido, ...detalle }) => [
        pedido.id_pedido, pedido.fecha, pedido.cliente, etiquetaTipoProducto(detalle), detalle.nombre, detalle.cantidad,
        detalle.sopa_incluida, detalle.segundo_elegido,
        detalle.refresco_incluido ? (detalle.refresco_acompanamiento || "Sí, gratuito") : "",
        detalle.precio, detalle.subtotal,
      ])],
      ["PRODUCCIÓN", ["Fecha", "Producto", "Categoría", "Preparados", "Comprometidos", "Consumos pensionados", "Disponibles"], reporte.produccion.map((p) => [p.fecha, p.nombre, p.categoria, p.preparados, p.comprometidos, p.consumos_pensionados, p.disponibles])],
      ["ADICIONALES", ["ID solicitud", "ID pedido", "Fecha", "Cliente", "Estado", "Total"], reporte.adicionales.map((a) => [a.id_solicitud, a.id_pedido, a.fecha, a.cliente, a.estado, a.total])],
      ["RESERVAS DE PLATOS", ["ID reserva", "Fecha", "Hora", "Cliente", "Platos reservados", "Estado"], reporte.reservas.map((r) => [r.id_reserva, r.fecha, r.hora, r.cliente, r.cantidad_platos, r.estado])],
      ["MOVIMIENTOS PENSIONADOS", ["ID movimiento", "Fecha", "Cliente", "Producto", "Tipo", "Cantidad", "Saldo resultante", "Usuario"], reporte.movimientos_pensionados.map((m) => [m.id_movimiento, m.fecha, m.cliente, m.tipo_producto, m.tipo_movimiento, m.cantidad, m.saldo_resultante, m.usuario])],
      ["SEGUNDO HISTÓRICO SIN ESPECIFICAR", ["Concepto", "Unidades consumidas", "Asignación a pollo/carne"], [["SEGUNDO", consumosGenericos, "No asignado; no se descuenta de una opción específica"]]],
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
    const detallesVenta = lineasVenta(reporte.pedidos);
    const consumosGenericos = (reporte.movimientos_pensionados || [])
      .filter((movimiento) => movimiento.tipo_producto === "SEGUNDO" && movimiento.tipo_movimiento === "CONSUMO")
      .reduce((total, movimiento) => total + Number(movimiento.cantidad || 0), 0);
    const detalleVentasImpresion = detallesVenta.map(({ pedido, ...detalle }) => {
      const componentes = detalle.tipo_venta === "ALMUERZO_COMPLETO" ? componentesCompleto(detalle) : "";
      return `<tr><td>#${escaparHtml(pedido.id_pedido)}</td><td>${escaparHtml(pedido.cliente)}</td><td>${escaparHtml(etiquetaTipoProducto(detalle))}</td><td>${escaparHtml(detalle.nombre)}</td><td>${escaparHtml(componentes)}</td><td>${escaparHtml(detalle.cantidad)}</td><td>${importe(detalle.precio)}</td><td>${importe(detalle.subtotal)}</td></tr>`;
    }).join("");
    const produccionImpresion = reporte.produccion.map((item) => `<tr><td>${escaparHtml(String(item.fecha).slice(0, 10))}</td><td>${escaparHtml(item.nombre)}</td><td>${escaparHtml(item.preparados)}</td><td>${escaparHtml(item.comprometidos)}</td><td>${escaparHtml(item.consumos_pensionados)}</td><td>${escaparHtml(item.disponibles)}</td></tr>`).join("");
    const movimientosImpresion = (reporte.movimientos_pensionados || []).map((movimiento) => `<tr><td>${escaparHtml(movimiento.cliente)}</td><td>${escaparHtml(movimiento.tipo_producto === "SEGUNDO" ? "Segundo histórico sin especificar" : movimiento.tipo_producto)}</td><td>${escaparHtml(movimiento.tipo_movimiento)}</td><td>${escaparHtml(movimiento.cantidad)}</td><td>${escaparHtml(movimiento.saldo_resultante)}</td></tr>`).join("");
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
          <div class="card">Segundos históricos sin especificar consumidos: <strong>${escaparHtml(consumosGenericos)}</strong></div>
        </div>
        <h2>Pedidos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Tipo · Estado</th><th>Total</th></tr></thead><tbody>${pedidos}</tbody></table>
        <h2>Detalle comercial</h2><p>El completo se cuenta como una línea de venta. Sus componentes son informativos para producción; el refresco incluido es gratuito.</p>
        <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Producto</th><th>Componentes incluidos</th><th>Cantidad</th><th>Precio aplicado</th><th>Subtotal</th></tr></thead><tbody>${detalleVentasImpresion}</tbody></table>
        <h2>Producción</h2><table><thead><tr><th>Fecha</th><th>Producto</th><th>Preparados</th><th>Comprometidos</th><th>Consumos pensionados asignados</th><th>Disponibles</th></tr></thead><tbody>${produccionImpresion}</tbody></table>
        <h2>Pagos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Método · Estado</th><th>Monto</th></tr></thead><tbody>${pagos}</tbody></table>
        <h2>Movimientos de pensionados</h2><p>Consumos históricos genéricos sin especificar: ${escaparHtml(consumosGenericos)} unidades; no se asignan a pollo o carne.</p>
        <table><thead><tr><th>Cliente</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Saldo</th></tr></thead><tbody>${movimientosImpresion}</tbody></table>
        <h2>Reservas de platos</h2><table><thead><tr><th>ID</th><th>Cliente</th><th>Fecha y hora</th><th>Estado</th></tr></thead><tbody>${reservas}</tbody></table>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
    ventana.document.close();
  };

  const resumen = reporte?.resumen || {};
  const detallesVenta = lineasVenta(reporte?.pedidos);
  const consumosGenericos = (reporte?.movimientos_pensionados || [])
    .filter((movimiento) => movimiento.tipo_producto === "SEGUNDO" && movimiento.tipo_movimiento === "CONSUMO")
    .reduce((total, movimiento) => total + Number(movimiento.cantidad || 0), 0);
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
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Producción diaria</h2><p className="mt-1 text-xs text-slate-500">Los componentes del completo se muestran solo como consumo de producción; no vuelven a sumarse como ventas. El refresco incluido no se descuenta.</p><div className="mt-3 max-h-80 overflow-auto">{reporte.produccion.map((p, index) => <p key={`${p.fecha}-${p.id_producto}-${index}`} className="flex justify-between gap-3 border-t py-2 text-sm"><span>{String(p.fecha).slice(0, 10)} · {p.nombre} · {p.categoria}</span><span>{p.preparados} preparados · {p.comprometidos} comprometidos · {p.consumos_pensionados} pensionados · {p.disponibles} libres</span></p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Pedidos</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.pedidos.map((p) => <p key={p.id_pedido} className="flex justify-between gap-3 border-t py-2 text-sm"><span>#{p.id_pedido} · {p.cliente} · {p.tipo_cliente} · {p.estado}</span><b>{importe(p.total)}</b></p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2"><h2 className="text-xl font-black">Detalle de ventas</h2><p className="mt-1 text-xs text-slate-500">Precios y subtotales guardados en cada venta. El completo se muestra una sola vez; sus componentes no generan ingresos aparte.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Pedido</th><th className="p-2">Tipo</th><th className="p-2">Producto</th><th className="p-2">Componentes incluidos</th><th className="p-2">Cantidad</th><th className="p-2">Precio aplicado</th><th className="p-2">Subtotal</th></tr></thead><tbody className="divide-y">{detallesVenta.map(({ pedido, ...detalle }, index) => <tr key={`${pedido.id_pedido}-${index}`}><td className="p-2">#{pedido.id_pedido} · {pedido.cliente}</td><td className="p-2">{etiquetaTipoProducto(detalle)}</td><td className="p-2">{detalle.nombre}</td><td className="p-2">{detalle.tipo_venta === "ALMUERZO_COMPLETO" ? componentesCompleto(detalle) : detalle.tipo_venta === "VASO_EXTRA_REFRESCO" ? "Venta independiente; no consume inventario de refresco" : "—"}</td><td className="p-2">{detalle.cantidad}</td><td className="p-2">{importe(detalle.precio)}</td><td className="p-2">{importe(detalle.subtotal)}</td></tr>)}</tbody></table>{detallesVenta.length === 0 && <p className="p-4 text-sm text-slate-500">Sin líneas de venta para este periodo.</p>}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Reservas de platos y adicionales</h2><div className="mt-3 max-h-80 overflow-auto">{reporte.reservas.map((r) => <p key={`r-${r.id_reserva}`} className="border-t py-2 text-sm">Reserva de platos #{r.id_reserva} · {r.cliente} · {String(r.fecha).slice(0, 10)} {String(r.hora).slice(0, 5)} · {r.estado}</p>)}{reporte.adicionales.map((a) => <p key={`a-${a.id_solicitud}`} className="border-t py-2 text-sm">Adicional #{a.id_solicitud} · Pedido #{a.id_pedido} · {a.cliente} · {a.estado} · {importe(a.total)}</p>)}</div></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Movimientos de pensionados</h2><p className="mt-1 text-xs text-slate-500">Segundo histórico sin especificar consumido en el periodo: {consumosGenericos} unidades. No se asigna a pollo o carne ni se descuenta de una producción concreta.</p><div className="mt-3 max-h-80 overflow-auto">{reporte.movimientos_pensionados.map((m) => <p key={m.id_movimiento} className="border-t py-2 text-sm">{new Date(m.fecha).toLocaleString()} · {m.cliente} · {m.tipo_movimiento} de {m.cantidad} {m.tipo_producto === "SEGUNDO" ? "segundo histórico sin especificar" : m.tipo_producto} · saldo {m.saldo_resultante} · {m.usuario}</p>)}</div></article>
        </section>
      </>}
    </div>
  );
}

export default Reportes;
