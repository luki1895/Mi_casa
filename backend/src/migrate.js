import "dotenv/config";
import { fileURLToPath } from "node:url";
import {
    executeSingleMigration,
    getHistoryIssues,
    getMigrationStatuses,
    loadMigrationFiles,
    parseMigrationCommand,
    readMigrationState,
} from "./migration-runner.js";

const migrationDir = fileURLToPath(new URL("./migrations", import.meta.url));

const usage = `Uso:
  npm run migrate -- status
  npm run migrate -- deps <archivo.sql>
  npm run migrate -- run <archivo.sql> --confirm <sha256>

No existe una opción para ejecutar todas las migraciones.
003 y 004 son manuales y están bloqueadas por este ejecutor.`;

const assertTls = (client) => {
    if (client.connection.stream.encrypted !== true) {
        throw new Error("La conexión PostgreSQL no usa TLS; no se ejecutarán migraciones.");
    }
};

const printStatus = (migrations, appliedByName) => {
    const statuses = getMigrationStatuses(migrations, appliedByName);
    console.log("ESTADO | MIGRACIÓN | CHECKSUM CALCULADO | CHECKSUM REGISTRADO");
    for (const migration of statuses) {
        console.log(
            `${migration.status} | ${migration.filename} | ${migration.checksum} | `
            + `${migration.recordedChecksum || "-"}`,
        );
    }
};

const withReadOnlyState = async (pool, callback) => {
    const client = await pool.connect();
    let transactionOpen = false;
    try {
        assertTls(client);
        await client.query("BEGIN READ ONLY");
        transactionOpen = true;
        const state = await readMigrationState(client);
        await client.query("COMMIT");
        transactionOpen = false;
        return await callback(state);
    } catch (error) {
        if (transactionOpen) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("No se pudo cerrar la transacción de lectura:", rollbackError.message);
            }
        }
        throw error;
    } finally {
        client.release();
    }
};

async function main() {
    let pool;
    try {
        const command = parseMigrationCommand(process.argv.slice(2));
        if (command.command === "help") {
            console.log(usage);
            return;
        }

        const migrations = await loadMigrationFiles(migrationDir);
        if (
            command.filename
            && !migrations.some(({ filename }) => filename === command.filename)
        ) {
            throw new Error(`Migración desconocida: ${command.filename}.`);
        }

        const { default: databasePool } = await import("./config/db.js");
        pool = databasePool;

        if (command.command === "status") {
            await withReadOnlyState(pool, (state) => {
                console.log(
                    `Historial: ${state.historyExists ? "presente" : "ausente"}; `
                    + `tablas de aplicación detectadas: ${state.existingTables.length}.`,
                );
                printStatus(migrations, state.appliedByName);
                const issues = getHistoryIssues(migrations, state.appliedByName);
                if (issues.length) {
                    throw new Error(issues.join("\n"));
                }
            });
            return;
        }

        if (command.command === "deps") {
            await withReadOnlyState(pool, (state) => {
                const migration = migrations.find(
                    ({ filename }) => filename === command.filename,
                );
                console.log(`Migración: ${migration.filename}`);
                console.log(
                    `Dependencias: ${migration.dependencies === null
                        ? "no verificadas"
                        : migration.dependencies.join(", ") || "ninguna"}`,
                );
                console.log(`Checksum calculado: ${migration.checksum}`);
                console.log(
                    `Checksum registrado: ${state.appliedByName.get(migration.filename) || "-"}`,
                );
                console.log(
                    `Tipo: ${migration.manualOnly ? "manual; bloqueada" : "ejecutable individualmente"}`,
                );
                const issues = getHistoryIssues(migrations, state.appliedByName);
                if (issues.length) {
                    throw new Error(issues.join("\n"));
                }
            });
            return;
        }

        const client = await pool.connect();
        try {
            assertTls(client);
            const result = await executeSingleMigration({
                client,
                migrations,
                targetFilename: command.filename,
                confirmationChecksum: command.confirmationChecksum,
            });
            console.log(
                result.status === "applied"
                    ? `Migración ${result.migration.filename} aplicada.`
                    : `Migración ${result.migration.filename} ya estaba aplicada sin discrepancias.`,
            );
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("No se pudo gestionar la migración:", error.message);
        process.exitCode = 1;
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

await main();
