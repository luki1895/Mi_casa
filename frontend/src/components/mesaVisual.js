const estilosEstado = {
    disponible: {
        label: "Disponible",
        color: "bg-emerald-600",
        background: "bg-emerald-50",
        border: "border-emerald-600",
        text: "text-emerald-900",
        marker: "bg-emerald-600",
    },
    ocupada: {
        label: "Ocupada · sin saldo",
        color: "bg-red-600",
        background: "bg-red-50",
        border: "border-red-600",
        text: "text-red-900",
        marker: "bg-red-600",
    },
    pendiente: {
        label: "Saldo pendiente",
        color: "bg-blue-600",
        background: "bg-blue-50",
        border: "border-blue-600",
        text: "text-blue-900",
        marker: "bg-blue-600",
    },
    deshabilitada: {
        label: "Deshabilitada",
        color: "bg-gray-500",
        background: "bg-gray-100",
        border: "border-gray-500",
        text: "text-gray-800",
        marker: "bg-gray-500",
    },
    desconocida: {
        label: "Sin información",
        color: "bg-slate-400",
        background: "bg-slate-50",
        border: "border-dashed border-slate-400",
        text: "text-slate-700",
        marker: "bg-slate-400",
    },
};

export const mesaEstadoVisual = (mesa, { atencion, mesaQueryError = false, atencionQueryError = false } = {}) => {
    if (mesaQueryError) return estilosEstado.desconocida;
    if (mesa?.habilitada === false) return estilosEstado.deshabilitada;
    if (mesa?.estado === "FUERA_SERVICIO" || mesa?.estado_atencion === "FUERA_SERVICIO") {
        return { ...estilosEstado.deshabilitada, label: "Fuera de servicio" };
    }

    if (mesa?.id_atencion) {
        if (atencionQueryError) return estilosEstado.desconocida;
        const saldoRaw = atencion ? atencion.saldo_pendiente : mesa.saldo_pendiente;
        if (saldoRaw === null || saldoRaw === undefined || saldoRaw === "") {
            return estilosEstado.desconocida;
        }
        const saldo = Number(saldoRaw);
        if (!Number.isFinite(saldo) || saldo < 0) return estilosEstado.desconocida;
        return saldo > 0 ? estilosEstado.pendiente : estilosEstado.ocupada;
    }

    if (mesa?.estado_atencion === "DISPONIBLE" && mesa.habilitada === true) {
        return estilosEstado.disponible;
    }
    return estilosEstado.desconocida;
};

export const posicionMesaValida = (mesa) => (
    Number.isFinite(Number(mesa?.posicion_x))
    && Number.isFinite(Number(mesa?.posicion_y))
    && mesa?.posicion_x !== null
    && mesa?.posicion_y !== null
);

export default estilosEstado;
