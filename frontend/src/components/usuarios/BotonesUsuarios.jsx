import Button from "../common/Button";

function BotonesUsuarios() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Guardar</Button>
      <Button variant="outline">Cancelar</Button>
    </div>
  );
}

export default BotonesUsuarios;
