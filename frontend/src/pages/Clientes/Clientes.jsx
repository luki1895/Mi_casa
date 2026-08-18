import { useMemo, useState } from "react";
import ResumenCliente from "../../components/clientes/ResumenCliente";
import BuscadorCliente from "../../components/clientes/BuscadorCliente";
import TablaClientes from "../../components/clientes/TablaClientes";
import BotonesCliente from "../../components/clientes/BotonesCliente";
import FormularioCliente from "../../components/clientes/FormularioCliente";
import HistorialCliente from "../../components/clientes/HistorialCliente";
import { clientesMock } from "../../data/clientesMock";

function Clientes() {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("TODOS");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const clientes = useMemo(() => {
    return clientesMock.filter((cliente) => {
      const texto = `${cliente.nombre} ${cliente.apellido || ""}`.toLowerCase();
      const coincideTexto = texto.includes(busqueda.toLowerCase());
      const coincideTipo = tipo === "TODOS" || cliente.tipo?.toUpperCase() === tipo;
      const coincideEstado = estado === "TODOS" || (estado === "ACTIVO" ? cliente.estado : !cliente.estado);
      return coincideTexto && coincideTipo && coincideEstado;
    });
  }, [busqueda, tipo, estado]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Clientes</p>
            <h2 className="text-2xl font-bold text-slate-900">Gestión de clientes</h2>
          </div>
          <p className="text-sm text-slate-500">Administra registros, filtros y estados en un solo lugar.</p>
        </div>
      </div>

      <BuscadorCliente
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        tipo={tipo}
        setTipo={setTipo}
        estado={estado}
        setEstado={setEstado}
        totalResultados={clientes.length}
        onAgregar={() => setMostrarFormulario(true)}
      />

      <ResumenCliente clientes={clientes} />

      <FormularioCliente
        visible={mostrarFormulario}
        guardar={() => setMostrarFormulario(false)}
        cancelar={() => setMostrarFormulario(false)}
      />

      <TablaClientes clientes={clientes} />
      <HistorialCliente />
      <BotonesCliente />
    </div>
  );
}

export default Clientes;
