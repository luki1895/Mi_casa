function ResumenCaja({

efectivo,

ingresos,

gastos,

saldo

}){

return(

<div className="grid md:grid-cols-4 gap-5">

<div className="bg-white shadow rounded-xl p-5">

<p>Efectivo Inicial</p>

<h2>

Bs {efectivo}

</h2>

</div>

<div className="bg-white shadow rounded-xl p-5">

<p>Ingresos</p>

<h2 className="text-green-600">

Bs {ingresos}

</h2>

</div>

<div className="bg-white shadow rounded-xl p-5">

<p>Gastos</p>

<h2 className="text-red-600">

Bs {gastos}

</h2>

</div>

<div className="bg-white shadow rounded-xl p-5">

<p>Saldo</p>

<h2 className="text-blue-600">

Bs {saldo}

</h2>

</div>

</div>

);

}

export default ResumenCaja;