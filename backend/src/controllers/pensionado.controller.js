import pensionadoService from "../services/pensionado.service.js";
import response from "../utils/response.js";

export const obtener = async (req, res) => {
    try {
        response.ok(res, await pensionadoService.obtenerDetalle(req.params.id));
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

const registrar = (tipoMovimiento) => async (req, res) => {
    try {
        response.ok(
            res,
            await pensionadoService.registrarMovimiento(req.params.id, req.usuario.id, req.body, tipoMovimiento),
            tipoMovimiento === "CONSUMO" ? "Consumo registrado" : "Reposición registrada",
        );
    } catch (error) {
        response.error(res, error.message, error.status || 500);
    }
};

export const consumir = registrar("CONSUMO");
export const reponer = registrar("REPOSICION");
