import {useState} from "react";

import {clientesMock} from "../../data/clientesMock";

import BuscadorCliente from "../../components/clientes/BuscadorCliente";
import FormularioCliente from "../../components/clientes/FormularioCliente";
import TablaClientes from "../../components/clientes/TablaClientes";
import ResumenCliente from "../../components/clientes/ResumenCliente";
import HistorialCliente from "../../components/clientes/HistorialCliente";
import BotonesCliente from "../../components/clientes/BotonesCliente";

function Clientes(){

const[clientes,setClientes]=useState(clientesMock);

const[filtro,setFiltro]=useState("");

const clientesFiltrados=

clientes.filter(cliente=>

cliente.nombre

.toLowerCase()

.includes(filtro.toLowerCase())

);

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Clientes

</h1>

<ResumenCliente

clientes={clientes}

/>

<BuscadorCliente

filtro={filtro}

setFiltro={setFiltro}

/>

<FormularioCliente/>

<TablaClientes

clientes={clientesFiltrados}

/>

<HistorialCliente/>

<BotonesCliente/>

</div>

);

}

export default Clientes;