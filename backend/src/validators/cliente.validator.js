import {body} from "express-validator";

export const crearCliente=[

body("nombre")

.notEmpty()

.withMessage("Nombre obligatorio"),

body("tipo_cliente")

.notEmpty()

.withMessage("Tipo obligatorio")

];