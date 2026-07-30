import { FaSearch } from "react-icons/fa";

const BuscadorCliente = ({

    busqueda,

    setBusqueda,

    tipo,

    setTipo,

    estado,

    setEstado

}) => {

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 outline-none transition focus:border-[#ff3b30] focus:bg-white"
                    />
                </div>

                <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30]"
                >
                    <option value="TODOS">Todos</option>
                    <option value="PENSIONADO">Pensionado</option>
                    <option value="EVENTUAL">Eventual</option>
                </select>

                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ff3b30]"
                >
                    <option value="TODOS">Todos</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                </select>
            </div>
        </div>
    );

};

export default BuscadorCliente;