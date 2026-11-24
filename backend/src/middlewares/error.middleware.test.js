import assert from "node:assert/strict";
import test from "node:test";
import errorMiddleware from "./error.middleware.js";

const responder = () => {
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

test("una caída de conexión de PostgreSQL se informa como HTTP 503", () => {
    const response = responder();
    errorMiddleware({ code: "ECONNREFUSED" }, {}, response, () => {});

    assert.equal(response.resultado.status, 503);
    assert.match(response.resultado.cuerpo.mensaje, /base de datos no está disponible/);
});

test("el agotamiento del pool explica que no hay conexiones disponibles", () => {
    const response = responder();
    errorMiddleware({ code: "EMAXCONNSESSION" }, {}, response, () => {});

    assert.equal(response.resultado.status, 503);
    assert.match(response.resultado.cuerpo.mensaje, /límite de conexiones disponibles/);
});

test("el límite de conexiones de PostgreSQL se informa como HTTP 503", () => {
    const response = responder();
    errorMiddleware({ code: "53300" }, {}, response, () => {});

    assert.equal(response.resultado.status, 503);
    assert.match(response.resultado.cuerpo.mensaje, /límite de conexiones disponibles/);
});

test("los errores internos no exponen el mensaje de PostgreSQL", (context) => {
    const response = responder();
    context.mock.method(console, "error", () => {});
    errorMiddleware({ code: "XX000", message: "detalle SQL sensible" }, {}, response, () => {});

    assert.equal(response.resultado.status, 500);
    assert.doesNotMatch(response.resultado.cuerpo.mensaje, /detalle SQL/);
});
