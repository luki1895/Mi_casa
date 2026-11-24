import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import reporteModel from "./reporte.model.js";

test("agrega la producción por producto antes de calcular compromisos del reporte", async (context) => {
    const consultas = [];
    context.mock.method(pool, "query", async (sql) => {
        consultas.push(String(sql));
        return { rows: [{}] };
    });

    await reporteModel.operativo("2026-11-24", "2026-11-24");

    const consultaProduccion = consultas.find((sql) => sql.includes("WITH unidades AS"));
    assert.ok(consultaProduccion);
    assert.match(consultaProduccion, /SUM\(unidades\.preparados\) AS preparados/);
    assert.match(consultaProduccion, /GROUP BY pd\.fecha,unidades\.id_producto/);
    assert.match(consultaProduccion, /GROUP BY unidades\.fecha,producto\.id_producto/);
    const consultaReservas = consultas.find((sql) => sql.includes("FROM reserva_plato r"));
    assert.ok(consultaReservas);
    assert.match(consultaReservas, /SUM\(dr\.cantidad\)/);
    assert.doesNotMatch(consultaReservas, /FROM reserva r/);
});
