function BotonesConfiguracion({ restablecer = () => {} }){

return(

<div className="flex justify-end gap-4">

<button

onClick={restablecer}

className="border rounded-lg px-6 py-3"

>

Restablecer

</button>

<button

className="bg-blue-600 text-white rounded-lg px-6 py-3"

>

Guardar Configuración

</button>

</div>

);

}

export default BotonesConfiguracion;