const erroresConexion = new Set([
    "08000", "08001", "08003", "08006", "57P01", "57P02", "57P03",
    "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH",
    "EMAXCONNSESSION",
]);

export const esErrorConexion = (error) => erroresConexion.has(error?.code);

export const mensajeErrorConexion = (error) => error?.code === "EMAXCONNSESSION"
    ? "La base de datos alcanzó el límite de conexiones disponibles. Inténtalo más tarde o revisa la configuración del pool."
    : "La conexión con la base de datos no está disponible. Inténtalo nuevamente.";
