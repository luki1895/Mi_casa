import { NavLink } from "react-router-dom";

const MenuItem = ({ icon: Icon, title, path }) => {
    return (
        <NavLink
            to={path}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                ${
                    isActive
                        ? "bg-[#fef3c7] text-[#b45309] shadow-sm border border-[#fcd34d]"
                        : "text-slate-700 hover:bg-[#f5f3ff]"
                }`
            }
        >
            <Icon size={20} />
            <span className="font-medium">{title}</span>
        </NavLink>
    );
};

export default MenuItem;