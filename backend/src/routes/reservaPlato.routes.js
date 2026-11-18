import { Router } from "express";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import * as reservaPlato from "../controllers/reservaPlato.controller.js";

const router = Router();

router.post("/", reservaPlato.crear);
router.get("/configuracion", reservaPlato.obtenerConfiguracion);
router.put("/configuracion", verificarToken, autorizarRoles("admin"), reservaPlato.actualizarConfiguracion);
router.get("/acceso/:codigo", reservaPlato.obtenerPrivado);
router.patch("/acceso/:codigo", reservaPlato.modificarPrivado);
router.post("/acceso/:codigo/cancelar", reservaPlato.cancelarPrivado);
router.get("/", verificarToken, autorizarRoles("admin", "caja"), reservaPlato.listar);
router.post("/:id/recibir", verificarToken, autorizarRoles("admin", "caja"), reservaPlato.recibir);
router.post("/:id/no-presentada", verificarToken, autorizarRoles("admin", "caja"), reservaPlato.marcarNoPresentada);
router.post("/:id/impresiones", verificarToken, autorizarRoles("admin", "caja"), reservaPlato.imprimir);

export default router;
