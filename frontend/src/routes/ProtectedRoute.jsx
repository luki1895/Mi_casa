import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function ProtectedRoute({ children, allowedRoles = [] }) {
    const { usuario } = useAuth();

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(usuario.role)) {
        if (usuario.role === "cliente") {
            return <Navigate to="/cliente" replace />;
        }

        if (usuario.role === "mesero") {
            return <Navigate to="/mesero" replace />;
        }

        if (usuario.role === "caja") {
            return <Navigate to="/caja" replace />;
        }

        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;