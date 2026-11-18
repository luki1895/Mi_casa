import assert from "node:assert/strict";
import test from "node:test";
import { mesaEstadoVisual } from "./mesaVisual.js";

test("solo una mesa habilitada y consultada como disponible usa el estado verde", () => {
    assert.equal(
        mesaEstadoVisual({ habilitada: true, estado_atencion: "DISPONIBLE" }).color,
        "bg-emerald-600",
    );
    assert.equal(
        mesaEstadoVisual({ habilitada: true, estado_atencion: null }).color,
        "bg-slate-400",
    );
});

test("el saldo confirmado de toda la atención determina azul o rojo", () => {
    const mesa = { habilitada: true, estado_atencion: "OCUPADA", id_atencion: 12 };

    assert.equal(
        mesaEstadoVisual(mesa, { atencion: { saldo_pendiente: 35.5 } }).color,
        "bg-blue-600",
    );
    assert.equal(
        mesaEstadoVisual(mesa, { atencion: { saldo_pendiente: 0 } }).color,
        "bg-red-600",
    );
});

test("datos de saldo incompletos o fallidos nunca indican mesa disponible", () => {
    const mesa = { habilitada: true, estado_atencion: "OCUPADA", id_atencion: 12, saldo_pendiente: 0 };

    assert.equal(mesaEstadoVisual(mesa, { atencion: { saldo_pendiente: null } }).color, "bg-slate-400");
    assert.equal(mesaEstadoVisual(mesa, { atencionQueryError: true }).color, "bg-slate-400");
    assert.equal(mesaEstadoVisual(mesa, { mesaQueryError: true }).color, "bg-slate-400");
});

test("las mesas deshabilitadas se distinguen en gris", () => {
    assert.equal(mesaEstadoVisual({ habilitada: false, estado_atencion: null }).color, "bg-gray-500");
});
