import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import operacionesModel from "./operaciones.model.js";

test("no reabre una caja cerrada ni elimina su historial", async (context) => {
    const queries = [];
    const client = {
        async query(sql) {
            queries.push(sql);
            if (sql.startsWith("SELECT id_cierre FROM cierre_caja")) {
                return { rows: [{ id_cierre: 4 }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        operacionesModel.abrirCaja({ monto_inicial: 10 }, 1),
        (error) => error.status === 409,
    );

    assert.equal(queries.some((sql) => sql.startsWith("DELETE FROM cierre_caja")), false);
    assert.equal(queries.some((sql) => sql.startsWith("INSERT INTO apertura_caja")), false);
    assert.ok(queries.includes("ROLLBACK"));
});

test("un pago parcial respeta el saldo y calcula el vuelto en la misma transacción", async (context) => {
    const queries = [];
    let pagoParams;
    const client = {
        async query(sql, params) {
            queries.push(sql);
            if (sql.includes("FROM apertura_caja")) return { rows: [{ id_apertura: 1 }], rowCount: 1 };
            if (sql.startsWith("SELECT id_pedido,total,pagado,estado")) {
                return { rows: [{ id_pedido: 8, total: "10.00", pagado: false, estado: "PENDIENTE" }], rowCount: 1 };
            }
            if (sql.startsWith("SELECT COALESCE(SUM(monto),0)")) {
                return { rows: [{ total: "3.00" }], rowCount: 1 };
            }
            if (sql.startsWith("INSERT INTO pago")) {
                pagoParams = params;
                return { rows: [{ id_pago: 12, monto: "2.25" }], rowCount: 1 };
            }
            if (sql.includes("FROM caja")) return { rows: [{ total: "5.00" }], rowCount: 1 };
            return { rows: [], rowCount: 1 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    const pago = await operacionesModel.registrarPago(
        8,
        { monto: 2.25, recibido: 3, metodo: "EFECTIVO" },
        2,
    );

    assert.deepEqual(pagoParams, [8, 2, 2.25, "EFECTIVO", 3, 0.75]);
    assert.equal(pago.saldo_pendiente, 4.75);
    assert.equal(pago.pedido_pagado, false);
    assert.equal(queries.some((sql) => sql.startsWith("UPDATE pedido")), false);
    assert.ok(queries.includes("COMMIT"));
});

test("un pago que cubre el saldo marca el pedido como pagado", async (context) => {
    const queries = [];
    const client = {
        async query(sql) {
            queries.push(sql);
            if (sql.includes("FROM apertura_caja")) return { rows: [{ id_apertura: 1 }], rowCount: 1 };
            if (sql.startsWith("SELECT id_pedido,total,pagado,estado")) {
                return { rows: [{ id_pedido: 8, total: "10.00", pagado: false, estado: "PENDIENTE" }], rowCount: 1 };
            }
            if (sql.startsWith("SELECT COALESCE(SUM(monto),0)")) return { rows: [{ total: "0.00" }], rowCount: 1 };
            if (sql.startsWith("INSERT INTO pago")) return { rows: [{ id_pago: 13, monto: "10.00" }], rowCount: 1 };
            return { rows: [], rowCount: 1 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    const pago = await operacionesModel.registrarPago(
        8,
        { monto: 10, recibido: 10, metodo: "TARJETA" },
        2,
    );

    assert.equal(pago.pedido_pagado, true);
    assert.ok(queries.some((sql) => sql.startsWith("UPDATE pedido SET pagado=TRUE")));
    assert.ok(queries.includes("COMMIT"));
});

test("rechaza pagos con fracciones menores a un centavo antes de insertar", async (context) => {
    const queries = [];
    const client = {
        async query(sql) {
            queries.push(sql);
            if (sql.includes("FROM apertura_caja")) return { rows: [{ id_apertura: 1 }], rowCount: 1 };
            if (sql.startsWith("SELECT id_pedido,total,pagado,estado")) {
                return { rows: [{ id_pedido: 8, total: "10.00", pagado: false, estado: "PENDIENTE" }], rowCount: 1 };
            }
            if (sql.startsWith("SELECT COALESCE(SUM(monto),0)")) return { rows: [{ total: "0.00" }], rowCount: 1 };
            return { rows: [], rowCount: 0 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        operacionesModel.registrarPago(8, { monto: 1.001, recibido: 1.01, metodo: "EFECTIVO" }, 2),
        (error) => error.status === 400,
    );

    assert.equal(queries.some((sql) => sql.startsWith("INSERT INTO pago")), false);
    assert.ok(queries.includes("ROLLBACK"));
});
