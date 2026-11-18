import { Router } from "express";
import verificarToken from "../middlewares/auth.middleware.js";
import autorizarRoles from "../middlewares/autorizarRoles.js";
import { publico, interno } from "../controllers/menu.controller.js";

const router = Router();

router.get("/", publico);
router.get("/interno", verificarToken, autorizarRoles("admin", "caja", "mesero"), interno);

export default router;
