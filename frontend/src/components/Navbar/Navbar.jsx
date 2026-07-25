import { FaBell, FaUserCircle } from "react-icons/fa";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";

const Navbar = () => {

    const { usuario, logout } = useContext(AuthContext);

    const [menuOpen, setMenuOpen] = useState(false);

    return (

        <header className="flex items-center justify-between bg-white shadow px-6 py-4">

            <h1 className="text-2xl font-bold text-gray-700">
                Sistema Mi Casa
            </h1>

            <div className="flex items-center gap-5 relative">

                <button className="text-2xl text-gray-600 hover:text-red-500">

                    <FaBell />

                </button>

                <button

                    onClick={() => setMenuOpen(!menuOpen)}

                    className="flex items-center gap-2"

                >

                    <FaUserCircle className="text-3xl text-gray-700" />

                    <span className="font-semibold">

                        {usuario?.nombre || "Administrador"}

                    </span>

                </button>

                {menuOpen && (

                    <div className="absolute right-0 top-14 bg-white shadow-lg rounded-lg w-48">

                        <button

                            onClick={logout}

                            className="w-full text-left px-4 py-3 hover:bg-gray-100"

                        >

                            Cerrar sesión

                        </button>

                    </div>

                )}

            </div>

        </header>

    );

};

export default Navbar;