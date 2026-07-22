import {useState} from "react";

import {usuariosMock} from "../../data/usuariosMock";

import ResumenUsuarios from "../../components/usuarios/ResumenUsuarios";
import BuscadorUsuarios from "../../components/usuarios/BuscadorUsuarios";
import FormularioUsuario from "../../components/usuarios/FormularioUsuario";
import TablaUsuarios from "../../components/usuarios/TablaUsuarios";
import PermisosUsuario from "../../components/usuarios/PermisosUsuario";
import BotonesUsuarios from "../../components/usuarios/BotonesUsuarios";

function Usuarios(){

const[usuarios,setUsuarios]=useState(usuariosMock);

const[filtro,setFiltro]=useState("");

const lista=

usuarios.filter(usuario=>

usuario.nombre

.toLowerCase()

.includes(filtro.toLowerCase())

);

return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">

Usuarios

</h1>

<ResumenUsuarios

usuarios={usuarios}

/>

<BuscadorUsuarios

filtro={filtro}

setFiltro={setFiltro}

/>

<FormularioUsuario/>

<TablaUsuarios

usuarios={lista}

/>

<PermisosUsuario/>

<BotonesUsuarios/>

</div>

);

}

export default Usuarios;