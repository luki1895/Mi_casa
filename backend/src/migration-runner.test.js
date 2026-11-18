import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
    executeSingleMigration,
    getMigrationStatuses,
    loadMigrationFiles,
    parseMigrationCommand,
    planSingleMigration,
} from "./migration-runner.js";

const migrationDir = fileURLToPath(new URL("./migrations", import.meta.url));
const migrations = await loadMigrationFiles(migrationDir);
const byFilename = new Map(migrations.map((migration) => [migration.filename, migration]));
const appliedThrough002 = new Map(
    ["000_init_schema.sql", "001_operaciones_restaurante.sql", "002_saldos_independientes_pensionados.sql"]
        .map((filename) => [filename, byFilename.get(filename).checksum]),
);

test("the CLI accepts status, dependency inspection, and one confirmed migration", () => {
    assert.deepEqual(parseMigrationCommand(["status"]), { command: "status" });
    assert.deepEqual(
        parseMigrationCommand(["deps", "009_eventos_cancelaciones.sql"]),
        { command: "deps", filename: "009_eventos_cancelaciones.sql" },
    );
    assert.deepEqual(
        parseMigrationCommand([
            "run",
            "005_integral_completion.sql",
            "--confirm",
            "a".repeat(64),
        ]),
        {
            command: "run",
            filename: "005_integral_completion.sql",
            confirmationChecksum: "a".repeat(64),
        },
    );
    assert.deepEqual(parseMigrationCommand([]), { command: "help" });
    assert.throws(() => parseMigrationCommand(["run", "all"]), /Argumentos inválidos/);
});

test("an applied checksum mismatch blocks every migration", () => {
    const applied = new Map(appliedThrough002);
    applied.set("000_init_schema.sql", "0".repeat(64));

    assert.throws(
        () => planSingleMigration({
            migrations,
            appliedByName: applied,
            targetFilename: "005_integral_completion.sql",
            confirmationChecksum: byFilename.get("005_integral_completion.sql").checksum,
        }),
        /Checksum distinto en 000_init_schema\.sql/,
    );
});

test("only the next pending non-manual migration can be selected", () => {
    assert.throws(
        () => planSingleMigration({
            migrations,
            appliedByName: appliedThrough002,
            targetFilename: "006_mesas_atenciones.sql",
            confirmationChecksum: byFilename.get("006_mesas_atenciones.sql").checksum,
        }),
        /La siguiente migración aplicable es 005_integral_completion\.sql/,
    );

    const statuses = getMigrationStatuses(migrations, appliedThrough002);
    assert.equal(
        statuses.find(({ filename }) => filename === "006_mesas_atenciones.sql").status,
        "ESPERA_ORDEN",
    );
});

test("a single migration requires its exact calculated checksum", () => {
    assert.throws(
        () => planSingleMigration({
            migrations,
            appliedByName: appliedThrough002,
            targetFilename: "005_integral_completion.sql",
            confirmationChecksum: "0".repeat(64),
        }),
        /Confirmación requerida/,
    );

    const plan = planSingleMigration({
        migrations,
        appliedByName: appliedThrough002,
        targetFilename: "005_integral_completion.sql",
        confirmationChecksum: byFilename.get("005_integral_completion.sql").checksum,
    });

    assert.equal(plan.alreadyApplied, false);
    assert.equal(plan.migration.filename, "005_integral_completion.sql");
});

test("manual migrations and unknown applied history cannot be run", () => {
    assert.throws(
        () => planSingleMigration({
            migrations,
            appliedByName: appliedThrough002,
            targetFilename: "003_restaurar_usuarios_prueba.sql",
            confirmationChecksum: byFilename.get("003_restaurar_usuarios_prueba.sql").checksum,
        }),
        /es manual y está bloqueada/,
    );

    const applied = new Map(appliedThrough002);
    applied.set("010_migracion_desconocida.sql", "a".repeat(64));
    assert.throws(
        () => planSingleMigration({
            migrations,
            appliedByName: applied,
            targetFilename: "005_integral_completion.sql",
            confirmationChecksum: byFilename.get("005_integral_completion.sql").checksum,
        }),
        /no existe localmente/,
    );
});

test("009 depends on the event schema from 008 and the base schema from 000", () => {
    assert.deepEqual(
        byFilename.get("009_eventos_cancelaciones.sql").dependencies,
        ["000_init_schema.sql", "008_reservas_platos.sql"],
    );
});

test("010 depends on the existing mesa and atención schema from 006", () => {
    assert.deepEqual(
        byFilename.get("010_configuracion_mesas.sql").dependencies,
        ["006_mesas_atenciones.sql"],
    );
});

test("execution applies and records only the confirmed file in one transaction", async () => {
    const statements = [];
    const client = {
        async query(statement, values) {
            statements.push({ statement, values });
            if (statement.includes("to_regclass('public.schema_migrations')")) {
                return { rows: [{ exists: true }] };
            }
            if (statement.includes("information_schema.tables")) {
                return {
                    rows: ["persona", "usuario", "producto", "pedido", "caja"]
                        .map((table_name) => ({ table_name })),
                };
            }
            if (statement.includes("SELECT name, checksum FROM public.schema_migrations")) {
                return {
                    rows: [...appliedThrough002].map(([name, checksum]) => ({ name, checksum })),
                };
            }
            return { rows: [] };
        },
    };

    const migration = byFilename.get("005_integral_completion.sql");
    const result = await executeSingleMigration({
        client,
        migrations,
        targetFilename: migration.filename,
        confirmationChecksum: migration.checksum,
    });

    assert.equal(result.status, "applied");
    const migrationStatements = statements.filter(({ statement }) =>
        statement.includes("ALTER TABLE usuario DROP CONSTRAINT")
    );
    assert.equal(migrationStatements.length, 1);
    assert.equal(
        statements.filter(({ statement }) => statement.startsWith("INSERT INTO public.schema_migrations"))
            .length,
        1,
    );
    assert.ok(statements.some(({ statement }) => statement === "COMMIT"));
    assert.ok(statements.some(({ statement }) => statement.includes("pg_advisory_xact_lock")));
});

test("a failed SQL migration is rolled back without a history record", async () => {
    const statements = [];
    const client = {
        async query(statement) {
            statements.push(statement);
            if (statement.includes("to_regclass('public.schema_migrations')")) {
                return { rows: [{ exists: true }] };
            }
            if (statement.includes("information_schema.tables")) {
                return {
                    rows: ["persona", "usuario"].map((table_name) => ({ table_name })),
                };
            }
            if (statement.includes("SELECT name, checksum FROM public.schema_migrations")) {
                return {
                    rows: [...appliedThrough002].map(([name, checksum]) => ({ name, checksum })),
                };
            }
            if (statement.includes("CREATE TABLE IF NOT EXISTS movimiento_pensionado")) {
                throw new Error("simulated SQL failure");
            }
            return { rows: [] };
        },
    };

    const migration = byFilename.get("005_integral_completion.sql");
    await assert.rejects(
        executeSingleMigration({
            client,
            migrations,
            targetFilename: migration.filename,
            confirmationChecksum: migration.checksum,
        }),
        /simulated SQL failure/,
    );

    assert.ok(statements.includes("ROLLBACK"));
    assert.equal(
        statements.some((statement) => statement.startsWith("INSERT INTO public.schema_migrations")),
        false,
    );
});

test("a stored checksum mismatch rolls back before executing migration SQL", async () => {
    const statements = [];
    const appliedWithMismatch = new Map(appliedThrough002);
    appliedWithMismatch.set("000_init_schema.sql", "f".repeat(64));
    const client = {
        async query(statement) {
            statements.push(statement);
            if (statement.includes("to_regclass('public.schema_migrations')")) {
                return { rows: [{ exists: true }] };
            }
            if (statement.includes("information_schema.tables")) {
                return { rows: [{ table_name: "usuario" }] };
            }
            if (statement.includes("SELECT name, checksum FROM public.schema_migrations")) {
                return {
                    rows: [...appliedWithMismatch].map(([name, checksum]) => ({ name, checksum })),
                };
            }
            return { rows: [] };
        },
    };

    const migration = byFilename.get("005_integral_completion.sql");
    await assert.rejects(
        executeSingleMigration({
            client,
            migrations,
            targetFilename: migration.filename,
            confirmationChecksum: migration.checksum,
        }),
        /Checksum distinto en 000_init_schema\.sql/,
    );

    assert.ok(statements.includes("ROLLBACK"));
    assert.equal(
        statements.some((statement) => statement.includes("ALTER TABLE usuario DROP CONSTRAINT")),
        false,
    );
    assert.equal(
        statements.some((statement) => statement.startsWith("INSERT INTO public.schema_migrations")),
        false,
    );
});
