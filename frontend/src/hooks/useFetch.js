import { useCallback, useEffect, useState } from "react";

export default function useFetch(service) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelado = false;

        Promise.resolve()
            .then(service)
            .then((respuesta) => {
                if (!cancelado) setData(respuesta.data);
            })
            .catch((requestError) => {
                if (!cancelado) setError(requestError);
            })
            .finally(() => {
                if (!cancelado) setLoading(false);
            });

        return () => {
            cancelado = true;
        };
    }, [service]);

    const recargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const respuesta = await service();
            setData(respuesta.data);
            return respuesta.data;
        } catch (requestError) {
            setError(requestError);
            throw requestError;
        } finally {
            setLoading(false);
        }
    }, [service]);

    return { data, loading, error, recargar };
}