import {Router} from "express";

import * as produccion from "../controllers/produccion.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router=Router();

router.get("/",verificarToken,produccion.listar);

router.post("/",verificarToken,produccion.crear);

export default router;