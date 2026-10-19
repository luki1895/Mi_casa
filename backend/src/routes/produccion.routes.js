import {Router} from "express";

import * as produccion from "../controllers/produccion.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router=Router();

router.get("/menu",verificarToken,autorizarRoles("admin", "caja", "mesero", "cliente"),produccion.listarMenu);

router.get("/productos",verificarToken,autorizarRoles("admin"),produccion.listarProductos);

router.get("/",verificarToken,autorizarRoles("admin"),produccion.listar);

router.post("/",verificarToken,autorizarRoles("admin"),produccion.crear);

export default router;