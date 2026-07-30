function VentasReportes({ ventas }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#fef3c7] p-4">
                <h2 className="text-lg font-semibold text-[#92400e]">Ventas</h2>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                    <tr>
                        <th className="p-3 text-left">Hora</th>
                        <th className="p-3 text-left">Cliente</th>
                        <th className="p-3 text-left">Tipo</th>
                        <th className="p-3 text-left">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ventas.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                            <td className="p-3">{item.hora}</td>
                            <td className="p-3">{item.cliente}</td>
                            <td className="p-3">{item.tipo}</td>
                            <td className="p-3 font-semibold text-slate-900">Bs {item.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default VentasReportes;