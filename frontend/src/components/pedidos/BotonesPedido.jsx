function BotonesPedido({ limpiarPedido }) {

    return (

        <div className="flex justify-end gap-4">

            <button

                onClick={limpiarPedido}

                className="px-5 py-3 rounded-lg border border-gray-400 hover:bg-gray-100"

            >

                Limpiar

            </button>

            <button

                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"

            >

                Registrar Pedido

            </button>

        </div>

    );

}

export default BotonesPedido;