import { FaBars, FaBell } from "react-icons/fa";

const Navbar = ({ onOpenMenu }) => {
    return (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
                {onOpenMenu && (
                    <button
                        type="button"
                        onClick={onOpenMenu}
                        aria-label="Abrir navegación"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden"
                    >
                        <FaBars />
                    </button>
                )}
                <div className="min-w-0">
                    <p className="hidden text-xs uppercase tracking-[0.3em] text-amber-600 sm:block">Panel</p>
                    <h1 className="truncate text-lg font-black text-slate-900 sm:text-2xl">Mi Casa Restaurant</h1>
                </div>
            </div>

            <div className="relative flex items-center gap-5">
                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition hover:bg-amber-100 hover:text-amber-700">
                    <FaBell />
                </button>
            </div>
        </header>
    );
};

export default Navbar;