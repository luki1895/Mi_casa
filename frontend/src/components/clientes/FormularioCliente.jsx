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

className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"

>

<div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

<h2 className="text-2xl font-bold text-slate-900">

{

cliente

?

"Editar Cliente"

:

"Nuevo Cliente"

}

</h2>

<span className="rounded-full bg-[#fef3c7] px-3 py-1 text-sm font-semibold text-[#92400e]">

{

cliente

?

"Editar cliente"

:

"Agregar cliente"

}

</span>

</div>

<div className="grid grid-cols-1 gap-5 md:grid-cols-2">

<div>

<label>

CI

</label>

<input

name="ci"

value={formulario.ci}

onChange={handleChange}

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30]"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30]"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

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

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

/>

</div>

</>

}

<div className="md:col-span-2">

<label>

Observaciones

</label>

<textarea

rows="5"

name="observacion"

value={formulario.observacion}

onChange={handleChange}

className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"

/>

</div>

</div>

<div className="flex justify-end gap-4 mt-8">

<button

type="button"

onClick={cancelar}

className="bg-slate-100 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl hover:bg-[#fef3c7]"

>

Cancelar

</button>

<button

type="submit"

className="bg-[#ff3b30] text-white px-5 py-3 rounded-xl hover:bg-[#e11d48]"

>

Guardar Cliente

</button>

</div>

</form>

);

};

export default FormularioCliente;