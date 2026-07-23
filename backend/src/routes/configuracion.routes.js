import { Router } from "express";

import * as configuracion from "../controllers/configuracion.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verificarToken, configuracion.obtener);

router.put("/", verificarToken, configuracion.actualizar);

export default router;