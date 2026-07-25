import {Router} from "express";

import * as reporte from "../controllers/reporte.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router=Router();

router.get("/dashboard",verificarToken,reporte.dashboard);

export default router;