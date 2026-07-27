import { useEffect, useMemo, useState } from "react";

import ResumenCliente from "../../components/clientes/ResumenCliente";
import BuscadorCliente from "../../components/clientes/BuscadorCliente";
import TablaClientes from "../../components/clientes/TablaClientes";
import BotonesCliente from "../../components/clientes/BotonesCliente";
import FormularioCliente from "../../components/clientes/FormularioCliente";
import HistorialCliente from "../../components/clientes/HistorialCliente";

import * as clienteService from "../../services/cliente.service";

const Clientes=()=>{

const[clientes,setClientes]=useState([]);

const[clienteSeleccionado,setClienteSeleccionado]=useState(null);

const[mostrarFormulario,setMostrarFormulario]=useState(false);

const[mostrarHistorial,setMostrarHistorial]=useState(false);

const[busqueda,setBusqueda]=useState("");

const[tipo,setTipo]=useState("TODOS");

const[estado,setEstado]=useState("TODOS");

const cargarClientes=async()=>{

try{

const{data}=await clienteService.obtenerClientes();

setClientes(data);

}catch(error){

console.log(error);

}

};

useEffect(()=>{

cargarClientes();

},[]);

const clientesFiltrados=useMemo(()=>{

return clientes.filter(cliente=>{

const coincideNombre=

cliente.nombre

.toLowerCase()

.includes(busqueda.toLowerCase());

const coincideTipo=

tipo==="TODOS"

||

cliente.tipo===tipo;

const coincideEstado=

estado==="TODOS"

||

cliente.estado===estado;

return(

coincideNombre

&&

coincideTipo

&&

coincideEstado

);

});

},[clientes,busqueda,tipo,estado]);

const nuevoCliente=()=>{

setClienteSeleccionado(null);

setMostrarFormulario(true);

};

const editarCliente=(cliente)=>{

setClienteSeleccionado(cliente);

setMostrarFormulario(true);

};

const historialCliente=(cliente)=>{

setClienteSeleccionado(cliente);

setMostrarHistorial(true);

};

const guardarCliente=async(cliente)=>{

if(cliente.id){

await clienteService.actualizarCliente(

cliente.id,

cliente

);

}else{

await clienteService.crearCliente(cliente);

}

setMostrarFormulario(false);

cargarClientes();

};

return(

<div className="space-y-6">

<ResumenCliente

clientes={clientes}

/>

<BuscadorCliente

busqueda={busqueda}

setBusqueda={setBusqueda}

tipo={tipo}

setTipo={setTipo}

estado={estado}

setEstado={setEstado}

/>

<BotonesCliente

nuevo={nuevoCliente}

actualizar={cargarClientes}

/>

<TablaClientes

clientes={clientesFiltrados}

editar={editarCliente}

historial={historialCliente}

/>

{

mostrarFormulario&&

<FormularioCliente

cliente={clienteSeleccionado}

guardar={guardarCliente}

cancelar={()=>setMostrarFormulario(false)}

/>

}

{

mostrarHistorial&&

<HistorialCliente

cliente={clienteSeleccionado}

cerrar={()=>setMostrarHistorial(false)}

/>

}

</div>

);

};

export default Clientes;