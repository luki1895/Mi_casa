import { useState } from "react";

function Observaciones() {

    const [texto, setTexto] = useState("");

    return (

        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-semibold mb-4">

                Observaciones

            </h2>

            <textarea

                rows="5"

                value={texto}

                onChange={(e) => setTexto(e.target.value)}

                placeholder="Ejemplo: Sin cebolla, poco ají..."

                className="w-full border rounded-lg p-3 resize-none"

            />

        </div>

    );

}

export default Observaciones;