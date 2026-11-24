import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";

const formularioVacio = { nombre: "", categoria: "SOPA", descripcion: "", imagen_url: "" };
const categorias = ["SOPA", "SEGUNDO", "ENTRADA", "REFRESCO", "EXTRA", "OTRO"];

function Productos() {
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    setErrorCatalogo("");
    try {
      const { data } = await api.get("/productos");
      setProductos(data.data || []);
    } catch (requestError) {
      const mensaje = requestError.response?.data?.mensaje || "No se pudo cargar el catálogo de productos.";
      setErrorCatalogo(mensaje);
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    api.get("/productos")
      .then(({ data }) => {
        if (!cancelado) {
          setProductos(data.data || []);
          setErrorCatalogo("");
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          const mensaje = requestError.response?.data?.mensaje || "No se pudo cargar el catálogo de productos.";
          setErrorCatalogo(mensaje);
          setError(mensaje);
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, []);

  const cambiarCampo = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const limpiar = () => {
    setFormulario(formularioVacio);
    setEditando(null);
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      if (editando === null) {
        await api.post("/productos", formulario);
        setAviso("Producto creado.");
      } else {
        await api.put(`/productos/${editando}`, formulario);
        setAviso("Producto actualizado.");
      }
      limpiar();
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  const editar = (producto) => {
    setEditando(producto.id_producto);
    setFormulario({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion || "",
      imagen_url: producto.imagen_url || "",
    });
    setError("");
    setAviso("");
  };

  const cambiarEstado = async (producto) => {
    const accion = producto.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} el producto "${producto.nombre}"?`)) return;
    setError("");
    setAviso("");
    try {
      await api.patch(`/productos/${producto.id_producto}/estado`, { activo: !producto.activo });
      setAviso(`Producto ${producto.activo ? "desactivado" : "activado"}.`);
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || `No se pudo ${accion} el producto.`);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administración</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Catálogo de productos</h1>
        <p className="mt-2 text-sm text-slate-600">Los precios de venta se configuran por categoría; los productos con historial no se eliminan físicamente.</p>
      </header>

      {(error || aviso) && (
        <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
          {error || aviso}
        </p>
      )}

      <form onSubmit={guardar} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{editando === null ? "Nuevo producto" : "Editar producto"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Nombre
            <input name="nombre" required maxLength="180" value={formulario.nombre} onChange={cambiarCampo} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Categoría
            <select name="categoria" value={formulario.categoria} onChange={cambiarCampo} className="w-full rounded-lg border border-slate-200 px-3 py-2">
              {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 md:col-span-2">
            Descripción (opcional)
            <textarea name="descripcion" rows="3" value={formulario.descripcion} onChange={cambiarCampo} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 md:col-span-2">
            Fotografía opcional (URL HTTPS o ruta local)
            <input name="imagen_url" type="text" value={formulario.imagen_url} onChange={cambiarCampo} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {editando !== null && <button type="button" onClick={limpiar} className="rounded-lg border border-slate-200 px-4 py-2 font-semibold">Cancelar</button>}
          <button disabled={guardando} className="rounded-lg bg-slate-900 px-5 py-2 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : editando === null ? "Crear producto" : "Guardar cambios"}</button>
        </div>
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Productos registrados</h2>
        {cargando ? <p className="py-6 text-center text-slate-500">Cargando catálogo…</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nombre</th><th className="p-3">Categoría</th><th className="p-3">Descripción</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {errorCatalogo ? <tr><td colSpan="5" className="p-6 text-center text-rose-700">No se pudo confirmar el catálogo.</td></tr> : productos.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500">No hay productos registrados.</td></tr> : productos.map((producto) => (
                  <tr key={producto.id_producto}>
                    <td className="p-3 font-semibold">{producto.nombre}</td>
                    <td className="p-3">{producto.categoria}</td>
                    <td className="p-3">{producto.descripcion || "—"}</td>
                    <td className="p-3">{producto.activo ? "Activo" : "Inactivo"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editar(producto)} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold">Editar</button>
                        <button type="button" onClick={() => cambiarEstado(producto)} className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold">{producto.activo ? "Desactivar" : "Activar"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Productos;
