import { useEffect, useState } from "react";
import api from "../../api/axios";

function Configuracion() {
  const [configuracion, setConfiguracion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/configuracion").then(({ data }) => setConfiguracion(data.data || {}))
      .catch((requestError) => setError(requestError.response?.data?.mensaje || "No se pudo cargar la configuración."))
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (event) => {
    event.preventDefault(); setGuardando(true); setMensaje(""); setError("");
    try {
      const campos = ["precio_almuerzo", "precio_sopa", "precio_segundo", "precio_entrada", "precio_refresco", "precio_plato_extra"];
      const precios = Object.fromEntries(campos.map((campo) => [campo, Number(configuracion[campo] || 0)]));
      if (Object.values(precios).some((valor) => !Number.isFinite(valor) || valor < 0)) throw new Error("Los precios deben ser valores no negativos.");
      await api.put("/configuracion", precios);
      setMensaje("Precios habituales actualizados.");
    } catch (requestError) { setError(requestError.message || requestError.response?.data?.mensaje || "No se pudo guardar la configuración."); }
    finally { setGuardando(false); }
  };

  return (
    <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administrador</p><h1 className="mt-1 text-3xl font-black">Configuración de precios</h1><p className="mt-1 text-sm text-slate-500">Precios habituales del menú. El extra puede llevar un precio especial desde Producción.</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}{mensaje && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</p>}{cargando ? <p className="rounded-xl bg-white p-6">Cargando configuración…</p> : configuracion && <form onSubmit={guardar} className="rounded-2xl bg-white p-6 shadow-sm"><div className="grid gap-4 sm:grid-cols-2">{[["precio_almuerzo","Almuerzo completo"],["precio_sopa","Sopa"],["precio_segundo","Segundo"],["precio_entrada","Entrada"],["precio_refresco","Bebida"],["precio_plato_extra","Plato extra habitual"]].map(([campo,label]) => <label key={campo} className="text-sm font-semibold text-slate-700">{label}<div className="mt-1 flex items-center gap-2 rounded-lg border px-3"><span className="text-slate-400">Bs</span><input type="number" min="0" step="0.01" value={configuracion[campo] ?? 0} onChange={(event) => setConfiguracion({ ...configuracion, [campo]: event.target.value })} className="w-full py-3 outline-none" /></div></label>)}</div><button disabled={guardando} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar precios"}</button></form>}</div>
  );
}

export default Configuracion;
