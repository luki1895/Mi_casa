import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import pedidoModel from "./pedido.model.js";

const crearCliente = () => ({
    async query(sql) {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
            return { rows: [], rowCount: 0 };
        }
        if (sql.includes("SELECT p.id_pedido,p.id_atencion")) {
            return {
                rows: [{
                    id_pedido: 7,
                    id_atencion: 12,
                    mesa: "Terraza 1",
                    pagado: true,
                    estado: "EN_PREPARACION",
                    cliente: "Cliente",
                    fecha: "2026-11-24T12:00:00Z",
                    observaciones: null,
                    total: "20.00",
                }],
                rowCount: 1,
            };
        }
        if (sql.includes("FROM solicitud_adicional")) {
            return {
                rows: [{ id_solicitud: 3, estado: "COBRADO", observaciones: "Sin cebolla", total: "4.50" }],
                rowCount: 1,
            };
        }
        if (sql.includes("FROM detalle_pedido p")) {
            return {
                rows: [{ id_producto: 2, nombre: "Plato", cantidad: 1, precio: "4.50", subtotal: "4.50" }],
                rowCount: 1,
            };
        }
        if (sql.includes("SELECT COUNT(*)::int AS cantidad")) {
            return { rows: [{ cantidad: 0 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
    },
    release() {},
});

test("la comanda del pedido incluye la mesa y el identificador de atención", async (context) => {
    const client = crearCliente();
    context.mock.method(pool, "connect", async () => client);

    const comanda = await pedidoModel.registrarImpresion(7, 2);

    assert.equal(comanda.id_atencion, 12);
    assert.equal(comanda.mesa, "Terraza 1");
    assert.equal(comanda.total, 20);
});

test("la comanda adicional imprime su subtotal, no el total acumulado del pedido", async (context) => {
    const client = crearCliente();
    context.mock.method(pool, "connect", async () => client);

    const comanda = await pedidoModel.registrarImpresion(7, 2, 3);

    assert.equal(comanda.tipo, "ADICIONAL");
    assert.equal(comanda.total, 4.5);
    assert.equal(comanda.detalle[0].subtotal, "4.50");
});
