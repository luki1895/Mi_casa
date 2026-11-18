import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { normalizeRole } from "../../auth/roles";
import { Alert, Button, Card, ConfirmModal } from "../../components/ui";
import MesaBoard from "../../components/MesaBoard";
import MesaAtencionDetail from "../../components/MesaAtencionDetail";
import useMesaBoardData from "../../hooks/useMesaBoardData";

const formularioInicial = { numero: "", capacidad: "", estado: "ACTIVA" };
function Mesas() {
    const { usuario } = useAuth();
    const rol = normalizeRole(usuario?.role ?? usuario?.rol);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [editando, setEditando] = useState(null);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [atencionParaCerrar, setAtencionParaCerrar] = useState(null);
    const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState(null);
    const {
        mesas,
        atenciones,
        cargando,
        actualizando,
        error: errorMesas,
        errorMesas: errorConsultaMesas,
        errorAtenciones: errorConsultaAtenciones,
        atencion: atencionSeleccionada,
        cargandoAtencion,
        errorAtencion,
        refresh: refrescarMesas,
        loadAtencion: consultarAtencion,
        clearAtencion,
    } = useMesaBoardData({ paused: guardando, enabled: !usuario?.demo });

    const mesaSeleccionada = mesas.find((mesa) => Number(mesa.id_mesa) === Number(mesaSeleccionadaId));
    const idAtencionMesaSeleccionada = mesaSeleccionada?.id_atencion;
    const detalleAtencionSeleccionada = atencionSeleccionada
        && Number(atencionSeleccionada.id_atencion) === Number(idAtencionMesaSeleccionada)
        ? atencionSeleccionada
        : null;
    const cargar = useCallback(() => refrescarMesas(true), [refrescarMesas]);

    useEffect(() => {
        if (!mesaSeleccionadaId) return;
        if (cargandoAtencion) return;
        if (!idAtencionMesaSeleccionada) {
            if (atencionSeleccionada) clearAtencion();
            return;
        }
        if (Number(atencionSeleccionada?.id_atencion) !== Number(idAtencionMesaSeleccionada)) {
            consultarAtencion(idAtencionMesaSeleccionada);
        }
    }, [atencionSeleccionada, cargandoAtencion, clearAtencion, consultarAtencion, idAtencionMesaSeleccionada, mesaSeleccionadaId]);

    const seleccionarMesa = (mesa) => setMesaSeleccionadaId(mesa.id_mesa);

    const guardarMesa = async (event) => {
        event.preventDefault();
        setGuardando(true);
        setError("");
        setAviso("");
        try {
            if (editando) await api.put(`/atenciones-mesa/mesas/${editando}`, { ...formulario, capacidad: Number(formulario.capacidad) });
            else await api.post("/atenciones-mesa/mesas", { ...formulario, capacidad: Number(formulario.capacidad) });
            setFormulario(formularioInicial);
            setEditando(null);
            setAviso(editando ? "Mesa actualizada." : "Mesa registrada.");
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo guardar la mesa.");
        } finally { setGuardando(false); }
    };

    const abrir = async (mesa) => {
        setError("");
        setAviso("");
        setGuardando(true);
        try {
            const { data } = await api.post(`/atenciones-mesa/mesas/${mesa.id_mesa}/atenciones`);
            setMesaSeleccionadaId(mesa.id_mesa);
            setAviso(`Atención abierta para la mesa ${mesa.numero}.`);
            await cargar();
            if (data.data?.id_atencion) await consultarAtencion(data.data.id_atencion);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo abrir la atención.");
            await cargar();
        } finally {
            setGuardando(false);
        }
    };

    const cerrar = async () => {
        if (!atencionParaCerrar) return;
        setGuardando(true);
        setError("");
        setAviso("");
        try {
            await api.post(`/atenciones-mesa/${atencionParaCerrar.id_atencion}/cerrar`);
            setAviso(`Atención de la mesa ${atencionParaCerrar.mesa} cerrada.`);
            setAtencionParaCerrar(null);
            setMesaSeleccionadaId(null);
            clearAtencion();
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cerrar la atención.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Servicio presencial</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Mesas y atenciones</h1>
                <p className="mt-2 text-sm text-slate-600">Las mesas se gestionan durante la atención habitual; no se aceptan reservas anticipadas de mesas.</p>
            </header>
            {error && <Alert type="error" onRetry={cargar}>{error}</Alert>}
            {aviso && <Alert type="success">{aviso}</Alert>}

            {rol === "admin" && <form onSubmit={guardarMesa} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-4">
                <label className="text-sm font-semibold">Nombre o número<input required maxLength="20" value={formulario.numero} onChange={(event) => setFormulario({ ...formulario, numero: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="text-sm font-semibold">Capacidad<input required type="number" min="1" step="1" value={formulario.capacidad} onChange={(event) => setFormulario({ ...formulario, capacidad: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="text-sm font-semibold">Estado<select value={formulario.estado} onChange={(event) => setFormulario({ ...formulario, estado: event.target.value })} className="mt-1 w-full rounded-lg border p-2"><option value="ACTIVA">Activa</option><option value="FUERA_SERVICIO">Fuera de servicio</option></select></label>
                <div className="flex items-end gap-2"><button disabled={guardando} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">{editando ? "Guardar" : "Registrar mesa"}</button>{editando && <button type="button" onClick={() => { setEditando(null); setFormulario(formularioInicial); }} className="rounded-lg border px-4 py-2">Cancelar</button>}</div>
            </form>}

            <MesaBoard
                mesas={mesas}
                atenciones={atenciones}
                selectedMesaId={mesaSeleccionadaId}
                loading={cargando}
                refreshing={actualizando}
                error={errorMesas}
                mesaQueryError={errorConsultaMesas}
                atencionQueryError={errorConsultaAtenciones}
                onRetry={cargar}
                onSelectMesa={seleccionarMesa}
                emptyMessage={usuario?.demo ? "Las mesas reales no se consultan en modo demostración." : undefined}
            />
            {mesaSeleccionada && (
                <Card title={`Mesa ${mesaSeleccionada.numero}`} description={`Capacidad: ${mesaSeleccionada.capacidad} · Estado: ${String(mesaSeleccionada.estado_atencion).replaceAll("_", " ")}`}>
                    <div className="flex flex-wrap gap-2">
                        {rol === "admin" && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setEditando(mesaSeleccionada.id_mesa);
                                    setFormulario({ numero: mesaSeleccionada.numero, capacidad: String(mesaSeleccionada.capacidad), estado: mesaSeleccionada.estado });
                                }}
                            >
                                Editar mesa
                            </Button>
                        )}
                        {(rol === "admin" || rol === "caja") && mesaSeleccionada.estado_atencion === "DISPONIBLE" && (
                            <Button variant="warning" loading={guardando} onClick={() => abrir(mesaSeleccionada)}>Abrir atención</Button>
                        )}
                    </div>
                </Card>
            )}
            {mesaSeleccionada?.id_atencion && (
                <MesaAtencionDetail
                    atencion={detalleAtencionSeleccionada}
                    loading={cargandoAtencion}
                    error={errorAtencion}
                    onRetry={consultarAtencion}
                />
            )}
            {detalleAtencionSeleccionada && (rol === "mesero" || rol === "admin") && (
                <Button variant="outline" onClick={() => setAtencionParaCerrar(detalleAtencionSeleccionada)}>
                    Solicitar cierre de atención
                </Button>
            )}
            <ConfirmModal
                open={Boolean(atencionParaCerrar)}
                title="Solicitar cierre de atención"
                message={atencionParaCerrar
                    ? `Se solicitará el cierre de la atención de la mesa ${atencionParaCerrar.mesa}. El servidor comprobará entregas, pagos confirmados, saldos y solicitudes adicionales pendientes antes de completar la operación.`
                    : ""}
                confirmText="Solicitar cierre"
                variant="success"
                onCancel={() => { if (!guardando) setAtencionParaCerrar(null); }}
                onConfirm={cerrar}
                loading={guardando}
            />
        </div>
    );
}

export default Mesas;
