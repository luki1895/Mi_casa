import {useState} from "react";

import {cajaInicial} from "../../data/cajaMock";

import ResumenCaja from "../../components/caja/ResumenCaja";
import TablaVentas from "../../components/caja/TablaVentas";
import RegistrarIngreso from "../../components/caja/RegistrarIngreso";
import RegistrarGasto from "../../components/caja/RegistrarGasto";
import CierreCaja from "../../components/caja/CierreCaja";
import BotonesCaja from "../../components/caja/BotonesCaja";

function Caja(){

const[caja,setCaja]=useState(cajaInicial);

const totalIngresos=

caja.ingresos.reduce(

(ac,item)=>ac+item.monto,

0

);

const totalGastos=

caja.gastos.reduce(

(ac,item)=>ac+item.total,

0

);

const saldo=

caja.efectivoInicial+

totalIngresos-

totalGastos;

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Caja

</h1>

<ResumenCaja

efectivo={caja.efectivoInicial}

ingresos={totalIngresos}

gastos={totalGastos}

saldo={saldo}

/>

<RegistrarIngreso/>

<RegistrarGasto/>

<TablaVentas

ventas={caja.ventas}

/>

<CierreCaja

saldo={saldo}

/>

<BotonesCaja/>

</div>

);

}

export default Caja;