function ResumenReportes({ reporte }) {
    const ventas = reporte.ventas.reduce((ac, item) => ac + item.total, 0);
    const gastos = reporte.gastos.reduce((ac, item) => ac + item.total, 0);
    const utilidad = ventas - gastos;

    const cards = [
        { titulo: "Ventas", valor: `Bs ${ventas}`, color: "bg-[#fef3c7] text-[#92400e]", subtitulo: "Ingresos del periodo" },
        { titulo: "Gastos", valor: `Bs ${gastos}`, color: "bg-[#fee2e2] text-[#b91c1c]", subtitulo: "Egresos registrados" },
        { titulo: "Utilidad", valor: `Bs ${utilidad}`, color: "bg-[#dcfce7] text-[#166534]", subtitulo: "Resultado neto" }
    ];

    return (
        <div className="grid md:grid-cols-3 gap-5">
            {cards.map((card) => (
                <div key={card.titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${card.color}`}>
                        {card.titulo}
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-slate-900">{card.valor}</h1>
                    <p className="mt-1 text-sm text-slate-500">{card.subtitulo}</p>
                </div>
            ))}
        </div>
    );
}

export default ResumenReportes;