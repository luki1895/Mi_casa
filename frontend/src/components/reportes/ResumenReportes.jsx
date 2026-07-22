function ResumenReportes({reporte}){

const ventas=

reporte.ventas.reduce(

(ac,item)=>ac+item.total,

0

);

const gastos=

reporte.gastos.reduce(

(ac,item)=>ac+item.total,

0

);

return(

<div className="grid md:grid-cols-3 gap-5">

<div className="bg-white rounded-xl shadow p-5">

<h3>

Ventas

</h3>

<h1>

Bs {ventas}

</h1>

</div>

<div className="bg-white rounded-xl shadow p-5">

<h3>

Gastos

</h3>

<h1>

Bs {gastos}

</h1>

</div>

<div className="bg-white rounded-xl shadow p-5">

<h3>

Utilidad

</h3>

<h1>

Bs {ventas-gastos}

</h1>

</div>

</div>

);

}

export default ResumenReportes;