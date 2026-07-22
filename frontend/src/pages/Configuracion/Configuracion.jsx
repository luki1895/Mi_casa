import {useState} from "react";

import {configuracionInicial} from "../../data/configuracionMock";

import DatosEmpresa from "../../components/configuracion/DatosEmpresa";
import ConfiguracionPrecios from "../../components/configuracion/ConfiguracionPrecios";
import ConfiguracionSistema from "../../components/configuracion/ConfiguracionSistema";
import ConfiguracionImpresion from "../../components/configuracion/ConfiguracionImpresion";
import ResumenConfiguracion from "../../components/configuracion/ResumenConfiguracion";
import BotonesConfiguracion from "../../components/configuracion/BotonesConfiguracion";

function Configuracion(){

const[configuracion,setConfiguracion]=useState(configuracionInicial);

const actualizar=(campo,valor)=>{

setConfiguracion(prev=>({

...prev,

[campo]:valor

}));

};

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Configuración

</h1>

<DatosEmpresa

configuracion={configuracion}

actualizar={actualizar}

/>

<ConfiguracionPrecios

configuracion={configuracion}

actualizar={actualizar}

/>

<ConfiguracionSistema

configuracion={configuracion}

actualizar={actualizar}

/>

<ConfiguracionImpresion

configuracion={configuracion}

actualizar={actualizar}

/>

<ResumenConfiguracion

configuracion={configuracion}

/>

<BotonesConfiguracion/>

</div>

);

}

export default Configuracion;