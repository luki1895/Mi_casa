import assert from "node:assert/strict";
import test from "node:test";
import verificarToken from "./auth.middleware.js";

const response = () => {
    let status;
    let body;
    return {
        result: () => ({ status, body }),
        res: {
            status(value) {
                status = value;
                return this;
            },
            json(value) {
                body = value;
            },
        },
    };
};

test("responde 401 cuando falta el encabezado Bearer", async () => {
    const res = response();
    const req = { get: () => undefined };
    let continuado = false;

    await verificarToken(req, res.res, () => { continuado = true; });

    assert.equal(res.result().status, 401);
    assert.equal(continuado, false);
});

test("responde 401 cuando el JWT no es válido", async () => {
    const res = response();
    const req = { get: () => "Bearer token-invalido" };
    let continuado = false;

    await verificarToken(req, res.res, () => { continuado = true; });

    assert.equal(res.result().status, 401);
    assert.equal(continuado, false);
});
