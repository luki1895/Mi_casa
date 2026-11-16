import test from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";

import { crearCliente } from "./cliente.validator.js";
import { crearUsuario } from "./usuario.validator.js";

const ejecutarValidacion = async (middlewares, body) => {
  const req = { body };
  const res = {};
  let nextError = null;

  const next = (error) => {
    if (error) nextError = error;
  };

  for (const middleware of middlewares) {
    await middleware(req, res, next);
  }

  if (nextError) {
    throw nextError;
  }

  return validationResult(req);
};

test("crearCliente exige nombre completo, CI, correo, telefono y tipo pensionado", async () => {
  const valido = await ejecutarValidacion(crearCliente, {
    nombre_completo: "Ana Flores",
    ci: "1234567",
    correo: "ana@ejemplo.com",
    telefono: "70000001",
    tipo_cliente: "PENSIONADO",
  });

  assert.equal(valido.isEmpty(), true);

  const invalido = await ejecutarValidacion(crearCliente, {
    nombre_completo: "Ana Flores",
  });

  assert.equal(invalido.isEmpty(), false);
  assert.deepEqual(
    invalido.array().map((error) => error.path).sort(),
    ["ci", "correo", "telefono", "tipo_cliente"].sort()
  );
});

test("crearUsuario exige nombre completo, CI, correo y telefono", async () => {
  const valido = await ejecutarValidacion(crearUsuario, {
    nombre_completo: "Luis Admin",
    ci: "1234567",
    correo: "luis@ejemplo.com",
    telefono: "70000001",
    usuario: "luis",
    password: "abc12345",
  });

  assert.equal(valido.isEmpty(), true);

  const invalido = await ejecutarValidacion(crearUsuario, {
    usuario: "luis",
    password: "abc12345",
  });

  assert.equal(invalido.isEmpty(), false);
  assert.deepEqual(
    invalido.array().map((error) => error.path).sort(),
    ["ci", "correo", "nombre_completo", "telefono"].sort()
  );
});

test("crearCliente solo acepta pensionados en registro manual", async () => {
  const valido = await ejecutarValidacion(crearCliente, {
    nombre_completo: "Ana Flores",
    ci: "1234567",
    correo: "ana@ejemplo.com",
    telefono: "70000001",
    tipo_cliente: "PENSIONADO",
  });

  assert.equal(valido.isEmpty(), true);

  const invalido = await ejecutarValidacion(crearCliente, {
    nombre_completo: "Ana Flores",
    ci: "1234567",
    correo: "ana@ejemplo.com",
    telefono: "70000001",
    tipo_cliente: "EVENTUAL",
  });

  assert.equal(invalido.isEmpty(), false);
  assert.equal(invalido.array()[0].path, "tipo_cliente");
});
