import { FaBell, FaUserCircle } from "react-icons/fa";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";

const Navbar = () => {
    const { usuario, logout } = useContext(AuthContext);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Panel</p>
                <h1 className="text-2xl font-black text-slate-900">Mi Casa Restaurant</h1>
            </div>

            <div className="relative flex items-center gap-5">
                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition hover:bg-amber-100 hover:text-amber-700">
                    <FaBell />
                </button>

                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300"
                >
                    <FaUserCircle className="text-2xl text-slate-700" />
                    <span className="font-semibold text-slate-800">
                        {usuario?.name || usuario?.nombre || "Administrador"}
                    </span>
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-14 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-dropdown">
                        <button
                            onClick={logout}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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