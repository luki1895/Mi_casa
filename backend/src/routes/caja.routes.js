import {Router} from "express";

import * as caja from "../controllers/caja.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";

const router=Router();

router.get("/panel",verificarToken,autorizarRoles("admin","caja"),caja.panel);

router.get("/reportes",verificarToken,autorizarRoles("admin","caja"),caja.reportes);

router.get("/pedidos",verificarToken,autorizarRoles("admin","caja"),caja.pedidos);

router.post("/abrir",verificarToken,autorizarRoles("admin","caja"),caja.abrir);

router.get("/pagos",verificarToken,autorizarRoles("admin","caja"),caja.pagos);

router.get("/gastos",verificarToken,autorizarRoles("admin","caja"),caja.gastos);

router.get("/adicionales",verificarToken,autorizarRoles("admin","caja"),caja.adicionales);

router.post("/gastos",verificarToken,autorizarRoles("admin","caja"),caja.registrarGasto);

router.post("/pedidos/:id/pagos",verificarToken,autorizarRoles("admin","caja"),caja.cobrar);

router.post("/adicionales/:id/cobrar",verificarToken,autorizarRoles("admin","caja"),caja.cobrarAdicional);

router.post("/cerrar",verificarToken,autorizarRoles("admin","caja"),caja.cerrar);

router.get("/",verificarToken,autorizarRoles("admin", "caja"),caja.listar);

export default router;