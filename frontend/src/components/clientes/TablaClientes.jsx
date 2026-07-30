import {
    FaEdit,
    FaTrash,
    FaHistory,
    FaUtensils,
    FaEye
} from "react-icons/fa";

const TablaClientes = ({
    clientes = [],
    editar,
    eliminar,
    historial,
    pedido
}) => {

    if (clientes.length === 0) {

        return (

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

                <h2 className="text-xl font-semibold text-slate-600">

                    No existen clientes registrados

                </h2>

            </div>

        );

    }

    return (

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <table className="w-full text-sm">

                <thead className="border-b border-[#fde68a] bg-[#fef3c7] text-[#92400e]">

                    <tr>

                        <th className="p-4 text-left">Cliente</th>

                        <th>CI</th>

                        <th>Celular</th>

                        <th>Tipo</th>

                        <th>Saldo</th>

                        <th>Estado</th>

                        <th>Acciones</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        clientes.map(cliente => (

                            <tr
                                key={cliente.id}
                                className="border-b border-slate-100 transition hover:bg-slate-50"
                            >

                                <td className="p-4">

                                    <div className="flex items-center gap-4">

                                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#fde68a] bg-[#fef3c7] font-bold text-[#92400e]">

                                            {

                                                cliente.nombre?.charAt(0)

                                            }

                                            {

                                                cliente.apellido?.charAt(0)

                                            }

                                        </div>

                                        <div>

                                            <h2 className="font-semibold">

                                                {

                                                    cliente.nombre

                                                }

                                                {" "}

                                                {

                                                    cliente.apellido

                                                }

                                            </h2>

                                            <p className="text-sm text-gray-500">

                                                {

                                                    cliente.correo

                                                }

                                            </p>

                                        </div>

                                    </div>

                                </td>

                                <td>

                                    {

                                        cliente.ci

                                    }

                                </td>

                                <td>

                                    {

                                        cliente.telefono

                                    }

                                </td>

                                <td>

                                    {

                                        cliente.tipo==="PENSIONADO"

                                        ?

                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">

                                            Pensionado

                                        </span>

                                        :

                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">

                                            Eventual

                                        </span>

                                    }

                                </td>

                                <td>

                                    {

                                        cliente.saldo

                                    }

                                </td>

                                <td>

                                    {

                                        cliente.estado==="ACTIVO"

                                        ?

                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">

                                            Activo

                                        </span>

                                        :

                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">

                                            Inactivo

                                        </span>

                                    }

                                </td>

                                <td>

                                    <div className="flex justify-center gap-2">

                                        <button

                                            onClick={()=>editar(cliente)}

                                            className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:scale-110"

                                        >

                                            <FaEdit/>

                                        </button>

                                        <button

                                            onClick={()=>historial(cliente)}

                                            className="rounded-full p-2 text-green-600 transition hover:bg-green-50 hover:scale-110"

                                        >

                                            <FaHistory/>

                                        </button>

                                        <button

                                            onClick={()=>pedido(cliente)}

                                            className="rounded-full p-2 text-orange-600 transition hover:bg-orange-50 hover:scale-110"

                                        >

                                            <FaUtensils/>

                                        </button>

                                        <button

                                            className="rounded-full p-2 text-gray-600 transition hover:bg-slate-100 hover:scale-110"

                                        >

                                            <FaEye/>

                                        </button>

                                        <button

                                            onClick={()=>eliminar(cliente.id)}

                                            className="rounded-full p-2 text-red-600 transition hover:bg-red-50 hover:scale-110"

                                        >

                                            <FaTrash/>

                                        </button>

                                    </div>

                                </td>

                            </tr>

                        ))

                    }

                </tbody>

            </table>

        </div>

    );

};

export default TablaClientes;