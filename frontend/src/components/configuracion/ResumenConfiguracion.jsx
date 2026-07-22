function ResumenConfiguracion({

configuracion

}){

return(

<div className="bg-green-50 border border-green-200 rounded-xl p-6">

<h2 className="text-xl font-semibold mb-3">

Resumen

</h2>

<p>

Empresa:

<strong>

{configuracion.empresa}

</strong>

</p>

<p>

Almuerzo:

<strong>

Bs {configuracion.precioAlmuerzo}

</strong>

</p>

<p>

Sopa:

<strong>

Bs {configuracion.precioSopa}

</strong>

</p>

<p>

Segundo:

<strong>

Bs {configuracion.precioSegundo}

</strong>

</p>

</div>

);

}

export default ResumenConfiguracion;