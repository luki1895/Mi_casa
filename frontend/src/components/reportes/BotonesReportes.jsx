import Button from "../common/Button";

function BotonesReportes() {
    return (
        <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline">
                Exportar PDF
            </Button>

            <Button variant="secondary">
                Imprimir
            </Button>
        </div>
    );
}

export default BotonesReportes;