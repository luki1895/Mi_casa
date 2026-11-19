import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
    hasPostgresTestBinaries,
    withPostgresTestCluster,
} from "./postgres-test-cluster.js";

const migrationPath = fileURLToPath(
    new URL("../migrations/012_retirar_rol_empleado.sql", import.meta.url),
);
const functionalRoles = ["admin", "caja", "mesero", "cliente"];

test("012 conserva cuentas empleado y la aplicación las mantiene sin permisos funcionales", async (t) => {
    if (!hasPostgresTestBinaries()) {
        t.skip("Instala PostgreSQL local o define PG_BIN para ejecutar estas pruebas reales.");
        return;
    }

    const migrationSql = await readFile(migrationPath, "utf8");
    await withPostgresTestCluster(async (postgresPool, port) => {
        const client = await postgresPool.connect();
        let applicationPool;
        let originalPoolQuery;
        let server;
        const previousDatabaseUrl = process.env.DATABASE_URL;
        const previousJwtSecret = process.env.JWT_SECRET;
        const jwtSecret = "roles-test-only-secret";

        try {
            await client.query(
                `CREATE TABLE public.persona (
                     id_persona bigserial PRIMARY KEY,
                     nombre varchar(150) NOT NULL,
                     ci varchar(40),
                     email varchar(150),
                     telefono varchar(30)
                 );
                 CREATE TABLE public.cliente (
                     id_cliente bigserial PRIMARY KEY
                 );
                 CREATE TABLE public.usuario (
                     id_usuario bigserial PRIMARY KEY,
                     id_persona bigint REFERENCES public.persona(id_persona) ON DELETE SET NULL,
                     id_cliente bigint UNIQUE REFERENCES public.cliente(id_cliente) ON DELETE SET NULL,
                     usuario varchar(80) NOT NULL UNIQUE,
                     password text NOT NULL,
                     rol varchar(40) NOT NULL,
                     estado boolean NOT NULL DEFAULT true,
                     creado_en timestamptz NOT NULL DEFAULT now()
                 )`,
            );
            await client.query(
                `ALTER TABLE public.usuario
                 ADD CONSTRAINT usuario_rol_check
                 CHECK (rol IN ('admin', 'empleado', 'mesero', 'caja', 'cliente')) NOT VALID`,
            );

            const passwords = new Map(
                ["admin", "caja", "mesero", "cliente", "legacy_a", "legacy_b"]
                    .map((username) => [username, `password-${username}`]),
            );
            const users = [
                ["admin", "admin", 1],
                ["caja", "caja", 2],
                ["mesero", "mesero", 3],
                ["cliente", "cliente", 4],
                ["legacy_a", "empleado", 5],
                ["legacy_b", "empleado", 6],
            ];
            await client.query(
                `INSERT INTO public.persona (nombre, ci, email, telefono)
                 SELECT 'Persona ' || n, 'CI-' || n, 'persona' || n || '@example.test', '7000000' || n
                 FROM generate_series(1, 6) AS n`,
            );
            for (const [username, role, personId] of users) {
                await client.query(
                    `INSERT INTO public.usuario (id_persona, usuario, password, rol, estado)
                     VALUES ($1, $2, $3, $4, true)`,
                    [personId, username, await bcrypt.hash(passwords.get(username), 4), role],
                );
            }
            await client.query(migrationSql);

            const { rows: legacyBefore } = await client.query(
                "SELECT usuario, rol FROM public.usuario WHERE rol = 'empleado' ORDER BY usuario",
            );
            assert.deepEqual(legacyBefore, [
                { usuario: "legacy_a", rol: "empleado" },
                { usuario: "legacy_b", rol: "empleado" },
            ]);

            const { rows: constraint } = await client.query(
                `SELECT convalidated, pg_get_constraintdef(oid) AS definition
                 FROM pg_constraint
                 WHERE conrelid = 'public.usuario'::regclass
                   AND conname = 'usuario_rol_check'`,
            );
            assert.equal(constraint[0].convalidated, false);
            assert.match(constraint[0].definition, /empleado/);

            await assert.rejects(
                client.query(
                    `INSERT INTO public.usuario (usuario, password, rol)
                     VALUES ('nuevo_empleado', 'unused', 'empleado')`,
                ),
                (error) => error.code === "23514",
            );
            await assert.rejects(
                client.query(
                    "UPDATE public.usuario SET rol = 'empleado' WHERE usuario = 'admin'",
                ),
                (error) => error.code === "23514",
            );
            await assert.rejects(
                client.query(
                    "UPDATE public.usuario SET rol = 'mesero' WHERE usuario = 'legacy_a'",
                ),
                (error) => error.code === "23514",
            );
            const { rows: fourRoles } = await client.query(
                "SELECT rol FROM public.usuario WHERE rol = ANY($1::text[]) ORDER BY rol",
                [functionalRoles],
            );
            assert.deepEqual(fourRoles.map(({ rol }) => rol), ["admin", "caja", "cliente", "mesero"]);

            process.env.DATABASE_URL = `postgresql://test:test@127.0.0.1:${port}/postgres`;
            process.env.JWT_SECRET = jwtSecret;
            const databaseModule = await import("../config/db.js");
            applicationPool = databaseModule.default;
            originalPoolQuery = applicationPool.query;
            applicationPool.query = client.query.bind(client);

            const [{ default: usuarioModel }, { default: authService }, { default: usuarioRoutes }] =
                await Promise.all([
                    import("../models/usuario.model.js"),
                    import("../services/auth.service.js"),
                    import("../routes/usuario.routes.js"),
                ]);

            const employeeLogin = await authService.login({
                usuario: "legacy_a",
                password: passwords.get("legacy_a"),
            }).then(
                () => null,
                (error) => error,
            );
            assert.equal(employeeLogin.status, 403);
            assert.match(employeeLogin.message, /rol.*no está reconocido/i);

            const adminLogin = await authService.login({
                usuario: "admin",
                password: passwords.get("admin"),
            });
            for (const role of functionalRoles.slice(1)) {
                const login = await authService.login({
                    usuario: role,
                    password: passwords.get(role),
                });
                assert.equal(login.usuario.rol, role);
            }

            const app = express();
            app.use(express.json());
            app.use("/usuarios", usuarioRoutes);
            server = await new Promise((resolve) => {
                const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
            });
            const baseUrl = `http://127.0.0.1:${server.address().port}/usuarios`;
            const request = (url, token, options = {}) => fetch(url, {
                ...options,
                headers: {
                    authorization: `Bearer ${token}`,
                    ...(options.body ? { "content-type": "application/json" } : {}),
                    ...options.headers,
                },
            });

            const listResponse = await request(baseUrl, adminLogin.token);
            assert.equal(listResponse.status, 200);
            const listBody = await listResponse.json();
            const listedEmployees = listBody.data.filter(({ rol }) => rol === "empleado");
            assert.equal(listedEmployees.length, 2);

            const employeeId = listedEmployees[0].id_usuario;
            const detailResponse = await request(`${baseUrl}/${employeeId}`, adminLogin.token);
            assert.equal(detailResponse.status, 200);
            assert.equal((await detailResponse.json()).data.rol, "empleado");

            const staleEmployeeToken = jwt.sign(
                { id: employeeId, rol: "empleado" },
                jwtSecret,
                { expiresIn: "1h" },
            );
            const deniedResponse = await request(baseUrl, staleEmployeeToken);
            assert.equal(deniedResponse.status, 403);

            const updateResponse = await request(`${baseUrl}/${employeeId}`, adminLogin.token, {
                method: "PUT",
                body: JSON.stringify({
                    usuario: "legacy_a_actualizado",
                    rol: "empleado",
                    estado: true,
                    nombre_completo: "Nombre histórico actualizado",
                    ci: "CI-HISTORICO",
                    correo: "historico@example.test",
                    telefono: "70009999",
                }),
            });
            assert.equal(updateResponse.status, 200);
            const updatedBody = await updateResponse.json();
            assert.equal(updatedBody.data.rol, "empleado");
            assert.equal(updatedBody.data.usuario, "legacy_a_actualizado");
            assert.equal(updatedBody.data.nombre_completo, "Nombre histórico actualizado");

            const deactivateResponse = await request(`${baseUrl}/${employeeId}`, adminLogin.token, {
                method: "PUT",
                body: JSON.stringify({ estado: false }),
            });
            assert.equal(deactivateResponse.status, 200);
            const reactivateResponse = await request(`${baseUrl}/${employeeId}`, adminLogin.token, {
                method: "PUT",
                body: JSON.stringify({ estado: true }),
            });
            assert.equal(reactivateResponse.status, 400);

            const attemptedRoleChange = await usuarioModel.actualizar(
                employeeId,
                { rol: "mesero" },
            ).then(
                () => null,
                (error) => error,
            );
            assert.equal(attemptedRoleChange.status, 400);

            const newEmployee = await usuarioModel.crear({
                usuario: "empleado_desde_api",
                password: "password-new-employee",
                rol: "empleado",
            }).then(
                () => null,
                (error) => error,
            );
            assert.equal(newEmployee.status, 400);

            const { rows: finalLegacyRows } = await client.query(
                "SELECT usuario, rol FROM public.usuario WHERE rol = 'empleado' ORDER BY usuario",
            );
            assert.equal(finalLegacyRows.length, 2);
            assert.ok(finalLegacyRows.some(({ usuario }) => usuario === "legacy_a_actualizado"));

            for (const role of functionalRoles) {
                const created = await usuarioModel.crear({
                    usuario: `nuevo_${role}`,
                    password: `new-password-${role}`,
                    rol: role,
                });
                assert.equal(created.rol, role);
            }
            const { rows: allRoles } = await client.query(
                "SELECT DISTINCT rol FROM public.usuario WHERE rol <> 'empleado' ORDER BY rol",
            );
            assert.deepEqual(allRoles.map(({ rol }) => rol), [...functionalRoles].sort());
        } finally {
            if (server) {
                await new Promise((resolve, reject) => {
                    server.close((error) => error ? reject(error) : resolve());
                });
            }
            if (applicationPool) {
                applicationPool.query = originalPoolQuery;
                await applicationPool.end();
            }
            if (previousDatabaseUrl === undefined) {
                delete process.env.DATABASE_URL;
            } else {
                process.env.DATABASE_URL = previousDatabaseUrl;
            }
            if (previousJwtSecret === undefined) {
                delete process.env.JWT_SECRET;
            } else {
                process.env.JWT_SECRET = previousJwtSecret;
            }
            client.release();
        }
    });
});
