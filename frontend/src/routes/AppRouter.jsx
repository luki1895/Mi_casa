import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/Login/Login";
import ClientePortal from "../pages/ClientePortal/ClientePortal";

import Dashboard from "../pages/Dashboard/Dashboard";
import Pedidos from "../pages/Pedidos/Pedidos";
import Usuarios from "../pages/Usuarios/Usuarios";
import Clientes from "../pages/Clientes/Clientes";
import Caja from "../pages/Caja/Caja";
import Produccion from "../pages/Produccion/Produccion";
import Reportes from "../pages/Reportes/Reportes";
import Configuracion from "../pages/Configuracion/Configuracion";
import Menu from "../pages/Menu/Menu";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                <Route
                    path="/cliente"
                    element={
                        <ProtectedRoute allowedRoles={["cliente"]}>
                            <ClientePortal />
                        </ProtectedRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute allowedRoles={["admin", "empleado"]}>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/caja" element={<Caja />} />
                    <Route path="/produccion" element={<Produccion />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;