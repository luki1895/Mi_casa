const filas=[

"sopa",

"segundo1",

"segundo2",

"entrada",

"refresco",

"extra"

];

function FormularioProduccion({

produccion,

actualizar

}){

return(

<div className="bg-white rounded-xl shadow">

<div className="border-b p-4">

<h2 className="text-xl font-semibold">

Producción

</h2>

</div>

<table className="w-full">

<thead>

<tr>

<th>Tipo</th>

<th>Nombre</th>

<th>Preparados</th>

</tr>

</thead>

<tbody>

{

filas.map(tipo=>(

<tr key={tipo}>

<td className="p-3">

{tipo.toUpperCase()}

</td>

<td>

<input

value={produccion[tipo].nombre}

onChange={(e)=>

actualizar(

tipo,

"nombre",

e.target.value

)

}

className="border rounded p-2 w-full"

/>

</td>

<td>

<input

type="number"

value={produccion[tipo].preparados}

onChange={(e)=>

actualizar(

tipo,

"preparados",

Number(e.target.value)

)

}

className="border rounded p-2 w-24"

/>

</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default FormularioProduccion;