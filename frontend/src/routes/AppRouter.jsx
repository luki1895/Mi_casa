import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/Login/Login";
import ClientePortal from "../pages/ClientePortal/ClientePortal";
import Mesero from "../pages/Mesero/Mesero";

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
                    path="/mesero"
                    element={
                        <ProtectedRoute allowedRoles={["mesero"]}>
                            <Mesero />
                        </ProtectedRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute allowedRoles={["admin", "caja", "empleado"]}>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
                    <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><Usuarios /></ProtectedRoute>} />
                    <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin"]}><Clientes /></ProtectedRoute>} />
                    <Route path="/menu" element={<ProtectedRoute allowedRoles={["admin"]}><Menu /></ProtectedRoute>} />
                    <Route path="/pedidos" element={<ProtectedRoute allowedRoles={["admin"]}><Pedidos /></ProtectedRoute>} />
                    <Route path="/caja" element={<ProtectedRoute allowedRoles={["admin", "caja"]}><Caja /></ProtectedRoute>} />
                    <Route path="/produccion" element={<ProtectedRoute allowedRoles={["admin"]}><Produccion /></ProtectedRoute>} />
                    <Route path="/reportes" element={<ProtectedRoute allowedRoles={["admin"]}><Reportes /></ProtectedRoute>} />
                    <Route path="/configuracion" element={<ProtectedRoute allowedRoles={["admin"]}><Configuracion /></ProtectedRoute>} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;