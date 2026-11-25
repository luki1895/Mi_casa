import assert from "node:assert/strict";
import test from "node:test";
import { agruparDetalleVenta, resolverDetalleVenta } from "./detalleVenta.js";

const menuVenta = () => [
    { id_producto: 11, nombre: "Sopa", precio: 8, stock: 10, tipo_venta: "PRODUCTO" },
    { id_producto: 12, nombre: "Pollo", precio: 12, stock: 5, tipo_venta: "PRODUCTO" },
    { id_producto: 13, nombre: "Carne", precio: 14, stock: 4, tipo_venta: "PRODUCTO" },
    {
        id_producto: 99,
        nombre: "Almuerzo completo",
        precio: 25,
        stock: 4,
        tipo_venta: "ALMUERZO_COMPLETO",
        id_sopa_componente: 11,
        id_segundo_elegido: 12,
        segundo_elegido: "Pollo",
        refresco_acompanamiento: "Mocochinchi",
    },
    {
        id_producto: 99,
        nombre: "Almuerzo completo",
        precio: 25,
        stock: 4,
        tipo_venta: "ALMUERZO_COMPLETO",
        id_sopa_componente: 11,
        id_segundo_elegido: 13,
        segundo_elegido: "Carne",
        refresco_acompanamiento: "Mocochinchi",
    },
    {
        id_producto: 98,
        nombre: "Vaso extra de refresco",
        precio: 3.75,
        stock: null,
        tipo_venta: "VASO_EXTRA_REFRESCO",
    },
];

test("almuerzo completo con pollo descuenta solo sopa y pollo", () => {
    const [venta] = resolverDetalleVenta(
        [{ id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 12, cantidad: 1 }],
        menuVenta(),
    );

    assert.equal(venta.id_sopa_componente, 11);
    assert.equal(venta.id_segundo_componente, 12);
    assert.equal(venta.subtotal, 25);
    assert.equal(venta.segundo_elegido, "Pollo");
});

test("almuerzo completo con carne descuenta solo sopa y carne", () => {
    const [venta] = resolverDetalleVenta(
        [{ id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 13, cantidad: 1 }],
        menuVenta(),
    );

    assert.equal(venta.id_sopa_componente, 11);
    assert.equal(venta.id_segundo_componente, 13);
    assert.equal(venta.segundo_elegido, "Carne");
});

test("sopa y segundo independientes conservan su propio producto y cantidad", () => {
    const ventas = resolverDetalleVenta([
        { id_producto: 11, tipo_venta: "PRODUCTO", cantidad: 2 },
        { id_producto: 13, tipo_venta: "PRODUCTO", cantidad: 1 },
    ], menuVenta());

    assert.deepEqual(ventas.map(({ id_producto, cantidad, id_sopa_componente }) => ({
        id_producto,
        cantidad,
        id_sopa_componente,
    })), [
        { id_producto: 11, cantidad: 2, id_sopa_componente: null },
        { id_producto: 13, cantidad: 1, id_sopa_componente: null },
    ]);
});

test("el refresco incluido es informativo y no suma una línea ni precio", () => {
    const ventas = resolverDetalleVenta([
        { id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 12, cantidad: 1 },
    ], menuVenta());

    assert.equal(ventas.length, 1);
    assert.equal(ventas[0].subtotal, 25);
    assert.equal(ventas[0].refresco_acompanamiento, "Mocochinchi");
});

test("el vaso extra usa su precio configurable y no descuenta producción", () => {
    const [venta] = resolverDetalleVenta([
        { id_producto: 98, tipo_venta: "VASO_EXTRA_REFRESCO", cantidad: 2 },
    ], menuVenta());

    assert.equal(venta.precio, 3.75);
    assert.equal(venta.subtotal, 7.5);
    assert.equal(venta.id_sopa_componente, null);
    assert.equal(venta.id_segundo_componente, null);
});

test("rechaza saldo insuficiente del componente elegido", () => {
    const menu = menuVenta().map((item) => item.id_segundo_elegido === 12
        ? { ...item, stock: 0 }
        : item);

    assert.throws(
        () => resolverDetalleVenta([
            { id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 12, cantidad: 1 },
        ], menu),
        (error) => error.status === 409 && /disponibilidad insuficiente/i.test(error.message),
    );

    const sinSopa = menuVenta().map((item) => (
        item.tipo_venta === "ALMUERZO_COMPLETO" && item.id_segundo_elegido === 12
            ? { ...item, stock: 0 }
            : item
    ));
    assert.throws(
        () => resolverDetalleVenta([
            { id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 12, cantidad: 1 },
        ], sinSopa),
        (error) => error.status === 409 && /disponibilidad insuficiente/i.test(error.message),
    );
});

test("las líneas completas con segundos distintos no se agrupan", () => {
    const lineas = agruparDetalleVenta([
        { id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 12, cantidad: 1 },
        { id_producto: 99, tipo_venta: "ALMUERZO_COMPLETO", id_segundo_elegido: 13, cantidad: 1 },
    ]);

    assert.equal(lineas.length, 2);
});
