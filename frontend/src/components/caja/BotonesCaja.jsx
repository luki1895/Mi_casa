import Button from "../common/Button";

function BotonesCaja() {
    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline">
                Imprimir Cierre
            </Button>

            <Button variant="success">
                Cerrar Caja
            </Button>
        </div>
    );
}

export default BotonesCaja;