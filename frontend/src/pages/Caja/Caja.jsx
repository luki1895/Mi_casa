import { useState } from "react";
import { cajaInicial } from "../../data/cajaMock";
import ResumenCaja from "../../components/caja/ResumenCaja";
import TablaVentas from "../../components/caja/TablaVentas";
import RegistrarIngreso from "../../components/caja/RegistrarIngreso";
import RegistrarGasto from "../../components/caja/RegistrarGasto";
import CierreCaja from "../../components/caja/CierreCaja";
import BotonesCaja from "../../components/caja/BotonesCaja";

function Caja() {
  const [caja] = useState(cajaInicial);

  return (
    <div className="space-y-6">
      <ResumenCaja
        efectivo={caja.efectivoInicial}
        ingresos={caja.ingresos}
        gastos={caja.gastos}
        saldo={caja.saldo}
      />
      <RegistrarIngreso />
      <RegistrarGasto />
      <TablaVentas ventas={caja.ventas} />
      <CierreCaja />
      <BotonesCaja />
    </div>
  );
}

export default Caja;
