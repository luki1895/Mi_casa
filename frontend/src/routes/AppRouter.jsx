import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

// Pages base del sistema
import Dashboard from "../pages/Dashboard/Dashboard";
import Pedidos from "../pages/Pedidos/Pedidos";
import Usuarios from "../pages/Usuarios/Usuarios";
import Clientes from "../pages/Clientes/Clientes";
import Caja from "../pages/Caja/Caja";
import Produccion from "../pages/Produccion/Produccion";
import Inventario from "../pages/Inventario/Inventario";
import Reportes from "../pages/Reportes/Reportes";
import Configuracion from "../pages/Configuracion/Configuracion";
import Menu from "../pages/Menu/Menu";

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
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/caja" element={<Caja />} />
                    <Route path="/inventario" element={<Inventario />} />
                    <Route path="/produccion" element={<Produccion />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                </Route>

                {/* 🔹 Fallback (opcional pero profesional) */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;