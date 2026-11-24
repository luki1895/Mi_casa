import assert from "node:assert/strict";
import test from "node:test";
import responderErrorControlador from "./responderErrorControlador.js";

const crearRespuesta = () => {
    const resultado = {};
    return {
        resultado,
        status(codigo) {
            resultado.status = codigo;
            return this;
        },
        json(cuerpo) {
            resultado.cuerpo = cuerpo;
            return this;
        },
    };
};

test("conserva los errores de validación explícitos", () => {
    const res = crearRespuesta();
    responderErrorControlador(res, Object.assign(new Error("Saldo insuficiente"), { status: 409 }), "Caja");

    assert.equal(res.resultado.status, 409);
    assert.equal(res.resultado.cuerpo.mensaje, "Saldo insuficiente");
});

test("clasifica el límite remoto de conexiones como HTTP 503", () => {
    const res = crearRespuesta();
    responderErrorControlador(res, { code: "53300" }, "Caja");

    assert.equal(res.resultado.status, 503);
    assert.match(res.resultado.cuerpo.mensaje, /límite de conexiones disponibles/);
});

test("no expone errores SQL desconocidos al cliente", (context) => {
    const res = crearRespuesta();
    context.mock.method(console, "error", () => {});
    responderErrorControlador(res, { code: "XX000", message: "detalle SQL" }, "Pedidos");

    assert.equal(res.resultado.status, 500);
    assert.doesNotMatch(res.resultado.cuerpo.mensaje, /detalle SQL/);
});
