function RegistrarGasto(){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Registrar Gasto

</h2>

<div className="grid md:grid-cols-4 gap-4">

<input

placeholder="Concepto"

className="border rounded-lg p-3"

/>

<input

placeholder="Cantidad"

className="border rounded-lg p-3"

/>

<input

placeholder="Costo Total"

className="border rounded-lg p-3"

/>

<button

className="bg-[#ff3b30] text-white rounded-xl px-4 py-3 hover:bg-[#e11d48]"

>

Registrar

</button>

</div>

</div>

);

}

export default RegistrarGasto;