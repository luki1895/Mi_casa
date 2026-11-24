import assert from "node:assert/strict";
import test from "node:test";
import pedidoModel from "./pedido.model.js";

test("el alias Cocinero conserva la restricción del mesero antes de acceder a la base", async () => {
    await assert.rejects(
        pedidoModel.actualizarEstado(1, "CANCELADO", 1, "Cocinero"),
        (error) => error.status === 403,
    );
});
