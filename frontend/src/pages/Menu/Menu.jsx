import { menuHoy } from "../../data/menuMock";

function Menu() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Menú del día</h2>
        <div className="divide-y">
          {menuHoy.map((producto) => (
            <div key={producto.id} className="flex justify-between items-center py-4">
              <div>
                <h3 className="font-semibold">{producto.nombre}</h3>
                <p className="text-sm text-gray-500">{producto.categoria}</p>
              </div>
              <span className="font-bold text-lg">Bs {producto.precio}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Menu;
