import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { migrationManifest } from "./migration-manifest.js";

export const applicationTables = [
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
    "movimiento_pensionado",
    "historial_reserva",
    "mesa",
    "atencion_mesa",
    "historial_atencion_mesa",
    "reserva_plato",
    "detalle_reserva_plato",
    "historial_reserva_plato",
    "impresion_reserva_plato",
    "configuracion_reserva_platos",
    "revision_reserva_plato",
    "sector_mesa",
    "precio_configurado",
    "idempotencia_operacion",
    "evento_privado",
    "detalle_evento_privado",
    "historial_evento_privado",
    "pago_evento",
    "impresion_evento_privado",
    "horario_evento_privado",
    "cancelacion_evento_privado",
    "pago",
    "solicitud_adicional",
    "bitacora_operaciones",
];

export const migrationTableSql = `
    CREATE TABLE public.schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`;

export const calculateChecksum = (sql) =>
    createHash("sha256").update(sql).digest("hex");

export async function loadMigrationFiles(migrationDir) {
    const files = (await readdir(migrationDir))
        .filter((file) => file.endsWith(".sql"))
        .sort();
    const migrations = [];

    for (const file of files) {
        const definition = migrationManifest[file];
        if (!definition) {
            throw new Error(`La migración ${file} no tiene metadatos de dependencias.`);
        }

        if (
            definition.dependencies
            && definition.dependencies.some((dependency) => !migrationManifest[dependency])
        ) {
            throw new Error(`La migración ${file} declara una dependencia desconocida.`);
        }

        const filePath = fileURLToPath(new URL(`./migrations/${file}`, import.meta.url));
        const sql = await readFile(filePath, "utf8");
        migrations.push({
            filename: file,
            sql,
            checksum: calculateChecksum(sql),
            ...definition,
        });
    }

    for (const filename of Object.keys(migrationManifest)) {
        if (!files.includes(filename)) {
            throw new Error(`Falta el archivo de migración registrado ${filename}.`);
        }
    }

    return migrations;
}

export async function readMigrationState(client) {
    const { rows: [tableRow] } = await client.query(
        "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
    );
    const { rows: existingTables } = await client.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE'
           AND table_name = ANY($1::text[])`,
        [applicationTables],
    );
    const appliedRows = tableRow.exists
        ? (await client.query(
            "SELECT name, checksum FROM public.schema_migrations ORDER BY name",
        )).rows
        : [];

    return {
        historyExists: tableRow.exists,
        existingTables: existingTables.map(({ table_name }) => table_name),
        appliedByName: new Map(appliedRows.map(({ name, checksum }) => [name, checksum])),
    };
}

export function getHistoryIssues(migrations, appliedByName) {
    const localByName = new Map(migrations.map((migration) => [migration.filename, migration]));
    const issues = [];

    for (const [filename, recordedChecksum] of appliedByName) {
        const migration = localByName.get(filename);

        if (!migration) {
            issues.push(`La base registra ${filename}, pero el archivo no existe localmente.`);
        } else if (
            recordedChecksum !== migration.checksum
            && !migration.acceptedHistoricalChecksums?.includes(recordedChecksum)
        ) {
            issues.push(
                `Checksum distinto en ${filename}: `
                + `registrado=${recordedChecksum}, calculado=${migration.checksum}.`,
            );
        }
    }

    return issues;
}

export function getMigrationStatuses(migrations, appliedByName) {
    const migrationByName = new Map(migrations.map((migration) => [migration.filename, migration]));
    const nextPending = migrations.find(
        (migration) => !migration.manualOnly && !appliedByName.has(migration.filename),
    );

    return migrations.map((migration) => {
        const recordedChecksum = appliedByName.get(migration.filename);

        if (recordedChecksum) {
            const checksumAccepted = recordedChecksum === migration.checksum
                || migration.acceptedHistoricalChecksums?.includes(recordedChecksum);
            return {
                ...migration,
                recordedChecksum,
                status: recordedChecksum === migration.checksum
                    ? "APLICADA"
                    : checksumAccepted
                        ? "APLICADA_RECONCILIADA"
                        : "CHECKSUM_DISTINTO",
            };
        }

        if (migration.manualOnly) {
            return { ...migration, recordedChecksum: null, status: "MANUAL" };
        }

        if (migration.dependencies === null) {
            return { ...migration, recordedChecksum: null, status: "DEPENDENCIAS_SIN_VALIDAR" };
        }

        const missingDependencies = migration.dependencies.filter(
            (dependency) => !appliedByName.has(dependency),
        );
        const status = missingDependencies.length
            ? "BLOQUEADA"
            : nextPending?.filename === migration.filename
                ? "PENDIENTE"
                : "ESPERA_ORDEN";

        return {
            ...migration,
            recordedChecksum: null,
            missingDependencies,
            status,
            dependencyNames: migration.dependencies.map(
                (dependency) => migrationByName.get(dependency)?.filename || dependency,
            ),
        };
    });
}

export function planSingleMigration({
    migrations,
    appliedByName,
    targetFilename,
    confirmationChecksum,
}) {
    const historyIssues = getHistoryIssues(migrations, appliedByName);
    if (historyIssues.length) {
        throw new Error(historyIssues.join("\n"));
    }

    const target = migrations.find(({ filename }) => filename === targetFilename);
    if (!target) {
        throw new Error(`Migración desconocida: ${targetFilename}.`);
    }
    if (target.manualOnly) {
        throw new Error(`${targetFilename} es manual y está bloqueada por este ejecutor.`);
    }
    if (target.dependencies === null) {
        throw new Error(`${targetFilename} no tiene dependencias verificadas; no se ejecutará.`);
    }

    const recordedChecksum = appliedByName.get(targetFilename);
    if (recordedChecksum) {
        return { alreadyApplied: true, migration: target };
    }

    const laterApplied = migrations.find(
        (migration) => migration.filename > targetFilename
            && !migration.manualOnly
            && appliedByName.has(migration.filename),
    );
    if (laterApplied) {
        throw new Error(
            `No se puede aplicar ${targetFilename}: ${laterApplied.filename} ya está registrada.`,
        );
    }

    const nextPending = migrations.find(
        (migration) => !migration.manualOnly && !appliedByName.has(migration.filename),
    );
    if (nextPending?.filename !== targetFilename) {
        throw new Error(
            `Orden inválido. La siguiente migración aplicable es ${nextPending?.filename || "ninguna"}.`,
        );
    }

    const missingDependencies = target.dependencies.filter(
        (dependency) => !appliedByName.has(dependency),
    );
    if (missingDependencies.length) {
        throw new Error(
            `Faltan dependencias de ${targetFilename}: ${missingDependencies.join(", ")}.`,
        );
    }

    if (confirmationChecksum?.toLowerCase() !== target.checksum) {
        throw new Error(
            `Confirmación requerida. Usa exactamente el checksum calculado: ${target.checksum}.`,
        );
    }

    return { alreadyApplied: false, migration: target };
}

export function assertInitialDatabaseState(state, targetFilename) {
    const baseMigration = "000_init_schema.sql";
    const hasBaseRecord = state.appliedByName.has(baseMigration);

    if (!state.historyExists && state.existingTables.length) {
        throw new Error(
            "Hay tablas de Mi Casa, pero no existe schema_migrations. "
            + "No se aplicará SQL ni se reconstruirá el historial.",
        );
    }

    if (state.historyExists && state.appliedByName.size === 0 && state.existingTables.length) {
        throw new Error(
            "Hay tablas de Mi Casa con un historial vacío. "
            + "No se aplicará SQL ni se reconstruirá el historial.",
        );
    }

    if (state.existingTables.length && !hasBaseRecord) {
        throw new Error(
            "Hay tablas de Mi Casa, pero 000 no está registrada. "
            + "No se puede inferir ni reparar el historial automáticamente.",
        );
    }

    if (hasBaseRecord && !state.existingTables.length) {
        throw new Error(
            "000 aparece registrada, pero no se encontraron tablas de la aplicación.",
        );
    }

    if (!state.historyExists && targetFilename !== baseMigration) {
        throw new Error("En una base vacía, la primera migración debe ser 000.");
    }
}

export function stripOuterTransaction(sql) {
    return sql
        .replace(/^\s*BEGIN\s*;/i, "")
        .replace(/;\s*COMMIT\s*;\s*$/i, ";");
}

export async function executeSingleMigration({
    client,
    migrations,
    targetFilename,
    confirmationChecksum,
}) {
    await client.query("BEGIN");

    try {
        await client.query("SELECT pg_advisory_xact_lock($1, $2)", [729116, 1]);
        let state = await readMigrationState(client);
        assertInitialDatabaseState(state, targetFilename);

        let plan = planSingleMigration({
            migrations,
            appliedByName: state.appliedByName,
            targetFilename,
            confirmationChecksum,
        });

        if (plan.alreadyApplied) {
            await client.query("COMMIT");
            return { status: "already-applied", migration: plan.migration };
        }

        if (!state.historyExists) {
            await client.query(migrationTableSql);
            state = { ...state, historyExists: true };
        }

        await client.query(stripOuterTransaction(plan.migration.sql));
        await client.query(
            "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
            [plan.migration.filename, plan.migration.checksum],
        );
        await client.query("COMMIT");

        return { status: "applied", migration: plan.migration };
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("No se pudo revertir la migración:", rollbackError.message);
        }
        throw error;
    }
}

export function parseMigrationCommand(args) {
    if (!args.length || args[0] === "--help" || args[0] === "-h") {
        return { command: "help" };
    }
    if (args[0] === "status" && args.length === 1) {
        return { command: "status" };
    }
    if (args[0] === "deps" && args.length === 2) {
        return { command: "deps", filename: args[1] };
    }
    if (
        args[0] === "run"
        && args.length === 4
        && args[2] === "--confirm"
    ) {
        return {
            command: "run",
            filename: args[1],
            confirmationChecksum: args[3],
        };
    }

    throw new Error(
        "Argumentos inválidos. Usa status, deps <archivo.sql> "
        + "o run <archivo.sql> --confirm <sha256>.",
    );
}
