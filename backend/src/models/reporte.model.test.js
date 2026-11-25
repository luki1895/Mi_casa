import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import reporteModel from "./reporte.model.js";

test("el reporte de producción contabiliza componentes del completo y consumos pensionados", async (context) => {
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
    assert.match(consultaProduccion, /consumos_pedido AS/);
    assert.match(consultaProduccion, /SELECT dp\.id_sopa_componente,p\.id_pedido/);
    assert.match(consultaProduccion, /SELECT dp\.id_segundo_componente,p\.id_pedido/);
    assert.match(consultaProduccion, /pensionados AS/);
    assert.match(consultaProduccion, /'SEGUNDO_POLLO'/);
    assert.match(consultaProduccion, /'SEGUNDO_CARNE'/);
    const consultaReservas = consultas.find((sql) => sql.includes("FROM reserva_plato r"));
    assert.ok(consultaReservas);
    assert.match(consultaReservas, /SUM\(dr\.cantidad\)/);
    assert.doesNotMatch(consultaReservas, /FROM reserva r/);
});

test("el reporte comercial conserva las líneas cobradas y muestra los componentes gratuitos sin duplicarlos", async (context) => {
    const consultas = [];
    context.mock.method(pool, "query", async (sql) => {
        consultas.push(String(sql));
        return { rows: [{}] };
    });

    await reporteModel.operativo("2026-11-24", "2026-11-24");

    const consultaPedidos = consultas.find((sql) => sql.includes("SELECT p.id_pedido,p.fecha,p.estado"));
    assert.ok(consultaPedidos);
    assert.match(consultaPedidos, /'precio',dp\.precio/);
    assert.match(consultaPedidos, /'subtotal',dp\.subtotal/);
    assert.match(consultaPedidos, /'sopa_incluida',sopa\.nombre/);
    assert.match(consultaPedidos, /'segundo_elegido',segundo\.nombre/);
    assert.match(consultaPedidos, /'refresco_incluido',dp\.id_sopa_componente IS NOT NULL/);
    assert.match(consultaPedidos, /'refresco_acompanamiento'/);
    assert.match(consultaPedidos, /pr\.codigo_venta='VASO_EXTRA_REFRESCO'/);
    assert.match(consultaPedidos, /'SEGUNDO_POLLO'/);
    assert.match(consultaPedidos, /'SEGUNDO_CARNE'/);
    assert.doesNotMatch(consultaPedidos, /UNION ALL/);

    const resumenIngresos = consultas.find((sql) => sql.includes("AS ingresos_confirmados"));
    assert.match(resumenIngresos, /SUM\(monto\).*FROM pago/s);
    const consultaMovimientos = consultas.find((sql) => sql.includes("mp.tipo_producto,mp.tipo_movimiento"));
    assert.match(consultaMovimientos, /ORDER BY mp\.fecha,mp\.id_movimiento/);
});
