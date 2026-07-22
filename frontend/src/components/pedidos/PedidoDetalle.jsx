function PedidoDetalle({ detallePedido, eliminarProducto }) {

    return (

        <div className="bg-white rounded-xl shadow overflow-hidden">

            <div className="border-b p-5">

                <h2 className="text-xl font-semibold">

                    Detalle del Pedido

                </h2>

            </div>

            <table className="w-full">

                <thead className="bg-gray-100">

                    <tr>

                        <th className="text-left p-3">Producto</th>

                        <th>Cant.</th>

                        <th>Precio</th>

                        <th>Subtotal</th>

                        <th></th>

                    </tr>

                </thead>

                <tbody>

                    {

                        detallePedido.length === 0

                            ?

                            (

                                <tr>

                                    <td

                                        colSpan="5"

                                        className="text-center py-8 text-gray-500"

                                    >

                                        No existen productos agregados.

                                    </td>

                                </tr>

                            )

                            :

                            detallePedido.map(item => (

                                <tr

                                    key={item.id}

                                    className="border-b"

                                >

                                    <td className="p-3">

                                        {item.nombre}

                                    </td>

                                    <td className="text-center">

                                        {item.cantidad}

                                    </td>

                                    <td className="text-center">

                                        Bs {item.precio}

                                    </td>

                                    <td className="text-center">

                                        Bs {item.subtotal}

                                    </td>

                                    <td className="text-center">

                                        <button

                                            onClick={() => eliminarProducto(item.id)}

                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"

                                        >

                                            X

                                        </button>

                                    </td>

                                </tr>

                            ))

                    }

                </tbody>

            </table>

        </div>

    );

}

export default PedidoDetalle;