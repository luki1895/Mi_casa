import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";

const refreshInterval = 30000;

const describeRequestError = (error, resource) => {
    if (error.response?.status === 503) {
        return `${resource} no está disponible (HTTP 503).`;
    }
    return error.response?.data?.mensaje || `No se pudo consultar ${resource.toLowerCase()}.`;
};

function useMesaBoardData({ paused = false, enabled = true } = {}) {
    const [mesas, setMesas] = useState([]);
    const [atenciones, setAtenciones] = useState([]);
    const [cargando, setCargando] = useState(enabled);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState("");
    const [errorMesas, setErrorMesas] = useState("");
    const [errorAtenciones, setErrorAtenciones] = useState("");
    const [atencion, setAtencion] = useState(null);
    const [cargandoAtencion, setCargandoAtencion] = useState(false);
    const [errorAtencion, setErrorAtencion] = useState("");
    const requestRef = useRef(null);
    const detailRequestRef = useRef(0);
    const loadedRef = useRef(false);
    const pausedRef = useRef(paused);
    const enabledRef = useRef(enabled);

    useEffect(() => {
        pausedRef.current = paused;
        enabledRef.current = enabled;
    }, [enabled, paused]);

    const refresh = useCallback(async (force = false) => {
        if (!enabled) return;
        if (requestRef.current) {
            if (!force) return requestRef.current;
            await requestRef.current;
        }

        const request = Promise.allSettled([
            api.get("/atenciones-mesa/mesas"),
            api.get("/atenciones-mesa"),
        ]);
        requestRef.current = request;
        const initialLoad = !loadedRef.current;
        setCargando(initialLoad);
        setActualizando(!initialLoad);

        try {
            const [mesasResult, atencionesResult] = await request;
            if (enabledRef.current && (force || !pausedRef.current)) {
                const errors = [];
                if (mesasResult.status === "fulfilled") {
                    setMesas(mesasResult.value.data.data || []);
                    setErrorMesas("");
                } else {
                    const message = describeRequestError(mesasResult.reason, "La consulta de mesas");
                    setMesas([]);
                    setErrorMesas(message);
                    errors.push(message);
                }
                if (atencionesResult.status === "fulfilled") {
                    setAtenciones(atencionesResult.value.data.data || []);
                    setErrorAtenciones("");
                } else {
                    const message = describeRequestError(atencionesResult.reason, "La consulta de atenciones");
                    setAtenciones([]);
                    setErrorAtenciones(message);
                    errors.push(message);
                }
                setError(errors.join(" "));
                loadedRef.current = true;
            }
        } finally {
            if (requestRef.current === request) requestRef.current = null;
            setCargando(false);
            setActualizando(false);
        }
    }, [enabled]);

    const loadAtencion = useCallback(async (idAtencion) => {
        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;
        setAtencion(null);
        setErrorAtencion("");
        setCargandoAtencion(true);

        try {
            const { data } = await api.get(`/atenciones-mesa/${idAtencion}`);
            const resultado = data.data;
            const resumenes = [...(resultado.pedidos || [])].sort((a, b) => Number(a.id_pedido) - Number(b.id_pedido));
            const detallesResult = await Promise.allSettled(
                resumenes.map((pedido) => api.get(`/pedidos/${pedido.id_pedido}`))
            );
            const erroresDetalle = [];
            const pedidos = resumenes.map((resumen, index) => {
                const detalleResult = detallesResult[index];
                if (detalleResult.status === "fulfilled") {
                    return {
                        ...detalleResult.value.data.data,
                        ...resumen,
                        detalle: detalleResult.value.data.data.detalle || [],
                    };
                }
                erroresDetalle.push(describeRequestError(detalleResult.reason, `El detalle del pedido #${resumen.id_pedido}`));
                return { ...resumen, detalle: [], detalleNoDisponible: true };
            });

            if (requestId === detailRequestRef.current) {
                setAtencion({ ...resultado, pedidos });
                setErrorAtencion(erroresDetalle.join(" "));
            }
        } catch (requestError) {
            if (requestId === detailRequestRef.current) {
                setErrorAtencion(describeRequestError(requestError, "La atención seleccionada"));
            }
        } finally {
            if (requestId === detailRequestRef.current) setCargandoAtencion(false);
        }
    }, []);

    const clearAtencion = useCallback(() => {
        detailRequestRef.current += 1;
        setAtencion(null);
        setCargandoAtencion(false);
        setErrorAtencion("");
    }, []);

    useEffect(() => {
        if (enabled) refresh();
        return undefined;
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled || paused || typeof document === "undefined") return undefined;
        const refreshIfVisible = () => {
            if (document.visibilityState === "visible") refresh();
        };
        const intervalId = window.setInterval(refreshIfVisible, refreshInterval);
        document.addEventListener("visibilitychange", refreshIfVisible);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", refreshIfVisible);
        };
    }, [enabled, paused, refresh]);

    return {
        mesas,
        atenciones,
        cargando: enabled && cargando,
        actualizando,
        error,
        errorMesas,
        errorAtenciones,
        atencion,
        cargandoAtencion,
        errorAtencion,
        refresh,
        loadAtencion,
        clearAtencion,
    };
}

export default useMesaBoardData;
