import Button from "../common/Button";

function BotonesPedido({ guardarPedido, limpiarPedido }) {
    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={limpiarPedido} variant="outline">
                Limpiar
            </Button>

            <Button variant="warning">
                Reservas
            </Button>

            <Button onClick={guardarPedido} variant="primary">
                Registrar Pedido
            </Button>
        </div>
    );
}

export default BotonesPedido;