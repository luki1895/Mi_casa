import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const roles = ["admin", "caja", "mesero", "cliente"];
const formularioVacio = {
  nombre_completo: "",
  ci: "",
  correo: "",
  telefono: "",
  usuario: "",
  password: "",
  rol: "mesero",
  estado: true,
};

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [edicion, setEdicion] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/usuarios");
      setUsuarios(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo cargar la lista de usuarios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    api.get("/usuarios")
      .then(({ data }) => {
        if (!cancelado) setUsuarios(data.data || []);
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo cargar la lista de usuarios.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const resetFormulario = (usuarioSeleccionado = null) => {
    setEdicion(usuarioSeleccionado);
    setFormulario({
      nombre_completo: usuarioSeleccionado?.nombre_completo || usuarioSeleccionado?.nombre || "",
      ci: usuarioSeleccionado?.ci || "",
      correo: usuarioSeleccionado?.correo || usuarioSeleccionado?.email || "",
      telefono: usuarioSeleccionado?.telefono || "",
      usuario: usuarioSeleccionado?.usuario || "",
      password: "",
      rol: usuarioSeleccionado?.rol || "mesero",
      estado: usuarioSeleccionado?.estado !== false && String(usuarioSeleccionado?.estado).toUpperCase() !== "INACTIVO",
    });
    setMostrarFormulario(true);
    setError("");
    setAviso("");
  };

  const guardarUsuario = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const payload = {
        nombre_completo: formulario.nombre_completo.trim(),
        ci: formulario.ci.trim(),
        correo: formulario.correo.trim(),
        telefono: formulario.telefono.trim(),
        usuario: formulario.usuario.trim(),
        rol: formulario.rol,
        estado: formulario.estado,
      };
      if (!formulario.password && !edicion) {
        throw new Error("La contraseña es obligatoria para crear un usuario.");
      }
      if (formulario.password) payload.password = formulario.password;

      if (edicion) {
        await api.put(`/usuarios/${edicion.id_usuario}`, payload);
        setAviso("Usuario actualizado correctamente.");
      } else {
        await api.post("/usuarios", payload);
        setAviso("Usuario registrado correctamente.");
      }

      setEdicion(null);
      setMostrarFormulario(false);
      setFormulario(formularioVacio);
      await cargarUsuarios();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || requestError.message || "No se pudo guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoUsuario = async (usuario) => {
    const activo = usuario.estado !== false && String(usuario.estado).toUpperCase() !== "INACTIVO";
    if (!window.confirm(`¿Deseas ${activo ? "desactivar" : "activar"} la cuenta "${usuario.usuario}"?`)) return;
    setError("");
    setAviso("");
    try {
      await api.put(`/usuarios/${usuario.id_usuario}`, { estado: !activo });
      setAviso(activo ? "Usuario desactivado." : "Usuario activado.");
      await cargarUsuarios();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo cambiar el estado del usuario.");
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((usuario) => `${usuario.usuario || ""} ${usuario.rol || ""}`.toLowerCase().includes(texto));
  }, [usuarios, busqueda]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Seguridad</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">Administración centralizada del acceso del sistema.</p>
        </div>
        <button onClick={cargarUsuarios} className="rounded-xl border bg-white px-4 py-2 font-semibold text-slate-700">Actualizar</button>
      </header>

      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="h-fit rounded-2xl bg-white p-5 shadow-sm">
          {!mostrarFormulario ? (
            <div className="space-y-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Acceso</p><h2 className="mt-2 text-xl font-black text-slate-900">Registrar usuario</h2></div>
              <button type="button" onClick={() => resetFormulario()} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">+ Registrar usuario</button>
            </div>
          ) : (
            <form onSubmit={guardarUsuario} className="space-y-4">
              <h2 className="text-xl font-black text-slate-900">{edicion ? "Editar usuario" : "Registrar usuario"}</h2>
              <label className="block text-sm font-semibold text-slate-700">Nombre completo
                <input required value={formulario.nombre_completo} onChange={(event) => setFormulario({ ...formulario, nombre_completo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">CI
                  <input required value={formulario.ci} onChange={(event) => setFormulario({ ...formulario, ci: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Teléfono
                  <input required value={formulario.telefono} onChange={(event) => setFormulario({ ...formulario, telefono: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">Correo
                <input type="email" required value={formulario.correo} onChange={(event) => setFormulario({ ...formulario, correo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Usuario
                <input required maxLength="80" value={formulario.usuario} onChange={(event) => setFormulario({ ...formulario, usuario: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Contraseña {edicion ? "(opcional para mantener la actual)" : ""}
                <input type="password" minLength="6" required={!edicion} value={formulario.password} onChange={(event) => setFormulario({ ...formulario, password: event.target.value })} placeholder={edicion ? "Dejar vacío para conservar la actual" : "Ingrese la contraseña"} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Rol
                <select value={formulario.rol} onChange={(event) => setFormulario({ ...formulario, rol: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {roles.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(formulario.estado)} onChange={(event) => setFormulario({ ...formulario, estado: event.target.checked })} className="h-4 w-4" />
                Usuario activo
              </label>
              <div className="flex gap-2">
                <button disabled={guardando} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-70">{guardando ? "Guardando…" : edicion ? "Guardar cambios" : "Registrar"}</button>
                <button type="button" onClick={() => { setEdicion(null); setMostrarFormulario(false); setFormulario(formularioVacio); }} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700">Cancelar</button>
              </div>
            </form>
          )}
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-black text-slate-900">Usuarios registrados ({usuarios.length})</h2>
            <input type="text" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por usuario o rol" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">Usuario</th><th className="px-4 py-3 font-semibold">Rol</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">ID</th><th className="px-4 py-3 font-semibold">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cargando ? <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Cargando usuarios...</td></tr>
                  : usuariosFiltrados.length === 0 ? <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-500">Sin coincidencias</td></tr>
                    : usuariosFiltrados.map((usuario) => {
                      const activo = usuario.estado !== false && String(usuario.estado).toUpperCase() !== "INACTIVO";
                      return (
                        <tr key={usuario.id_usuario}>
                          <td className="px-4 py-3 font-medium text-slate-800">{usuario.usuario}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{usuario.rol}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{activo ? "Activo" : "Inactivo"}</span></td>
                          <td className="px-4 py-3 text-slate-600">{usuario.id_usuario}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => resetFormulario(usuario)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold">Editar</button>
                              <button type="button" onClick={() => cambiarEstadoUsuario(usuario)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-50">{activo ? "Desactivar" : "Activar"}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Usuarios;
