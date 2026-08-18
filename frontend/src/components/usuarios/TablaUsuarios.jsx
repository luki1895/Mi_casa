function TablaUsuarios({ usuarios = [], onEditar = () => {}, onToggleSelect = () => {} }) {
   return (
       <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
           <table className="w-full text-left">
               <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                   <tr>
                       <th className="px-4 py-3">
                           <input type="checkbox" aria-label="Seleccionar todo" className="h-4 w-4 rounded border-slate-300" />
                       </th>
                       <th className="px-4 py-3">Nombre</th>
                       <th className="px-4 py-3">Usuario</th>
                       <th className="px-4 py-3">Rol</th>
                       <th className="px-4 py-3">Estado</th>
                       <th className="px-4 py-3 text-right">Acciones</th>
                   </tr>
               </thead>

               <tbody>
                   {usuarios.map((usuario) => (
                       <tr key={usuario.id} className="border-t border-slate-200">
                           <td className="px-4 py-3">
                               <input
                                   type="checkbox"
                                   className="h-4 w-4 rounded border-slate-300"
                                   onChange={() => onToggleSelect(usuario.id)}
                               />
                           </td>
                           <td className="px-4 py-3 font-medium text-slate-800">{usuario.nombre}</td>
                           <td className="px-4 py-3 text-slate-600">{usuario.usuario}</td>
                           <td className="px-4 py-3">
                               <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{usuario.rol}</span>
                           </td>
                           <td className="px-4 py-3">
                               <span className={`rounded-full px-2 py-1 text-xs font-semibold ${usuario.estado ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                                   {usuario.estado ? "Activo" : "Inactivo"}
                               </span>
                           </td>
                           <td className="px-4 py-3 text-right">
                               <button onClick={() => onEditar(usuario)} className="font-semibold text-[#ef4444] hover:text-[#dc2626]">
                                   Editar
                               </button>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>
   );
}

export default TablaUsuarios;