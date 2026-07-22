function TablaClientes({

clientes

}){

return(

<div className="bg-white rounded-xl shadow overflow-hidden">

<table className="w-full">

<thead>

<tr>

<th>Nombre</th>

<th>Tipo</th>

<th>Sopas</th>

<th>Segundos</th>

<th>Estado</th>

</tr>

</thead>

<tbody>

{

clientes.map(cliente=>(

<tr key={cliente.id}>

<td>

{cliente.nombre}

</td>

<td>

{cliente.tipo}

</td>

<td>

{cliente.saldoSopas}

</td>

<td>

{cliente.saldoSegundos}

</td>

<td>

{

cliente.estado

?

"Activo"

:

"Inactivo"

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

export default TablaClientes;