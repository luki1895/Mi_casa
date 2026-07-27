import {
    FaUsers,
    FaUserCheck,
    FaUserClock,
    FaClipboardList,
    FaUtensils
} from "react-icons/fa";

const ResumenCliente = ({ clientes = [] }) => {

    const pensionados = clientes.filter(c => c.tipo === "PENSIONADO").length;

    const eventuales = clientes.filter(c => c.tipo === "EVENTUAL").length;

    const activos = clientes.filter(c => c.estado === "ACTIVO").length;

    const almuerzos = clientes.reduce((total, cliente) => {

        return total + Number(cliente.saldo || 0);

    }, 0);

    const tarjetas = [

        {
            titulo: "Clientes",
            valor: clientes.length,
            icono: <FaUsers />,
            color: "bg-blue-600"
        },

        {
            titulo: "Pensionados",
            valor: pensionados,
            icono: <FaUserCheck />,
            color: "bg-green-600"
        },

        {
            titulo: "Eventuales",
            valor: eventuales,
            icono: <FaUserClock />,
            color: "bg-orange-500"
        },

        {
            titulo: "Activos",
            valor: activos,
            icono: <FaClipboardList />,
            color: "bg-purple-600"
        },

        {
            titulo: "Almuerzos",
            valor: almuerzos,
            icono: <FaUtensils />,
            color: "bg-red-700"
        }

    ];

    return (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">

            {

                tarjetas.map((item, index) => (

                    <div

                        key={index}

                        className={`${item.color} rounded-xl text-white shadow-lg p-5`}

                    >

                        <div className="flex justify-between items-center">

                            <div>

                                <p className="text-sm opacity-80">

                                    {item.titulo}

                                </p>

                                <h2 className="text-3xl font-bold mt-2">

                                    {item.valor}

                                </h2>

                            </div>

                            <div className="text-5xl opacity-70">

                                {item.icono}

                            </div>

                        </div>

                    </div>

                ))

            }

        </div>

    );

};

export default ResumenCliente;