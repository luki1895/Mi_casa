function PermisosUsuario(){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Permisos por Rol

</h2>

<table className="w-full">

<thead>

<tr>

<th>Módulo</th>

<th>Administrador</th>

<th>Caja</th>

<th>Mesero</th>

</tr>

</thead>

<tbody>

<tr>

<td>Clientes</td>

<td>✔</td>

<td>✔</td>

<td>✖</td>

</tr>

<tr>

<td>Pedidos</td>

<td>✔</td>

<td>✔</td>

<td>✔</td>

</tr>

<tr>

<td>Producción</td>

<td>✔</td>

<td>✖</td>

<td>✖</td>

</tr>

<tr>

<td>Caja</td>

<td>✔</td>

<td>✔</td>

<td>✖</td>

</tr>

<tr>

<td>Reportes</td>

<td>✔</td>

<td>✖</td>

<td>✖</td>

</tr>

<tr>

<td>Configuración</td>

<td>✔</td>

<td>✖</td>

<td>✖</td>

</tr>

</tbody>

</table>

</div>

);

}

export default PermisosUsuario;