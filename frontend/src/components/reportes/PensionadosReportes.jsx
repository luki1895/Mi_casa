function PensionadosReportes() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#ede9fe] px-3 py-1 text-sm font-semibold text-[#6d28d9]">Pensionados</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Consumo de Pensionados</h2>
            <p className="mt-2 text-sm text-slate-600">
                Aquí se mostrará el descuento realizado de sopas y segundos de cada pensionado.
            </p>
        </div>
    );
}

export default PensionadosReportes;