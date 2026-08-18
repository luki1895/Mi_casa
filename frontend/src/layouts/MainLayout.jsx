import { useContext } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";
import { SistemaContext } from "../context/SistemaContext";

function MainLayout() {
    const { tema } = useContext(SistemaContext);

    return (
        <div
            className="flex h-screen bg-slate-100"
            style={{
                background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 40%, #f5f3ff 100%)",
                "--primary-color": tema.primary,
                "--secondary-color": tema.secondary,
                "--accent-color": tema.accent,
                "--sidebar-color": tema.sidebar
            }}
        >
            <Sidebar />

            <div className="flex flex-1 flex-col">
                <Navbar />

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default MainLayout;