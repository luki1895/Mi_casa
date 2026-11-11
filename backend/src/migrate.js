import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";

const migrationDir = fileURLToPath(new URL("./migrations", import.meta.url));
const applicationTables = [
    "persona",
    "cliente",
    "usuario",
    "producto",
    "configuracion",
    "produccion_diaria",
    "pedido",
    "detalle_pedido",
    "gasto",
    "caja",
    "apertura_caja",
    "cierre_caja",
    "reserva",
    "pago",
    "solicitud_adicional",
    "bitacora_operaciones",
];
const manualOnlyMigrations = new Set([
    "003_restaurar_usuarios_prueba.sql",
    "004_maria_prueba_como_mesera.sql",
]);

try {
    const connectionClient = await pool.connect();
    const tlsEnabled = connectionClient.connection.stream.encrypted === true;
    connectionClient.release();

    if (!tlsEnabled) {
        throw new Error("La conexión PostgreSQL no usa TLS; no se ejecutarán migraciones.");
    }

    const files = (await readdir(migrationDir))
        .filter((file) => file.endsWith(".sql"))
        .sort();

    for (const file of files.filter((name) => manualOnlyMigrations.has(name))) {
        console.warn(`Se omite la migración manual/de prueba ${file}.`);
    }

    const migrationFiles = files.filter((file) => !manualOnlyMigrations.has(file));
    const { rows: [migrationTable] } = await pool.query(
        "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS migration_table_exists",
    );
    const { rows: existingTables } = await pool.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE'
           AND table_name = ANY($1::text[])`,
        [applicationTables],
    );

    if (!migrationTable.migration_table_exists && existingTables.length > 0) {
        throw new Error(
            "Ya existe un esquema de Mi Casa sin historial de migraciones. "
            + "No se aplicará ningún SQL automáticamente; verifica el respaldo y el esquema primero.",
        );
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
            name TEXT PRIMARY KEY,
            checksum TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    const { rows: appliedMigrations } = await pool.query(
        "SELECT name, checksum FROM public.schema_migrations",
    );
    const appliedByName = new Map(appliedMigrations.map(({ name, checksum }) => [name, checksum]));

    if (appliedMigrations.length === 0 && existingTables.length > 0) {
        throw new Error(
            "El esquema de Mi Casa existe, pero el historial de migraciones está vacío. "
            + "No se ejecutarán migraciones para evitar modificar datos existentes.",
        );
    }

    for (const file of migrationFiles) {
        const filePath = fileURLToPath(new URL(`./migrations/${file}`, import.meta.url));
        const sql = await readFile(filePath, "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const previousChecksum = appliedByName.get(file);

        if (previousChecksum) {
            if (previousChecksum !== checksum) {
                throw new Error(
                    `La migración ${file} cambió después de aplicarse. `
                    + "Crea una migración nueva en lugar de modificar una ya aplicada.",
                );
            }
            continue;
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query(
                "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
                [file, checksum],
            );
            await client.query("COMMIT");
            appliedByName.set(file, checksum);
            console.log(`Migración ${file} aplicada correctamente.`);
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("No se pudo revertir la migración:", rollbackError.message);
            }
            throw error;
        } finally {
            client.release();
        }
    }
} catch (error) {
    console.error("No se pudo aplicar la migración:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
