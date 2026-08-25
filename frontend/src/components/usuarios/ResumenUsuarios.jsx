function ResumenUsuarios({ usuarios = [] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Usuarios</p>
        <h2 className="text-2xl font-bold text-slate-900">{usuarios.length}</h2>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Activos</p>
        <h2 className="text-2xl font-bold text-green-600">{usuarios.filter((u) => u.estado).length}</h2>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Inactivos</p>
        <h2 className="text-2xl font-bold text-red-500">{usuarios.filter((u) => !u.estado).length}</h2>
      </div>
    </div>
  );
}

export default ResumenUsuarios;
