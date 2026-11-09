import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    api.get("/usuarios")
      .then(({ data }) => {
        if (!cancelado) setUsuarios(data.data || []);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar la lista de usuarios desde el backend.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((usuario) => {
      const nombre = `${usuario.usuario || ""} ${usuario.rol || ""}`.toLowerCase();
      return nombre.includes(texto);
    });
  }, [usuarios, busqueda]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Seguridad</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Usuarios del sistema</h2>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por usuario o rol"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:bg-white"
          />
        </div>

        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {cargando ? (
          <p className="text-sm text-gray-500">Cargando usuarios...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-500">Sin coincidencias</td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id_usuario}>
                      <td className="px-4 py-3 font-medium text-slate-800">{usuario.usuario}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{usuario.rol}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${usuario.estado ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {usuario.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{usuario.id_usuario}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Usuarios;
