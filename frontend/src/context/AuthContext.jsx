import { createContext, useEffect, useState } from "react";
import { normalizeSession } from "../auth/roles";
import { AUTH_STORAGE_KEY, SESSION_INVALID_EVENT } from "../auth/sessionEvents";

// The context is intentionally exported separately for consumers and hooks.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => {
        const storageUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!storageUser) return null;

        try {
            const sesion = normalizeSession(JSON.parse(storageUser));
            if (!sesion) localStorage.removeItem(AUTH_STORAGE_KEY);
            return sesion;
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }
    });

    useEffect(() => {
        const invalidarSesion = () => {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setUsuario(null);
        };

        window.addEventListener(SESSION_INVALID_EVENT, invalidarSesion);
        return () => window.removeEventListener(SESSION_INVALID_EVENT, invalidarSesion);
    }, []);

    const login = (datos) => {
        const sesion = normalizeSession(datos);
        if (!sesion) throw new Error("La sesión no contiene un rol válido.");
        setUsuario(sesion);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sesion));
    };

    const logout = () => {
        setUsuario(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ usuario, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}