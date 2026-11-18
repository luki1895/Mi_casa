import assert from "node:assert/strict";
import test from "node:test";
import autorizarRoles, { normalizarRol } from "./autorizarRoles.js";

test("normaliza las variantes explícitas de roles conocidos", () => {
    assert.equal(normalizarRol("Administrador"), "admin");
    assert.equal(normalizarRol("ADMIN"), "admin");
    assert.equal(normalizarRol("Cajero"), "caja");
    assert.equal(normalizarRol("Mesera"), "mesero");
});

test("no concede permisos de administrador por coincidencia parcial", () => {
    assert.equal(normalizarRol("notadmin"), "notadmin");
});

test("autoriza un rol equivalente después de normalizarlo", () => {
    let continuado = false;
    const req = { usuario: { rol: "Administrador" } };
    const res = { status() { throw new Error("No se esperaba denegación"); } };

    autorizarRoles("admin")(req, res, () => { continuado = true; });

    assert.equal(continuado, true);
});

test("autoriza Caja para operaciones compartidas de Caja y Administración", () => {
    let continuado = false;
    const req = { usuario: { rol: "Cajero" } };
    const res = { status() { throw new Error("No se esperaba denegación"); } };

    autorizarRoles("admin", "caja")(req, res, () => { continuado = true; });

    assert.equal(continuado, true);
});

test("deniega reservas internas a un rol distinto de Caja o Administración", () => {
    let status;
    const req = { usuario: { rol: "Mesera" } };
    const res = {
        status(valor) {
            status = valor;
            return this;
        },
        json() {},
    };

    autorizarRoles("admin", "caja")(req, res, () => {
        throw new Error("No se esperaba autorizar a la mesera");
    });

    assert.equal(status, 403);
});

test("responde 403 si el usuario autenticado no tiene el rol permitido", () => {
    let status;
    let cuerpo;
    const req = { usuario: { role: "mesero" } };
    const res = {
        status(valor) {
            status = valor;
            return this;
        },
        json(valor) {
            cuerpo = valor;
        },
    };

    autorizarRoles("admin")(req, res, () => {
        throw new Error("No se esperaba autorizar al mesero");
    });

    assert.equal(status, 403);
    assert.equal(cuerpo.ok, false);
});
