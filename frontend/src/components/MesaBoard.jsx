import { useMemo, useState } from "react";
import { Alert, Button, Input } from "./ui";
import { mesaEstadoVisual, posicionMesaValida } from "./mesaVisual";

const estadosMesa = [
    { id: "TODAS", label: "Todas" },
    { id: "DISPONIBLE", label: "Disponibles" },
    { id: "OCUPADA", label: "Ocupadas sin saldo" },
    { id: "PENDIENTE", label: "Saldo pendiente" },
    { id: "FUERA_SERVICIO", label: "Fuera de servicio" },
    { id: "DESCONOCIDA", label: "Sin información" },
];

const importe = (value) => {
    const amount = Number(value);
    return value === null || value === undefined || value === "" || !Number.isFinite(amount)
        ? "No disponible"
        : `Bs ${amount.toFixed(2)}`;
};

const tiempoTranscurrido = (value) => {
    const openedAt = new Date(value).getTime();
    if (!value || !Number.isFinite(openedAt) || openedAt > Date.now()) return null;

    const minutes = Math.floor((Date.now() - openedAt) / 60000);
    if (minutes < 1) return "menos de 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

const estadoId = (mesa, atencion, mesaQueryError, atencionQueryError) => {
    const estado = mesaEstadoVisual(mesa, { atencion, mesaQueryError, atencionQueryError });
    if (estado.label === "Disponible") return "DISPONIBLE";
    if (estado.label === "Ocupada · sin saldo") return "OCUPADA";
    if (estado.label === "Saldo pendiente") return "PENDIENTE";
    if (estado.label === "Deshabilitada" || estado.label === "Fuera de servicio") return "FUERA_SERVICIO";
    return "DESCONOCIDA";
};

function MesaBoard({
    mesas = [],
    atenciones = [],
    selectedMesaId,
    loading = false,
    refreshing = false,
    error = "",
    mesaQueryError = "",
    atencionQueryError = "",
    emptyMessage = "No hay mesas registradas.",
    onRetry,
    onSelectMesa,
}) {
    const [filtro, setFiltro] = useState("TODAS");
    const [busqueda, setBusqueda] = useState("");

    const atencionesById = useMemo(
        () => new Map(atenciones.map((atencion) => [Number(atencion.id_atencion), atencion])),
        [atenciones]
    );
    const obtenerAtencion = (mesa) => mesa.id_atencion
        ? atencionesById.get(Number(mesa.id_atencion))
        : null;
    const conteoPorEstado = useMemo(() => {
        const conteos = Object.fromEntries(estadosMesa.map(({ id }) => [id, 0]));
        conteos.TODAS = mesas.length;
        mesas.forEach((mesa) => {
            conteos[estadoId(
                mesa,
                mesa.id_atencion ? atencionesById.get(Number(mesa.id_atencion)) : null,
                Boolean(mesaQueryError),
                Boolean(atencionQueryError)
            )] += 1;
        });
        return conteos;
    }, [atencionesById, atencionQueryError, mesaQueryError, mesas]);
    const mesasFiltradas = useMemo(() => mesas.filter((mesa) => {
        const estado = estadoId(
            mesa,
            mesa.id_atencion ? atencionesById.get(Number(mesa.id_atencion)) : null,
            Boolean(mesaQueryError),
            Boolean(atencionQueryError)
        );
        const coincideEstado = filtro === "TODAS" || estado === filtro;
        const coincideBusqueda = String(mesa.numero ?? "").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase());
        return coincideEstado && coincideBusqueda;
    }), [atencionesById, atencionQueryError, busqueda, filtro, mesaQueryError, mesas]);
    const ubicadas = mesasFiltradas.filter(posicionMesaValida);
    const sinUbicar = mesasFiltradas.filter((mesa) => !posicionMesaValida(mesa));

    const renderMesa = (mesa, enPlano = false) => {
        const atencion = obtenerAtencion(mesa);
        const visual = mesaEstadoVisual(mesa, {
            atencion,
            mesaQueryError: Boolean(mesaQueryError),
            atencionQueryError: Boolean(atencionQueryError),
        });
        const estado = estadoId(mesa, atencion, Boolean(mesaQueryError), Boolean(atencionQueryError));
        const selectable = estado !== "DESCONOCIDA" && !mesaQueryError;
        const selected = Number(selectedMesaId) === Number(mesa.id_mesa);
        const forma = mesa.forma_visual === "CIRCULAR"
            ? "rounded-full"
            : mesa.forma_visual === "CUADRADA"
                ? "rounded-md"
                : "rounded-xl";
        const saldoPendiente = atencion ? atencion.saldo_pendiente : mesa.saldo_pendiente;
        const abiertaHace = mesa.id_atencion ? tiempoTranscurrido(mesa.abierta_en) : null;

        return (
            <button
                key={mesa.id_mesa}
                type="button"
                onClick={() => selectable && onSelectMesa?.(mesa)}
                disabled={!selectable}
                aria-pressed={selected}
                aria-label={`Mesa ${mesa.numero}, ${visual.label}`}
                title={`Mesa ${mesa.numero} · ${visual.label}${mesa.sector ? ` · ${mesa.sector}` : ""}`}
                className={`flex min-w-0 flex-col items-center justify-center overflow-hidden border-2 text-center shadow-sm ${visual.background} ${visual.border} ${visual.text} ${forma} ${selected ? "z-10 ring-4 ring-[#B85C3B]/35" : ""} ${selectable ? "cursor-pointer hover:brightness-95" : "cursor-not-allowed opacity-75"}`}
                style={enPlano ? {
                    position: "absolute",
                    left: `${Number(mesa.posicion_x) * 100}%`,
                    top: `${Number(mesa.posicion_y) * 100}%`,
                    width: `${Number(mesa.ancho_visual || 0.12) * 100}%`,
                    height: `${Number(mesa.alto_visual || 0.12) * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${Number(mesa.rotacion_grados || 0)}deg)`,
                } : undefined}
            >
                <span className="max-w-full truncate px-1 text-[10px] font-black sm:text-xs">{mesa.numero}</span>
                <span className="max-w-full truncate px-1 text-[8px] font-semibold sm:text-[10px]">{visual.label}</span>
                {!enPlano && (
                    <span className="mt-1 text-[10px] leading-tight">
                        {mesa.id_atencion ? `Atención #${mesa.id_atencion}` : mesa.sector || "Sin sector"}
                    </span>
                )}
                {!enPlano && mesa.id_atencion && (
                    <span className="mt-1 grid grid-cols-2 gap-2 text-left text-[10px] leading-tight">
                        <span>Pedidos: {mesa.cantidad_pedidos ?? "—"}</span>
                        <span>Saldo: {atencionQueryError ? "No disponible" : importe(saldoPendiente)}</span>
                        {abiertaHace && <span className="col-span-2">Abierta hace {abiertaHace}</span>}
                    </span>
                )}
            </button>
        );
    };

    return (
        <section id="mesa-board" aria-labelledby="mesa-board-title" className="space-y-5">
            <header className="flex flex-col justify-between gap-4 border-b border-[#E8DDD1] pb-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B85C3B]">Servicio presencial</p>
                    <h2 id="mesa-board-title" className="mt-1 text-3xl font-black tracking-tight text-[#342820]">Mesas del restaurante</h2>
                    <p className="mt-1 text-sm text-[#75675C]">Selecciona una mesa para consultar la atención y continuar la operación.</p>
                </div>
                {onRetry && <Button variant="secondary" size="sm" onClick={onRetry} loading={loading || refreshing}>Actualizar mesas</Button>}
            </header>

            <div aria-label="Leyenda de estados de mesas" className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] px-4 py-3 text-xs font-semibold text-[#594A3E]">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-600" />Disponible</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-600" />Ocupada · sin saldo</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-blue-600" />Saldo pendiente</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-gray-500" />Deshabilitada</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-dashed border-slate-400 bg-slate-100" />Sin información</span>
            </div>

            {error && (
                <Alert type="error" onRetry={onRetry}>
                    {error} {mesaQueryError
                        ? "No se muestran estados de mesa hasta que la consulta vuelva a estar disponible."
                        : "Los saldos no se muestran mientras falte la consulta de atenciones."}
                </Alert>
            )}
            {atencionQueryError && !mesaQueryError && (
                <Alert type="warning" onRetry={onRetry}>
                    El estado de las mesas sí se consultó, pero {String(atencionQueryError).toLowerCase()} Los saldos no se muestran mientras falte esa información.
                </Alert>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-[#E8DDD1] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2" aria-label="Filtrar mesas por estado">
                    {estadosMesa.map((estado) => (
                        <button
                            key={estado.id}
                            type="button"
                            aria-pressed={filtro === estado.id}
                            onClick={() => setFiltro(estado.id)}
                            className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amber-100 ${filtro === estado.id ? "bg-[#342820] text-white" : "bg-[#F7F3EE] text-[#594A3E] hover:bg-[#F4D7AC]"}`}
                        >
                            {estado.label} <span className="ml-1 text-xs opacity-75">{mesaQueryError ? "—" : conteoPorEstado[estado.id]}</span>
                        </button>
                    ))}
                </div>
                <Input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    aria-label="Buscar mesa por nombre o número"
                    placeholder="Buscar mesa..."
                    className="sm:max-w-xs"
                />
            </div>

            {loading && !mesas.length ? (
                <p role="status" className="rounded-xl border border-[#E8DDD1] bg-white p-6 text-sm text-[#75675C]">Cargando mesas y atenciones...</p>
            ) : !mesasFiltradas.length ? (
                <div className="rounded-xl border border-[#E8DDD1] bg-white p-6 text-sm text-[#75675C]">
                    {mesaQueryError
                        ? "No se puede confirmar el estado actual. No se muestran mesas hasta que la consulta vuelva a estar disponible."
                        : mesas.length
                            ? "No hay mesas que coincidan con el filtro."
                            : error
                                ? "No se pudo determinar el estado actual de las mesas."
                                : emptyMessage}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="overflow-auto rounded-2xl border border-[#D8CBBE] bg-[#F4EFE8] p-3">
                        <div
                            role="group"
                            aria-label="Plano de mesas"
                            className="relative mx-auto aspect-[10/7] min-w-[560px] overflow-hidden rounded-xl border border-[#CDBEAE] bg-white"
                            style={{
                                backgroundImage: "linear-gradient(to right, rgba(184,92,59,.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(184,92,59,.10) 1px, transparent 1px)",
                                backgroundSize: "2.5% 2.5%",
                            }}
                        >
                            {ubicadas.map((mesa) => renderMesa(mesa, true))}
                            {!ubicadas.length && (
                                <p className="absolute inset-0 flex items-center justify-center p-5 text-center text-sm text-[#75675C]">
                                    No hay mesas con ubicación guardada en el plano.
                                </p>
                            )}
                        </div>
                    </div>

                    {sinUbicar.length > 0 && (
                        <section aria-label="Mesas sin ubicación guardada" className="rounded-xl border border-[#E8DDD1] bg-white p-4">
                            <h3 className="font-bold text-[#342820]">Mesas sin ubicar ({sinUbicar.length})</h3>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {sinUbicar.map((mesa) => renderMesa(mesa))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </section>
    );
}

export default MesaBoard;
