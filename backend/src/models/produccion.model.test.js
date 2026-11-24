import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import produccionModel from "./produccion.model.js";

test("rechaza precios especiales con más de dos decimales antes de conectar", async (context) => {
    let conexionesAbiertas = 0;
    context.mock.method(pool, "connect", async () => {
        conexionesAbiertas += 1;
        throw new Error("No debe conectarse a la base");
    });

    await assert.rejects(
        produccionModel.crear({ fecha: "2099-12-01", precio_extra: 1.234 }, 1),
        (error) => error.status === 400,
    );
    assert.equal(conexionesAbiertas, 0);
});

test("mantiene reservado el stock pendiente aunque caduque el enlace privado", async (context) => {
    let consultaMenu;
    context.mock.method(pool, "query", async (sql) => {
        if (String(sql).includes("information_schema.columns")) {
            return { rows: [{ tiene_imagen: true, tiene_reservas_platos: true }] };
        }
        consultaMenu = String(sql);
        return { rows: [] };
    });

    await produccionModel.listarMenu("2099-12-01");

    assert.match(consultaMenu, /menu_agregado AS/);
    assert.match(consultaMenu, /SUM\(producido\)/);
    assert.match(consultaMenu, /GROUP BY id_producto, categoria/);
    assert.match(consultaMenu, /rp\.estado = 'PENDIENTE'/);
    assert.match(consultaMenu, /rp\.id_pedido IS NULL/);
    assert.doesNotMatch(consultaMenu, /codigo_expira_en|codigo_revocado_en/);
});
