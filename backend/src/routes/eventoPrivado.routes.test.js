import assert from "node:assert/strict";
import test from "node:test";
import router from "./eventoPrivado.routes.js";

const autorizar = (metodo, ruta, role) => {
    const layer = router.stack.find((item) => item.route
        && item.route.path === ruta
        && item.route.methods[metodo]);
    assert.ok(layer, `No se encontró la ruta ${metodo.toUpperCase()} ${ruta}`);
    const authorization = layer.route.stack[1]?.handle;
    assert.equal(typeof authorization, "function", "La ruta debe tener middleware de autorización");
    let status;
    let continuado = false;
    authorization(
        { usuario: { role } },
        {
            status(value) {
                status = value;
                return this;
            },
            json() {},
        },
        () => { continuado = true; },
    );
    return { status, continuado };
};

test("Caja puede consultar e imprimir eventos, pero no revisar ni autorizar devoluciones", () => {
    assert.deepEqual(autorizar("get", "/:id", "caja"), { status: undefined, continuado: true });
    assert.deepEqual(autorizar("post", "/:id/impresiones", "caja"), { status: undefined, continuado: true });
    for (const [method, path] of [
        ["patch", "/:id/revision"],
        ["post", "/:id/cancelacion"],
        ["post", "/:id/cancelacion/devolucion"],
    ]) {
        assert.deepEqual(autorizar(method, path, "caja"), { status: 403, continuado: false });
        assert.deepEqual(autorizar(method, path, "admin"), { status: undefined, continuado: true });
    }
});
