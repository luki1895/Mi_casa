function TablaVentas({ventas}){

return(

<div className="bg-white rounded-xl shadow">

<div className="border-b p-4">

<h2>

Ventas del Día

</h2>

</div>

<table className="w-full">

<thead>

<tr>

<th>Hora</th>

<th>Cliente</th>

<th>Total</th>

</tr>

</thead>

<tbody>

{

ventas.length===0?

<tr>

<td

colSpan="3"

className="text-center py-8"

>

No existen ventas.

</td>

</tr>

:

ventas.map(item=>(

<tr key={item.id}>

<td>

{item.hora}

</td>

<td>

{item.cliente}

</td>

<td>

Bs {item.total}

</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default TablaVentas;