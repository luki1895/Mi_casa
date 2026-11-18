import { useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaTimes } from "react-icons/fa";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import menuSections from "./menuItems";
import MenuItem from "./MenuItem";
import useAuth from "../../hooks/useAuth";
import { normalizeRole } from "../../auth/roles";

const Sidebar = ({
  collapsed = false,
  mobile = false,
  onToggle,
  onClose,
}) => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const role = normalizeRole(usuario?.role ?? usuario?.rol);
  const sections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.roles?.map(normalizeRole).includes(role)
      ),
    }))
    .filter((section) => section.items.length > 0);

  const cerrarSesion = () => {
    logout();
    onClose?.();
    navigate("/login", { replace: true });
  };

  const handleNavigate = () => {
    if (mobile) onClose?.();
  };

  return (
    <aside className={`flex h-full flex-col border-r border-slate-800 bg-slate-900 text-slate-200 ${collapsed ? "w-20" : "w-72"}`}>
      <div className={`border-b border-slate-800 ${collapsed ? "p-4" : "p-5"}`}>
        <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-slate-900">
            M
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-white">Mi Casa</h1>
              <p className="text-xs uppercase tracking-[0.20em] text-amber-300">Restaurant</p>
            </div>
          )}
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar navegación"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <FaTimes />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Contraer navegación"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <MdChevronLeft size={20} />
            </button>
          )
        )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <MenuItem
                    key={item.path}
                    icon={item.icon}
                    title={item.title}
                    path={item.path}
                    collapsed={collapsed}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-800 p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-slate-950">
                {(usuario?.name || usuario?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{usuario?.name || usuario?.username || "Usuario"}</p>
                <p className="truncate text-xs capitalize text-slate-400">{role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <FaSignOutAlt />
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onToggle}
              aria-label="Expandir navegación"
              className="flex h-11 w-full items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <MdChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-11 w-full items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <FaSignOutAlt />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;