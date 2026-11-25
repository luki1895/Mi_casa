const claveDeIdempotencia = (referencia, payload) => {
    const serializado = JSON.stringify(payload);
    if (referencia.current?.payload === serializado) return referencia.current.clave;

    if (!globalThis.crypto?.randomUUID) {
        throw new Error("Este navegador no permite generar una clave segura para evitar pedidos duplicados.");
    }
    const clave = globalThis.crypto.randomUUID();
    referencia.current = { payload: serializado, clave };
    return clave;
};

export default claveDeIdempotencia;
