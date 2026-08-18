import { useEffect, useState } from "react";

const vacio = {
   nombre: "",
   usuario: "",
   contraseña: "",
   rol: "Administrador"
};

function FormularioUsuario({ visible = false, usuario = null, onGuardar = () => {}, onCancelar = () => {} }) {
   const [formulario, setFormulario] = useState(vacio);

   useEffect(() => {
       if (usuario) {
           setFormulario({
               nombre: usuario.nombre || "",
               usuario: usuario.usuario || "",
               contraseña: "",
               rol: usuario.rol || "Administrador"
           });
       } else {
           setFormulario(vacio);
       }
   }, [usuario, visible]);

   const manejarCambio = (e) => {
       setFormulario((prev) => ({ ...prev, [e.target.name]: e.target.value }));
   };

   const enviar = (e) => {
       e.preventDefault();
       onGuardar({ ...usuario, ...formulario, contraseña: formulario.contraseña || usuario?.contraseña || "" });
   };

   if (!visible) return null;

   return (
       <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
           <div className="mb-5 flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-900">{usuario ? "Editar usuario" : "Nuevo usuario"}</h2>
               <button type="button" onClick={onCancelar} className="text-sm font-semibold text-slate-500 hover:text-[#ef4444]">
                   Cerrar
               </button>
           </div>

           <form onSubmit={enviar} className="grid gap-4 md:grid-cols-2">
               <input
                   name="nombre"
                   value={formulario.nombre}
                   onChange={manejarCambio}
                   placeholder="Nombre"
                   className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
               />

               <input
                   name="usuario"
                   value={formulario.usuario}
                   onChange={manejarCambio}
                   placeholder="Usuario"
                   className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
               />

               <input
                   type="password"
                   name="contraseña"
                   value={formulario.contraseña}
                   onChange={manejarCambio}
                   placeholder={usuario ? "Nueva contraseña" : "Contraseña"}
                   className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
               />

               <select
                   name="rol"
                   value={formulario.rol}
                   onChange={manejarCambio}
                   className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
               >
                   <option>Administrador</option>
                   <option>Caja</option>
                   <option>Mesero</option>
               </select>

               <div className="md:col-span-2 flex justify-end gap-3">
                   <button type="button" onClick={onCancelar} className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700">
                       Cancelar
                   </button>
                   <button type="submit" className="rounded-2xl bg-[#ef4444] px-5 py-3 font-semibold text-white hover:bg-[#dc2626]">
                       Guardar
                   </button>
               </div>
           </form>
       </div>
   );
}

export default FormularioUsuario;