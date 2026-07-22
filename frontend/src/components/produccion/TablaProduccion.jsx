const filas=[

"sopa",

"segundo1",

"segundo2",

"entrada",

"refresco",

"extra"

];

function TablaProduccion({

produccion

}){

return(

<div className="bg-white rounded-xl shadow">

<div className="border-b p-4">

<h2>

Disponibilidad

</h2>

</div>

<table className="w-full">

<thead>

<tr>

<th>Producto</th>

<th>Preparados</th>

<th>Vendidos</th>

<th>Reservados</th>

<th>Disponibles</th>

</tr>

</thead>

<tbody>

{

filas.map(tipo=>(

<tr key={tipo}>

<td>

{produccion[tipo].nombre||"-"}

</td>

<td>

{produccion[tipo].preparados}

</td>

<td>

{produccion[tipo].vendidos}

</td>

<td>

{produccion[tipo].reservados}

</td>

<td>

{

produccion[tipo].preparados-

produccion[tipo].vendidos-

produccion[tipo].reservados

}

</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default TablaProduccion;