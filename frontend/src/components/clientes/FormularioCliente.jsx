import { useEffect, useState } from "react";

const estadoInicial = {

    ci: "",

    nombre: "",

    apellido: "",

    telefono: "",

    correo: "",

    direccion: "",

    tipo: "EVENTUAL",

    saldo: 0,

    estado: "ACTIVO",

    observacion: "",

    fechaInicio: "",

    fechaFin: ""

};

const FormularioCliente = ({

    cliente,

    guardar,

    cancelar

})=>{

const[formulario,setFormulario]=useState(estadoInicial);

useEffect(()=>{

if(cliente){

setFormulario(cliente);

}else{

setFormulario(estadoInicial);

}

},[cliente]);

const handleChange=(e)=>{

setFormulario({

...formulario,

[e.target.name]:e.target.value

});

};

const enviar=(e)=>{

e.preventDefault();

guardar(formulario);

};

return(

<form

onSubmit={enviar}

className="bg-white rounded-xl shadow-lg p-6"

>

<h2 className="text-2xl font-bold mb-6">

{

cliente

?

"Editar Cliente"

:

"Nuevo Cliente"

}

</h2>

<div className="grid grid-cols-2 gap-5">

<div>

<label>

CI

</label>

<input

name="ci"

value={formulario.ci}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Nombre

</label>

<input

name="nombre"

value={formulario.nombre}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Apellido

</label>

<input

name="apellido"

value={formulario.apellido}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Celular

</label>

<input

name="telefono"

value={formulario.telefono}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Correo

</label>

<input

name="correo"

value={formulario.correo}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Dirección

</label>

<input

name="direccion"

value={formulario.direccion}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Tipo Cliente

</label>

<select

name="tipo"

value={formulario.tipo}

onChange={handleChange}

className="w-full border rounded-lg p-3"

>

<option value="EVENTUAL">

EVENTUAL

</option>

<option value="PENSIONADO">

PENSIONADO

</option>

</select>

</div>

<div>

<label>

Estado

</label>

<select

name="estado"

value={formulario.estado}

onChange={handleChange}

className="w-full border rounded-lg p-3"

>

<option value="ACTIVO">

ACTIVO

</option>

<option value="INACTIVO">

INACTIVO

</option>

</select>

</div>

{

formulario.tipo==="PENSIONADO"

&&

<>

<div>

<label>

Almuerzos Disponibles

</label>

<input

name="saldo"

type="number"

value={formulario.saldo}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Fecha Inicio

</label>

<input

name="fechaInicio"

type="date"

value={formulario.fechaInicio}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

<div>

<label>

Fecha Final

</label>

<input

name="fechaFin"

type="date"

value={formulario.fechaFin}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

</>

}

<div className="col-span-2">

<label>

Observaciones

</label>

<textarea

rows="5"

name="observacion"

value={formulario.observacion}

onChange={handleChange}

className="w-full border rounded-lg p-3"

/>

</div>

</div>

<div className="flex justify-end gap-4 mt-8">

<button

type="button"

onClick={cancelar}

className="bg-gray-600 text-white px-5 py-3 rounded-lg"

>

Cancelar

</button>

<button

type="submit"

className="bg-red-700 text-white px-5 py-3 rounded-lg"

>

Guardar Cliente

</button>

</div>

</form>

);

};

export default FormularioCliente;