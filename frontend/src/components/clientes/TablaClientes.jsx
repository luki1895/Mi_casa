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

            <div className="bg-white rounded-xl shadow p-10 text-center">

                <h2 className="text-xl font-semibold text-gray-500">

                    No existen clientes registrados

                </h2>

            </div>

        );

    }

    return (

        <div className="bg-white rounded-xl shadow overflow-hidden">

            <table className="w-full">

                <thead className="bg-red-700 text-white">

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
                                className="border-b hover:bg-gray-50 transition"
                            >

                                <td className="p-4">

                                    <div className="flex items-center gap-4">

                                        <div className="w-12 h-12 rounded-full bg-red-700 text-white flex items-center justify-center font-bold">

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

                                    <div className="flex gap-3 justify-center">

                                        <button

                                            onClick={()=>editar(cliente)}

                                            className="text-blue-600 hover:scale-110"

                                        >

                                            <FaEdit/>

                                        </button>

                                        <button

                                            onClick={()=>historial(cliente)}

                                            className="text-green-600 hover:scale-110"

                                        >

                                            <FaHistory/>

                                        </button>

                                        <button

                                            onClick={()=>pedido(cliente)}

                                            className="text-orange-600 hover:scale-110"

                                        >

                                            <FaUtensils/>

                                        </button>

                                        <button

                                            className="text-gray-600 hover:scale-110"

                                        >

                                            <FaEye/>

                                        </button>

                                        <button

                                            onClick={()=>eliminar(cliente.id)}

                                            className="text-red-600 hover:scale-110"

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