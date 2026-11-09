import { Router } from "express";

import * as usuario from "../controllers/usuario.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import { impedirAutoeliminacion, impedirCambioPrivilegiosPropios } from "../middlewares/protegerUsuarioPropio.js";

const router = Router();

router.get("/", verificarToken, autorizarRoles("admin"), usuario.listar);

router.get("/:id", verificarToken, autorizarRoles("admin"), usuario.obtener);

router.post("/", verificarToken, autorizarRoles("admin"), usuario.crear);

router.put("/:id", verificarToken, autorizarRoles("admin"), impedirCambioPrivilegiosPropios, usuario.actualizar);

router.delete("/:id", verificarToken, autorizarRoles("admin"), impedirAutoeliminacion, usuario.eliminar);

export default router;