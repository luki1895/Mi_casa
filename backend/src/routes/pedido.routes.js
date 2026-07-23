import {Router} from "express";

import * as pedido from "../controllers/pedido.controller.js";

import verificarToken from "../middlewares/auth.middleware.js";

const router=Router();

router.get("/",verificarToken,pedido.listar);

router.post("/",verificarToken,pedido.crear);

export default router;