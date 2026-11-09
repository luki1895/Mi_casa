import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { normalizeRole } from "../auth/roles";

function ProtectedRoute({ children, allowedRoles = [] }) {
    const { usuario } = useAuth();
    const role = normalizeRole(usuario?.role ?? usuario?.rol);

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.map(normalizeRole).includes(role)) {
        if (role === "cliente") {
            return <Navigate to="/cliente" replace />;
        }

        if (role === "mesero") {
            return <Navigate to="/mesero" replace />;
        }

        if (role === "caja") {
            return <Navigate to="/caja" replace />;
        }

        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;