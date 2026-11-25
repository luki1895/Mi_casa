import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Button } from "../../components/ui";
import ConfiguracionMesas from "./ConfiguracionMesas";

function Configuracion() {
  const [seccionActiva, setSeccionActiva] = useState("GENERAL");
  const [mesasVisitadas, setMesasVisitadas] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [horarioReservas, setHorarioReservas] = useState(null);
  const [errorHorario, setErrorHorario] = useState("");
  const [mensajeHorario, setMensajeHorario] = useState("");
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  useEffect(() => {
    api.get("/configuracion").then(({ data }) => setConfiguracion(data.data || {}))
      .catch((requestError) => setError(requestError.response?.data?.mensaje || "No se pudo cargar la configuración."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    api.get("/reservas-platos/configuracion")
      .then(({ data }) => setHorarioReservas(data.data || {}))
      .catch((requestError) => setErrorHorario(requestError.response?.data?.mensaje || "No se pudo consultar la configuración de reservas de platos."));
  }, []);

  const guardar = async (event) => {
    event.preventDefault(); setGuardando(true); setMensaje(""); setError("");
    try {
      const campos = ["precio_almuerzo", "precio_sopa", "precio_segundo", "precio_entrada", "precio_refresco", "precio_plato_extra", "precio_vaso_extra_refresco"];
      const precios = Object.fromEntries(campos.map((campo) => [
        campo,
        configuracion[campo] === "" || configuracion[campo] === null || configuracion[campo] === undefined
          ? null
          : Number(configuracion[campo]),
      ]));
      if (Object.values(precios).some((valor) => valor !== null && (!Number.isFinite(valor) || valor < 0))) throw new Error("Los precios deben ser valores no negativos.");
      await api.put("/configuracion", precios);
      const { data } = await api.get("/configuracion");
      setConfiguracion(data.data || {});
      setMensaje("Precios vigentes actualizados. Los anteriores se conservaron en el historial.");
    } catch (requestError) { setError(requestError.message || requestError.response?.data?.mensaje || "No se pudo guardar la configuración."); }
    finally { setGuardando(false); }
  };

  const guardarHorario = async (event) => {
    event.preventDefault(); setGuardandoHorario(true); setMensajeHorario(""); setErrorHorario("");
    try {
      const datos = {
        hora_inicio: horarioReservas.hora_inicio,
        hora_fin: horarioReservas.hora_fin,
        intervalo_minutos: Number(horarioReservas.intervalo_minutos),
        tolerancia_minutos: Number(horarioReservas.tolerancia_minutos),
      };
      await api.put("/reservas-platos/configuracion", datos);
      setMensajeHorario("Horario de reservas de platos actualizado.");
    } catch (requestError) { setErrorHorario(requestError.response?.data?.mensaje || "No se pudo guardar el horario de reservas."); }
    finally { setGuardandoHorario(false); }
  };

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administrador</p><h1 className="mt-1 text-3xl font-black">Configuración</h1><p className="mt-1 text-sm text-slate-500">Administra las opciones operativas y del sistema.</p></header>
      <nav aria-label="Secciones de configuración" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[
          ["GENERAL", "Precios"],
          ["RESERVAS", "Reservas de platos"],
          ["MESAS", "Mesas"],
        ].map(([seccion, titulo]) => (
          <Button
            key={seccion}
            variant={seccionActiva === seccion ? "primary" : "secondary"}
            aria-current={seccionActiva === seccion ? "page" : undefined}
            onClick={() => {
              setSeccionActiva(seccion);
              if (seccion === "MESAS") setMesasVisitadas(true);
            }}
          >
            {titulo}
          </Button>
        ))}
      </nav>

      {mesasVisitadas && (
        <div hidden={seccionActiva !== "MESAS"}>
          <ConfiguracionMesas />
        </div>
      )}
      {seccionActiva !== "MESAS" && (
        <>
          {seccionActiva === "GENERAL" && (
            <>
              {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
              {mensaje && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</p>}
              {cargando ? <p className="rounded-xl bg-white p-6">Cargando configuración…</p> : configuracion && <form onSubmit={guardar} className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-black">Precios con vigencia</h2>
                <p className="mb-4 text-sm text-slate-600">Los precios sembrados en versiones anteriores no se consideran vigentes. Deja un campo vacío si todavía no has confirmado ese precio; guardar vacío retira solo su precio actual y conserva el historial.</p>
                <div className="grid gap-4 sm:grid-cols-2">{[["precio_almuerzo","Almuerzo completo"],["precio_sopa","Sopa"],["precio_segundo","Segundo independiente"],["precio_entrada","Entrada"],["precio_refresco","Refresco vendido aparte"],["precio_plato_extra","Plato extra"],["precio_vaso_extra_refresco","Vaso extra de refresco"]].map(([campo,label]) => <label key={campo} className="text-sm font-semibold text-slate-700">{label}<div className="mt-1 flex items-center gap-2 rounded-lg border px-3"><span className="text-slate-400">Bs</span><input type="number" min="0" step="0.01" value={configuracion[campo] ?? ""} onChange={(event) => setConfiguracion({ ...configuracion, [campo]: event.target.value })} className="w-full py-3 outline-none" /></div></label>)}</div>
                <button disabled={guardando} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar precios vigentes"}</button>
                {configuracion.historial_precios?.length > 0 && <div className="mt-8 overflow-x-auto"><h3 className="mb-3 font-bold">Historial de precios</h3><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-2">Concepto</th><th className="p-2">Precio</th><th className="p-2">Vigente desde</th><th className="p-2">Vigente hasta</th></tr></thead><tbody>{configuracion.historial_precios.map((item, index) => <tr key={`${item.codigo}-${item.vigente_desde}-${index}`} className="border-b"><td className="p-2">{item.codigo}</td><td className="p-2">Bs {Number(item.precio).toFixed(2)}</td><td className="p-2">{new Date(item.vigente_desde).toLocaleString()}</td><td className="p-2">{item.vigente_hasta ? new Date(item.vigente_hasta).toLocaleString() : "Vigente"}</td></tr>)}</tbody></table></div>}
              </form>}
            </>
          )}
          {seccionActiva === "RESERVAS" && (
            <>
              {errorHorario && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{errorHorario}</p>}
              {mensajeHorario && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{mensajeHorario}</p>}
              {horarioReservas && <form onSubmit={guardarHorario} className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-black">Reservas de platos</h2>
                <p className="mb-4 text-sm text-slate-500">Configura los horarios reales. No se aceptarán solicitudes hasta definir inicio, fin e intervalo.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">Hora de inicio<input required type="time" value={String(horarioReservas.hora_inicio || "").slice(0, 5)} onChange={(event) => setHorarioReservas({ ...horarioReservas, hora_inicio: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                  <label className="text-sm font-semibold">Hora de fin<input required type="time" value={String(horarioReservas.hora_fin || "").slice(0, 5)} onChange={(event) => setHorarioReservas({ ...horarioReservas, hora_fin: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                  <label className="text-sm font-semibold">Intervalo entre horarios (minutos)<input required type="number" min="1" max="32767" step="1" value={horarioReservas.intervalo_minutos ?? ""} onChange={(event) => setHorarioReservas({ ...horarioReservas, intervalo_minutos: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                  <label className="text-sm font-semibold">Tolerancia de llegada (minutos)<input required type="number" min="0" max="32767" step="1" value={horarioReservas.tolerancia_minutos ?? ""} onChange={(event) => setHorarioReservas({ ...horarioReservas, tolerancia_minutos: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
                </div>
                <button disabled={guardandoHorario} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{guardandoHorario ? "Guardando…" : "Guardar horario"}</button>
              </form>}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Configuracion;
