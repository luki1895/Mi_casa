function BuscadorUsuarios({ busqueda, setBusqueda }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar usuario..."
        className="w-full border rounded-lg p-3"
      />
    </div>
  );
}

export default BuscadorUsuarios;
