function ProduccionReportes() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-sm font-semibold text-[#166534]">Producción</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Producción del Día</h2>
            <p className="mt-2 text-sm text-slate-600">
                Aquí se mostrará el resumen de sopa, segundos, entrada, refresco y plato extra vendidos.
            </p>
        </div>
    );
}

export default ProduccionReportes;