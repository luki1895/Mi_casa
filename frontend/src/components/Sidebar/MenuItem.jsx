import { NavLink } from "react-router-dom";

const MenuItem = ({ icon: Icon, title, path, collapsed = false, onNavigate }) => {
    return (
        <NavLink
            to={path}
            onClick={onNavigate}
            title={collapsed ? title : undefined}
            aria-label={collapsed ? title : undefined}
            className={({ isActive }) =>
                `flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} rounded-xl py-3 text-sm font-semibold transition-colors ${
                    isActive
                        ? "bg-[#F59E0B] text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
            }
        >
            <Icon size={18} />
            {!collapsed && <span className="truncate">{title}</span>}
        </NavLink>
    );
};

export default MenuItem;