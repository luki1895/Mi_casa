import { useState } from "react";

function Observaciones({ observacion, setObservacion }) {

    const [texto, setTexto] = useState("");

    const valor = observacion !== undefined ? observacion : texto;

    const cambiarTexto = (e) => {

        if (setObservacion) {

            setObservacion(e.target.value);

        } else {

            setTexto(e.target.value);

        }

    };

    return (

        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-semibold mb-4">

                Observaciones

            </h2>

            <textarea

                rows="5"

                value={valor}

                onChange={cambiarTexto}

                placeholder="Ejemplo: Sin cebolla, poco ají..."

                className="w-full border rounded-lg p-3 resize-none"

            />

        </div>

    );

}

export default Observaciones;