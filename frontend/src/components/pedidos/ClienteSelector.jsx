import { useState } from "react";

function ClienteSelector() {

    const [tipoCliente, setTipoCliente] = useState("pensionado");

    return (

        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-semibold mb-5">

                Cliente

            </h2>

            <div className="flex gap-6 mb-5">

                <label className="flex items-center gap-2 cursor-pointer">

                    <input

                        type="radio"

                        value="pensionado"

                        checked={tipoCliente === "pensionado"}

                        onChange={(e) => setTipoCliente(e.target.value)}

                    />

                    Pensionado

                </label>

                <label className="flex items-center gap-2 cursor-pointer">

                    <input

                        type="radio"

                        value="eventual"

                        checked={tipoCliente === "eventual"}

                        onChange={(e) => setTipoCliente(e.target.value)}

                    />

                    Eventual

                </label>

            </div>

            {

                tipoCliente === "pensionado"

                ?

                <input

                    type="text"

                    placeholder="Buscar pensionado..."

                    className="w-full border rounded-lg p-3"

                />

                :

                <div className="space-y-3">

                    <input

                        type="text"

                        placeholder="Nombre del cliente"

                        className="w-full border rounded-lg p-3"

                    />

                    <input

                        type="text"

                        placeholder="Teléfono (Opcional)"

                        className="w-full border rounded-lg p-3"

                    />

                </div>

            }

        </div>

    );

}

export default ClienteSelector;