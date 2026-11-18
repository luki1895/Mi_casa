import assert from "node:assert/strict";
import test from "node:test";
import productoModel from "./models/producto.model.js";
import pensionadoModel from "./models/pensionado.model.js";
import reservaModel from "./models/reserva.model.js";
import reporteModel from "./models/reporte.model.js";
import produccionModel from "./models/produccion.model.js";
import reservaPlatoModel from "./models/reservaPlato.model.js";
import eventoPrivadoModel from "./models/eventoPrivado.model.js";

const debeRechazarComo = async (operacion, codigo) => {
    await assert.rejects(operacion, (error) => error.status === codigo);
};

test("product creation rejects unknown catalog categories before database access", async () => {
    await debeRechazarComo(
        productoModel.crear({ nombre: "Producto prueba", categoria: "INVENTADA" }),
        400,
    );
});

test("pension movements reject invalid product types and non-positive quantities", async () => {
    await debeRechazarComo(
        pensionadoModel.registrarMovimiento(1, 1, { tipo_producto: "OTRO", cantidad: 1 }, "CONSUMO"),
        400,
    );
    await debeRechazarComo(
        pensionadoModel.registrarMovimiento(1, 1, { tipo_producto: "SOPA", cantidad: 0 }, "CONSUMO"),
        400,
    );
});

test("reservation and report date filters reject impossible calendar dates", async () => {
    await debeRechazarComo(reservaModel.listar({ desde: "2025-02-31", hasta: "2025-03-01" }), 400);
    await debeRechazarComo(reporteModel.operativo("2025-02-01", "2025-02-31"), 400);
});

test("daily production rejects impossible dates before opening a database transaction", async () => {
    await debeRechazarComo(produccionModel.crear({ fecha: "2025-02-31" }, 1), 400);
});

test("public dish reservations reject incomplete contact and item data before database access", async () => {
    await debeRechazarComo(reservaPlatoModel.crear({ nombre: "", celular: "555" }), 400);
    await debeRechazarComo(reservaPlatoModel.crear({
        nombre: "Cliente",
        celular: "555",
        items: [{ id_producto: 1, cantidad: 0 }],
    }), 400);
});

test("dish reservation internal operations reject invalid reservation ids before database access", async () => {
    await debeRechazarComo(reservaPlatoModel.recibir("no-valido", 1), 400);
    await debeRechazarComo(reservaPlatoModel.marcarNoPresentada("no-valido", 1), 400);
    await debeRechazarComo(reservaPlatoModel.registrarImpresion("no-valido", 1, {}), 400);
});

test("private-event requests reject invalid schedules before database access", async () => {
    await debeRechazarComo(eventoPrivadoModel.crear({
        nombre_responsable: "Cliente",
        celular: "555",
        tipo_evento: "Reunión",
        fecha: "2026-12-01",
        hora_inicio: "18:00",
        hora_fin: "17:00",
        invitados: 4,
        decoracion: "NO",
        detalle: [{ preparacion: "Comida", cantidad_personas: 4 }],
    }), 400);
});
