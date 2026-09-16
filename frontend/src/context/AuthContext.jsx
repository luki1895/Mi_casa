import { createContext, useState } from "react";

export const AuthContext = createContext();

const STORAGE_KEY = "mi_casa_usuario";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => {
        const storageUser = localStorage.getItem(STORAGE_KEY);
        return storageUser ? JSON.parse(storageUser) : null;
    });

    const login = (datos) => {
        setUsuario(datos);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    };

    const logout = () => {
        setUsuario(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ usuario, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}