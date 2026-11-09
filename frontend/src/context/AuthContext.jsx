import { createContext, useState } from "react";
import { normalizeSession } from "../auth/roles";

// The context is intentionally exported separately for consumers and hooks.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const STORAGE_KEY = "mi_casa_usuario";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => {
        const storageUser = localStorage.getItem(STORAGE_KEY);
        if (!storageUser) return null;

        try {
            const sesion = normalizeSession(JSON.parse(storageUser));
            if (!sesion) localStorage.removeItem(STORAGE_KEY);
            return sesion;
        } catch {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    });

    const login = (datos) => {
        const sesion = normalizeSession(datos);
        if (!sesion) throw new Error("La sesión no contiene un rol válido.");
        setUsuario(sesion);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
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