function GastosReportes({gastos}){

return(

<div className="bg-white rounded-xl shadow overflow-hidden">

<div className="border-b p-4">

<h2>

Gastos

</h2>

</div>

<table className="w-full">

<thead>

<tr>

<th>Concepto</th>

<th>Cantidad</th>

<th>Total</th>

</tr>

</thead>

<tbody>

{

gastos.map((item,index)=>(

<tr key={index}>

<td>{item.concepto}</td>

<td>{item.cantidad}</td>

<td>Bs {item.total}</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default GastosReportes;