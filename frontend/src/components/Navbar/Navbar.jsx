import { FaBell, FaUserCircle } from "react-icons/fa";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";

function Navbar() {

    const { user } = useContext(UserContext);

    return (
        <header className="h-16 bg-white shadow flex items-center justify-between px-6">

            <h2 className="text-lg font-semibold text-gray-700">
                Panel Administrativo
            </h2>

            <div className="flex items-center gap-6">

                <div className="relative cursor-pointer">
                    <FaBell size={20} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                        3
                    </span>
                </div>

                <div className="flex items-center gap-2 cursor-pointer">
                    <FaUserCircle size={24} />
                    <span className="text-sm font-medium">
                        {user.name}
                    </span>
                </div>

            </div>

        </header>
    );
}

export default Navbar;