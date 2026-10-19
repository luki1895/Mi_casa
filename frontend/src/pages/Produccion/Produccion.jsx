import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const campos = [
  ["Sopa", "id_sopa", "cantidad_sopa"],
  ["Segundo 1", "id_segundo1", "cantidad_segundo1"],
  ["Segundo 2", "id_segundo2", "cantidad_segundo2"],
  ["Entrada", "id_entrada", "cantidad_entrada"],
  ["Bebida", "id_refresco", "cantidad_refresco"],
  ["Plato extra", "id_plato_extra", "cantidad_extra"],
];

const nuevaProduccion = () => ({
  id_sopa: "", id_segundo1: "", id_segundo2: "", id_entrada: "", id_refresco: "", id_plato_extra: "",
  cantidad_sopa: 0, cantidad_segundo1: 0, cantidad_segundo2: 0,
  cantidad_entrada: 0, cantidad_refresco: 0, cantidad_extra: 0, precio_extra: "",
});

const fechaLocal = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

function Produccion() {
  const [fecha, setFecha] = useState(fechaLocal);
  const [produccion, setProduccion] = useState(nuevaProduccion);
  const [productos, setProductos] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [produccionResponse, productosResponse, menuResponse] = await Promise.all([
        api.get(`/produccion?fecha=${fecha}`),
        api.get("/produccion/productos"),
        api.get(`/produccion/menu?fecha=${fecha}`),
      ]);
      const fila = produccionResponse.data.data?.[0];
      const formulario = nuevaProduccion();
      campos.forEach(([, idCampo, cantidadCampo]) => {
        formulario[idCampo] = fila?.[idCampo] ?? "";
        formulario[cantidadCampo] = Number(fila?.[cantidadCampo] ?? 0);
      });
      formulario.precio_extra = fila?.precio_extra ?? "";
      setProduccion(formulario);
      setProductos(productosResponse.data.data || []);
      setDisponibilidad(menuResponse.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo consultar la producción. Verifica que el backend y la migración estén activos.");
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPreparados = useMemo(() => campos.reduce(
    (total, [, , cantidadCampo]) => total + Number(produccion[cantidadCampo] || 0), 0
  ), [produccion]);

  const actualizar = (campo, valor) => {
    setProduccion((actual) => ({ ...actual, [campo]: valor }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setAviso("");
    setError("");
    try {
      const body = { ...produccion, fecha };
      campos.forEach(([, idCampo, cantidadCampo]) => {
        body[idCampo] = body[idCampo] || null;
        body[cantidadCampo] = Number(body[cantidadCampo] || 0);
        if (body[cantidadCampo] < 0 || !Number.isInteger(body[cantidadCampo])) {
          throw new Error("Las cantidades deben ser números enteros mayores o iguales a cero.");
        }
        if (!body[idCampo]) body[cantidadCampo] = 0;
      });
      if (body.precio_extra !== "" && Number(body.precio_extra) < 0) {
        throw new Error("El precio del plato extra no puede ser negativo.");
      }
      body.precio_extra = body.precio_extra === "" ? null : Number(body.precio_extra);
      await api.post("/produccion", body);
      setAviso("Producción del día guardada.");
      await cargar();
    } catch (requestError) {
      setError(requestError.message || requestError.response?.data?.mensaje || "No se pudo guardar la producción.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Operación diaria</p><h1 className="mt-1 text-3xl font-black text-slate-900">Producción y disponibilidad</h1></div>
        <label className="text-sm font-semibold text-slate-600">Fecha <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
      </header>
      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Platos preparados</p><p className="mt-2 text-3xl font-black">{totalPreparados}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Unidades vendidas</p><p className="mt-2 text-3xl font-black">{disponibilidad.reduce((total, plato) => total + Number(plato.vendidos || 0), 0)}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Unidades reservadas</p><p className="mt-2 text-3xl font-black">{disponibilidad.reduce((total, plato) => total + Number(plato.reservados || 0), 0)}</p></div>
      </section>
      <form onSubmit={guardar} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Menú del día</h2><p className="text-sm text-slate-500">Selecciona productos registrados y registra las unidades preparadas.</p></div><button type="button" onClick={cargar} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Actualizar</button></div>
        {cargando ? <p className="py-6 text-center text-slate-500">Cargando producción…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Categoría</th><th className="p-3">Plato</th><th className="p-3">Preparados</th><th className="p-3">Precio extra del día</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {campos.map(([etiqueta, idCampo, cantidadCampo]) => (
                  <tr key={idCampo}>
                    <td className="p-3 font-semibold">{etiqueta}</td>
                    <td className="p-3"><select value={produccion[idCampo]} onChange={(event) => actualizar(idCampo, event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2"><option value="">No ofrecer</option>{productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre}</option>)}</select></td>
                    <td className="p-3"><input type="number" min="0" step="1" value={produccion[cantidadCampo]} onChange={(event) => actualizar(cantidadCampo, event.target.value)} disabled={!produccion[idCampo]} className="w-28 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" /></td>
                    <td className="p-3">{idCampo === "id_plato_extra" ? <input aria-label="Precio especial del plato extra" type="number" min="0" step="0.01" placeholder="Usar precio habitual" value={produccion.precio_extra} onChange={(event) => actualizar("precio_extra", event.target.value)} className="w-40 rounded-lg border border-slate-200 px-3 py-2" /> : <span className="text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-5 flex justify-end"><button disabled={guardando || cargando} className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar producción"}</button></div>
      </form>
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Disponibilidad para venta</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Plato</th><th className="p-3">Categoría</th><th className="p-3">Preparados</th><th className="p-3">Vendidos</th><th className="p-3">Reservados</th><th className="p-3">Disponibles</th><th className="p-3">Precio</th></tr></thead><tbody className="divide-y divide-slate-100">{disponibilidad.length === 0 ? <tr><td colSpan="7" className="p-6 text-center text-slate-500">Sin producción disponible para esta fecha.</td></tr> : disponibilidad.map((plato) => <tr key={`${plato.id_producto}-${plato.categoria}`}><td className="p-3 font-semibold">{plato.nombre}</td><td className="p-3">{plato.categoria}</td><td className="p-3">{plato.preparados}</td><td className="p-3">{plato.vendidos}</td><td className="p-3">{plato.reservados}</td><td className="p-3 font-bold">{plato.stock}</td><td className="p-3">Bs {Number(plato.precio).toFixed(2)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

export default Produccion;
