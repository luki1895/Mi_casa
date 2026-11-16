import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { normalizeRole } from "../../auth/roles";

const formularioVacio = {
  nombre_completo: "",
  ci: "",
  correo: "",
  telefono: "",
};

function Clientes() {
  const { usuario } = useAuth();
  const rol = normalizeRole(usuario?.role ?? usuario?.rol);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [listaClientes, setClientes] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [clienteVinculacion, setClienteVinculacion] = useState(null);
  const [clientePensiones, setClientePensiones] = useState(null);
  const [datosPensiones, setDatosPensiones] = useState(null);
  const [cargandoPensiones, setCargandoPensiones] = useState(false);
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [movimiento, setMovimiento] = useState({ tipo_producto: "SOPA", tipo_movimiento: "CONSUMO", cantidad: 1, observaciones: "" });
  const [usuarioCuenta, setUsuarioCuenta] = useState("");
  const [formulario, setFormulario] = useState(formularioVacio);
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
    } finally {
      setCargando(false);
    }
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
    return () => {
      cancelado = true;
    };
  }, []);

  const clientesFiltrados = useMemo(() => {
    return listaClientes.filter((cliente) => {
      const texto = `${cliente.nombre || ""} ${cliente.telefono || ""}`.toLowerCase();
      const coincideTexto = texto.includes(busqueda.trim().toLowerCase());
      const coincideTipo = tipo === "TODOS" || String(cliente.tipo_cliente || "").toUpperCase() === tipo;
      return coincideTexto && coincideTipo;
    });
  }, [listaClientes, busqueda, tipo]);

  const resetFormulario = (cliente = null) => {
    setEdicion(cliente);
    setFormulario({
      nombre_completo: cliente?.nombre || "",
      ci: cliente?.ci || "",
      correo: cliente?.correo || cliente?.email || "",
      telefono: cliente?.telefono || "",
    });
    setError("");
    setAviso("");
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setAviso("");
    setError("");
    try {
      const nombre = formulario.nombre_completo.trim();
      const body = {
        nombre,
        nombre_completo: nombre,
        ci: formulario.ci.trim(),
        correo: formulario.correo.trim(),
        telefono: formulario.telefono.trim(),
        tipo_cliente: edicion?.tipo_cliente || "PENSIONADO",
        estado: edicion?.estado ?? true,
      };
      if (edicion) {
        await api.put(`/clientes/${edicion.id_cliente}`, body);
      } else {
        await api.post("/clientes", body);
      }
      setEdicion(null);
      setFormulario(formularioVacio);
      setAviso(edicion ? "Cliente actualizado." : "Cliente pensionado registrado.");
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const editar = (cliente) => resetFormulario(cliente);

  const cambiarEstado = async (cliente) => {
    const activo = cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO";
    try {
      await api.put(`/clientes/${cliente.id_cliente}`, { estado: !activo });
      setAviso(activo ? "Cliente desactivado; se conservó su historial." : "Cliente activado.");
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo cambiar el estado.");
    }
  };

  const abrirPensiones = async (cliente) => {
    setClientePensiones(cliente);
    setDatosPensiones(null);
    setCargandoPensiones(true);
    setError("");
    try {
      const { data } = await api.get(`/clientes/${cliente.id_cliente}/pensiones`);
      setDatosPensiones(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo cargar el saldo pensionado.");
    } finally {
      setCargandoPensiones(false);
    }
  };

  const registrarMovimiento = async (event) => {
    event.preventDefault();
    if (!clientePensiones) return;
    setGuardandoMovimiento(true);
    setError("");
    setAviso("");
    try {
      const endpoint = movimiento.tipo_movimiento === "CONSUMO" ? "consumos" : "reposiciones";
      await api.post(`/clientes/${clientePensiones.id_cliente}/pensiones/${endpoint}`, {
        tipo_producto: movimiento.tipo_producto,
        cantidad: Number(movimiento.cantidad),
        observaciones: movimiento.observaciones,
      });
      setAviso(movimiento.tipo_movimiento === "CONSUMO" ? "Consumo registrado." : "Reposición registrada.");
      setMovimiento((actual) => ({ ...actual, cantidad: 1, observaciones: "" }));
      await abrirPensiones(clientePensiones);
      await cargar();
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo registrar el movimiento.");
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  const vincularCuenta = async (event) => {
    event.preventDefault();
    if (!clienteVinculacion || !usuarioCuenta.trim()) return;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await api.put(`/clientes/${clienteVinculacion.id_cliente}/cuenta`, { usuario: usuarioCuenta.trim() });
      setAviso(`La cuenta ${usuarioCuenta.trim()} quedó vinculada a ${clienteVinculacion.nombre}.`);
      setClienteVinculacion(null);
      setUsuarioCuenta("");
    } catch (requestError) {
      setError(requestError.response?.data?.mensaje || "No se pudo vincular la cuenta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Administración</p>
          <h1 className="mt-1 text-3xl font-black">Clientes</h1>
          <p className="text-sm text-slate-500">Los clientes eventuales se crean desde los pedidos; el registro manual está reservado para pensionados.</p>
        </div>
        <button onClick={cargar} className="rounded-xl border bg-white px-4 py-2 font-semibold">Actualizar</button>
      </header>
      {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={guardar} className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{edicion ? "Editar cliente" : "Registrar pensionado"}</h2>
          <p className="text-sm text-slate-500">Tipo: <strong>{edicion?.tipo_cliente || "PENSIONADO"}</strong></p>
          <label className="block text-sm font-semibold">Nombre completo
            <input required maxLength="160" value={formulario.nombre_completo} onChange={(event) => setFormulario({ ...formulario, nombre_completo: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-semibold">CI
            <input required={!edicion} value={formulario.ci} onChange={(event) => setFormulario({ ...formulario, ci: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-semibold">Correo
            <input type="email" required={!edicion} value={formulario.correo} onChange={(event) => setFormulario({ ...formulario, correo: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-semibold">Teléfono
            <input required={!edicion} value={formulario.telefono} onChange={(event) => setFormulario({ ...formulario, telefono: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Los saldos de sopa y segundo se asignan mediante reposiciones auditadas, no desde el formulario del cliente.</p>
          {edicion && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">El saldo histórico en dinero (Bs {Number(edicion.saldo_pensiones || 0).toFixed(2)}) se conserva.</p>}
          <div className="flex gap-2">
            <button disabled={guardando} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : edicion ? "Guardar cambios" : "Registrar"}</button>
            {edicion && <button type="button" onClick={() => resetFormulario()} className="rounded-xl border px-4 py-3 font-bold">Cancelar</button>}
          </div>
        </form>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="text-xl font-black">Clientes registrados ({listaClientes.length})</h2>
            <div className="flex gap-2">
              <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar nombre o teléfono" className="rounded-lg border px-3 py-2 text-sm" />
              <select value={tipo} onChange={(event) => setTipo(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="TODOS">Todos los tipos</option>
                <option value="PENSIONADO">Pensionados</option>
                <option value="EVENTUAL">Eventuales</option>
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nombre</th><th className="p-3">Teléfono</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
              <tbody className="divide-y">
                {cargando ? <tr><td colSpan="5" className="p-8 text-center">Cargando…</td></tr> : clientesFiltrados.map((cliente) => {
                  const activo = cliente.estado !== false && String(cliente.estado).toUpperCase() !== "INACTIVO";
                  return (
                    <tr key={cliente.id_cliente}>
                      <td className="p-3 font-semibold">{cliente.nombre}</td>
                      <td className="p-3">{cliente.telefono || "—"}</td>
                      <td className="p-3">{cliente.tipo_cliente}</td>
                      <td className="p-3">{activo ? "Activo" : "Inactivo"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editar(cliente)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Editar</button>
                          {cliente.tipo_cliente === "PENSIONADO" && <button onClick={() => abrirPensiones(cliente)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Saldos</button>}
                          <button onClick={() => cambiarEstado(cliente)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">{activo ? "Desactivar" : "Activar"}</button>
                          <button onClick={() => { setClienteVinculacion(cliente); setUsuarioCuenta(""); setError(""); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Vincular cuenta</button>
                        </div>
                        {clienteVinculacion?.id_cliente === cliente.id_cliente && <form onSubmit={vincularCuenta} className="mt-3 flex gap-2">
                          <input required value={usuarioCuenta} onChange={(event) => setUsuarioCuenta(event.target.value)} placeholder="Usuario con rol cliente" className="min-w-0 rounded-lg border px-2 py-1.5 text-xs" />
                          <button disabled={guardando} className="rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-bold disabled:opacity-50">Vincular</button>
                          <button type="button" onClick={() => setClienteVinculacion(null)} className="rounded-lg border px-2 py-1.5 text-xs">Cancelar</button>
                        </form>}
                      </td>
                    </tr>
                  );
                })}
                {!cargando && clientesFiltrados.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay resultados.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {clientePensiones && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-black">Saldos de {clientePensiones.nombre}</h2><p className="text-sm text-slate-500">Consumos y reposiciones independientes con historial de movimientos.</p></div>
          <button type="button" onClick={() => { setClientePensiones(null); setDatosPensiones(null); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Cerrar</button>
        </div>
        {cargandoPensiones ? <p>Cargando saldos…</p> : datosPensiones && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="rounded-xl bg-slate-50 p-4">Sopas disponibles: <strong>{datosPensiones.saldo_sopas ?? "Sin asignar"}</strong></p>
            <p className="rounded-xl bg-slate-50 p-4">Segundos disponibles: <strong>{datosPensiones.saldo_segundos ?? "Sin asignar"}</strong></p>
          </div>
          <form onSubmit={registrarMovimiento} className="grid gap-3 rounded-xl border p-4 md:grid-cols-5">
            <label className="text-sm font-semibold">Movimiento
              <select value={movimiento.tipo_movimiento} onChange={(event) => setMovimiento({ ...movimiento, tipo_movimiento: event.target.value })} className="mt-1 w-full rounded-lg border p-2">
                <option value="CONSUMO">Consumo</option>
                {["admin", "caja"].includes(rol) && <option value="REPOSICION">Reposición</option>}
              </select>
            </label>
            <label className="text-sm font-semibold">Producto
              <select value={movimiento.tipo_producto} onChange={(event) => setMovimiento({ ...movimiento, tipo_producto: event.target.value })} className="mt-1 w-full rounded-lg border p-2">
                <option value="SOPA">Sopa</option><option value="SEGUNDO">Segundo</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Cantidad
              <input type="number" min="1" step="1" required value={movimiento.cantidad} onChange={(event) => setMovimiento({ ...movimiento, cantidad: event.target.value })} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm font-semibold md:col-span-2">Observaciones
              <input maxLength="500" value={movimiento.observaciones} onChange={(event) => setMovimiento({ ...movimiento, observaciones: event.target.value })} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <div className="flex justify-end md:col-span-5"><button disabled={guardandoMovimiento} className="rounded-lg bg-slate-900 px-5 py-2 font-bold text-white disabled:opacity-50">{guardandoMovimiento ? "Registrando…" : "Registrar movimiento"}</button></div>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Fecha</th><th className="p-3">Producto</th><th className="p-3">Movimiento</th><th className="p-3">Cantidad</th><th className="p-3">Saldo resultante</th><th className="p-3">Usuario</th></tr></thead>
              <tbody className="divide-y">
                {datosPensiones.movimientos.length === 0 ? <tr><td colSpan="6" className="p-5 text-center text-slate-500">Sin movimientos registrados.</td></tr> : datosPensiones.movimientos.map((registro) => (
                  <tr key={registro.id_movimiento}>
                    <td className="p-3">{new Date(registro.fecha).toLocaleString()}</td><td className="p-3">{registro.tipo_producto}</td><td className="p-3">{registro.tipo_movimiento}</td><td className="p-3">{registro.cantidad}</td><td className="p-3">{registro.saldo_resultante}</td><td className="p-3">{registro.usuario || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}
      </section>}
    </div>
  );
}

export default Clientes;
