import assert from "node:assert/strict";
import test from "node:test";
import { guardarResultado, obtenerReintento, validarSolicitudId } from "./idempotencia.js";

const clave = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("valida la clave UUID antes de iniciar una operación", () => {
    assert.equal(validarSolicitudId(clave), clave);
    assert.throws(
        () => validarSolicitudId("not-a-uuid"),
        (error) => error.status === 400,
    );
});

test("la operación usa bloqueo transaccional y reproduce el resultado para el mismo payload", async () => {
    const sentencias = [];
    let almacenado = null;
    const client = {
        async query(sql, parametros) {
            sentencias.push({ sql: String(sql), parametros });
            if (String(sql).includes("pg_advisory_xact_lock")) return { rows: [] };
            if (String(sql).includes("SELECT operacion,payload_hash,resultado")) {
                return almacenado ? { rows: [almacenado], rowCount: 1 } : { rows: [], rowCount: 0 };
            }
            if (String(sql).includes("INSERT INTO idempotencia_operacion")) {
                almacenado = {
                    operacion: parametros[2],
                    payload_hash: parametros[3],
                    resultado: JSON.parse(parametros[4]),
                };
                return { rows: [], rowCount: 1 };
            }
            return { rows: [] };
        },
    };
    const solicitud = await obtenerReintento(client, 4, clave, "CREAR_PEDIDO", { detalle: [{ id: 8, cantidad: 1 }] });
    const resultadoOriginal = { id_pedido: 21, total: 14 };
    await guardarResultado(client, 4, solicitud, "CREAR_PEDIDO", resultadoOriginal);
    const reintento = await obtenerReintento(client, 4, clave, "CREAR_PEDIDO", { detalle: [{ id: 8, cantidad: 1 }] });

    assert.deepEqual(reintento.resultado, resultadoOriginal);
    assert.equal(sentencias.filter(({ sql }) => sql.includes("pg_advisory_xact_lock")).length, 2);
    assert.equal(sentencias.filter(({ sql }) => sql.includes("INSERT INTO idempotencia_operacion")).length, 1);
});

test("rechaza reutilizar una clave con una operación o payload diferentes", async () => {
    const client = {
        async query(sql) {
            if (String(sql).includes("pg_advisory_xact_lock")) return { rows: [] };
            if (String(sql).includes("SELECT operacion,payload_hash,resultado")) {
                return {
                    rows: [{ operacion: "CREAR_PEDIDO", payload_hash: "0".repeat(64), resultado: {} }],
                    rowCount: 1,
                };
            }
            return { rows: [] };
        },
    };

    await assert.rejects(
        obtenerReintento(client, 4, clave, "REGISTRAR_PAGO", { id_pedido: 21 }),
        (error) => error.status === 409,
    );
});
