import { NavLink } from "react-router-dom";

const MenuItem = ({ icon: Icon, title, path }) => {
    return (
        <NavLink
            to={path}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
            }
        >
            <Icon size={18} />
            <span>{title}</span>
        </NavLink>
    );
};

export default MenuItem;