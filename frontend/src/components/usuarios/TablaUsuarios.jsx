function TablaUsuarios({usuarios}){

return(

<div className="bg-white rounded-xl shadow overflow-hidden">

<table className="w-full">

<thead>

<tr>

<th>Nombre</th>

<th>Usuario</th>

<th>Rol</th>

<th>Estado</th>

<th></th>

</tr>

</thead>

<tbody>

{

usuarios.map(usuario=>(

<tr key={usuario.id}>

<td>{usuario.nombre}</td>

<td>{usuario.usuario}</td>

<td>{usuario.rol}</td>

<td>

{

usuario.estado

?

"Activo"

:

"Inactivo"

}

</td>

<td>

<button

className="text-blue-600"

>

Editar

</button>

</td>

</tr>

))

}

</tbody>

</table>

</div>

);

}

export default TablaUsuarios;