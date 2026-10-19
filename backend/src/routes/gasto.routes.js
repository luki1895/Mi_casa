import {Router} from "express";

import * as gasto from "../controllers/gasto.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router=Router();

router.get("/",verificarToken,autorizarRoles("admin", "caja"),gasto.listar);

export default router;