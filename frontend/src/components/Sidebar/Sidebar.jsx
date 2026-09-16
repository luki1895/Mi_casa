import React from "react";
import menuItems from "./menuItems";
import MenuItem from "./MenuItem";

const Sidebar = () => {
  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-900 text-slate-200">
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-slate-900">
            M
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Mi Casa</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Restaurant</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 p-4">
        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            title={item.title}
            path={item.path}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
        v1.0 · Panel administrativo
      </div>
    </aside>
  );
};

export default Sidebar;