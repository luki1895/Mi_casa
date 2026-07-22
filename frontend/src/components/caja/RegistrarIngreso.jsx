function RegistrarIngreso(){

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="text-xl font-semibold mb-5">

Ingreso Manual

</h2>

<div className="grid md:grid-cols-3 gap-4">

<input

placeholder="Concepto"

className="border rounded-lg p-3"

/>

<input

placeholder="Monto"

className="border rounded-lg p-3"

/>

<button

className="bg-green-600 text-white rounded-lg"

>

Registrar

</button>

</div>

</div>

);

}

export default RegistrarIngreso;