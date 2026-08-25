import { useMemo, useState } from "react";
import { inventarioInicial } from "../../data/inventarioMock";

const normalizarNombre = (valor) => valor.trim().toLowerCase();

const diasDesde = (fecha) => {
  const diferencia = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diferencia / (1000 * 60 * 60 * 24)));
};

const hoy = () => new Date().toISOString().slice(0, 10);

function Inventario() {
  const [productos, setProductos] = useState(inventarioInicial);
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState({
    nombre: "",
    unidades: "",
    costoUnitario: "",
    categoria: "granos"
  });
  const [gasto, setGasto] = useState({ concepto: "", cantidad: "", costoTotal: "" });
  const [gastos, setGastos] = useState([
    { id: 1, concepto: "Compra de cebolla", cantidad: 4, costoTotal: 80, fecha: hoy() },
    { id: 2, concepto: "Compra de pollo", cantidad: 7, costoTotal: 320, fecha: hoy() }
  ]);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return productos;

    return productos.filter((producto) => producto.nombre.toLowerCase().includes(texto));
  }, [busqueda, productos]);

  const agregarProducto = (event) => {
    event.preventDefault();

    const nombre = normalizarNombre(formulario.nombre);
    const unidades = Number(formulario.unidades) || 0;
    const costoUnitario = Number(formulario.costoUnitario) || 0;

    if (!nombre) {
      return;
    }

    const fechaActual = hoy();

    setProductos((prev) => {
      const existente = prev.find((producto) => producto.nombre === nombre);

      if (existente) {
        return prev.map((producto) => {
          if (producto.nombre !== nombre) return producto;

          return {
            ...producto,
            unidades: Number(producto.unidades) + unidades,
            costoUnitario: costoUnitario || producto.costoUnitario,
            categoria: formulario.categoria || producto.categoria,
            ultimaModificacion: fechaActual
          };
        });
      }

      return [
        {
          id: Date.now(),
          nombre,
          unidades,
          costoUnitario,
          categoria: formulario.categoria || "granos",
          ultimaModificacion: fechaActual
        },
        ...prev
      ];
    });

    setFormulario({ nombre: "", unidades: "", costoUnitario: "", categoria: "granos" });
  };

  const registrarGasto = (event) => {
    event.preventDefault();
    const concepto = gasto.concepto.trim();
    const cantidad = Number(gasto.cantidad) || 0;
    const costoTotal = Number(gasto.costoTotal) || 0;

    if (!concepto || cantidad <= 0 || costoTotal <= 0) {
      return;
    }

    setGastos((prev) => [
      {
        id: Date.now(),
        concepto,
        cantidad,
        costoTotal,
        fecha: hoy()
      },
      ...prev
    ]);

    setGasto({ concepto: "", cantidad: "", costoTotal: "" });
  };

  const alertas = productos.filter((producto) => producto.unidades <= 5 || diasDesde(producto.ultimaModificacion) > 6).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ef4444]">Inventario</p>
            <h2 className="text-2xl font-bold text-slate-900">Control de insumos y compras</h2>
          </div>
          <p className="text-sm text-slate-500">Los nombres se guardan en minúsculas y el sistema marca alertas por stock bajo o actualización antigua.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Productos</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900">{productos.length}</h3>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Alertas</p>
          <h3 className="mt-2 text-3xl font-bold text-red-500">{alertas}</h3>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Registrar producto</h3>
          </div>

          <form onSubmit={agregarProducto} className="grid gap-4 md:grid-cols-2">
            <input
              value={formulario.nombre}
              onChange={(event) => setFormulario((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Nombre del producto"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />

            <select
              value={formulario.categoria}
              onChange={(event) => setFormulario((prev) => ({ ...prev, categoria: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            >
              <option value="granos">Granos</option>
              <option value="aceites">Aceites</option>
              <option value="carnes">Carnes</option>
              <option value="verduras">Verduras</option>
              <option value="otros">Otros</option>
            </select>

            <input
              type="number"
              min="0"
              value={formulario.unidades}
              onChange={(event) => setFormulario((prev) => ({ ...prev, unidades: event.target.value }))}
              placeholder="Unidades"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={formulario.costoUnitario}
              onChange={(event) => setFormulario((prev) => ({ ...prev, costoUnitario: event.target.value }))}
              placeholder="Costo unitario"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-2xl bg-[#ef4444] px-5 py-3 font-semibold text-white hover:bg-[#dc2626]">
                Guardar producto
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-900">Registro de gasto</h3>
          <form onSubmit={registrarGasto} className="space-y-3">
            <input
              value={gasto.concepto}
              onChange={(event) => setGasto((prev) => ({ ...prev, concepto: event.target.value }))}
              placeholder="Concepto"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />
            <input
              type="number"
              min="0"
              value={gasto.cantidad}
              onChange={(event) => setGasto((prev) => ({ ...prev, cantidad: event.target.value }))}
              placeholder="Cantidad"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={gasto.costoTotal}
              onChange={(event) => setGasto((prev) => ({ ...prev, costoTotal: event.target.value }))}
              placeholder="Costo total"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white"
            />
            <button type="submit" className="w-full rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white hover:bg-red-400">
              Registrar gasto
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-slate-900">Productos registrados</h3>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar producto"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-[#ef4444] focus:bg-white md:max-w-xs"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Unidades</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Última actualización</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => {
                const esAlerta = producto.unidades <= 5 || diasDesde(producto.ultimaModificacion) > 6;

                return (
                  <tr key={producto.id} className={`border-t border-slate-200 ${esAlerta ? "bg-red-50 text-red-700" : "bg-white text-slate-700"}`}>
                    <td className="px-4 py-3 font-semibold">{producto.nombre}</td>
                    <td className="px-4 py-3 capitalize">{producto.categoria}</td>
                    <td className="px-4 py-3">{producto.unidades}</td>
                    <td className="px-4 py-3">Bs. {producto.costoUnitario.toFixed(2)}</td>
                    <td className="px-4 py-3">{producto.ultimaModificacion}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${esAlerta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {esAlerta ? "Alerta" : "Normal"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Gastos registrados</h3>
        <div className="space-y-3">
          {gastos.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{item.concepto}</p>
                <p className="text-xs text-slate-500">{item.fecha}</p>
              </div>
              <span className="font-semibold text-red-500">-Bs. {Number(item.costoTotal).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Inventario;
