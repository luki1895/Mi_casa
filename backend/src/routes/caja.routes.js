import {Router} from "express";

import * as caja from "../controllers/caja.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router=Router();

router.get("/",verificarToken,caja.listar);

router.post("/",verificarToken,caja.registrar);

export default router;