import { Router } from "express";

import * as configuracion from "../controllers/configuracion.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router = Router();

router.get("/", verificarToken, autorizarRoles("admin"), configuracion.obtener);

router.put("/", verificarToken, autorizarRoles("admin"), configuracion.actualizar);

export default router;