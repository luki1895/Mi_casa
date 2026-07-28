import { useMemo, useState } from "react";
import { usuariosMock } from "../../data/usuariosMock";
import ResumenUsuarios from "../../components/usuarios/ResumenUsuarios";
import BuscadorUsuarios from "../../components/usuarios/BuscadorUsuarios";
import FormularioUsuario from "../../components/usuarios/FormularioUsuario";
import TablaUsuarios from "../../components/usuarios/TablaUsuarios";
import PermisosUsuario from "../../components/usuarios/PermisosUsuario";
import BotonesUsuarios from "../../components/usuarios/BotonesUsuarios";

function Usuarios() {
  const [busqueda, setBusqueda] = useState("");
  const usuarios = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return usuariosMock.filter((usuario) => usuario.nombre.toLowerCase().includes(texto));
  }, [busqueda]);

  return (
    <div className="space-y-6">
      <ResumenUsuarios usuarios={usuarios} />
      <BuscadorUsuarios busqueda={busqueda} setBusqueda={setBusqueda} />
      <FormularioUsuario />
      <TablaUsuarios usuarios={usuarios} />
      <PermisosUsuario />
      <BotonesUsuarios />
    </div>
  );
}

export default Usuarios;
