import {Router} from "express";

import * as gasto from "../controllers/gasto.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router=Router();

router.get("/",verificarToken,gasto.listar);

router.post("/",verificarToken,gasto.crear);

export default router;