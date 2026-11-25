import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import { Alert, Button, Card, ConfirmModal, Input, Modal, Select } from "../../components/ui";
import MesaLayoutEditor from "../../components/MesaLayoutEditor";

const formularioInicial = {
    numero: "",
    id_sector: "",
    capacidad: "2",
    orden_visualizacion: "0",
    habilitada: true,
    estado: "ACTIVA",
    forma_visual: "CIRCULAR",
    ancho_visual: "0.12",
    alto_visual: "0.12",
    rotacion_grados: 0,
};

const crearLayoutDesdeMesas = (mesas) => mesas.map((mesa) => ({
    id_mesa: Number(mesa.id_mesa),
    posicion_x: mesa.posicion_x === null || mesa.posicion_x === undefined ? null : Number(mesa.posicion_x),
    posicion_y: mesa.posicion_y === null || mesa.posicion_y === undefined ? null : Number(mesa.posicion_y),
    rotacion_grados: Number(mesa.rotacion_grados || 0),
    forma_visual: mesa.forma_visual || "CIRCULAR",
    ancho_visual: Number(mesa.ancho_visual || 0.12),
    alto_visual: Number(mesa.alto_visual || 0.12),
}));

let consultaEnCurso = null;

const obtenerConfiguracion = () => {
    if (!consultaEnCurso) {
        consultaEnCurso = Promise.all([
            api.get("/atenciones-mesa/admin/mesas"),
            api.get("/atenciones-mesa/admin/sectores"),
        ])
            .then(([mesasResponse, sectoresResponse]) => {
                const mesas = mesasResponse.data?.data;
                const sectores = sectoresResponse.data?.data;
                if (!Array.isArray(mesas) || !Array.isArray(sectores)) {
                    throw Object.assign(new Error("La API devolvió una respuesta incompleta para la configuración de mesas."), {
                        code: "INVALID_RESPONSE",
                    });
                }
                return { mesas, sectores };
            })
            .finally(() => { consultaEnCurso = null; });
    }
    return consultaEnCurso;
};

const describirError = (error, alternativa, esOperacion = false) => {
    const mensajeApi = error.response?.data?.mensaje || "";
    const detalles = `${mensajeApi} ${error.message || ""}`.toLocaleLowerCase();
    if (/migraci[oó]n|esquema.*incompleto|sector_mesa|configuraci[oó]n de mesas/.test(detalles)) {
        const faltaConfiguracion = /sector_mesa|columnas de configuraci[oó]n/.test(detalles);
        const faltaPlano = /columnas de distribuci[oó]n en planta/.test(detalles);
        const faltaAmbas = faltaConfiguracion && faltaPlano;
        return {
            tipo: "migracion",
            mensaje: faltaAmbas
                ? "La configuración está pendiente de habilitación en PostgreSQL. Faltan las migraciones 010_configuracion_mesas.sql y 011_distribucion_plano_mesas.sql; deben aplicarse en ese orden. No se guardan cambios mientras falte el esquema."
                : faltaConfiguracion
                    ? "La configuración está pendiente de habilitación en PostgreSQL. Falta aplicar 010_configuracion_mesas.sql. Las operaciones de mesas y sectores no se guardan mientras falte ese esquema."
                    : faltaPlano
                        ? "La configuración está pendiente de habilitación en PostgreSQL. Falta aplicar 011_distribucion_plano_mesas.sql, después de la 010. Las posiciones no se guardan mientras falte ese esquema."
                        : "La configuración de mesas requiere habilitar el esquema en PostgreSQL. Aplica las migraciones 010_configuracion_mesas.sql y 011_distribucion_plano_mesas.sql en ese orden antes de guardar.",
        };
    }
    if (error.code === "INVALID_RESPONSE") {
        return { tipo: "api", mensaje: error.message };
    }
    if (!error.response || error.response.status === 503) {
        return {
            tipo: "conexion",
            mensaje: esOperacion
                ? "No se recibió confirmación de la base de datos. No marques la operación como guardada ni la repitas todavía; actualiza la lista manualmente cuando el servicio esté disponible para comprobar el estado."
                : "No se pudo consultar la base de datos. No es posible confirmar cuántas mesas o sectores existen. No se reintenta automáticamente; usa Actualizar solo cuando el servicio esté disponible.",
        };
    }
    return { tipo: "api", mensaje: mensajeApi || alternativa };
};

function ConfiguracionMesas() {
    const [mesas, setMesas] = useState([]);
    const [layout, setLayout] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [consultaFallida, setConsultaFallida] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [guardandoPlano, setGuardandoPlano] = useState(false);
    const [error, setError] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [mesaEditando, setMesaEditando] = useState(null);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [mesaPendiente, setMesaPendiente] = useState(null);
    const [nombreSector, setNombreSector] = useState("");
    const [sectorEditando, setSectorEditando] = useState(null);
    const [guardandoSector, setGuardandoSector] = useState(false);

    const consultar = useCallback(() => obtenerConfiguracion(), []);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const datos = await consultar();
            setMesas(datos.mesas);
            setLayout(crearLayoutDesdeMesas(datos.mesas));
            setSectores(datos.sectores);
            setConsultaFallida(false);
        } catch (requestError) {
            setMesas([]);
            setSectores([]);
            setConsultaFallida(true);
            setError(describirError(requestError, "No se pudo consultar la configuración de mesas y sectores."));
        } finally {
            setCargando(false);
        }
    }, [consultar]);

    useEffect(() => {
        let activo = true;
        consultar()
            .then((datos) => {
                if (!activo) return;
                setMesas(datos.mesas);
                setLayout(crearLayoutDesdeMesas(datos.mesas));
                setSectores(datos.sectores);
                setConsultaFallida(false);
            })
            .catch((requestError) => {
                if (!activo) return;
                setMesas([]);
                setSectores([]);
                setConsultaFallida(true);
                setError(describirError(requestError, "No se pudo consultar la configuración de mesas y sectores."));
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => { activo = false; };
    }, [consultar]);

    const abrirFormulario = (mesa = null, formaVisual = "CIRCULAR") => {
        setMesaEditando(mesa);
        setFormulario(mesa ? {
            numero: mesa.numero,
            id_sector: mesa.id_sector ? String(mesa.id_sector) : "",
            capacidad: String(mesa.capacidad),
            orden_visualizacion: String(mesa.orden_visualizacion ?? 0),
            habilitada: Boolean(mesa.habilitada),
            estado: mesa.estado,
            forma_visual: mesa.forma_visual || "CIRCULAR",
            ancho_visual: String(mesa.ancho_visual ?? 0.12),
            alto_visual: String(mesa.alto_visual ?? 0.12),
            rotacion_grados: Number(mesa.rotacion_grados || 0),
            posicion_x: mesa.posicion_x ?? null,
            posicion_y: mesa.posicion_y ?? null,
        } : { ...formularioInicial, forma_visual: formaVisual });
        setModalAbierto(true);
    };

    const guardarMesa = async (event) => {
        event.preventDefault();
        setGuardando(true);
        setError(null);
        setMensaje("");
        const datos = {
            numero: formulario.numero.trim(),
            id_sector: formulario.id_sector || null,
            capacidad: Number(formulario.capacidad),
            orden_visualizacion: Number(formulario.orden_visualizacion),
            habilitada: formulario.habilitada,
            estado: formulario.estado,
            forma_visual: formulario.forma_visual,
            ancho_visual: Number(formulario.ancho_visual),
            alto_visual: Number(formulario.alto_visual),
            rotacion_grados: Number(formulario.rotacion_grados),
            posicion_x: formulario.posicion_x ?? null,
            posicion_y: formulario.posicion_y ?? null,
        };
        try {
            if (mesaEditando) {
                const { data } = await api.put(`/atenciones-mesa/mesas/${mesaEditando.id_mesa}`, datos);
                if (!data.data?.id_mesa) {
                    throw Object.assign(new Error("La API no confirmó la actualización de la mesa."), { code: "INVALID_RESPONSE" });
                }
                const mesaActualizada = {
                    ...data.data,
                    sector: sectores.find((sector) => Number(sector.id_sector) === Number(data.data.id_sector))?.nombre || null,
                };
                setMesas((actuales) => actuales.map((mesa) => (
                    Number(mesa.id_mesa) === Number(mesaActualizada.id_mesa) ? { ...mesa, ...mesaActualizada } : mesa
                )));
                if (String(mesaEditando.id_sector || "") !== String(mesaActualizada.id_sector || "")) {
                    setSectores((actuales) => actuales.map((sector) => ({
                        ...sector,
                        cantidad_mesas: Number(sector.cantidad_mesas || 0)
                            + (Number(sector.id_sector) === Number(mesaActualizada.id_sector) ? 1 : 0)
                            - (Number(sector.id_sector) === Number(mesaEditando.id_sector) ? 1 : 0),
                    })));
                }
                setLayout((actual) => actual.map((item) => (
                    Number(item.id_mesa) === Number(mesaActualizada.id_mesa)
                        ? { ...item, forma_visual: datos.forma_visual, ancho_visual: datos.ancho_visual, alto_visual: datos.alto_visual, rotacion_grados: datos.rotacion_grados }
                        : item
                )));
                setMensaje("Mesa actualizada.");
            } else {
                const { data } = await api.post("/atenciones-mesa/mesas", datos);
                const mesaCreada = data.data;
                if (!mesaCreada?.id_mesa) {
                    throw Object.assign(new Error("La API no confirmó el registro de la mesa."), { code: "INVALID_RESPONSE" });
                }
                const mesaConSector = {
                    ...mesaCreada,
                    sector: sectores.find((sector) => Number(sector.id_sector) === Number(mesaCreada.id_sector))?.nombre || null,
                };
                setMesas((actuales) => [...actuales, mesaConSector]);
                if (mesaConSector.id_sector) {
                    setSectores((actuales) => actuales.map((sector) => (
                        Number(sector.id_sector) === Number(mesaConSector.id_sector)
                            ? { ...sector, cantidad_mesas: Number(sector.cantidad_mesas || 0) + 1 }
                            : sector
                    )));
                }
                setLayout((actual) => [...actual, ...crearLayoutDesdeMesas([mesaConSector])]);
                setMensaje("Mesa registrada.");
            }
            setModalAbierto(false);
        } catch (requestError) {
            setError(describirError(requestError, "No se pudo guardar la mesa.", true));
        } finally {
            setGuardando(false);
        }
    };

    const cambiarHabilitacion = async () => {
        if (!mesaPendiente) return;
        setGuardando(true);
        setError(null);
        setMensaje("");
        try {
            const { data } = await api.put(`/atenciones-mesa/mesas/${mesaPendiente.id_mesa}`, {
                numero: mesaPendiente.numero,
                id_sector: mesaPendiente.id_sector,
                capacidad: Number(mesaPendiente.capacidad),
                orden_visualizacion: Number(mesaPendiente.orden_visualizacion ?? 0),
                habilitada: !mesaPendiente.habilitada,
                estado: mesaPendiente.estado,
                forma_visual: mesaPendiente.forma_visual,
                ancho_visual: Number(mesaPendiente.ancho_visual ?? 0.12),
                alto_visual: Number(mesaPendiente.alto_visual ?? 0.12),
                rotacion_grados: Number(mesaPendiente.rotacion_grados || 0),
                posicion_x: mesaPendiente.posicion_x ?? null,
                posicion_y: mesaPendiente.posicion_y ?? null,
            });
            if (!data.data?.id_mesa) {
                throw Object.assign(new Error("La API no confirmó el cambio de habilitación."), { code: "INVALID_RESPONSE" });
            }
            setMesas((actuales) => actuales.map((mesa) => (
                Number(mesa.id_mesa) === Number(data.data.id_mesa) ? { ...mesa, ...data.data } : mesa
            )));
            setMensaje(mesaPendiente.habilitada
                ? "Mesa deshabilitada. Se conservan su historial y sus relaciones."
                : "Mesa habilitada y disponible para las operaciones que correspondan.");
            setMesaPendiente(null);
        } catch (requestError) {
            setError(describirError(requestError, "No se pudo cambiar el estado de la mesa.", true));
        } finally {
            setGuardando(false);
        }
    };

    const guardarSector = async (event) => {
        event.preventDefault();
        setGuardandoSector(true);
        setError(null);
        setMensaje("");
        try {
            if (sectorEditando) {
                const { data } = await api.put(`/atenciones-mesa/admin/sectores/${sectorEditando.id_sector}`, { nombre: nombreSector.trim() });
                const sectorActualizado = data.data;
                if (!sectorActualizado?.id_sector) {
                    throw Object.assign(new Error("La API no confirmó la actualización del sector."), { code: "INVALID_RESPONSE" });
                }
                setSectores((actuales) => actuales.map((sector) => (
                    Number(sector.id_sector) === Number(sectorActualizado.id_sector) ? sectorActualizado : sector
                )));
                setMesas((actuales) => actuales.map((mesa) => (
                    Number(mesa.id_sector) === Number(sectorActualizado.id_sector)
                        ? { ...mesa, sector: sectorActualizado.nombre }
                        : mesa
                )));
                setMensaje("Sector actualizado.");
            } else {
                const { data } = await api.post("/atenciones-mesa/admin/sectores", { nombre: nombreSector.trim() });
                if (!data.data?.id_sector) {
                    throw Object.assign(new Error("La API no confirmó el registro del sector."), { code: "INVALID_RESPONSE" });
                }
                setSectores((actuales) => [...actuales, { ...data.data, cantidad_mesas: 0 }]);
                setMensaje("Sector registrado.");
            }
            setNombreSector("");
            setSectorEditando(null);
        } catch (requestError) {
            setError(describirError(requestError, "No se pudo guardar el sector.", true));
        } finally {
            setGuardandoSector(false);
        }
    };

    const cambiarEstadoSector = async (sector) => {
        setGuardandoSector(true);
        setError(null);
        setMensaje("");
        try {
            const { data } = await api.put(`/atenciones-mesa/admin/sectores/${sector.id_sector}`, {
                nombre: sector.nombre,
                activo: !sector.activo,
            });
            if (!data.data?.id_sector) {
                throw Object.assign(new Error("La API no confirmó el cambio de estado del sector."), { code: "INVALID_RESPONSE" });
            }
            setSectores((actuales) => actuales.map((item) => (
                Number(item.id_sector) === Number(data.data.id_sector) ? { ...item, ...data.data } : item
            )));
            setMensaje(data.data.activo ? "Sector activado." : "Sector desactivado; sus mesas e historial se conservaron.");
        } catch (requestError) {
            setError(describirError(requestError, "No se pudo cambiar el estado del sector.", true));
        } finally {
            setGuardandoSector(false);
        }
    };

    const guardarDistribucion = async (distribucion) => {
        setGuardandoPlano(true);
        setError(null);
        setMensaje("");
        const mesasPlano = distribucion.map((mesa) => ({
            id_mesa: mesa.id_mesa,
            posicion_x: mesa.posicion_x,
            posicion_y: mesa.posicion_y,
            rotacion_grados: mesa.rotacion_grados,
            forma_visual: mesa.forma_visual,
            ancho_visual: mesa.ancho_visual,
            alto_visual: mesa.alto_visual,
        }));
        try {
            const { data } = await api.put("/atenciones-mesa/admin/distribucion", { mesas: mesasPlano });
            if (
                !Array.isArray(data.data)
                || data.data.length !== mesasPlano.length
                || data.data.some((mesa) => !mesa?.id_mesa)
            ) {
                throw Object.assign(new Error("La API no confirmó la distribución guardada."), { code: "INVALID_RESPONSE" });
            }
            const guardadasPorId = new Map(data.data.map((mesa) => [Number(mesa.id_mesa), mesa]));
            setLayout((actual) => actual.map((mesa) => (
                guardadasPorId.has(Number(mesa.id_mesa))
                    ? { ...mesa, ...guardadasPorId.get(Number(mesa.id_mesa)) }
                    : mesa
            )));
            setMesas((actuales) => actuales.map((mesa) => ({
                ...mesa,
                ...(guardadasPorId.get(Number(mesa.id_mesa)) || {}),
            })));
            setMensaje("Distribución guardada.");
        } catch (requestError) {
            setError(describirError(requestError, "No se pudo guardar la distribución.", true));
        } finally {
            setGuardandoPlano(false);
        }
    };

    const cancelarDistribucion = () => {
        setLayout(crearLayoutDesdeMesas(mesas));
        setMensaje("");
    };

    const mesasHabilitadas = mesas.filter((mesa) => mesa.habilitada).length;
    const mesasOcupadas = mesas.filter((mesa) => Boolean(mesa.id_atencion)).length;
    const accionesBloqueadas = cargando || Boolean(error) || guardando || guardandoSector || guardandoPlano;

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B85C3B]">Configuración · Mesas</p>
                    <h2 className="mt-1 text-2xl font-black text-[#342820]">Mesas del restaurante</h2>
                    <p className="mt-1 text-sm text-[#75675C]">Administra las mesas persistidas y su organización por sectores.</p>
                </div>
                <Button variant="warning" onClick={() => abrirFormulario()}>Crear mesa</Button>
            </header>

            {error && !modalAbierto && (
                <Alert
                    type={error.tipo === "migracion" ? "warning" : "error"}
                    onRetry={error.tipo === "migracion" ? undefined : cargar}
                >
                    {error.mensaje}
                </Alert>
            )}
            {mensaje && <Alert type="success">{mensaje}</Alert>}

            <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-[#E8DDD1]">
                    <p className="text-sm text-[#75675C]">Mesas configuradas</p>
                    <p className="mt-2 text-3xl font-black text-[#342820]">{cargando || consultaFallida ? "—" : mesas.length}</p>
                </Card>
                <Card className="border-[#E8DDD1]">
                    <p className="text-sm text-[#75675C]">Habilitadas para operación</p>
                    <p className="mt-2 text-3xl font-black text-[#342820]">{cargando || consultaFallida ? "—" : mesasHabilitadas}</p>
                </Card>
                <Card className="border-[#E8DDD1]">
                    <p className="text-sm text-[#75675C]">Con atención abierta</p>
                    <p className="mt-2 text-3xl font-black text-[#342820]">{cargando || consultaFallida ? "—" : mesasOcupadas}</p>
                </Card>
            </div>

            <Card title="Sectores" description="Crea sectores propios y asígnalos a las mesas. Se pueden desactivar cuando no tienen atenciones abiertas; mesas e historial se conservan.">
                <form onSubmit={guardarSector} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Input
                        label={sectorEditando ? "Renombrar sector" : "Nuevo sector"}
                        value={nombreSector}
                        onChange={(event) => setNombreSector(event.target.value)}
                        maxLength={60}
                        required
                        placeholder="Nombre del sector"
                    />
                    <div className="flex gap-2">
                        <Button type="submit" variant="secondary" loading={guardandoSector} disabled={accionesBloqueadas}>
                            {sectorEditando ? "Guardar nombre" : "Agregar sector"}
                        </Button>
                        {sectorEditando && (
                            <Button type="button" variant="outline" onClick={() => { setSectorEditando(null); setNombreSector(""); }}>
                                Cancelar
                            </Button>
                        )}
                    </div>
                </form>
                {sectores.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {sectores.map((sector) => (
                            <li key={sector.id_sector} className="inline-flex items-center gap-2 rounded-full border border-[#E8DDD1] bg-[#FCFAF7] px-3 py-2 text-sm">
                                <span className="font-semibold text-[#342820]">{sector.nombre}</span>
                                <span className="text-xs text-[#75675C]">{sector.cantidad_mesas} mesas</span>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${sector.activo ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                                    {sector.activo ? "Activo" : "Inactivo"}
                                </span>
                                <button
                                    type="button"
                                    className="rounded px-2 py-1 text-xs font-bold text-[#8F422D] hover:bg-[#F4D7AC]"
                                    onClick={() => { setSectorEditando(sector); setNombreSector(sector.nombre); }}
                                >
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    disabled={guardandoSector || accionesBloqueadas || (sector.activo && Number(sector.atenciones_abiertas) > 0)}
                                    className="rounded px-2 py-1 text-xs font-bold text-[#8F422D] hover:bg-[#F4D7AC] disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => cambiarEstadoSector(sector)}
                                    title={sector.activo && Number(sector.atenciones_abiertas) > 0 ? "Resuelve las atenciones abiertas antes de desactivar este sector." : undefined}
                                >
                                    {sector.activo ? "Desactivar" : "Activar"}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {!cargando && (consultaFallida
                    ? <p className="mt-4 text-sm text-[#75675C]">No se pudo confirmar la lista de sectores.</p>
                    : !sectores.length && <p className="mt-4 text-sm text-[#75675C]">No hay sectores registrados.</p>)}
            </Card>

            <section aria-label="Editor visual de la distribución">
                {cargando ? (
                    <p role="status" className="rounded-xl border border-[#E8DDD1] bg-white p-6 text-sm text-[#75675C]">Consultando mesas y sectores...</p>
                ) : consultaFallida ? (
                    <div className="rounded-xl border border-[#E8DDD1] bg-white p-6 text-sm text-[#75675C]">
                        No se pudo consultar el plano; no se puede afirmar que esté vacío ni mostrar una distribución sin confirmar los datos.
                    </div>
                ) : (
                    <MesaLayoutEditor
                        mesas={mesas}
                        sectores={sectores}
                        layout={layout}
                        onLayoutChange={setLayout}
                        onCreateMesa={(forma) => abrirFormulario(null, forma)}
                        onEditMesa={(mesa) => abrirFormulario({
                            ...mesa,
                            ...layout.find((item) => Number(item.id_mesa) === Number(mesa.id_mesa)),
                            posicion_x: mesa.posicion_x,
                            posicion_y: mesa.posicion_y,
                        })}
                        onToggleMesa={setMesaPendiente}
                        onSave={guardarDistribucion}
                        onCancel={cancelarDistribucion}
                        saving={guardandoPlano}
                        disabled={accionesBloqueadas}
                    />
                )}
            </section>

            <Modal
                open={modalAbierto}
                title={mesaEditando ? `Editar mesa ${mesaEditando.numero}` : "Crear mesa"}
                onClose={() => !guardando && setModalAbierto(false)}
                size="lg"
            >
                <form onSubmit={guardarMesa} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Número o nombre"
                            value={formulario.numero}
                            onChange={(event) => setFormulario({ ...formulario, numero: event.target.value })}
                            maxLength={20}
                            required
                        />
                        <Select
                            label="Sector"
                            value={formulario.id_sector}
                            onChange={(event) => setFormulario({ ...formulario, id_sector: event.target.value })}
                        >
                            <option value="">Sin sector</option>
                            {sectores.map((sector) => (
                                <option key={sector.id_sector} value={sector.id_sector} disabled={!sector.activo}>
                                    {sector.nombre}{sector.activo ? "" : " (inactivo)"}
                                </option>
                            ))}
                        </Select>
                        <Input
                            label="Capacidad de personas"
                            type="number"
                            min="1"
                            step="1"
                            value={formulario.capacidad}
                            onChange={(event) => setFormulario({ ...formulario, capacidad: event.target.value })}
                            required
                        />
                        <Input
                            label="Orden de visualización"
                            type="number"
                            min="0"
                            step="1"
                            value={formulario.orden_visualizacion}
                            onChange={(event) => setFormulario({ ...formulario, orden_visualizacion: event.target.value })}
                            required
                        />
                        <Select
                            label="Habilitación administrativa"
                            value={String(formulario.habilitada)}
                            onChange={(event) => setFormulario({ ...formulario, habilitada: event.target.value === "true" })}
                        >
                            <option value="true">Habilitada</option>
                            <option value="false">Deshabilitada</option>
                        </Select>
                        <Select
                            label="Estado operativo"
                            value={formulario.estado}
                            onChange={(event) => setFormulario({ ...formulario, estado: event.target.value })}
                        >
                            <option value="ACTIVA">Activa</option>
                            <option value="FUERA_SERVICIO">Fuera de servicio</option>
                        </Select>
                        <Select
                            label="Forma de mesa"
                            value={formulario.forma_visual}
                            onChange={(event) => setFormulario({ ...formulario, forma_visual: event.target.value })}
                        >
                            <option value="CIRCULAR">Circular</option>
                            <option value="CUADRADA">Cuadrada</option>
                            <option value="RECTANGULAR">Rectangular</option>
                        </Select>
                    </div>
                    <p className="text-xs text-[#75675C]">La habilitación administrativa es independiente del estado operativo. Las mesas con atención abierta no se pueden deshabilitar ni retirar del servicio.</p>
                    {error && (
                        <Alert
                            type={error.tipo === "migracion" ? "warning" : "error"}
                            onRetry={error.tipo === "migracion" ? undefined : cargar}
                        >
                            {error.mensaje}
                        </Alert>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" disabled={guardando} onClick={() => setModalAbierto(false)}>Cancelar</Button>
                        <Button type="submit" variant="warning" loading={guardando} disabled={accionesBloqueadas}>
                            {error?.tipo === "migracion" ? "Pendiente de migración" : mesaEditando ? "Guardar cambios" : "Crear mesa"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={Boolean(mesaPendiente)}
                title={mesaPendiente?.habilitada ? "Deshabilitar mesa" : "Habilitar mesa"}
                message={mesaPendiente?.habilitada
                    ? `La mesa ${mesaPendiente.numero} dejará de aparecer en Caja y Mesero. Su historial se conservará; no se elimina físicamente.`
                    : `La mesa ${mesaPendiente?.numero} volverá a aparecer en las vistas operativas si su estado lo permite.`}
                confirmText={mesaPendiente?.habilitada ? "Deshabilitar mesa" : "Habilitar mesa"}
                variant={mesaPendiente?.habilitada ? "danger" : "success"}
                loading={guardando}
                onCancel={() => !guardando && setMesaPendiente(null)}
                onConfirm={cambiarHabilitacion}
            />
        </div>
    );
}

export default ConfiguracionMesas;
