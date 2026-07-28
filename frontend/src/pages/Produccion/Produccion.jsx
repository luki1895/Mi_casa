import { useState } from "react";
import { produccionInicial } from "../../data/produccionMock";
import SelectorFecha from "../../components/produccion/SelectorFecha";
import FormularioProduccion from "../../components/produccion/FormularioProduccion";
import TablaProduccion from "../../components/produccion/TablaProduccion";
import ResumenProduccion from "../../components/produccion/ResumenProduccion";
import BotonesProduccion from "../../components/produccion/BotonesProduccion";

function Produccion() {
  const [produccion] = useState(produccionInicial);

  return (
    <div className="space-y-6">
      <SelectorFecha />
      <ResumenProduccion produccion={produccion} />
      <FormularioProduccion produccion={produccion} actualizar={() => {}} />
      <TablaProduccion produccion={produccion} />
      <BotonesProduccion />
    </div>
  );
}

export default Produccion;
