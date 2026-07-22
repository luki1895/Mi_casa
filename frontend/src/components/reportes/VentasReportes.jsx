function VentasReportes({ventas}){

return(

<div className="bg-white rounded-xl shadow overflow-hidden">

<div className="border-b p-4">

<h2>

Ventas

</h2>

</div>

<table className="w-full">

<thead>

<tr>

<th>Hora</th>

<th>Cliente</th>

<th>Tipo</th>

<th>Total</th>

</tr>

</thead>

<tbody>

{

ventas.map(item=>(

<tr key={item.id}>

<td>{item.hora}</td>

<td>{item.cliente}</td>

<td>{item.tipo}</td>

<td>Bs {item.total}</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default VentasReportes;