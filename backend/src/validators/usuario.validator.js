import {body} from "express-validator";

export const crearUsuario=[

body("usuario")

.notEmpty(),

body("password")

.isLength({

min:6

})

];