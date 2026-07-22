const campos=[

["precioAlmuerzo","Almuerzo Completo"],

["precioSopa","Sopa"],

["precioSegundo","Segundo"],

["precioEntrada","Entrada"],

["precioExtra","Plato Extra"],

["precioRefresco","Refresco"]

];

function ConfiguracionPrecios({

configuracion,

actualizar

}){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Lista de Precios

</h2>

<div className="grid md:grid-cols-2 gap-4">

{

campos.map(campo=>(

<div

key={campo[0]}

className="flex justify-between items-center"

>

<label>

{campo[1]}

</label>

<input

type="number"

value={configuracion[campo[0]]}

onChange={(e)=>

actualizar(

campo[0],

Number(e.target.value)

)

}

className="border rounded-lg p-3 w-32"

/>

</div>

))

}

</div>

</div>

);

}

export default ConfiguracionPrecios;