const fechaRestaurante = (fecha = new Date()) => {
    const valores = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/La_Paz",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(fecha).map(({ type, value }) => [type, value]),
    );
    return `${valores.year}-${valores.month}-${valores.day}`;
};

export default fechaRestaurante;
