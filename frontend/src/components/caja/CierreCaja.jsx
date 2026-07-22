function CierreCaja({saldo}){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-4">

Cierre de Caja

</h2>

<div className="flex justify-between items-center">

<h3>

Saldo Final

</h3>

<h1 className="text-4xl text-blue-600">

Bs {saldo}

</h1>

</div>

</div>

);

}

export default CierreCaja;