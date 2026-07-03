import { createContext, useState } from "react";

export const UserContext = createContext();

export function UserProvider({ children }) {
    const [user] = useState({
        name: "Admin",
        role: "Administrador"
    });

    return (
        <UserContext.Provider value={{ user }}>
            {children}
        </UserContext.Provider>
    );
}