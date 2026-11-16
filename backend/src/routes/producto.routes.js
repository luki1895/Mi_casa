import { Router } from "express";
import * as producto from "../controllers/producto.controller.js";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router = Router();
router.use(verificarToken, autorizarRoles("admin"));
router.get("/", producto.listar);
router.get("/:id", producto.obtener);
router.post("/", producto.crear);
router.put("/:id", producto.actualizar);
router.patch("/:id/estado", producto.cambiarEstado);
router.delete("/:id", producto.eliminar);

export default router;
