import { Router } from "express";

import * as cliente from "../controllers/cliente.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import * as pensionado from "../controllers/pensionado.controller.js";
import { crearCliente } from "../validators/cliente.validator.js";
import validar from "../middlewares/validacion.middleware.js";
import * as reserva from "../controllers/reserva.controller.js";

const router = Router();

router.get("/mi-cuenta", verificarToken, autorizarRoles("cliente"), cliente.miPortal);

router.post("/mis-reservas", verificarToken, autorizarRoles("cliente"), cliente.crearReserva);

router.get("/reservas", verificarToken, autorizarRoles("admin", "caja"), reserva.listar);

router.get("/reservas/:id", verificarToken, autorizarRoles("admin", "caja"), reserva.obtener);

router.patch("/reservas/:id/estado", verificarToken, autorizarRoles("admin", "caja"), reserva.actualizar);

router.get("/para-pedidos", verificarToken, autorizarRoles("admin", "caja", "mesero"), cliente.listarParaPedidos);

router.get("/", verificarToken, autorizarRoles("admin", "caja"), cliente.listar);

router.get("/:id", verificarToken, autorizarRoles("admin", "caja"), cliente.obtener);

router.post("/", verificarToken, autorizarRoles("admin", "caja"), crearCliente, validar, cliente.crear);

router.put("/:id", verificarToken, autorizarRoles("admin"), cliente.actualizar);

router.put("/:id/cuenta", verificarToken, autorizarRoles("admin"), cliente.vincularCuenta);

router.get("/:id/pensiones", verificarToken, autorizarRoles("admin", "caja", "mesero"), pensionado.obtener);

router.post("/:id/pensiones/consumos", verificarToken, autorizarRoles("admin", "caja", "mesero"), pensionado.consumir);

router.post("/:id/pensiones/reposiciones", verificarToken, autorizarRoles("admin", "caja"), pensionado.reponer);

router.delete("/:id", verificarToken, autorizarRoles("admin"), cliente.eliminar);

export default router;