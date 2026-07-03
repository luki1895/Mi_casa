import { FaBell, FaUserCircle } from "react-icons/fa";
import { useContext, useState } from "react";
import { UserContext } from "../../context/UserContext";

function Navbar() {

    const { user } = useContext(UserContext);
    const [open, setOpen] = useState(false);

    return (
        <header className="h-16 bg-white shadow flex items-center justify-between px-6 relative">

            <h2 className="text-lg font-semibold text-gray-700">
                Panel Administrativo
            </h2>

            <div className="flex items-center gap-6">

                {/* Notificaciones */}
                <div className="relative cursor-pointer">
                    <FaBell size={20} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                        3
                    </span>
                </div>

                {/* Usuario */}
                <div className="relative">

                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setOpen(!open)}
                    >
                        <FaUserCircle size={24} />
                        <span className="text-sm font-medium">
                            {user.name}
                        </span>
                    </div>

                    {/* Dropdown */}
                    {open && (
                        <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border">

                            <div className="p-2 hover:bg-gray-100 cursor-pointer">
                                Perfil
                            </div>

                            <div className="p-2 hover:bg-gray-100 cursor-pointer">
                                Configuración
                            </div>

                            <div className="p-2 hover:bg-red-100 text-red-600 cursor-pointer">
                                Cerrar sesión
                            </div>

                        </div>
                    )}

                </div>

            </div>

        </header>
    );
}

export default Navbar;