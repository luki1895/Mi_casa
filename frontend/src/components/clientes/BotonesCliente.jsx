import {
    FaPlus,
    FaFileExcel,
    FaPrint,
    FaSyncAlt
} from "react-icons/fa";
import Button from "../common/Button";

const BotonesCliente = ({
    nuevo,
    actualizar,
    imprimir,
    excel
}) => {
    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={nuevo} variant="primary">
                <FaPlus className="text-sm" />
                Nuevo
            </Button>

            <Button onClick={actualizar} variant="secondary">
                <FaSyncAlt className="text-sm" />
                Actualizar
            </Button>

            <Button onClick={excel} variant="success">
                <FaFileExcel className="text-sm" />
                Excel
            </Button>

            <Button onClick={imprimir} variant="outline">
                <FaPrint className="text-sm" />
                Imprimir
            </Button>
        </div>
    );
};

export default BotonesCliente;