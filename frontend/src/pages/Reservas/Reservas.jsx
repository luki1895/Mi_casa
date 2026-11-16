import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";

const fechaLocal = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

const siguienteEstado = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["ATENDIDA", "CANCELADA", "NO_ASISTIO"],
  ATENDIDA: [],
  CANCELADA: [],
  NO_ASISTIO: [],
};

function Reservas() {
  const hoy = fechaLocal();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [reservas, setReservas] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/clientes/reservas", {
        params: { desde: desde || undefined, hasta: hasta || undefined, estado: estadoFiltro || undefined },
      });
      setReservas(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudieron cargar las reservas.");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, estadoFiltro]);

  useEffect(() => {
    let cancelado = false;
    api.get("/clientes/reservas", {
      params: { desde: desde || undefined, hasta: hasta || undefined, estado: estadoFiltro || undefined },
    })
      .then(({ data }) => {
        if (!cancelado) setReservas(data.data || []);
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudieron cargar las reservas.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, [desde, hasta, estadoFiltro]);

  const abrir = async (reserva) => {
    setError("");
    setAviso("");
    try {
      const { data } = await api.get(`/clientes/reservas/${reserva.id_reserva}`);
      setSeleccionada(data.data);
      setObservaciones(data.data.observaciones_admin || "");
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo consultar la reserva.");
    }
  };

  const actualizar = async (estado) => {
    if (!seleccionada) return;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const { data } = await api.patch(`/clientes/reservas/${seleccionada.id_reserva}/estado`, {
        estado,
        observaciones_admin: observaciones,
      });
      setSeleccionada(data.data);
      setObservaciones(data.data.observaciones_admin || "");
      setAviso("Reserva actualizada y cambio registrado en el historial.");
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo actualizar la reserva.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarObservaciones = async () => {
    if (!seleccionada) return;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const { data } = await api.patch(`/clientes/reservas/${seleccionada.id_reserva}/estado`, {
        observaciones_admin: observaciones,
      });
      setSeleccionada(data.data);
      setObservaciones(data.data.observaciones_admin || "");
      setAviso("Observación administrativa guardada en el historial.");
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo guardar la observación.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Atención al cliente</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Reservas</h1>
        <p className="mt-1 text-sm text-slate-500">Las solicitudes se revisan y actualizan por Administrador o Caja. No se aplica límite de aforo.</p>
      </header>
      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-sm font-semibold">Desde<input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm font-semibold">Hasta<input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="text-sm font-semibold">Estado<select value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Todos</option>{Object.keys(siguienteEstado).map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></label>
          <button type="button" onClick={cargar} className="self-end rounded-lg border px-4 py-2 font-semibold">Actualizar lista</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Cliente</th><th className="p-3">Fecha</th><th className="p-3">Hora</th><th className="p-3">Personas</th><th className="p-3">Estado</th><th className="p-3">Detalle</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? <tr><td colSpan="6" className="p-6 text-center">Cargando reservas…</td></tr> : reservas.length === 0 ? <tr><td colSpan="6" className="p-6 text-center text-slate-500">No hay reservas para estos filtros.</td></tr> : reservas.map((reserva) => (
                <tr key={reserva.id_reserva}>
                  <td className="p-3 font-semibold">{reserva.cliente}<small className="block font-normal text-slate-500">{reserva.telefono || "Sin teléfono"}</small></td>
                  <td className="p-3">{new Date(`${String(reserva.fecha).slice(0, 10)}T00:00:00`).toLocaleDateString()}</td>
                  <td className="p-3">{String(reserva.hora).slice(0, 5)}</td>
                  <td className="p-3">{reserva.cantidad_personas}</td>
                  <td className="p-3">{reserva.estado}</td>
                  <td className="p-3"><button type="button" onClick={() => abrir(reserva)} className="rounded-md border px-3 py-1.5 font-semibold">Revisar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {seleccionada && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap justify-between gap-3">
          <div><h2 className="text-xl font-black">Reserva #{seleccionada.id_reserva} · {seleccionada.cliente}</h2><p className="text-sm text-slate-500">{seleccionada.cantidad_personas} personas · {String(seleccionada.fecha).slice(0, 10)} · {String(seleccionada.hora).slice(0, 5)} · {seleccionada.estado}</p></div>
          <button type="button" onClick={() => setSeleccionada(null)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Cerrar detalle</button>
        </div>
        <p className="rounded-lg bg-slate-50 p-3 text-sm">{seleccionada.observaciones || "Sin observaciones del cliente."}</p>
        <label className="block text-sm font-semibold">Observaciones administrativas<textarea maxLength="1000" rows="3" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" disabled={guardando} onClick={guardarObservaciones} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">Guardar observación</button>
          <div className="flex flex-wrap gap-2">
            {(siguienteEstado[seleccionada.estado] || []).map((estado) => <button key={estado} type="button" disabled={guardando} onClick={() => actualizar(estado)} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{estado.replace("_", " ")}</button>)}
          </div>
        </div>
        <div><h3 className="font-bold">Historial de cambios</h3><div className="mt-2 space-y-2">{seleccionada.historial?.length ? seleccionada.historial.map((registro) => <p key={registro.id_historial} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{registro.estado_anterior || "Nueva"} → {registro.estado_nuevo}</strong> · {registro.usuario || "Usuario no disponible"} · {new Date(registro.fecha).toLocaleString()}{registro.observaciones_admin && <span className="block text-slate-600">{registro.observaciones_admin}</span>}</p>) : <p className="text-sm text-slate-500">Sin cambios administrativos registrados.</p>}</div></div>
      </section>}
    </div>
  );
}

export default Reservas;
