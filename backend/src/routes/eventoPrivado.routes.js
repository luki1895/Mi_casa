import { Router } from "express";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import * as evento from "../controllers/eventoPrivado.controller.js";

const router = Router();

router.post("/", evento.crear);
router.get("/acceso/:codigo", evento.obtenerPrivado);
router.post("/acceso/:codigo/cancelar", evento.cancelarPrivado);
router.patch("/acceso/:codigo/responder", evento.responderPrivado);
router.post("/acceso/:codigo/pagos", evento.registrarPago);
router.get("/horarios", evento.listarHorarios);
router.put("/horarios", verificarToken, autorizarRoles("admin"), evento.actualizarHorarios);
router.get("/", verificarToken, autorizarRoles("admin", "caja"), evento.listar);
router.get("/:id", verificarToken, autorizarRoles("admin", "caja"), evento.obtenerInterno);
router.patch("/:id/revision", verificarToken, autorizarRoles("admin"), evento.revisar);
router.post("/:id/cancelacion", verificarToken, autorizarRoles("admin"), evento.cancelarAdministrativamente);
router.post("/:id/cancelacion/devolucion", verificarToken, autorizarRoles("admin"), evento.registrarDevolucion);
router.post("/pagos/:id/verificar", verificarToken, autorizarRoles("admin", "caja"), evento.verificarPago);
router.post("/:id/impresiones", verificarToken, autorizarRoles("admin", "caja"), evento.imprimir);

export default router;
