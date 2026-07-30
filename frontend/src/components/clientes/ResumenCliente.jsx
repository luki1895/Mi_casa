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
    const almuerzos = clientes.reduce((total, cliente) => total + Number(cliente.saldo || 0), 0);

    const tarjetas = [
        { titulo: "Clientes", valor: clientes.length, icono: <FaUsers />, color: "bg-[#fef3c7] text-[#92400e]" },
        { titulo: "Pensionados", valor: pensionados, icono: <FaUserCheck />, color: "bg-[#dcfce7] text-[#166534]" },
        { titulo: "Eventuales", valor: eventuales, icono: <FaUserClock />, color: "bg-[#ffedd5] text-[#c2410c]" },
        { titulo: "Activos", valor: activos, icono: <FaClipboardList />, color: "bg-[#ede9fe] text-[#6d28d9]" },
        { titulo: "Almuerzos", valor: almuerzos, icono: <FaUtensils />, color: "bg-[#fee2e2] text-[#b91c1c]" }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {tarjetas.map((item, index) => (
                <div key={index} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${item.color}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium opacity-80">{item.titulo}</p>
                            <h2 className="mt-2 text-3xl font-bold">{item.valor}</h2>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 text-2xl">{item.icono}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ResumenCliente;