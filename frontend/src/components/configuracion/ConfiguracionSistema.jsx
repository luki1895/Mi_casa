function ConfiguracionSistema({

configuracion,

actualizar

}){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Sistema

</h2>

<div className="space-y-4">

<label className="flex gap-3">

<input

type="checkbox"

checked={configuracion.ticket}

onChange={(e)=>actualizar("ticket",e.target.checked)}

/>

Imprimir Ticket

</label>

<label className="flex gap-3">

<input

type="checkbox"

checked={configuracion.logo}

onChange={(e)=>actualizar("logo",e.target.checked)}

/>

Mostrar Logo

</label>

</div>

</div>

);

}

export default ConfiguracionSistema;