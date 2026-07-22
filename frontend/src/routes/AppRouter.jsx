import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

// Pages base del sistema
import Dashboard from "../pages/Dashboard/Dashboard";
import Pedidos from "../pages/Pedidos/Pedidos";

// Login independiente
import Login from "../pages/Login/Login";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>

                {/* 🔹 Inicio → redirige al Dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* 🔹 Login (sin layout) */}
                <Route path="/login" element={<Login />} />

                {/* 🔹 Sistema principal con layout */}
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                </Route>

                {/* 🔹 Fallback (opcional pero profesional) */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;