import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!mobileOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setMobileOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

    return (
        <div className="flex min-h-screen bg-background text-text">
            <div className="hidden h-screen shrink-0 md:block">
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((current) => !current)}
                />
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        aria-label="Cerrar navegación"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-slate-950/50"
                    />
                    <div className="absolute inset-y-0 left-0 w-[min(18rem,calc(100vw-3rem))] shadow-2xl">
                        <Sidebar
                            mobile
                            onClose={() => setMobileOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <Navbar onOpenMenu={() => setMobileOpen(true)} />

                <main className="flex-1 overflow-x-hidden bg-[#f8f5f2] p-4 sm:p-6 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default MainLayout;