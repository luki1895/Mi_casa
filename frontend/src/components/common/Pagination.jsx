function Pagination({

pagina,

total,

anterior,

siguiente

}){

return(

<div className="flex justify-end items-center gap-3 mt-4">

<button

onClick={anterior}

disabled={pagina===1}

className="border px-4 py-2 rounded"

>

Anterior

</button>

<span>

Página {pagina} de {total}

</span>

<button

onClick={siguiente}

disabled={pagina===total}

className="border px-4 py-2 rounded"

>

Siguiente

</button>

</div>

);

}

export default Pagination;