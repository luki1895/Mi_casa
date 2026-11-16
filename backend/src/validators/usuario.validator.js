import { body } from "express-validator";

export const crearUsuario = [
  body("nombre_completo")
    .trim()
    .notEmpty()
    .withMessage("El nombre completo es obligatorio"),

  body("ci")
    .trim()
    .notEmpty()
    .withMessage("El CI es obligatorio"),

  body("correo")
    .trim()
    .isEmail()
    .withMessage("El correo es obligatorio y debe ser válido"),

  body("telefono")
    .trim()
    .notEmpty()
    .withMessage("El teléfono es obligatorio"),

  body("usuario")
    .trim()
    .notEmpty()
    .withMessage("El nombre de usuario es obligatorio"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
];