function ResumenCliente({

clientes

}){

const pensionados=

clientes.filter(

c=>c.tipo==="Pensionado"

).length;

const eventuales=

clientes.filter(

c=>c.tipo==="Eventual"

).length;

return(

<div className="grid md:grid-cols-3 gap-5">

<div className="bg-white p-5 rounded-xl shadow">

<h3>

Total Clientes

</h3>

<h1>

{clientes.length}

</h1>

</div>

<div className="bg-white p-5 rounded-xl shadow">

<h3>

Pensionados

</h3>

<h1>

{pensionados}

</h1>

</div>

<div className="bg-white p-5 rounded-xl shadow">

<h3>

Eventuales

</h3>

<h1>

{eventuales}

</h1>

</div>

</div>

);

}

export default ResumenCliente;