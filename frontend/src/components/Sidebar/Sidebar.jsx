import React from "react";
import menuItems from "./menuItems";
import MenuItem from "./MenuItem";

const Sidebar = () => {
  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 shadow-2xl" style={{ background: "var(--sidebar-color)" }}>
      <div className="border-b border-slate-700 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg" style={{ background: "linear-gradient(135deg, var(--secondary-color), var(--primary-color))" }}>
            MC
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wide text-white">Mi Casa</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Panel administrativo</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {menuItems.map((item, index) => (
          <MenuItem key={index} icon={item.icon} title={item.title} path={item.path} />
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
        v1.0 · Sistema interno
      </div>
    </aside>
  );
};

export default Sidebar;