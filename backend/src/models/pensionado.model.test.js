import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import pensionadoModel from "./pensionado.model.js";
import produccionModel from "./produccion.model.js";

const resultado = (rows = []) => ({ rows, rowCount: rows.length });

const crearCliente = (sentencias, saldo = 4) => ({
    async query(sql, parametros) {
        sentencias.push({ sql: String(sql), parametros });
        if (String(sql).startsWith("SELECT id_sopa,id_segundo1,id_segundo2")) {
            return resultado([{ id_sopa: 11, id_segundo1: 22, id_segundo2: 23 }]);
        }
        if (String(sql).startsWith("SELECT id_cliente,tipo_cliente")) {
            return resultado([{ id_cliente: 7, tipo_cliente: "PENSIONADO", saldo }]);
        }
        if (String(sql).startsWith("INSERT INTO movimiento_pensionado")) {
            return resultado([{
                id_movimiento: 12,
                tipo_producto: parametros[2],
                tipo_movimiento: parametros[3],
                cantidad: parametros[4],
                saldo_resultante: parametros[5],
            }]);
        }
        return resultado();
    },
    release() {},
});

test("registra consumo de pollo en su saldo nuevo y deja intacto el saldo histórico", async (context) => {
    const sentencias = [];
    context.mock.method(pool, "connect", async () => crearCliente(sentencias, 4));
    context.mock.method(produccionModel, "listarMenu", async () => [
        { id_producto: 22, tipo_venta: "PRODUCTO", stock: 3 },
    ]);

    const resultadoMovimiento = await pensionadoModel.registrarMovimiento(
        7,
        3,
        { tipo_producto: "SEGUNDO_POLLO", cantidad: 1 },
        "CONSUMO",
    );

    assert.equal(resultadoMovimiento.saldo, 3);
    assert.ok(sentencias.some(({ sql }) => sql.includes("saldo_segundos_pollo")));
    assert.ok(sentencias.some(({ sql, parametros }) => (
        sql.includes("INSERT INTO movimiento_pensionado")
        && parametros[2] === "SEGUNDO_POLLO"
    )));
    assert.ok(sentencias.some(({ sql }) => sql.includes("pg_advisory_xact_lock")));
    assert.ok(sentencias.some(({ sql }) => sql === "COMMIT"));
});

test("registra consumos de sopa y carne contra sus propios saldos y productos", async (context) => {
    const operaciones = [];
    context.mock.method(pool, "connect", async () => {
        const sentencias = [];
        operaciones.push(sentencias);
        return crearCliente(sentencias, 3);
    });
    context.mock.method(produccionModel, "listarMenu", async () => [
        { id_producto: 11, tipo_venta: "PRODUCTO", stock: 3 },
        { id_producto: 22, tipo_venta: "PRODUCTO", stock: 3 },
        { id_producto: 23, tipo_venta: "PRODUCTO", stock: 3 },
    ]);

    for (const [tipoProducto, columnaSaldo] of [
        ["SOPA", "saldo_sopas"],
        ["SEGUNDO_CARNE", "saldo_segundos_carne"],
    ]) {
        const movimiento = await pensionadoModel.registrarMovimiento(
            7,
            3,
            { tipo_producto: tipoProducto, cantidad: 1 },
            "CONSUMO",
        );
        const sentencias = operaciones[operaciones.length - 1];
        assert.equal(movimiento.saldo, 2);
        assert.ok(sentencias.some(({ sql }) => sql.includes(`UPDATE cliente SET ${columnaSaldo}=$1`)));
        assert.ok(sentencias.some(({ sql, parametros }) => (
            sql.includes("INSERT INTO movimiento_pensionado")
            && parametros[2] === tipoProducto
        )));
    }
});

test("revierte el consumo cuando la producción del producto elegido es insuficiente", async (context) => {
    const sentencias = [];
    context.mock.method(pool, "connect", async () => crearCliente(sentencias, 4));
    context.mock.method(produccionModel, "listarMenu", async () => [
        { id_producto: 23, tipo_venta: "PRODUCTO", stock: 0 },
    ]);

    await assert.rejects(
        pensionadoModel.registrarMovimiento(
            7,
            3,
            { tipo_producto: "SEGUNDO_CARNE", cantidad: 1 },
            "CONSUMO",
        ),
        (error) => error.status === 409,
    );
    assert.ok(sentencias.some(({ sql }) => sql === "ROLLBACK"));
    assert.equal(sentencias.some(({ sql }) => sql.startsWith("UPDATE cliente")), false);
    assert.equal(sentencias.some(({ sql }) => sql.startsWith("INSERT INTO movimiento_pensionado")), false);
});

test("rechaza el consumo si el saldo asignado al pensionado es insuficiente", async (context) => {
    const sentencias = [];
    context.mock.method(pool, "connect", async () => crearCliente(sentencias, 0));
    context.mock.method(produccionModel, "listarMenu", async () => [
        { id_producto: 11, tipo_venta: "PRODUCTO", stock: 3 },
    ]);

    await assert.rejects(
        pensionadoModel.registrarMovimiento(
            7,
            3,
            { tipo_producto: "SOPA", cantidad: 1 },
            "CONSUMO",
        ),
        (error) => error.status === 409 && /Saldo insuficiente/.test(error.message),
    );
    assert.ok(sentencias.some(({ sql }) => sql === "ROLLBACK"));
    assert.equal(sentencias.some(({ sql }) => sql.startsWith("UPDATE cliente")), false);
    assert.equal(sentencias.some(({ sql }) => sql.startsWith("INSERT INTO movimiento_pensionado")), false);
});

test("el saldo SEGUNDO histórico queda consumible sin transformarse en pollo o carne", async (context) => {
    const sentencias = [];
    context.mock.method(pool, "connect", async () => crearCliente(sentencias, 2));
    const movimiento = await pensionadoModel.registrarMovimiento(
        7,
        3,
        { tipo_producto: "SEGUNDO", cantidad: 1 },
        "CONSUMO",
    );

    assert.equal(movimiento.saldo, 1);
    assert.ok(sentencias.some(({ sql }) => sql.includes("SET saldo_segundos=$1")));
    assert.equal(sentencias.some(({ sql }) => sql.includes("pg_advisory_xact_lock")), false);
    assert.equal(sentencias.some(({ sql }) => sql.startsWith("INSERT INTO movimiento_pensionado")
        && sql.includes("SEGUNDO_POLLO")), false);
});

test("consulta el historial completo de movimientos sin transformarlo", async (context) => {
    const historial = [
        { id_movimiento: 1, tipo_producto: "SEGUNDO", cantidad: 2 },
        { id_movimiento: 2, tipo_producto: "SOPA", cantidad: 1 },
        { id_movimiento: 3, tipo_producto: "SEGUNDO_POLLO", cantidad: 1 },
        { id_movimiento: 4, tipo_producto: "SEGUNDO_CARNE", cantidad: 1 },
    ];
    const consultas = [];
    context.mock.method(pool, "query", async (sql) => {
        consultas.push(String(sql));
        if (String(sql).includes("FROM cliente")) {
            return resultado([{
                id_cliente: 7,
                nombre: "Cliente",
                tipo_cliente: "PENSIONADO",
                saldo_sopas: 1,
                saldo_segundos: 2,
                saldo_segundos_pollo: 3,
                saldo_segundos_carne: 4,
            }]);
        }
        return resultado(historial);
    });

    const detalle = await pensionadoModel.obtenerDetalle(7);

    assert.deepEqual(detalle.movimientos, historial);
    assert.ok(consultas.some((sql) => sql.includes("FROM movimiento_pensionado")));
});
