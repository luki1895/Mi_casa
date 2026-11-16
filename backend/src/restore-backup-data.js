import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import {
    access,
    mkdtemp,
    readdir,
    readFile,
    rmdir,
    stat,
    unlink,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

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
const requiredMigrations = [
    "000_init_schema.sql",
    "001_operaciones_restaurante.sql",
    "002_saldos_independientes_pensionados.sql",
];
const backupPath = process.argv[2];
let restoreListDirectory;
let restoreListPath;

const findPgRestore = async () => {
    const candidates = [];
    const where = spawnSync("where.exe", ["pg_restore"], { encoding: "utf8" });
    if (where.status === 0) {
        candidates.push(...where.stdout.split(/\r?\n/).filter(Boolean));
    }

    for (const directory of [
        "C:\\Program Files\\PostgreSQL",
        "C:\\Program Files\\pgAdmin 4\\runtime",
    ]) {
        try {
            const entries = await readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                if (directory.endsWith("PostgreSQL") && entry.isDirectory()) {
                    candidates.push(path.join(directory, entry.name, "bin", "pg_restore.exe"));
                } else if (entry.isFile() && entry.name.toLowerCase() === "pg_restore.exe") {
                    candidates.push(path.join(directory, entry.name));
                }
            }
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }

    for (const candidate of [...new Set(candidates)]) {
        try {
            await access(candidate);
            return candidate;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }

    throw new Error("No se encontró pg_restore. Instala las herramientas de PostgreSQL o pgAdmin.");
};

const getArchiveTables = (toc, objectType) => new Set(
    toc.split(/\r?\n/)
        .map((line) => line.match(new RegExp(
            `^\\s*\\d+;\\s+\\d+\\s+\\d+\\s+${objectType}\\s+public\\s+("?[^"\\s]+"?)`,
        ))?.[1]?.replaceAll('"', ""))
        .filter(Boolean),
);

let restoreCommitted = false;

try {
    if (!backupPath) {
        throw new Error("Indica la ruta del respaldo .dump como argumento.");
    }

    if (!process.env.PGSSLROOTCERT?.trim()) {
        throw new Error("Configura PGSSLROOTCERT antes de restaurar.");
    }

    const backupStats = await stat(backupPath);
    const header = await readFile(backupPath);
    if (header.subarray(0, 5).toString("ascii") !== "PGDMP") {
        throw new Error("El respaldo no es un archivo PostgreSQL custom válido.");
    }

    const databaseUrl = new URL(process.env.DATABASE_URL);
    const pgRestore = await findPgRestore();
    const listResult = spawnSync(pgRestore, ["--list", backupPath], {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
    });
    if (listResult.status !== 0) {
        throw new Error("pg_restore no pudo leer el índice del respaldo.");
    }

    const schemaTables = getArchiveTables(listResult.stdout, "TABLE");
    const dataTables = getArchiveTables(listResult.stdout, "TABLE DATA");
    const expected = [...applicationTables].sort();
    const actualSchema = [...schemaTables].sort();
    const actualData = [...dataTables].sort();

    if (
        JSON.stringify(actualSchema) !== JSON.stringify(expected)
        || JSON.stringify(actualData) !== JSON.stringify(expected)
    ) {
        throw new Error(
            "Las tablas del respaldo no coinciden exactamente con las tablas esperadas de Mi Casa; no se restauró.",
        );
    }

    const client = await pool.connect();
    try {
        if (client.connection.stream.encrypted !== true) {
            throw new Error("La conexión PostgreSQL no usa TLS; no se restaurará el respaldo.");
        }

        const { rows: [database] } = await client.query(`
            SELECT current_database() AS name,
                   to_regclass('public.schema_migrations') IS NOT NULL AS has_migration_history
        `);
        if (database.name !== decodeURIComponent(databaseUrl.pathname.slice(1))) {
            throw new Error("La base destino no coincide con DATABASE_URL.");
        }
        if (!database.has_migration_history) {
            throw new Error("No existe el historial de migraciones; crea el esquema antes de restaurar datos.");
        }

        const { rows: applied } = await client.query(
            "SELECT name FROM public.schema_migrations",
        );
        const appliedNames = new Set(applied.map(({ name }) => name));
        if (requiredMigrations.some((name) => !appliedNames.has(name))) {
            throw new Error("Faltan migraciones de esquema requeridas; no se restauraron datos.");
        }

        const { rows: targetTables } = await client.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_type = 'BASE TABLE'
               AND table_name = ANY($1::text[])`,
            [applicationTables],
        );
        if (
            JSON.stringify(targetTables.map(({ table_name }) => table_name).sort())
            !== JSON.stringify(expected)
        ) {
            throw new Error("Las tablas de destino no coinciden exactamente con el esquema esperado.");
        }

        const { rows: foreignKeys } = await client.query(
            `SELECT child.relname AS child, parent.relname AS parent
             FROM pg_constraint constraint_row
             JOIN pg_class child ON child.oid = constraint_row.conrelid
             JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
             JOIN pg_class parent ON parent.oid = constraint_row.confrelid
             JOIN pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
             WHERE constraint_row.contype = 'f'
               AND child_schema.nspname = 'public'
               AND parent_schema.nspname = 'public'
               AND child.relname = ANY($1::text[])
               AND parent.relname = ANY($1::text[])`,
            [applicationTables],
        );
        const orderedTables = [];
        const remainingTables = new Set(applicationTables);
        while (remainingTables.size > 0) {
            const next = applicationTables.find((table) => (
                remainingTables.has(table)
                && foreignKeys
                    .filter(({ child }) => child === table)
                    .every(({ parent }) => !remainingTables.has(parent))
            ));

            if (!next) {
                throw new Error("Las claves foráneas del esquema tienen dependencias cíclicas; no se restauró.");
            }

            orderedTables.push(next);
            remainingTables.delete(next);
        }

        for (const table of applicationTables) {
            const { rows: [count] } = await client.query(
                `SELECT COUNT(*)::text AS count FROM public."${table}"`,
            );
            if (count.count !== "0") {
                throw new Error(
                    `La tabla ${table} ya contiene registros; no se mezclará el respaldo con datos existentes.`,
                );
            }
        }

        const tableDataLines = new Map();
        for (const line of listResult.stdout.split(/\r?\n/)) {
            const match = line.match(/^\s*\d+;\s+\d+\s+\d+\s+TABLE DATA\s+public\s+("?[^"\s]+"?)/);
            if (match) {
                tableDataLines.set(match[1].replaceAll('"', ""), line);
            }
        }
        const orderedDataLines = orderedTables.map((table) => tableDataLines.get(table));
        if (orderedDataLines.some((line) => !line)) {
            throw new Error("No se pudo ordenar el respaldo según las claves foráneas del esquema.");
        }

        restoreListDirectory = await mkdtemp(path.join(tmpdir(), "micasa-restore-"));
        restoreListPath = path.join(restoreListDirectory, "restore.list");
        let nextDataLine = 0;
        const orderedToc = listResult.stdout
            .split(/\r?\n/)
            .map((line) => (
                /^\s*\d+;\s+\d+\s+\d+\s+TABLE DATA\s+public\s+/.test(line)
                    ? orderedDataLines[nextDataLine++]
                    : line
            ))
            .join("\n");
        await writeFile(restoreListPath, orderedToc, { encoding: "utf8", flag: "wx" });
    } finally {
        client.release();
    }

    const sslRootCert = process.env.PGSSLROOTCERT.trim();
    const pgEnv = {
        ...process.env,
        PGHOST: databaseUrl.hostname,
        PGPORT: databaseUrl.port || "5432",
        PGUSER: decodeURIComponent(databaseUrl.username),
        PGPASSWORD: decodeURIComponent(databaseUrl.password),
        PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: path.isAbsolute(sslRootCert)
            ? sslRootCert
            : path.resolve(backendDirectory, sslRootCert),
    };

    await access(pgEnv.PGSSLROOTCERT);
    const restoreResult = spawnSync(pgRestore, [
        "--data-only",
        "--no-owner",
        "--no-acl",
        "--exit-on-error",
        "--single-transaction",
        "--use-list",
        restoreListPath,
        "--dbname",
        pgEnv.PGDATABASE,
        backupPath,
    ], {
        encoding: "utf8",
        env: pgEnv,
        maxBuffer: 10 * 1024 * 1024,
    });

    if (restoreResult.error) {
        throw new Error(`No se pudo ejecutar pg_restore: ${restoreResult.error.message}`);
    }
    if (restoreResult.status !== 0) {
        const diagnostics = (restoreResult.stderr || "")
            .split(/\r?\n/)
            .filter((line) => /pg_restore: (?:error|warning):/i.test(line))
            .filter((line) => !/(?:DETAIL|CONTEXT|Command was):/i.test(line))
            .map((line) => line.replaceAll(pgEnv.PGPASSWORD, "[redactado]"))
            .slice(0, 5);
        if (diagnostics.length > 0) {
            console.error("Diagnóstico de pg_restore:", diagnostics.join("\n"));
        }
        throw new Error(
            "pg_restore no pudo completar la restauración. Se solicitó una sola transacción para revertir errores.",
        );
    }
    restoreCommitted = true;

    const counts = [];
    for (const table of applicationTables) {
        const { rows: [count] } = await pool.query(
            `SELECT COUNT(*)::text AS count FROM public."${table}"`,
        );
        counts.push({ table_name: table, row_count: count.count });
    }

    const { rows: [users] } = await pool.query(
        "SELECT COUNT(*)::integer AS count FROM public.usuario WHERE estado = TRUE",
    );
    if (users.count === 0) {
        console.warn("El respaldo se restauró, pero no hay usuarios activos; revisa accesos antes de iniciar el sistema.");
    }

    console.log("Restauración de datos completada:", {
        backupSizeBytes: backupStats.size,
        tables: counts.map(({ table_name, row_count }) => ({
            table: table_name,
            rows: Number(row_count),
        })),
        activeUsers: users.count,
    });
} catch (error) {
    console.error("No se completó la restauración:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
    if (!restoreCommitted) {
        console.error("No se confirmó la restauración completa.");
    }
    if (restoreListPath) {
        await unlink(restoreListPath);
        await rmdir(restoreListDirectory);
    }
}
