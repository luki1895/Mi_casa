function FormularioUsuario(){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Nuevo Usuario

</h2>

<div className="grid md:grid-cols-2 gap-4">

<input

placeholder="Nombre"

className="border rounded-lg p-3"

/>

<input

placeholder="Usuario"

className="border rounded-lg p-3"

/>

<input

type="password"

placeholder="Contraseña"

className="border rounded-lg p-3"

/>

<select

className="border rounded-lg p-3"

>

<option>

Administrador

</option>

<option>

Caja

</option>

<option>

Mesero

</option>

</select>

</div>

</div>

);

}

export default FormularioUsuario;