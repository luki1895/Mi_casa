import { Router } from "express";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import * as atencionMesa from "../controllers/atencionMesa.controller.js";

const router = Router();

router.use(verificarToken);
router.get("/mesas", autorizarRoles("admin", "caja", "mesero"), atencionMesa.listarMesas);
router.get("/admin/mesas", autorizarRoles("admin"), atencionMesa.listarMesasConfiguracion);
router.get("/sectores", autorizarRoles("admin", "caja", "mesero"), atencionMesa.listarSectores);
router.get("/admin/sectores", autorizarRoles("admin"), atencionMesa.listarSectoresConfiguracion);
router.post("/admin/sectores", autorizarRoles("admin"), atencionMesa.crearSector);
router.put("/admin/sectores/:id", autorizarRoles("admin"), atencionMesa.actualizarSector);
router.put("/admin/distribucion", autorizarRoles("admin"), atencionMesa.guardarDistribucion);
router.post("/mesas", autorizarRoles("admin"), atencionMesa.crearMesa);
router.put("/mesas/:id", autorizarRoles("admin"), atencionMesa.actualizarMesa);
router.post("/mesas/:idMesa/atenciones", autorizarRoles("admin", "caja"), atencionMesa.abrirAtencion);
router.get("/", autorizarRoles("admin", "caja", "mesero"), atencionMesa.listarAtenciones);
router.get("/:id", autorizarRoles("admin", "caja", "mesero"), atencionMesa.obtenerAtencion);
router.post("/:id/cerrar", autorizarRoles("admin", "caja"), atencionMesa.cerrarAtencion);

export default router;
