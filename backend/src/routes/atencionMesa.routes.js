import { Router } from "express";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import * as atencionMesa from "../controllers/atencionMesa.controller.js";

const router = Router();

router.use(verificarToken);
router.get("/mesas", autorizarRoles("admin", "caja", "mesero"), atencionMesa.listarMesas);
router.post("/mesas", autorizarRoles("admin"), atencionMesa.crearMesa);
router.put("/mesas/:id", autorizarRoles("admin"), atencionMesa.actualizarMesa);
router.post("/mesas/:idMesa/atenciones", autorizarRoles("admin", "caja", "mesero"), atencionMesa.abrirAtencion);
router.get("/", autorizarRoles("admin", "caja", "mesero"), atencionMesa.listarAtenciones);
router.get("/:id", autorizarRoles("admin", "caja", "mesero"), atencionMesa.obtenerAtencion);
router.post("/:id/cerrar", autorizarRoles("admin", "mesero"), atencionMesa.cerrarAtencion);

export default router;
