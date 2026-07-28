import { useState } from "react";
import { configuracionInicial } from "../../data/configuracionMock";
import DatosEmpresa from "../../components/configuracion/DatosEmpresa";
import ConfiguracionPrecios from "../../components/configuracion/ConfiguracionPrecios";
import ConfiguracionSistema from "../../components/configuracion/ConfiguracionSistema";
import ConfiguracionImpresion from "../../components/configuracion/ConfiguracionImpresion";
import ResumenConfiguracion from "../../components/configuracion/ResumenConfiguracion";
import BotonesConfiguracion from "../../components/configuracion/BotonesConfiguracion";

function Configuracion() {
  const [configuracion, setConfiguracion] = useState(configuracionInicial);

  const actualizar = (campo, valor) => {
    setConfiguracion((prev) => ({ ...prev, [campo]: valor }));
  };

  const restablecer = () => {
    setConfiguracion(configuracionInicial);
  };

  return (
    <div className="space-y-6">
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
