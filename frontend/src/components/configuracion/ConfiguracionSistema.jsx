const temas = [
   { valor: "rojo", nombre: "Rojo corporativo", color: "bg-[#ef4444]" },
   { valor: "verde", nombre: "Verde natural", color: "bg-[#10b981]" },
   { valor: "azul", nombre: "Azul premium", color: "bg-[#2563eb]" },
   { valor: "violeta", nombre: "Violeta elegante", color: "bg-[#8b5cf6]" }
];

function ConfiguracionSistema({ configuracion = {}, actualizar = () => {} }) {
   return (
       <div className="rounded-2xl bg-white p-6 shadow-sm">
           <h2 className="mb-5 text-xl font-semibold text-slate-900">Sistema</h2>

           <div className="space-y-6">
               <label className="flex items-center gap-3 text-slate-700">
                   <input
                       type="checkbox"
                       checked={configuracion.ticket}
                       onChange={(e) => actualizar("ticket", e.target.checked)}
                       className="h-4 w-4 rounded border-slate-300"
                   />
                   Imprimir ticket
               </label>

               <label className="flex items-center gap-3 text-slate-700">
                   <input
                       type="checkbox"
                       checked={configuracion.logo}
                       onChange={(e) => actualizar("logo", e.target.checked)}
                       className="h-4 w-4 rounded border-slate-300"
                   />
                   Mostrar logo
               </label>

               <div>
                   <p className="mb-3 text-sm font-medium text-slate-700">Tema del sistema</p>
                   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                       {temas.map((tema) => (
                           <button
                               key={tema.valor}
                               type="button"
                               onClick={() => actualizar("tema", tema.valor)}
                               className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                   configuracion.tema === tema.valor ? "border-[#ef4444] bg-[#fff1f2]" : "border-slate-200 bg-slate-50"
                               }`}
                           >
                               <span className={`h-5 w-5 rounded-full ${tema.color}`} />
                               <span className="text-sm font-medium text-slate-700">{tema.nombre}</span>
                           </button>
                       ))}
                   </div>
               </div>
           </div>
       </div>
   );
}

export default ConfiguracionSistema;