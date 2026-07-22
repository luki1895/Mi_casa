import {useState} from "react";

import {reporteMock} from "../../data/reportesMock";

import FiltroReportes from "../../components/reportes/FiltroReportes";
import ResumenReportes from "../../components/reportes/ResumenReportes";
import VentasReportes from "../../components/reportes/VentasReportes";
import GastosReportes from "../../components/reportes/GastosReportes";
import ProduccionReportes from "../../components/reportes/ProduccionReportes";
import PensionadosReportes from "../../components/reportes/PensionadosReportes";
import BotonesReportes from "../../components/reportes/BotonesReportes";

function Reportes(){

const[reporte]=useState(reporteMock);

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Reportes

</h1>

<FiltroReportes/>

<ResumenReportes reporte={reporte}/>

<VentasReportes ventas={reporte.ventas}/>

<GastosReportes gastos={reporte.gastos}/>

<ProduccionReportes/>

<PensionadosReportes/>

<BotonesReportes/>

</div>

);

}

export default Reportes;