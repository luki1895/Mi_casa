import { Router } from "express";

import * as cliente from "../controllers/cliente.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verificarToken, cliente.listar);

router.get("/:id", verificarToken, cliente.obtener);

router.post("/", verificarToken, cliente.crear);

router.put("/:id", verificarToken, cliente.actualizar);

router.delete("/:id", verificarToken, cliente.eliminar);

export default router;