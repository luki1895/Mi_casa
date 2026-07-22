import { useState } from "react";

import { produccionInicial } from "../../data/produccionMock";

import SelectorFecha from "../../components/produccion/SelectorFecha";
import FormularioProduccion from "../../components/produccion/FormularioProduccion";
import TablaProduccion from "../../components/produccion/TablaProduccion";
import ResumenProduccion from "../../components/produccion/ResumenProduccion";
import BotonesProduccion from "../../components/produccion/BotonesProduccion";

function Produccion(){

const [produccion,setProduccion]=useState(produccionInicial);

const actualizar=(tipo,campo,valor)=>{

setProduccion(prev=>({

...prev,

[tipo]:{

...prev[tipo],

[campo]:valor

}

}));

};

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Producción Diaria

</h1>

<SelectorFecha/>

<FormularioProduccion

produccion={produccion}

actualizar={actualizar}

/>

<TablaProduccion

produccion={produccion}

/>

<ResumenProduccion

produccion={produccion}

/>

<BotonesProduccion/>

</div>

);

}

export default Produccion;