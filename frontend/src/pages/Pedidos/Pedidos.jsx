import { useState } from "react";

import ClienteSelector from "../../components/pedidos/ClienteSelector";
import MenuDelDia from "../../components/pedidos/MenuDelDia";
import PedidoDetalle from "../../components/pedidos/PedidoDetalle";
import PedidoResumen from "../../components/pedidos/PedidoResumen";
import Observaciones from "../../components/pedidos/Observaciones";
import BotonesPedido from "../../components/pedidos/BotonesPedido";

function Pedidos() {

    const [detallePedido, setDetallePedido] = useState([]);

    const agregarProducto = (producto) => {

        const existe = detallePedido.find(
            item => item.id === producto.id
        );

        if (existe) {

            setDetallePedido(

                detallePedido.map(item =>

                    item.id === producto.id

                        ? {
                            ...item,
                            cantidad: item.cantidad + 1,
                            subtotal: (item.cantidad + 1) * item.precio
                        }

                        : item

                )

            );

        }

        else {

            setDetallePedido([

                ...detallePedido,

                {
                    ...producto,
                    cantidad: 1,
                    subtotal: producto.precio
                }

            ]);

        }

    };

    const eliminarProducto = (id) => {

        setDetallePedido(

            detallePedido.filter(item => item.id !== id)

        );

    };

    const limpiarPedido = () => {

        setDetallePedido([]);

    };

    const total = detallePedido.reduce(

        (total, item) => total + item.subtotal,

        0

    );

    return (

        <div className="space-y-6">

            <h1 className="text-3xl font-bold">

                Registro de Pedido

            </h1>

            <div className="grid xl:grid-cols-2 gap-6">

                <div className="space-y-6">

                    <ClienteSelector />

                    <MenuDelDia
                        agregarProducto={agregarProducto}
                    />

                    <Observaciones />

                </div>

                <div className="space-y-6">

                    <PedidoDetalle
                        detallePedido={detallePedido}
                        eliminarProducto={eliminarProducto}
                    />

                    <PedidoResumen
                        detallePedido={detallePedido}
                        total={total}
                    />

                    <BotonesPedido
                        limpiarPedido={limpiarPedido}
                    />

                </div>

            </div>

        </div>

    );

}

export default Pedidos;