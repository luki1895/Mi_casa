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

        <div className="bg-white rounded-xl shadow p-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                <div className="relative">

                    <FaSearch

                        className="absolute left-4 top-4 text-gray-400"

                    />

                    <input

                        value={busqueda}

                        onChange={(e)=>setBusqueda(e.target.value)}

                        placeholder="Buscar cliente..."

                        className="border rounded-lg pl-10 pr-4 py-3 w-full"

                    />

                </div>

                <select

                    value={tipo}

                    onChange={(e)=>setTipo(e.target.value)}

                    className="border rounded-lg p-3"

                >

                    <option value="TODOS">

                        Todos

                    </option>

                    <option value="PENSIONADO">

                        Pensionado

                    </option>

                    <option value="EVENTUAL">

                        Eventual

                    </option>

                </select>

                <select

                    value={estado}

                    onChange={(e)=>setEstado(e.target.value)}

                    className="border rounded-lg p-3"

                >

                    <option value="TODOS">

                        Todos

                    </option>

                    <option value="ACTIVO">

                        Activo

                    </option>

                    <option value="INACTIVO">

                        Inactivo

                    </option>

                </select>

            </div>

        </div>

    );

};

export default BuscadorCliente;