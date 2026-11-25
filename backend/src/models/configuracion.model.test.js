import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import configuracionModel from "./configuracion.model.js";

const resultado = (rows = []) => ({ rows, rowCount: rows.length });

test("no adopta los precios sembrados como precios vigentes sin confirmación", async (context) => {
    const consultas = [];
    context.mock.method(pool, "query", async (sql) => {
        consultas.push(String(sql));
        if (String(sql).includes("to_regclass('public.precio_configurado')")) return resultado([{ precios: true }]);
        if (String(sql).includes("FROM configuracion")) {
            return resultado([{ id_configuracion: 1, precio_almuerzo: 99, precio_sopa: 88 }]);
        }
        return resultado([]);
    });

    const config = await configuracionModel.obtener();

    assert.equal(config.precio_almuerzo, null);
    assert.equal(config.precio_sopa, null);
    assert.deepEqual(config.historial_precios, []);
    assert.equal(consultas.some((sql) => sql.startsWith("INSERT")), false);
});

test("cambiar un precio cierra el periodo anterior y conserva ambos valores en el historial", async (context) => {
    const escrituras = [];
    const fechaActual = new Date("2026-01-01T10:00:00.000Z");
    const client = {
        async query(sql, parametros) {
            const texto = String(sql);
            escrituras.push({ sql: texto, parametros });
            if (texto.includes("to_regclass('public.precio_configurado')")) return resultado([{ precios: true }]);
            if (texto.includes("SELECT id_precio,precio FROM precio_configurado")) {
                return resultado([{ id_precio: 5, precio: "2.50" }]);
            }
            if (texto.includes("RETURNING vigente_hasta")) return resultado([{ vigente_hasta: fechaActual }]);
            if (texto.includes("SELECT clock_timestamp()")) return resultado([{ ahora: fechaActual }]);
            return resultado();
        },
        release() {},
    };
    const historial = [
        { codigo: "VASO_EXTRA_REFRESCO", precio: "2.50", vigente_desde: new Date("2025-01-01T00:00:00.000Z"), vigente_hasta: fechaActual },
        { codigo: "VASO_EXTRA_REFRESCO", precio: "4.25", vigente_desde: fechaActual, vigente_hasta: null },
    ];
    context.mock.method(pool, "connect", async () => client);
    context.mock.method(pool, "query", async (sql) => {
        if (String(sql).includes("to_regclass('public.precio_configurado')")) return resultado([{ precios: true }]);
        if (String(sql).includes("FROM configuracion")) return resultado([{ id_configuracion: 1 }]);
        if (String(sql).includes("FROM precio_configurado")) return resultado(historial);
        return resultado();
    });

    const config = await configuracionModel.actualizar({ precio_vaso_extra_refresco: 4.25 }, 8);

    assert.equal(config.precio_vaso_extra_refresco, 4.25);
    assert.equal(config.historial_precios.length, 2);
    assert.ok(escrituras.some(({ sql }) => sql.includes("UPDATE precio_configurado")));
    assert.ok(escrituras.some(({ sql, parametros }) => (
        sql.includes("INSERT INTO precio_configurado") && parametros[1] === 4.25
    )));
});
