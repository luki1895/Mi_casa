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
      <ResumenCliente clientes={clientes} />
      <BuscadorCliente
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        tipo={tipo}
        setTipo={setTipo}
        estado={estado}
        setEstado={setEstado}
      />
      <FormularioCliente />
      <TablaClientes clientes={clientes} />
      <HistorialCliente />
      <BotonesCliente />
    </div>
  );
}

export default Clientes;
