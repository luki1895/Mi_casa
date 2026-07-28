import { useState } from "react";

import ClienteSelector from "../../components/pedidos/ClienteSelector";
import MenuDelDia from "../../components/pedidos/MenuDelDia";
import PedidoDetalle from "../../components/pedidos/PedidoDetalle";
import PedidoResumen from "../../components/pedidos/PedidoResumen";
import Observaciones from "../../components/pedidos/Observaciones";
import BotonesPedido from "../../components/pedidos/BotonesPedido";

const menuInicial = [
    {
        id: 1,
        nombre: "Silpancho",
        categoria: "Segundo",
        precio: 15,
        stock: 30
    },
    {
        id: 2,
        nombre: "Fricasé",
        categoria: "Segundo",
        precio: 15,
        stock: 20
    },
    {
        id: 3,
        nombre: "Sopa de Maní",
        categoria: "Sopa",
        precio: 8,
        stock: 50
    },
    {
        id: 4,
        nombre: "Mocochinchi",
        categoria: "Refresco",
        precio: 5,
        stock: 80
    }
];

export default function Pedidos() {

    const [cliente, setCliente] = useState(null);

    const [detalle, setDetalle] = useState([]);

    const [observacion, setObservacion] = useState("");

    const agregarProducto = (producto) => {

        const existe = detalle.find(

            item => item.id === producto.id

        );

        if (existe) {

            setDetalle(

                detalle.map(item =>

                    item.id === producto.id

                        ? {

                            ...item,

                            cantidad: item.cantidad + 1,

                            subtotal:

                                (item.cantidad + 1) *

                                item.precio

                        }

                        : item

                )

            );

            return;

        }

        setDetalle([

            ...detalle,

            {

                ...producto,

                cantidad: 1,

                subtotal: producto.precio

            }

        ]);

    };

    const aumentar = (id) => {

        setDetalle(

            detalle.map(item =>

                item.id === id

                    ? {

                        ...item,

                        cantidad: item.cantidad + 1,

                        subtotal:

                            (item.cantidad + 1) *

                            item.precio

                    }

                    : item

            )

        );

    };

    const disminuir = (id) => {

        setDetalle(

            detalle

                .map(item =>

                    item.id === id

                        ? {

                            ...item,

                            cantidad: item.cantidad - 1,

                            subtotal:

                                (item.cantidad - 1) *

                                item.precio

                        }

                        : item

                )

                .filter(item => item.cantidad > 0)

        );

    };

    const eliminar = (id) => {

        setDetalle(

            detalle.filter(

                item => item.id !== id

            )

        );

    };

    const subtotal = detalle.reduce(

        (total, item) =>

            total + item.subtotal,

        0

    );

    const descuento = 0;

    const total = subtotal - descuento;

    const guardarPedido = () => {

        const pedido = {

            cliente,

            detalle,

            observacion,

            subtotal,

            descuento,

            total,

            estado: "PENDIENTE"

        };

        console.log(pedido);

        alert("Pedido registrado correctamente");

    };

    const limpiarPedido = () => {

        setCliente(null);

        setDetalle([]);

        setObservacion("");

    };

    return (

        <div className="space-y-6">

            <ClienteSelector

                cliente={cliente}

                setCliente={setCliente}

            />

            <MenuDelDia

                menu={menuInicial}

                agregarProducto={agregarProducto}

            />

            <PedidoDetalle

                detallePedido={detalle}

                eliminarProducto={eliminar}

            />

            <Observaciones

                observacion={observacion}

                setObservacion={setObservacion}

            />

            <PedidoResumen

                detallePedido={detalle}

                total={total}

            />

            <BotonesPedido

                guardarPedido={guardarPedido}

                limpiarPedido={limpiarPedido}

            />

        </div>

    );

}