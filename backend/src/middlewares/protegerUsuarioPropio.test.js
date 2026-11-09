import assert from "node:assert/strict";
import test from "node:test";
import {
    impedirAutoeliminacion,
    impedirCambioPrivilegiosPropios,
} from "./protegerUsuarioPropio.js";

const responder = () => {
    let status;
    let cuerpo;
    return {
        resultado: () => ({ status, cuerpo }),
        res: {
            status(valor) {
                status = valor;
                return this;
            },
            json(valor) {
                cuerpo = valor;
            },
        },
    };
};

test("bloquea que un administrador cambie su propio rol", () => {
    const respuesta = responder();
    const req = { params: { id: "4" }, usuario: { id: 4, rol: "admin" }, body: { rol: "caja" } };
    let continuo = false;

    impedirCambioPrivilegiosPropios(req, respuesta.res, () => { continuo = true; });

    assert.equal(respuesta.resultado().status, 403);
    assert.equal(continuo, false);
});

test("permite cambios de datos propios sin cambio de rol", () => {
    const req = { params: { id: "4" }, usuario: { id: 4, rol: "admin" }, body: { usuario: "admin2" } };
    let continuo = false;

    impedirCambioPrivilegiosPropios(req, responder().res, () => { continuo = true; });

    assert.equal(continuo, true);
});

test("permite cambiar a otros usuarios", () => {
    const req = { params: { id: "5" }, usuario: { id: 4, rol: "admin" }, body: { rol: "mesero" } };
    let continuo = false;

    impedirCambioPrivilegiosPropios(req, responder().res, () => { continuo = true; });

    assert.equal(continuo, true);
});

test("bloquea eliminar la propia cuenta", () => {
    const respuesta = responder();
    const req = { params: { id: "4" }, usuario: { id: 4 } };
    let continuo = false;

    impedirAutoeliminacion(req, respuesta.res, () => { continuo = true; });

    assert.equal(respuesta.resultado().status, 403);
    assert.equal(continuo, false);
});
