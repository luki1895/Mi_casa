import { menuHoy } from "../../data/menuMock";

function MenuDelDia({ agregarProducto }) {

    return (

        <div className="bg-white rounded-xl shadow">

            <div className="border-b p-5">

                <h2 className="text-xl font-semibold">

                    Menú del Día

                </h2>

            </div>

            <div className="divide-y">

                {

                    menuHoy.map((producto) => (

                        <div

                            key={producto.id}

                            className="flex justify-between items-center p-5"

                        >

                            <div>

                                <h3 className="font-semibold">

                                    {producto.nombre}

                                </h3>

                                <p className="text-gray-500 text-sm">

                                    {producto.categoria}

                                </p>

                            </div>

                            <div className="flex items-center gap-5">

                                <span className="font-bold text-lg">

                                    Bs {producto.precio}

                                </span>

                                <button

                                    onClick={() => agregarProducto(producto)}

                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"

                                >

                                    Agregar

                                </button>

                            </div>

                        </div>

                    ))

                }

            </div>

        </div>

    );

}

export default MenuDelDia;