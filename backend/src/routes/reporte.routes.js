import {Router} from "express";

import * as reporte from "../controllers/reporte.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router=Router();

router.get("/dashboard",verificarToken,autorizarRoles("admin"),reporte.dashboard);

router.get("/operativo",verificarToken,autorizarRoles("admin"),reporte.operativo);

export default router;