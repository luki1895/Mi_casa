import { NavLink } from "react-router-dom";

const MenuItem = ({ icon: Icon, title, path }) => {
    return (
        <NavLink
            to={path}
            className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-200"
                }`
            }
        >
            <Icon size={22} />
            <span>{title}</span>
        </NavLink>
    );
};

export default MenuItem;