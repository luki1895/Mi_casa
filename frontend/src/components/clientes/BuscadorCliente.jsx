import { FaPlus, FaSearch } from "react-icons/fa";

const BuscadorCliente = ({
    busqueda,
    setBusqueda,
    tipo,
    setTipo,
    estado,
    setEstado,
    totalResultados = 0,
    onAgregar = () => {}
}) => {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:max-w-xl">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ef4444] focus:bg-white"
                    />
                </div>

                <button
                    onClick={onAgregar}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white shadow-sm transition"
                    style={{ background: "var(--primary-color)" }}
                >
                    <FaPlus className="text-sm" />
                    Agregar cliente
                </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-[#ef4444]"
                >
                    <option value="TODOS">Todos</option>
                    <option value="PENSIONADO">Pensionado</option>
                    <option value="EVENTUAL">Eventual</option>
                </select>

                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-[#ef4444]"
                >
                    <option value="TODOS">Todos</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                </select>

                <div className="flex items-center justify-center rounded-2xl bg-[#fff7ed] px-3 py-3 text-sm font-medium text-[#9a4d00]">
                    {totalResultados} resultados
                </div>
            </div>
        </div>
    );
};

export default BuscadorCliente;