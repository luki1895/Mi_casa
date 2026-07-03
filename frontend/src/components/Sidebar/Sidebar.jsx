import React from "react";
import menuItems from "./menuItems";
import MenuItem from "./MenuItem";

const Sidebar = () => {
  return (
    <aside className="h-screen w-64 bg-white shadow-lg flex flex-col">

      {/* HEADER / LOGO */}
      <div className="p-5 border-b">
        <h1 className="text-xl font-bold text-gray-800">
          🍽 Sistema Restaurante
        </h1>
        <p className="text-sm text-gray-500">
          Panel administrativo
        </p>
      </div>

      {/* MENU */}
      <nav className="flex flex-col p-3 gap-1 flex-1">

        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            title={item.title}
            path={item.path}
          />
        ))}

      </nav>

      {/* FOOTER */}
      <div className="p-3 border-t text-xs text-gray-400">
        v1.0 - Sistema interno
      </div>

    </aside>
  );
};

export default Sidebar;