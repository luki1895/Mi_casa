import assert from "node:assert/strict";
import test from "node:test";
import validarCredenciales from "./validarCredenciales.js";

test("rechaza credenciales ausentes o que no son texto", () => {
    for (const datos of [
        undefined,
        null,
        {},
        { usuario: "admin" },
        { password: "secreto" },
        { usuario: "  ", password: "secreto" },
        { usuario: "admin", password: "   " },
        { usuario: 123, password: "secreto" },
        { usuario: "admin", password: 123 },
    ]) {
        assert.throws(
            () => validarCredenciales(datos),
            (error) => error.status === 400,
        );
    }
});

test("recorta el usuario y conserva exactamente la contraseña", () => {
    assert.deepEqual(
        validarCredenciales({ usuario: " admin ", password: " clave " }),
        { usuario: "admin", password: " clave " },
    );
});
