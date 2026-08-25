import { useMemo, useState } from "react";
import Modal from "../../components/common/Modal";
import { usuariosMock } from "../../data/usuariosMock";
import ResumenUsuarios from "../../components/usuarios/ResumenUsuarios";
import BuscadorUsuarios from "../../components/usuarios/BuscadorUsuarios";
import FormularioUsuario from "../../components/usuarios/FormularioUsuario";
import TablaUsuarios from "../../components/usuarios/TablaUsuarios";
import BotonesUsuarios from "../../components/usuarios/BotonesUsuarios";

function Usuarios() {
 const [usuarios, setUsuarios] = useState(usuariosMock);
 const [busqueda, setBusqueda] = useState("");
 const [mostrarFormulario, setMostrarFormulario] = useState(false);
 const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
 const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
 const [accionModal, setAccionModal] = useState("aprobacion");
 const [listaEliminacion, setListaEliminacion] = useState([]);
 const [password, setPassword] = useState("");

 const usuariosFiltrados = useMemo(() => {
   const texto = busqueda.toLowerCase();
   return usuarios.filter((usuario) => usuario.nombre.toLowerCase().includes(texto) || usuario.usuario.toLowerCase().includes(texto));
 }, [busqueda, usuarios]);

 const abrirFormulario = (usuario = null) => {
   setUsuarioSeleccionado(usuario);
   setMostrarFormulario(true);
 };

 const guardarUsuario = (usuario) => {
   const dato = {
     ...usuario,
     id: usuario.id || Date.now(),
     estado: usuario.estado ?? true
   };

   if (usuarioSeleccionado) {
     setUsuarios((prev) => prev.map((item) => (item.id === dato.id ? dato : item)));
   } else {
     setUsuarios((prev) => [dato, ...prev]);
   }

   setMostrarFormulario(false);
   setUsuarioSeleccionado(null);
 };

 const alternarSeleccion = (id) => {
   setListaEliminacion((prev) =>
     prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
   );
 };

 const confirmarEliminacion = () => {
   if (password !== "admin123") {
     return;
   }

   setUsuarios((prev) => prev.filter((usuario) => !listaEliminacion.includes(usuario.id)));
   setListaEliminacion([]);
   setPassword("");
   setMostrarConfirmacion(false);
 };

 const confirmarCambio = () => {
   if (password !== "admin123") {
     return;
   }

   setPassword("");
   setMostrarConfirmacion(false);
 };

 return (
   <div className="space-y-6">
     <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
       <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
         <div>
           <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Usuarios</p>
           <h2 className="text-2xl font-bold text-slate-900">Gestión de accesos</h2>
         </div>
         <p className="text-sm text-slate-500">Administra usuarios y aprobaciones desde un solo lugar.</p>
       </div>
     </div>

     <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         <div className="w-full md:max-w-lg">
           <BuscadorUsuarios busqueda={busqueda} setBusqueda={setBusqueda} />
         </div>

         <BotonesUsuarios
           onAgregar={() => abrirFormulario()}
           onEliminar={() => {
             setAccionModal("eliminar");
             setMostrarConfirmacion(true);
           }}
           onModificar={() => {
             const siguiente = usuariosFiltrados[0];
             if (siguiente) abrirFormulario(siguiente);
           }}
           onAprobar={() => {
             setAccionModal("aprobacion");
             setMostrarConfirmacion(true);
           }}
         />
       </div>
     </div>

     <ResumenUsuarios usuarios={usuariosFiltrados} />
     <FormularioUsuario
       visible={mostrarFormulario}
       usuario={usuarioSeleccionado}
       onGuardar={guardarUsuario}
       onCancelar={() => {
         setMostrarFormulario(false);
         setUsuarioSeleccionado(null);
       }}
     />
     <TablaUsuarios
       usuarios={usuariosFiltrados}
       onEditar={abrirFormulario}
       onToggleSelect={alternarSeleccion}
     />

     <Modal
       open={mostrarConfirmacion}
       title={accionModal === "eliminar" ? "Eliminar usuarios" : "Confirmación requerida"}
       onClose={() => {
         setMostrarConfirmacion(false);
         setPassword("");
         setListaEliminacion([]);
       }}
     >
       <div className="space-y-4">
         {accionModal === "eliminar" ? (
           <div className="space-y-3">
             <p className="text-sm text-slate-600">Selecciona los usuarios que deseas eliminar:</p>
             <div className="space-y-2">
               {usuarios.map((usuario) => (
                 <label key={usuario.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                   <span>{usuario.nombre} · {usuario.usuario}</span>
                   <input
                     type="checkbox"
                     checked={listaEliminacion.includes(usuario.id)}
                     onChange={() => alternarSeleccion(usuario.id)}
                     className="h-4 w-4 rounded border-slate-300"
                   />
                 </label>
               ))}
             </div>
           </div>
         ) : (
           <p className="text-sm text-slate-600">Para continuar, ingresa la contraseña de un administrador para aprobar la acción.</p>
         )}

         <input
           type="password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           placeholder="Contraseña de administrador"
           className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444]"
         />

         <div className="flex justify-end gap-3">
           <button
             type="button"
             onClick={() => {
               setMostrarConfirmacion(false);
               setPassword("");
               setListaEliminacion([]);
             }}
             className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700"
           >
             Cancelar
           </button>
           <button
             type="button"
             onClick={accionModal === "eliminar" ? confirmarEliminacion : confirmarCambio}
             className="rounded-2xl bg-[#ef4444] px-5 py-3 font-semibold text-white hover:bg-[#dc2626]"
           >
             Confirmar
           </button>
         </div>
       </div>
     </Modal>
   </div>
 );
}

export default Usuarios;
