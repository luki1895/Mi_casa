function DatosEmpresa({

configuracion,

actualizar

}){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Datos del Restaurante

</h2>

<div className="grid md:grid-cols-3 gap-4">

<input

value={configuracion.empresa}

onChange={(e)=>actualizar("empresa",e.target.value)}

placeholder="Empresa"

className="border rounded-lg p-3"

/>

<input

value={configuracion.direccion}

onChange={(e)=>actualizar("direccion",e.target.value)}

placeholder="Dirección"

className="border rounded-lg p-3"

/>

<input

value={configuracion.telefono}

onChange={(e)=>actualizar("telefono",e.target.value)}

placeholder="Teléfono"

className="border rounded-lg p-3"

/>

</div>

</div>

);

}

export default DatosEmpresa;