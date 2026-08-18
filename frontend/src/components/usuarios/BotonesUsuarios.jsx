import Button from "../common/Button";

function BotonesUsuarios({
  onAgregar = () => {},
  onEliminar = () => {},
  onModificar = () => {},
  onAprobar = () => {}
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary" onClick={onAgregar} style={{ background: "var(--primary-color)" }}>Agregar</Button>
      <Button variant="outline" onClick={onEliminar}>Eliminar</Button>
      <Button variant="outline" onClick={onModificar}>Modificar</Button>
      <Button variant="primary" onClick={onAprobar} style={{ background: "var(--primary-color)" }}>Aprobar cambios</Button>
    </div>
  );
}

export default BotonesUsuarios;
