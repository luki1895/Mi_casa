function BuscadorCliente({

filtro,

setFiltro

}){

return(

<div className="bg-white rounded-xl shadow p-5">

<input

value={filtro}

onChange={(e)=>

setFiltro(e.target.value)

}

placeholder="Buscar cliente..."

className="w-full border rounded-lg p-3"

/>

</div>

);

}

export default BuscadorCliente;