import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import pedidoService from "./pedido.service.js";

test("rechaza pedidos incompletos antes de abrir una conexión", async (context) => {
    let conexionesAbiertas = 0;
    context.mock.method(pool, "connect", async () => {
        conexionesAbiertas += 1;
        throw new Error("No debe conectarse a la base");
    });

    await assert.rejects(
        pedidoService.crear({ id_cliente: 1, detalle: [] }, 1, "mesero"),
        (error) => error.status === 400,
    );
    assert.equal(conexionesAbiertas, 0);
});

test("el alias Cajero exige una caja abierta antes de crear pedidos", async (context) => {
    const queries = [];
    const client = {
        async query(sql) {
            queries.push(sql);
            return { rows: [], rowCount: 0 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        pedidoService.crear({
            id_cliente: 1,
            detalle: [{ id_producto: 1, cantidad: 1 }],
        }, 1, "Cajero"),
        (error) => error.status === 409,
    );

    assert.ok(queries.some((sql) => sql.includes("FROM apertura_caja")));
    assert.ok(queries.includes("ROLLBACK"));
});
