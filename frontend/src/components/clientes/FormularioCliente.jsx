import {useState} from "react";

function FormularioCliente(){

const[tipo,setTipo]=useState("Eventual");

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Nuevo Cliente

</h2>

<div className="grid md:grid-cols-2 gap-4">

<input

placeholder="Nombre"

className="border rounded-lg p-3"

/>

<input

placeholder="Teléfono"

className="border rounded-lg p-3"

/>

<select

value={tipo}

onChange={(e)=>

setTipo(e.target.value)

}

className="border rounded-lg p-3"

>

<option>

Eventual

</option>

<option>

Pensionado

</option>

</select>

{

tipo==="Pensionado"

&&

<>

<input

value="26"

readOnly

className="border rounded-lg p-3 bg-gray-100"

/>

<input

value="26"

readOnly

className="border rounded-lg p-3 bg-gray-100"

/>

</>

}

</div>

</div>

);

}

export default FormularioCliente;