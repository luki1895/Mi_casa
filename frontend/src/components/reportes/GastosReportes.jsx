function GastosReportes({ gastos }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#fee2e2] p-4">
                <h2 className="text-lg font-semibold text-[#b91c1c]">Gastos</h2>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                    <tr>
                        <th className="p-3 text-left">Concepto</th>
                        <th className="p-3 text-left">Cantidad</th>
                        <th className="p-3 text-left">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {gastos.map((item, index) => (
                        <tr key={index} className="border-t border-slate-100">
                            <td className="p-3">{item.concepto}</td>
                            <td className="p-3">{item.cantidad}</td>
                            <td className="p-3 font-semibold text-slate-900">Bs {item.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default GastosReportes;