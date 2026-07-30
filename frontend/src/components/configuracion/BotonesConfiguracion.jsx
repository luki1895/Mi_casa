import Button from "../common/Button";

function BotonesConfiguracion({ restablecer = () => {} }) {
    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={restablecer} variant="outline">
                Restablecer
            </Button>

            <Button variant="primary">
                Guardar Configuración
            </Button>
        </div>
    );
}

export default BotonesConfiguracion;