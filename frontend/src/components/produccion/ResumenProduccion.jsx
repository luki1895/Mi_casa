function ResumenProduccion({produccion}){

const total=

Object.values(produccion)

.filter(x=>typeof x==="object")

.reduce(

(ac,item)=>

ac+item.preparados,

0

);

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-4">

Resumen

</h2>

<p>

Total Preparados

<strong>

{total}

</strong>

</p>

</div>

);

}

export default ResumenProduccion;