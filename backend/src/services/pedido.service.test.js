import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import pedidoService from "./pedido.service.js";
import pedidoModel from "../models/pedido.model.js";
import detalleModel from "../models/detalle_pedido.model.js";
import produccionModel from "../models/produccion.model.js";

test("rechaza pedidos incompletos antes de abrir una conexión", async (context) => {
    let conexionesAbiertas = 0;
    context.mock.method(pool, "connect", async () => {
        conexionesAbiertas += 1;
        throw new Error("No debe conectarse a la base");
    });

    await assert.rejects(
        pedidoService.crear({ id_cliente: 1, detalle: [] }, 1, "mesero", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
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
        }, 1, "Cajero", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
        (error) => error.status === 409,
    );

    assert.ok(queries.some((sql) => sql.includes("FROM apertura_caja")));
    assert.ok(queries.includes("ROLLBACK"));
});

test("una venta bloquea el inventario del día antes de consultar disponibilidad e insertar el pedido", async (context) => {
    const sentencias = [];
    const client = {
        async query(sql, parametros) {
            const texto = String(sql);
            sentencias.push({ sql: texto, parametros });
            if (texto.includes("SELECT operacion,payload_hash,resultado")) return { rows: [], rowCount: 0 };
            if (texto.includes("SELECT id_cliente, tipo_cliente")) {
                return { rows: [{ id_cliente: 1, tipo_cliente: "EVENTUAL" }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);
    context.mock.method(pedidoModel, "crear", async () => 55);
    context.mock.method(detalleModel, "crear", async () => {});
    context.mock.method(produccionModel, "listarMenu", async () => [
        { id_producto: 9, nombre: "Sopa", precio: 8, stock: 1, tipo_venta: "PRODUCTO" },
    ]);

    const resultado = await pedidoService.crear({
        id_cliente: 1,
        detalle: [{ id_producto: 9, cantidad: 1 }],
    }, 3, "mesero", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");

    const bloqueoInventario = sentencias.findIndex(({ sql, parametros }) => (
        sql.includes("pg_advisory_xact_lock") && String(parametros?.[0]).startsWith("menu:")
    ));
    const consultaCliente = sentencias.findIndex(({ sql }) => sql.includes("SELECT id_cliente, tipo_cliente"));
    assert.equal(resultado.id_pedido, 55);
    assert.ok(bloqueoInventario >= 0);
    assert.ok(bloqueoInventario < consultaCliente);
});

test("reintentar el mismo pedido devuelve el resultado original sin repetir inserciones", async (context) => {
    let almacenado = null;
    let creaciones = 0;
    let detalles = 0;
    let lecturasMenu = 0;
    const client = {
        async query(sql, parametros) {
            const texto = String(sql);
            if (texto.includes("SELECT operacion,payload_hash,resultado")) {
                return almacenado ? { rows: [almacenado], rowCount: 1 } : { rows: [], rowCount: 0 };
            }
            if (texto.includes("SELECT id_cliente, tipo_cliente")) {
                return { rows: [{ id_cliente: 1, tipo_cliente: "EVENTUAL" }], rowCount: 1 };
            }
            if (texto.includes("INSERT INTO idempotencia_operacion")) {
                almacenado = {
                    operacion: parametros[2],
                    payload_hash: parametros[3],
                    resultado: JSON.parse(parametros[4]),
                };
            }
            return { rows: [], rowCount: 0 };
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);
    context.mock.method(pedidoModel, "crear", async () => {
        creaciones += 1;
        return 81;
    });
    context.mock.method(detalleModel, "crear", async () => { detalles += 1; });
    context.mock.method(produccionModel, "listarMenu", async () => {
        lecturasMenu += 1;
        return [{ id_producto: 9, nombre: "Sopa", precio: 8, stock: 1, tipo_venta: "PRODUCTO" }];
    });
    const payload = { id_cliente: 1, detalle: [{ id_producto: 9, cantidad: 1 }] };
    const key = "abababab-abab-4bab-8bab-abababababab";

    const primero = await pedidoService.crear(payload, 3, "mesero", key);
    const reintento = await pedidoService.crear(payload, 3, "mesero", key);

    assert.deepEqual(reintento, primero);
    assert.equal(creaciones, 1);
    assert.equal(detalles, 1);
    assert.equal(lecturasMenu, 1);
});
