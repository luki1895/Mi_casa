import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { normalizeRole } from "../../auth/roles";

function Pensiones() {
  const { usuario } = useAuth();
  const rol = normalizeRole(usuario?.role ?? usuario?.rol);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [movimiento, setMovimiento] = useState({ tipo_producto: "SOPA", tipo_movimiento: "CONSUMO", cantidad: 1, observaciones: "" });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargarDetalle = useCallback(async () => {
    if (!clienteId) {
      setDetalle(null);
      return;
    }
    setDetalle(null);
    setError("");
    try {
      const { data } = await api.get(`/clientes/${clienteId}/pensiones`);
      setDetalle(data.data);
    } catch (requestError) {
      setDetalle(null);
      setError(requestError.response?.data?.mensaje || "No se pudo consultar el saldo del pensionado.");
    }
  }, [clienteId]);

  useEffect(() => {
    let cancelado = false;
    api.get("/clientes/para-pedidos")
      .then(({ data }) => {
        if (cancelado) return;
        const pensionados = (data.data || []).filter((cliente) => cliente.tipo_cliente === "PENSIONADO");
        setClientes(pensionados);
        if (pensionados.length) setClienteId((actual) => actual || String(pensionados[0].id_cliente));
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo cargar la lista de pensionados.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    if (!clienteId) return undefined;
    let cancelado = false;
    api.get(`/clientes/${clienteId}/pensiones`)
      .then(({ data }) => {
        if (!cancelado) setDetalle(data.data);
      })
      .catch((requestError) => {
        if (!cancelado) {
          setDetalle(null);
          setError(requestError.response?.data?.mensaje || "No se pudo consultar el saldo del pensionado.");
        }
      });
    return () => { cancelado = true; };
  }, [clienteId]);

  const registrar = async (event) => {
    event.preventDefault();
    if (!clienteId) return;
    setGuardando(true); setError(""); setAviso("");
    try {
      const endpoint = movimiento.tipo_movimiento === "CONSUMO" ? "consumos" : "reposiciones";
      await api.post(`/clientes/${clienteId}/pensiones/${endpoint}`, {
        tipo_producto: movimiento.tipo_producto,
        cantidad: Number(movimiento.cantidad),
        observaciones: movimiento.observaciones,
      });
      setAviso(movimiento.tipo_movimiento === "CONSUMO" ? "Consumo registrado." : "Reposición registrada.");
      setMovimiento((actual) => ({ ...actual, cantidad: 1, observaciones: "" }));
      await cargarDetalle();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Atención operativa</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Saldos pensionados</h1>
        <p className="mt-1 text-sm text-slate-500">Sopas y segundos mantienen saldos y movimientos independientes.</p>
      </header>
      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <label className="block max-w-xl text-sm font-semibold">Pensionado
          <select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="mt-1 w-full rounded-lg border p-3">
            <option value="">Selecciona un pensionado</option>
            {clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>)}
          </select>
        </label>
      </section>
      {cargando ? <p className="rounded-xl bg-white p-5">Cargando pensionados…</p> : detalle && String(detalle.id_cliente) === clienteId && <>
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Sopas disponibles</p><p className="mt-2 text-3xl font-black">{detalle.saldo_sopas ?? "Sin asignar"}</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Segundos disponibles</p><p className="mt-2 text-3xl font-black">{detalle.saldo_segundos ?? "Sin asignar"}</p></article>
        </section>
        <form onSubmit={registrar} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-4">
          <label className="text-sm font-semibold">Movimiento<select value={movimiento.tipo_movimiento} onChange={(event) => setMovimiento({ ...movimiento, tipo_movimiento: event.target.value })} className="mt-1 w-full rounded-lg border p-3"><option value="CONSUMO">Registrar consumo</option>{["admin", "caja"].includes(rol) && <option value="REPOSICION">Reponer saldo</option>}</select></label>
          <label className="text-sm font-semibold">Producto<select value={movimiento.tipo_producto} onChange={(event) => setMovimiento({ ...movimiento, tipo_producto: event.target.value })} className="mt-1 w-full rounded-lg border p-3"><option value="SOPA">Sopa</option><option value="SEGUNDO">Segundo</option></select></label>
          <label className="text-sm font-semibold">Cantidad<input required type="number" min="1" step="1" value={movimiento.cantidad} onChange={(event) => setMovimiento({ ...movimiento, cantidad: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="text-sm font-semibold">Observaciones<input maxLength="500" value={movimiento.observaciones} onChange={(event) => setMovimiento({ ...movimiento, observaciones: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="md:col-span-4 flex justify-end"><button disabled={guardando || !clienteId} className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Registrando…" : "Registrar movimiento"}</button></div>
        </form>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Historial de {detalle.nombre}</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Fecha</th><th className="p-3">Producto</th><th className="p-3">Tipo</th><th className="p-3">Cantidad</th><th className="p-3">Saldo</th><th className="p-3">Responsable</th><th className="p-3">Observaciones</th></tr></thead><tbody className="divide-y">{detalle.movimientos.length === 0 ? <tr><td colSpan="7" className="p-6 text-center text-slate-500">Sin movimientos registrados.</td></tr> : detalle.movimientos.map((registro) => <tr key={registro.id_movimiento}><td className="p-3">{new Date(registro.fecha).toLocaleString()}</td><td className="p-3">{registro.tipo_producto}</td><td className="p-3">{registro.tipo_movimiento}</td><td className="p-3">{registro.cantidad}</td><td className="p-3">{registro.saldo_resultante}</td><td className="p-3">{registro.usuario || "—"}</td><td className="p-3">{registro.observaciones || "—"}</td></tr>)}</tbody></table></div>
        </section>
      </>}
    </div>
  );
}

export default Pensiones;
