import {Router} from "express";

import * as pedido from "../controllers/pedido.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router=Router();

router.get("/mis-servicios",verificarToken,autorizarRoles("mesero"),pedido.misServicios);

router.get("/activos",verificarToken,autorizarRoles("admin", "caja", "mesero"),pedido.listarActivos);

router.get("/",verificarToken,autorizarRoles("admin", "caja"),pedido.listar);

router.get("/:id",verificarToken,autorizarRoles("admin", "caja", "mesero"),pedido.obtener);

router.post("/:id/detalle",verificarToken,autorizarRoles("admin", "caja", "mesero"),pedido.agregarDetalle);

router.post("/:id/adicionales",verificarToken,autorizarRoles("mesero"),pedido.solicitarAdicional);

router.patch("/:id/estado",verificarToken,autorizarRoles("admin", "caja", "mesero"),pedido.actualizarEstado);

router.post("/",verificarToken,autorizarRoles("admin", "caja", "mesero"),pedido.crear);

export default router;