import { Router } from "express";

import * as cliente from "../controllers/cliente.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router = Router();

router.get("/mi-cuenta", verificarToken, autorizarRoles("cliente"), cliente.miPortal);

router.post("/mis-reservas", verificarToken, autorizarRoles("cliente"), cliente.crearReserva);

router.get("/para-pedidos", verificarToken, autorizarRoles("admin", "caja", "mesero"), cliente.listarParaPedidos);

router.get("/", verificarToken, autorizarRoles("admin", "caja"), cliente.listar);

router.get("/:id", verificarToken, autorizarRoles("admin", "caja"), cliente.obtener);

router.post("/", verificarToken, autorizarRoles("admin", "caja"), cliente.crear);

router.put("/:id", verificarToken, autorizarRoles("admin"), cliente.actualizar);

router.put("/:id/cuenta", verificarToken, autorizarRoles("admin"), cliente.vincularCuenta);

router.delete("/:id", verificarToken, autorizarRoles("admin"), cliente.eliminar);

export default router;