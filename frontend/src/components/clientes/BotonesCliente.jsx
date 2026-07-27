import {
    FaPlus,
    FaFileExcel,
    FaPrint,
    FaSyncAlt
} from "react-icons/fa";

const BotonesCliente = ({

    nuevo,

    actualizar,

    imprimir,

    excel

})=>{

    return(

        <div className="flex gap-4">

            <button

                onClick={nuevo}

                className="bg-red-700 text-white px-5 py-3 rounded-lg"

            >

                <FaPlus className="inline mr-2"/>

                Nuevo

            </button>

            <button

                onClick={actualizar}

                className="bg-blue-700 text-white px-5 py-3 rounded-lg"

            >

                <FaSyncAlt className="inline mr-2"/>

                Actualizar

            </button>

            <button

                onClick={excel}

                className="bg-green-700 text-white px-5 py-3 rounded-lg"

            >

                <FaFileExcel className="inline mr-2"/>

                Excel

            </button>

            <button

                onClick={imprimir}

                className="bg-gray-700 text-white px-5 py-3 rounded-lg"

            >

                <FaPrint className="inline mr-2"/>

                Imprimir

            </button>

        </div>

    );

};

export default BotonesCliente;