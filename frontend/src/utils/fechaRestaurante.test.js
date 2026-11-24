import assert from "node:assert/strict";
import test from "node:test";
import fechaRestaurante from "./fechaRestaurante.js";

test("calcula el día operativo en America/La_Paz al cruzar la medianoche UTC", () => {
  assert.equal(fechaRestaurante(new Date("2026-11-24T03:59:59.000Z")), "2026-11-23");
  assert.equal(fechaRestaurante(new Date("2026-11-24T04:00:00.000Z")), "2026-11-24");
});
