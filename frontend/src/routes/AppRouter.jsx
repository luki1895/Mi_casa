import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Usuarios from "../pages/Usuarios/Usuarios";
import Platos from "../pages/Platos/Platos";
import Pedidos from "../pages/Pedidos/Pedidos";
import Personas from "../pages/Personas/Personas";
import Caja from "../pages/Caja/Caja";
import Cocina from "../pages/Cocina/Cocina";
import Reportes from "../pages/Reportes/Reportes";
import Configuracion from "../pages/Configuracion/Configuracion";
import Menu from "../pages/Menu/Menu";
function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Redirige la raíz al Dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Layout principal */}
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/platos" element={<Platos />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/personas" element={<Personas />} />
                    <Route path="/caja" element={<Caja />} />
                    <Route path="/cocina" element={<Cocina />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                    <Route path="/menu" element={<Menu />} />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;