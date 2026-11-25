import assert from "node:assert/strict";
import test from "node:test";
import router from "./atencionMesa.routes.js";

const autorizar = (metodo, ruta, role) => {
    const layer = router.stack.find((item) => item.route
        && item.route.path === ruta
        && item.route.methods[metodo]);
    assert.ok(layer, `No se encontró la ruta ${metodo.toUpperCase()} ${ruta}`);
    const authorization = layer.route.stack[0]?.handle;
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

test("solo Administración puede consultar y modificar la configuración de mesas y sectores", () => {
    for (const [method, path] of [
        ["get", "/admin/mesas"],
        ["get", "/admin/sectores"],
        ["post", "/admin/sectores"],
        ["put", "/admin/sectores/:id"],
        ["put", "/admin/distribucion"],
        ["post", "/mesas"],
        ["put", "/mesas/:id"],
    ]) {
        assert.deepEqual(autorizar(method, path, "admin"), { status: undefined, continuado: true });
        for (const role of ["caja", "mesero"]) {
            assert.deepEqual(autorizar(method, path, role), { status: 403, continuado: false });
        }
    }
});

test("Caja puede abrir atenciones y Mesero no puede hacerlo", () => {
    assert.deepEqual(
        autorizar("post", "/mesas/:idMesa/atenciones", "caja"),
        { status: undefined, continuado: true },
    );
    assert.deepEqual(
        autorizar("post", "/mesas/:idMesa/atenciones", "mesero"),
        { status: 403, continuado: false },
    );
});

test("Caja y Mesero pueden consultar el mismo plano y los sectores activos", () => {
    for (const [method, path] of [["get", "/mesas"], ["get", "/sectores"]]) {
        for (const role of ["admin", "caja", "mesero"]) {
            assert.deepEqual(autorizar(method, path, role), { status: undefined, continuado: true });
        }
    }
});

test("solo Administración y Caja pueden finalizar una atención", () => {
    assert.deepEqual(
        autorizar("post", "/:id/cerrar", "caja"),
        { status: undefined, continuado: true },
    );
    assert.deepEqual(
        autorizar("post", "/:id/cerrar", "admin"),
        { status: undefined, continuado: true },
    );
    assert.deepEqual(
        autorizar("post", "/:id/cerrar", "mesero"),
        { status: 403, continuado: false },
    );
});
