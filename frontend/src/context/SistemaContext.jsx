import { createContext, useState } from "react";

export const SistemaContext = createContext();

const temaInicial = {
    nombre: "rojo",
    primary: "#ef4444",
    secondary: "#f59e0b",
    accent: "#fff7ed",
    sidebar: "#1f2937"
};

export function SistemaProvider({ children }) {
    const [clientes, setClientes] = useState([]);
    const [pedidos, setPedidos] = useState([]);
    const [produccion, setProduccion] = useState([]);
    const [caja, setCaja] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [tema, setTema] = useState(temaInicial);

    return (
        <SistemaContext.Provider
            value={{
                clientes,
                setClientes,
                pedidos,
                setPedidos,
                produccion,
                setProduccion,
                caja,
                setCaja,
                gastos,
                setGastos,
                tema,
                setTema
            }}
        >
            {children}
        </SistemaContext.Provider>
    );
}