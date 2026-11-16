import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

function Clientes() {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("PENSIONADO");
  const [listaClientes, setClientes] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [clienteVinculacion, setClienteVinculacion] = useState(null);
  const [usuarioCuenta, setUsuarioCuenta] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState({ nombre_completo: "", ci: "", correo: "", telefono: "", tipo_cliente: "PENSIONADO", saldo_pensiones: 0, saldo_sopas: "", saldo_segundos: "", renovar: false });

  const resetFormulario = (cliente = null) => {
    setEdicion(cliente);
    setFormulario({
      nombre_completo: cliente?.nombre || "",
      ci: cliente?.ci || "",
      correo: cliente?.correo || "",
      telefono: cliente?.telefono || "",
      tipo_cliente: cliente?.tipo_cliente || "PENSIONADO",
      saldo_pensiones: cliente?.saldo_pensiones || 0,
      saldo_sopas: cliente?.saldo_sopas ?? "",
      saldo_segundos: cliente?.saldo_segundos ?? "",
      renovar: false,
    });
    setAviso("");
  };
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/clientes");
      setClientes(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo cargar la lista de clientes.");
    } finally { setCargando(false); }
  }, []);

  useEffect(() => {
    let cancelado = false;
    api.get("/clientes")
      .then(({ data }) => {
        if (!cancelado) setClientes(data.data || []);
      })
      .catch((requestError) => {
        if (!cancelado) setError(requestError.response?.data?.mensaje || "No se pudo cargar la lista de clientes.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, []);

  const clientesFiltrados = useMemo(() => {
    return listaClientes.filter((cliente) => {
      const texto = `${cliente.nombre || ""} ${cliente.telefono || ""}`.toLowerCase();
      const coincideTexto = texto.includes(busqueda.toLowerCase());
      const coincideTipo = tipo === "TODOS" || String(cliente.tipo_cliente || "").toUpperCase() === tipo;
      return coincideTexto && coincideTipo;
    });
  }, [listaClientes, busqueda, tipo]);

  const editar = (cliente) => {
    resetFormulario(cliente);
    setMostrarFormulario(true);
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true); setAviso(""); setError("");
    try {
      const nombre = (formulario.nombre_completo || formulario.nombre || "").trim();
      const body = {
        ...formulario,
        nombre,
        nombre_completo: nombre,
        ci: (formulario.ci || "").trim(),
        correo: (formulario.correo || "").trim(),
        telefono: (formulario.telefono || "").trim(),
        tipo_cliente: "PENSIONADO",
        saldo_pensiones: Number(formulario.saldo_pensiones || 0),
        saldo_sopas: formulario.saldo_sopas === "" ? null : Number(formulario.saldo_sopas),
        saldo_segundos: formulario.saldo_segundos === "" ? null : Number(formulario.saldo_segundos),
        estado: edicion?.estado ?? true,
        renovar: Boolean(formulario.renovar),
      };
      if (edicion) await api.put(`/clientes/${edicion.id_cliente}`, body);
      else await api.post("/clientes", body);
      setAviso(edicion ? "Cliente actualizado." : "Cliente registrado.");
      setEdicion(null);
      setMostrarFormulario(false);
      setFormulario({ nombre_completo: "", ci: "", correo: "", telefono: "", tipo_cliente: "PENSIONADO", saldo_pensiones: 0, saldo_sopas: "", saldo_segundos: "", renovar: false });
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo guardar el cliente.");
    } finally { setGuardando(false); }
  };

  const cambiarEstado = async (cliente) => {
    const activo = cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO";
    try {
      await api.put(`/clientes/${cliente.id_cliente}`, { nombre: cliente.nombre, telefono: cliente.telefono, tipo_cliente: cliente.tipo_cliente, saldo_pensiones: cliente.saldo_pensiones || 0, estado: !activo });
      setAviso(activo ? "Cliente desactivado; se conservó su historial." : "Cliente activado.");
      await cargar();
    } catch (requestError) { setError(requestError.response?.data?.mensaje || "No se pudo cambiar el estado."); }
  };

  const vincularCuenta = async (event) => {
    event.preventDefault();
    if (!clienteVinculacion || !usuarioCuenta.trim()) return;
    setGuardando(true); setError(""); setAviso("");
    try {
      await api.put(`/clientes/${clienteVinculacion.id_cliente}/cuenta`, { usuario: usuarioCuenta.trim() });
      setAviso(`La cuenta ${usuarioCuenta.trim()} quedó vinculada a ${clienteVinculacion.nombre}.`);
      setClienteVinculacion(null); setUsuarioCuenta("");
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo vincular la cuenta.");
    } finally { setGuardando(false); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administración</p><h1 className="mt-1 text-3xl font-black">Clientes</h1><p className="text-sm text-slate-500">Los clientes se registran automáticamente al hacer un pedido; si no existen, quedan como EVENTUAL con su propio ID.</p></div><button onClick={cargar} className="rounded-xl border bg-white px-4 py-2 font-semibold">Actualizar</button></header>
      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Regla del sistema</p>
          <p className="mt-1">Solo se admite cliente PENSIONADO en el registro manual; los clientes EVENTUAL se crean automáticamente desde el pedido.</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-black">Clientes registrados ({listaClientes.length})</h2><div className="flex gap-2"><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar nombre o teléfono" className="rounded-lg border px-3 py-2 text-sm" /><select value={tipo} onChange={(event) => setTipo(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="TODOS">Todos los tipos</option><option value="PENSIONADO">Pensionados</option></select></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nombre</th><th className="p-3">Teléfono</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead><tbody className="divide-y">{cargando ? <tr><td colSpan="5" className="p-8 text-center">Cargando…</td></tr> : clientesFiltrados.map((cliente) => { const activo = cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO"; return <tr key={cliente.id_cliente}><td className="p-3 font-semibold">{cliente.nombre}</td><td className="p-3">{cliente.telefono || "—"}</td><td className="p-3">{cliente.tipo_cliente}</td><td className="p-3">{activo ? "Activo" : "Inactivo"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={() => editar(cliente)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Editar</button><button onClick={() => cambiarEstado(cliente)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">{activo ? "Desactivar" : "Activar"}</button><button onClick={() => { setClienteVinculacion(cliente); setUsuarioCuenta(""); setError(""); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Vincular cuenta</button></div>{clienteVinculacion?.id_cliente === cliente.id_cliente && <form onSubmit={vincularCuenta} className="mt-3 flex gap-2"><input required value={usuarioCuenta} onChange={(event) => setUsuarioCuenta(event.target.value)} placeholder="Usuario con rol cliente" className="min-w-0 rounded-lg border px-2 py-1.5 text-xs" /><button disabled={guardando} className="rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-bold disabled:opacity-50">Vincular</button><button type="button" onClick={() => setClienteVinculacion(null)} className="rounded-lg border px-2 py-1.5 text-xs">Cancelar</button></form>}</td></tr>; })}{!cargando && clientesFiltrados.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay resultados.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

export default Clientes;
