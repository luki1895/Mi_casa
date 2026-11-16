import { body } from "express-validator";

export const crearCliente = [
  body("nombre_completo")
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage("El nombre completo es obligatorio"),

  body("nombre")
    .optional({ nullable: true })
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

  body("tipo_cliente")
    .trim()
    .custom((value) => {
      if (!value) {
        throw new Error("El tipo de cliente es obligatorio");
      }
      if (String(value).toUpperCase() !== "PENSIONADO") {
        throw new Error("En el registro manual solo se permite cliente pensionado; los eventuales se crean desde el pedido");
      }
      return true;
    }),
];