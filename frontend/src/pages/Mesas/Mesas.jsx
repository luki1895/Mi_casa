import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { normalizeRole } from "../../auth/roles";

const formularioInicial = { numero: "", capacidad: "", estado: "ACTIVA" };
const importe = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;

function Mesas() {
    const { usuario } = useAuth();
    const rol = normalizeRole(usuario?.role ?? usuario?.rol);
    const [mesas, setMesas] = useState([]);
    const [atenciones, setAtenciones] = useState([]);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [editando, setEditando] = useState(null);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [mesasResponse, atencionesResponse] = await Promise.all([
                api.get("/atenciones-mesa/mesas"),
                api.get("/atenciones-mesa"),
            ]);
            setMesas(mesasResponse.data.data || []);
            setAtenciones(atencionesResponse.data.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudieron cargar las mesas y atenciones.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { Promise.resolve().then(cargar); }, [cargar]);

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
        try {
            await api.post(`/atenciones-mesa/mesas/${mesa.id_mesa}/atenciones`);
            setAviso(`Atención abierta para la mesa ${mesa.numero}.`);
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo abrir la atención.");
        }
    };

    const cerrar = async (atencion) => {
        if (!window.confirm(`¿Solicitar el cierre de la atención de la mesa ${atencion.mesa}?`)) return;
        setError("");
        setAviso("");
        try {
            await api.post(`/atenciones-mesa/${atencion.id_atencion}/cerrar`);
            setAviso(`Atención de la mesa ${atencion.mesa} cerrada.`);
            await cargar();
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudo cerrar la atención.");
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Servicio presencial</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Mesas y atenciones</h1>
                <p className="mt-2 text-sm text-slate-600">Las mesas se gestionan durante la atención habitual; no se aceptan reservas anticipadas de mesas.</p>
            </header>
            {(error || aviso) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || aviso}</p>}

            {rol === "admin" && <form onSubmit={guardarMesa} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-4">
                <label className="text-sm font-semibold">Nombre o número<input required maxLength="20" value={formulario.numero} onChange={(event) => setFormulario({ ...formulario, numero: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="text-sm font-semibold">Capacidad<input required type="number" min="1" step="1" value={formulario.capacidad} onChange={(event) => setFormulario({ ...formulario, capacidad: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
                <label className="text-sm font-semibold">Estado<select value={formulario.estado} onChange={(event) => setFormulario({ ...formulario, estado: event.target.value })} className="mt-1 w-full rounded-lg border p-2"><option value="ACTIVA">Activa</option><option value="FUERA_SERVICIO">Fuera de servicio</option></select></label>
                <div className="flex items-end gap-2"><button disabled={guardando} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">{editando ? "Guardar" : "Registrar mesa"}</button>{editando && <button type="button" onClick={() => { setEditando(null); setFormulario(formularioInicial); }} className="rounded-lg border px-4 py-2">Cancelar</button>}</div>
            </form>}

            <section className="space-y-3">
                <h2 className="text-xl font-black">Estado de mesas</h2>
                {cargando ? <p className="rounded-xl bg-white p-5 text-slate-500">Cargando…</p> : !mesas.length ? <p className="rounded-xl bg-white p-5 text-slate-500">No hay mesas registradas.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {mesas.map((mesa) => <article key={mesa.id_mesa} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">Mesa {mesa.numero}</h3><p className="text-sm text-slate-500">Capacidad: {mesa.capacidad}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{mesa.estado_atencion.replace("_", " ")}</span></div>
                        {mesa.id_atencion ? <p className="text-sm text-slate-600">Atención #{mesa.id_atencion} · {mesa.cantidad_pedidos} pedidos</p> : null}
                        {rol === "admin" && <button type="button" onClick={() => { setEditando(mesa.id_mesa); setFormulario({ numero: mesa.numero, capacidad: String(mesa.capacidad), estado: mesa.estado }); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Editar</button>}
                        {(rol === "admin" || rol === "caja") && mesa.estado_atencion === "DISPONIBLE" && <button type="button" onClick={() => abrir(mesa)} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950">Abrir atención</button>}
                    </article>)}
                </div>}
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-black">Atenciones abiertas</h2>
                {!atenciones.length ? <p className="rounded-xl bg-white p-5 text-slate-500">No hay atenciones abiertas.</p> : <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Mesa</th><th className="p-3">Responsable</th><th className="p-3">Apertura</th><th className="p-3">Pedidos</th><th className="p-3">Saldo pendiente</th><th className="p-3">Acción</th></tr></thead><tbody className="divide-y">{atenciones.map((atencion) => <tr key={atencion.id_atencion}><td className="p-3 font-semibold">{atencion.mesa}</td><td className="p-3">{atencion.responsable}</td><td className="p-3">{new Date(atencion.abierta_en).toLocaleString("es-BO")}</td><td className="p-3">{atencion.cantidad_pedidos}</td><td className="p-3">{importe(atencion.saldo_pendiente)}</td><td className="p-3">{(rol === "mesero" || rol === "admin") && <button type="button" onClick={() => cerrar(atencion)} className="rounded-lg border px-3 py-1.5 font-semibold">Cerrar atención</button>}</td></tr>)}</tbody></table></div>}
            </section>
        </div>
    );
}

export default Mesas;
