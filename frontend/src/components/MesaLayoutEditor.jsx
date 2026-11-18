import { useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Select } from "./ui";
import { mesaEstadoVisual, posicionMesaValida } from "./mesaVisual";

const pasoCuadricula = 0.025;
const limitar = (valor, minimo, maximo) => Math.max(minimo, Math.min(maximo, valor));
const ajustarCuadricula = (valor) => Math.round(valor / pasoCuadricula) * pasoCuadricula;

const dimensionesRotadas = (mesa) => {
    const radianes = Number(mesa.rotacion_grados || 0) * Math.PI / 180;
    return {
        ancho: Math.abs(Math.cos(radianes)) * Number(mesa.ancho_visual)
            + Math.abs(Math.sin(radianes)) * Number(mesa.alto_visual),
        alto: Math.abs(Math.sin(radianes)) * Number(mesa.ancho_visual)
            + Math.abs(Math.cos(radianes)) * Number(mesa.alto_visual),
    };
};

const haySuperposiciones = (mesas) => {
    const ubicadas = mesas.filter(posicionMesaValida);
    for (let i = 0; i < ubicadas.length; i += 1) {
        const actual = ubicadas[i];
        const dimensiones = dimensionesRotadas(actual);
        if (
            Number(actual.posicion_x) - dimensiones.ancho / 2 < 0
            || Number(actual.posicion_x) + dimensiones.ancho / 2 > 1
            || Number(actual.posicion_y) - dimensiones.alto / 2 < 0
            || Number(actual.posicion_y) + dimensiones.alto / 2 > 1
        ) return { tipo: "limites", mesas: [actual] };
        for (let j = i + 1; j < ubicadas.length; j += 1) {
            const otra = ubicadas[j];
            const dimensionesOtra = dimensionesRotadas(otra);
            if (
                Math.abs(Number(actual.posicion_x) - Number(otra.posicion_x))
                    < (dimensiones.ancho + dimensionesOtra.ancho) / 2
                && Math.abs(Number(actual.posicion_y) - Number(otra.posicion_y))
                    < (dimensiones.alto + dimensionesOtra.alto) / 2
            ) return { tipo: "superposicion", mesas: [actual, otra] };
        }
    }
    return null;
};

const limitesCentro = (mesa) => {
    const dimensiones = dimensionesRotadas(mesa);
    return {
        x: dimensiones.ancho / 2,
        y: dimensiones.alto / 2,
    };
};

const convertirMesa = (mesa) => ({
    id_mesa: Number(mesa.id_mesa),
    posicion_x: mesa.posicion_x === null || mesa.posicion_x === undefined ? null : Number(mesa.posicion_x),
    posicion_y: mesa.posicion_y === null || mesa.posicion_y === undefined ? null : Number(mesa.posicion_y),
    rotacion_grados: Number(mesa.rotacion_grados || 0),
    forma_visual: mesa.forma_visual || "CIRCULAR",
    ancho_visual: Number(mesa.ancho_visual || 0.12),
    alto_visual: Number(mesa.alto_visual || 0.12),
});

function MesaLayoutEditor({
    mesas = [],
    sectores = [],
    layout = [],
    onLayoutChange,
    onCreateMesa,
    onEditMesa,
    onToggleMesa,
    onSave,
    onCancel,
    saving = false,
    disabled = false,
}) {
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const [sectorFiltro, setSectorFiltro] = useState("TODAS");
    const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState(null);
    const [zoom, setZoom] = useState(1);

    const datosPorId = useMemo(
        () => new Map(mesas.map((mesa) => [Number(mesa.id_mesa), mesa])),
        [mesas]
    );
    const layoutPorId = useMemo(
        () => new Map(layout.map((mesa) => [Number(mesa.id_mesa), mesa])),
        [layout]
    );
    const mesasFiltradas = useMemo(() => mesas.filter((mesa) => (
        sectorFiltro === "TODAS"
        || (sectorFiltro === "SIN_SECTOR" && !mesa.id_sector)
        || String(mesa.id_sector) === sectorFiltro
    )), [mesas, sectorFiltro]);
    const layoutFiltrado = useMemo(
        () => mesasFiltradas.map((mesa) => layoutPorId.get(Number(mesa.id_mesa))).filter(Boolean),
        [layoutPorId, mesasFiltradas]
    );
    const mesaSeleccionada = mesaSeleccionadaId === null
        ? null
        : datosPorId.get(Number(mesaSeleccionadaId));
    const layoutSeleccionado = mesaSeleccionada
        ? layoutPorId.get(Number(mesaSeleccionada.id_mesa))
        : null;
    const ubicadas = layoutFiltrado.filter(posicionMesaValida);
    const sinUbicar = mesasFiltradas.filter((mesa) => !posicionMesaValida(layoutPorId.get(Number(mesa.id_mesa))));
    const superposicion = haySuperposiciones(layout);
    const cambiosPendientes = layout.some((mesa) => {
        const original = datosPorId.get(Number(mesa.id_mesa));
        if (!original) return false;
        const base = convertirMesa(original);
        return ["posicion_x", "posicion_y", "rotacion_grados", "ancho_visual", "alto_visual"]
            .some((campo) => Number(mesa[campo] ?? -1) !== Number(base[campo] ?? -1))
            || mesa.forma_visual !== base.forma_visual;
    });

    const actualizarMesa = (idMesa, actualizacion) => {
        onLayoutChange((actual) => actual.map((mesa) => (
            Number(mesa.id_mesa) === Number(idMesa) ? { ...mesa, ...actualizacion } : mesa
        )));
    };

    const ubicarMesa = (mesa, x, y) => {
        const limites = limitesCentro(mesa);
        const posicion = {
            posicion_x: limitar(ajustarCuadricula(x), limites.x, 1 - limites.x),
            posicion_y: limitar(ajustarCuadricula(y), limites.y, 1 - limites.y),
        };
        actualizarMesa(mesa.id_mesa, posicion);
    };

    const sugerirUbicacion = (mesa) => {
        const limites = limitesCentro(mesa);
        const candidatos = [];
        for (let y = Math.max(limites.y, 0.1); y <= 0.9; y += 0.1) {
            for (let x = Math.max(limites.x, 0.1); x <= 0.9; x += 0.1) {
                candidatos.push({
                    posicion_x: limitar(ajustarCuadricula(x), limites.x, 1 - limites.x),
                    posicion_y: limitar(ajustarCuadricula(y), limites.y, 1 - limites.y),
                });
            }
        }
        const otrasMesas = layout.filter((item) => Number(item.id_mesa) !== Number(mesa.id_mesa));
        const ubicacion = candidatos.find((candidato) => !haySuperposiciones([
            ...otrasMesas,
            { ...mesa, ...candidato },
        ]));
        if (ubicacion) actualizarMesa(mesa.id_mesa, ubicacion);
    };

    const puntoDesdeEvento = (event) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return null;
        return {
            x: limitar((event.clientX - rect.left) / rect.width, 0, 1),
            y: limitar((event.clientY - rect.top) / rect.height, 0, 1),
        };
    };

    const iniciarArrastre = (event, mesa) => {
        if (disabled) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { id_mesa: mesa.id_mesa };
        setMesaSeleccionadaId(Number(mesa.id_mesa));
    };

    const moverArrastre = (event, mesa) => {
        if (!dragRef.current || Number(dragRef.current.id_mesa) !== Number(mesa.id_mesa)) return;
        const punto = puntoDesdeEvento(event);
        if (punto) ubicarMesa(mesa, punto.x, punto.y);
    };

    const terminarArrastre = () => {
        dragRef.current = null;
    };

    const colocarDesdeBandeja = (event) => {
        event.preventDefault();
        if (disabled || !canvasRef.current) return;
        const idMesa = Number(event.dataTransfer.getData("text/mesa-id"));
        const mesa = layoutPorId.get(idMesa);
        const punto = puntoDesdeEvento(event);
        if (mesa && punto) {
            setMesaSeleccionadaId(idMesa);
            ubicarMesa(mesa, punto.x, punto.y);
        }
    };

    const colocarSeleccionadaEnToque = (event) => {
        if (disabled || event.target !== event.currentTarget || !layoutSeleccionado || posicionMesaValida(layoutSeleccionado)) return;
        const punto = puntoDesdeEvento(event);
        if (punto) ubicarMesa(layoutSeleccionado, punto.x, punto.y);
    };

    const colorMesa = (mesa) => mesaEstadoVisual(mesa);
    const disponibleParaEditar = !disabled && !saving;

    return (
        <Card
            title="Plano del restaurante"
            description="Distribuye las mesas sobre un plano vacío. Las posiciones se guardan normalizadas para conservar la distribución al cambiar de pantalla."
            className="border-[#E8DDD1]"
        >
            <div className="space-y-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {["CIRCULAR", "CUADRADA", "RECTANGULAR"].map((forma) => (
                            <Button
                                key={forma}
                                type="button"
                                variant="secondary"
                                disabled={!disponibleParaEditar}
                                onClick={() => onCreateMesa(forma)}
                            >
                                Añadir {forma.toLocaleLowerCase()}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <Select label="Sector visible" value={sectorFiltro} onChange={(event) => setSectorFiltro(event.target.value)} className="min-w-48">
                            <option value="TODAS">Todos los sectores</option>
                            <option value="SIN_SECTOR">Sin sector</option>
                            {sectores.map((sector) => <option key={sector.id_sector} value={sector.id_sector}>{sector.nombre}</option>)}
                        </Select>
                        <div className="flex items-center gap-1 rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] p-1" aria-label="Controles de zoom">
                            <Button type="button" size="sm" variant="secondary" aria-label="Alejar plano" disabled={zoom <= 0.7} onClick={() => setZoom((actual) => Math.max(0.7, Number((actual - 0.15).toFixed(2))))}>−</Button>
                            <span className="min-w-12 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
                            <Button type="button" size="sm" variant="secondary" aria-label="Acercar plano" disabled={zoom >= 1.6} onClick={() => setZoom((actual) => Math.min(1.6, Number((actual + 0.15).toFixed(2))))}>+</Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => setZoom(1)}>Ajustar</Button>
                        </div>
                    </div>
                </div>

                <div aria-label="Leyenda de estados del plano" className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] px-4 py-3 text-xs font-semibold text-[#594A3E]">
                    {[
                        ["bg-emerald-600", "Disponible"],
                        ["bg-red-600", "Ocupada · sin saldo"],
                        ["bg-blue-600", "Saldo pendiente"],
                        ["bg-gray-500", "Deshabilitada"],
                        ["bg-slate-400", "Sin información"],
                    ].map(([color, label]) => (
                        <span key={label} className="inline-flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-sm ${color}`} />
                            {label}
                        </span>
                    ))}
                </div>

                {superposicion && (
                    <Alert type="error">
                        {superposicion.tipo === "limites"
                            ? `La mesa #${superposicion.mesas[0].id_mesa} queda fuera de los límites del plano. Muévela dentro antes de guardar.`
                            : `Las mesas #${superposicion.mesas[0].id_mesa} y #${superposicion.mesas[1].id_mesa} se superponen. Muévelas antes de guardar.`}
                    </Alert>
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="min-w-0 space-y-3">
                        <div className="overflow-auto rounded-2xl border border-[#D8CBBE] bg-[#F4EFE8] p-3">
                            <div
                                ref={canvasRef}
                                role="application"
                                aria-label="Plano interactivo del restaurante"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={colocarDesdeBandeja}
                                onClick={colocarSeleccionadaEnToque}
                                className="relative mx-auto aspect-[10/7] min-h-[320px] min-w-[457px] overflow-hidden rounded-xl border border-[#CDBEAE] bg-white"
                                style={{
                                    width: `${zoom * 100}%`,
                                    backgroundImage: "linear-gradient(to right, rgba(184,92,59,.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(184,92,59,.10) 1px, transparent 1px)",
                                    backgroundSize: "2.5% 2.5%",
                                }}
                            >
                                {ubicadas.map((layoutMesa) => {
                                    const mesa = datosPorId.get(Number(layoutMesa.id_mesa));
                                    if (!mesa) return null;
                                    const estado = colorMesa(mesa);
                                    const seleccionada = Number(mesaSeleccionadaId) === Number(mesa.id_mesa);
                                    const forma = layoutMesa.forma_visual === "CIRCULAR"
                                        ? "rounded-full"
                                        : layoutMesa.forma_visual === "CUADRADA"
                                            ? "rounded-md"
                                            : "rounded-xl";
                                    return (
                                        <button
                                            key={mesa.id_mesa}
                                            type="button"
                                            aria-pressed={seleccionada}
                                            aria-label={`Mesa ${mesa.numero}, ${estado.label}`}
                                            onPointerDown={(event) => iniciarArrastre(event, layoutMesa)}
                                            onPointerMove={(event) => moverArrastre(event, layoutMesa)}
                                            onPointerUp={terminarArrastre}
                                            onPointerCancel={terminarArrastre}
                                            onClick={(event) => { event.stopPropagation(); setMesaSeleccionadaId(Number(mesa.id_mesa)); }}
                                            className={`absolute flex min-h-12 min-w-12 select-none flex-col items-center justify-center border-2 px-1 text-center shadow-sm touch-none ${forma} ${estado.background} ${estado.border} ${estado.text} ${seleccionada ? "z-10 ring-4 ring-[#B85C3B]/30" : ""} ${disponibleParaEditar ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                                            style={{
                                                left: `${Number(layoutMesa.posicion_x) * 100}%`,
                                                top: `${Number(layoutMesa.posicion_y) * 100}%`,
                                                width: `${Number(layoutMesa.ancho_visual) * 100}%`,
                                                height: `${Number(layoutMesa.alto_visual) * 100}%`,
                                                transform: `translate(-50%, -50%) rotate(${layoutMesa.rotacion_grados}deg)`,
                                            }}
                                        >
                                            <span className="truncate text-[10px] font-black sm:text-xs">{mesa.numero}</span>
                                            <span className="truncate text-[8px] font-semibold sm:text-[10px]">{estado.label}</span>
                                        </button>
                                    );
                                })}
                                {!ubicadas.length && (
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5 text-center">
                                        <p className="max-w-sm rounded-xl border border-dashed border-[#CDBEAE] bg-white/90 px-4 py-3 text-sm text-[#75675C]">
                                            Plano vacío. No hay mesas con ubicación guardada. Añade mesas reales o arrástralas aquí desde “Sin ubicar”.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-[#75675C]">Cuadrícula de alineación del 2.5%. Arrastra las mesas; en móvil, selecciónala y toca una posición libre del plano.</p>

                        {sinUbicar.length > 0 && (
                            <section aria-label="Mesas sin ubicar" className="rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] p-3">
                                <h3 className="font-bold text-[#342820]">Sin ubicar en el plano ({sinUbicar.length})</h3>
                                <ul className="mt-2 flex flex-wrap gap-2">
                                    {sinUbicar.map((mesa) => (
                                        <li key={mesa.id_mesa} className="flex items-center gap-1 rounded-lg border border-[#E8DDD1] bg-white p-2">
                                            <button
                                                type="button"
                                                draggable={!disabled}
                                                onDragStart={(event) => {
                                                    setMesaSeleccionadaId(Number(mesa.id_mesa));
                                                    event.dataTransfer.setData("text/mesa-id", String(mesa.id_mesa));
                                                }}
                                                onClick={() => setMesaSeleccionadaId(Number(mesa.id_mesa))}
                                                className="text-left text-sm font-bold text-[#342820]"
                                            >
                                                Mesa {mesa.numero}
                                            </button>
                                            <Button type="button" size="sm" variant="secondary" disabled={!disponibleParaEditar} onClick={() => sugerirUbicacion(layoutPorId.get(Number(mesa.id_mesa)))}>
                                                Colocar
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <aside aria-label="Propiedades de mesa" className="min-w-0">
                        {mesaSeleccionada && layoutSeleccionado ? (
                            <Card
                                title={`Mesa ${mesaSeleccionada.numero}`}
                                description={mesaSeleccionada.sector || "Sin sector"}
                                className="border-[#E8DDD1]"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-sm ${colorMesa(mesaSeleccionada).color}`} />
                                        <span className="text-sm font-semibold text-[#594A3E]">{colorMesa(mesaSeleccionada).label}</span>
                                    </div>
                                    <p className="text-sm text-[#75675C]">{mesaSeleccionada.capacidad} personas</p>
                                    <Button type="button" variant="secondary" className="w-full" onClick={() => onEditMesa(mesaSeleccionada)}>
                                        Editar datos de mesa
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mesaSeleccionada.habilitada ? "outline" : "success"}
                                        className="w-full"
                                        disabled={!disponibleParaEditar || Boolean(mesaSeleccionada.id_atencion)}
                                        onClick={() => onToggleMesa(mesaSeleccionada)}
                                    >
                                        {mesaSeleccionada.habilitada ? "Deshabilitar mesa" : "Habilitar mesa"}
                                    </Button>
                                    {mesaSeleccionada.id_atencion && (
                                        <p className="text-xs text-amber-800">No se puede deshabilitar mientras haya una atención abierta.</p>
                                    )}
                                    {posicionMesaValida(layoutSeleccionado) ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            disabled={!disponibleParaEditar}
                                            onClick={() => actualizarMesa(mesaSeleccionada.id_mesa, {
                                                rotacion_grados: (Number(layoutSeleccionado.rotacion_grados) + 90) % 360,
                                            })}
                                        >
                                            Girar 90°
                                        </Button>
                                    ) : (
                                        <Button type="button" variant="warning" className="w-full" disabled={!disponibleParaEditar} onClick={() => sugerirUbicacion(layoutSeleccionado)}>
                                            Buscar ubicación libre
                                        </Button>
                                    )}
                                    <Select
                                        label="Forma"
                                        value={layoutSeleccionado.forma_visual}
                                        disabled={!disponibleParaEditar}
                                        onChange={(event) => actualizarMesa(mesaSeleccionada.id_mesa, { forma_visual: event.target.value })}
                                    >
                                        <option value="CIRCULAR">Circular</option>
                                        <option value="CUADRADA">Cuadrada</option>
                                        <option value="RECTANGULAR">Rectangular</option>
                                    </Select>
                                    <label className="block text-sm font-semibold text-[#594A3E]">
                                        Ancho visual
                                        <input
                                            type="range"
                                            min="0.04"
                                            max="0.4"
                                            step="0.01"
                                            value={layoutSeleccionado.ancho_visual}
                                            disabled={!disponibleParaEditar}
                                            onChange={(event) => actualizarMesa(mesaSeleccionada.id_mesa, { ancho_visual: Number(event.target.value) })}
                                            className="mt-2 w-full accent-[#B85C3B]"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-[#594A3E]">
                                        Alto visual
                                        <input
                                            type="range"
                                            min="0.04"
                                            max="0.4"
                                            step="0.01"
                                            value={layoutSeleccionado.alto_visual}
                                            disabled={!disponibleParaEditar}
                                            onChange={(event) => actualizarMesa(mesaSeleccionada.id_mesa, { alto_visual: Number(event.target.value) })}
                                            className="mt-2 w-full accent-[#B85C3B]"
                                        />
                                    </label>
                                    {posicionMesaValida(layoutSeleccionado) && (
                                        <p className="text-xs text-[#75675C]">
                                            X {(Number(layoutSeleccionado.posicion_x) * 100).toFixed(1)}% · Y {(Number(layoutSeleccionado.posicion_y) * 100).toFixed(1)}% · {layoutSeleccionado.rotacion_grados}°
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <Card title="Propiedades" description="Selecciona una mesa en el plano o en la bandeja sin ubicar." className="border-[#E8DDD1]">
                                <p className="text-sm text-[#75675C]">El plano no incluye dimensiones arquitectónicas predeterminadas. Organiza las mesas según la distribución física real.</p>
                            </Card>
                        )}
                    </aside>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#E8DDD1] pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" disabled={!cambiosPendientes || saving} onClick={onCancel}>Cancelar cambios</Button>
                    <Button
                        type="button"
                        variant="warning"
                        disabled={!cambiosPendientes || Boolean(superposicion) || disabled}
                        loading={saving}
                        onClick={() => onSave(layout)}
                    >
                        Guardar distribución
                    </Button>
                </div>
                {disabled && <p className="text-sm text-amber-900">El plano puede consultarse, pero la administración de la distribución estará disponible cuando la base de datos tenga aplicada la migración 011.</p>}
            </div>
        </Card>
    );
}

export default MesaLayoutEditor;
