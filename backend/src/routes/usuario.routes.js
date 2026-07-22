import { Router } from "express";

import * as usuario from "../controllers/usuario.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verificarToken, usuario.listar);

router.get("/:id", verificarToken, usuario.obtener);

router.post("/", verificarToken, usuario.crear);

router.put("/:id", verificarToken, usuario.actualizar);

router.delete("/:id", verificarToken, usuario.eliminar);

export default router;