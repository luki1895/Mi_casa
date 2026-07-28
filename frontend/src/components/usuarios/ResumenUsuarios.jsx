function ResumenUsuarios({ usuarios = [] }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-gray-500">Usuarios</p>
        <h2 className="text-2xl font-bold">{usuarios.length}</h2>
      </div>
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-gray-500">Activos</p>
        <h2 className="text-2xl font-bold text-green-600">{usuarios.filter((u) => u.estado).length}</h2>
      </div>
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-gray-500">Roles</p>
        <h2 className="text-2xl font-bold text-blue-600">{new Set(usuarios.map((u) => u.rol)).size}</h2>
      </div>
    </div>
  );
}

export default ResumenUsuarios;
