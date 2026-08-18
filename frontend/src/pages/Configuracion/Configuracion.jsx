import { useContext, useState } from "react";
import { configuracionInicial } from "../../data/configuracionMock";
import DatosEmpresa from "../../components/configuracion/DatosEmpresa";
import ConfiguracionPrecios from "../../components/configuracion/ConfiguracionPrecios";
import ConfiguracionSistema from "../../components/configuracion/ConfiguracionSistema";
import ConfiguracionImpresion from "../../components/configuracion/ConfiguracionImpresion";
import ResumenConfiguracion from "../../components/configuracion/ResumenConfiguracion";
import BotonesConfiguracion from "../../components/configuracion/BotonesConfiguracion";
import { SistemaContext } from "../../context/SistemaContext";

const temas = {
  rojo: { primary: "#ef4444", secondary: "#f59e0b", accent: "#fff7ed", sidebar: "#1f2937", nombre: "Rojo corporativo" },
  verde: { primary: "#10b981", secondary: "#84cc16", accent: "#ecfdf5", sidebar: "#0f172a", nombre: "Verde natural" },
  azul: { primary: "#2563eb", secondary: "#38bdf8", accent: "#eff6ff", sidebar: "#0f172a", nombre: "Azul premium" },
  violeta: { primary: "#8b5cf6", secondary: "#a78bfa", accent: "#f5f3ff", sidebar: "#1f2937", nombre: "Violeta elegante" }
};

function Configuracion() {
  const { setTema } = useContext(SistemaContext);
  const [configuracion, setConfiguracion] = useState(configuracionInicial);

  const actualizar = (campo, valor) => {
    setConfiguracion((prev) => ({ ...prev, [campo]: valor }));

    if (campo === "tema" && temas[valor]) {
      setTema(temas[valor]);
    }
  };

  const restablecer = () => {
    setConfiguracion(configuracionInicial);
    setTema(temas[configuracionInicial.tema]);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Ajustes</p>
            <h2 className="text-2xl font-bold text-slate-900">Configuración del sistema</h2>
          </div>
          <p className="text-sm text-slate-500">Ajusta la identidad del negocio y los elementos visibles del sistema.</p>
        </div>
      </div>

      <ResumenConfiguracion configuracion={configuracion} />
      <DatosEmpresa configuracion={configuracion} actualizar={actualizar} />
      <ConfiguracionPrecios configuracion={configuracion} actualizar={actualizar} />
      <ConfiguracionSistema configuracion={configuracion} actualizar={actualizar} />
      <ConfiguracionImpresion configuracion={configuracion} />
      <BotonesConfiguracion restablecer={restablecer} />
    </div>
  );
}

export default Configuracion;
