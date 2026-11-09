import {createContext,useState} from "react";

// The context is intentionally exported separately for consumers and hooks.
// eslint-disable-next-line react-refresh/only-export-components
export const SistemaContext=createContext();

export function SistemaProvider({children}){

const[clientes,setClientes]=useState([]);

const[pedidos,setPedidos]=useState([]);

const[produccion,setProduccion]=useState([]);

const[caja,setCaja]=useState([]);

const[gastos,setGastos]=useState([]);

return(

<SistemaContext.Provider

value={{

clientes,

setClientes,

pedidos,

setPedidos,

produccion,

setProduccion,

caja,

setCaja,

gastos,

setGastos

}}

>

{children}

</SistemaContext.Provider>

);

}