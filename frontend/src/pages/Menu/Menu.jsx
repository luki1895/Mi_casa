import { useEffect, useState } from "react";
import api from "../../api/axios";

function Menu() {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    api.get("/produccion/menu")
      .then(({ data }) => {
        if (!cancelado) setProductos(data.data || []);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el menú del día desde el backend.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Menú del día</h2>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {cargando ? (
          <p className="text-sm text-gray-500">Cargando menú...</p>
        ) : (
          <div className="divide-y">
            {productos.length === 0 ? (
              <p className="py-4 text-sm text-gray-500">No hay productos disponibles para hoy.</p>
            ) : (
              productos.map((producto) => (
                <div key={producto.id_producto} className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold">{producto.nombre}</h3>
                    <p className="text-sm text-gray-500">{producto.categoria}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">Bs {Number(producto.precio || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Stock: {producto.stock ?? 0}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Menu;
