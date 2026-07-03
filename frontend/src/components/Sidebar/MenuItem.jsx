import { NavLink } from "react-router-dom";

const MenuItem = ({ icon: Icon, title, path }) => {
    return (
        <NavLink
            to={path}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                ${
                    isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                }`
            }
        >
            <Icon size={20} />
            <span className="font-medium">{title}</span>
        </NavLink>
    );
};

export default MenuItem;