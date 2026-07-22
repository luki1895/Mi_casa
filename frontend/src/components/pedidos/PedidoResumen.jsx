function PedidoResumen({ detallePedido, total }) {

    return (

        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-semibold mb-5">

                Resumen

            </h2>

            <div className="space-y-4">

                <div className="flex justify-between">

                    <span>

                        Productos

                    </span>

                    <strong>

                        {detallePedido.length}

                    </strong>

                </div>

                <div className="flex justify-between">

                    <span>

                        Total

                    </span>

                    <strong className="text-3xl text-green-600">

                        Bs {total}

                    </strong>

                </div>

            </div>

        </div>

    );

}

export default PedidoResumen;