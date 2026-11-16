import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";

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
const migrationFiles = [
    "000_init_schema.sql",
    "001_operaciones_restaurante.sql",
    "002_saldos_independientes_pensionados.sql",
];
const idSequences = [
    ["persona", "id_persona", "persona_id_persona_seq"],
    ["cliente", "id_cliente", "cliente_id_cliente_seq"],
    ["usuario", "id_usuario", "usuario_id_usuario_seq"],
    ["producto", "id_producto", "producto_id_producto_seq"],
    ["configuracion", "id_configuracion", "configuracion_id_configuracion_seq"],
    ["produccion_diaria", "id_produccion", "produccion_diaria_id_produccion_seq"],
    ["pedido", "id_pedido", "pedido_id_pedido_seq"],
    ["detalle_pedido", "id_detalle_pedido", "detalle_pedido_id_detalle_pedido_seq"],
    ["gasto", "id_gasto", "gasto_id_gasto_seq"],
    ["caja", "id_caja", "caja_id_caja_seq"],
    ["apertura_caja", "id_apertura", "apertura_caja_id_apertura_seq"],
    ["cierre_caja", "id_cierre", "cierre_caja_id_cierre_seq"],
    ["reserva", "id_reserva", "reserva_id_reserva_seq"],
    ["pago", "id_pago", "pago_id_pago_seq"],
    ["solicitud_adicional", "id_solicitud", "solicitud_adicional_id_solicitud_seq"],
    ["bitacora_operaciones", "id_operacion", "bitacora_operaciones_id_operacion_seq"],
];

try {
    const client = await pool.connect();
    const tlsEnabled = client.connection.stream.encrypted === true;

    try {
        if (!tlsEnabled) {
            throw new Error("La conexión PostgreSQL no usa TLS; no se continuará con la base.");
        }

        const { rows } = await client.query(`
            SELECT
                current_database() AS database_name,
                to_regclass('public.schema_migrations') IS NOT NULL AS migration_history_exists
        `);
        const { rows: tables } = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        const tableNames = tables
            .map(({ table_name }) => table_name)
            .filter((table_name) => table_name !== "schema_migrations");
        if (JSON.stringify(tableNames) !== JSON.stringify([...applicationTables].sort())) {
            throw new Error("Las tablas públicas no coinciden con el esquema esperado de Mi Casa.");
        }

        const { rows: applied } = await client.query(
            "SELECT name, checksum FROM public.schema_migrations ORDER BY name",
        );
        for (const name of migrationFiles) {
            const migration = applied.find((item) => item.name === name);
            if (!migration) {
                throw new Error(`Falta la migración ${name} en el historial de Supabase.`);
            }
            const filePath = fileURLToPath(new URL(`./migrations/${name}`, import.meta.url));
            const sql = await readFile(filePath, "utf8");
            const checksum = createHash("sha256").update(sql).digest("hex");
            if (checksum !== migration.checksum) {
                throw new Error(`El checksum de la migración ${name} no coincide.`);
            }
        }

        const rowCounts = [];
        for (const table of applicationTables) {
            const { rows: [count] } = await client.query(
                `SELECT COUNT(*)::integer AS count FROM public."${table}"`,
            );
            rowCounts.push({ table, rows: count.count });
        }

        const unalignedSequences = [];
        for (const [table, column, sequence] of idSequences) {
            const { rows: [sequenceState] } = await client.query(
                `SELECT last_value::bigint AS last_value, is_called
                 FROM public."${sequence}"`,
            );
            const { rows: [maximum] } = await client.query(
                `SELECT COALESCE(MAX("${column}"), 0)::bigint AS max_id
                 FROM public."${table}"`,
            );
            if (
                BigInt(sequenceState.last_value) < BigInt(maximum.max_id)
                || (
                    BigInt(sequenceState.last_value) === BigInt(maximum.max_id)
                    && !sequenceState.is_called
                )
            ) {
                unalignedSequences.push(table);
            }
        }

        const { rows: [integrity] } = await client.query(`
            SELECT
                (SELECT COUNT(*)::integer
                 FROM pg_constraint
                 WHERE contype = 'f'
                   AND connamespace = 'public'::regnamespace
                   AND NOT convalidated) AS unvalidated_foreign_keys,
                (SELECT COUNT(*)::integer
                 FROM public.usuario
                 WHERE estado = TRUE) AS active_users,
                (SELECT COUNT(*)::integer
                 FROM public.usuario
                 WHERE estado = TRUE AND rol = 'admin') AS active_admins
        `);
        if (integrity.unvalidated_foreign_keys > 0) {
            throw new Error("Hay claves foráneas sin validar en el esquema.");
        }
        if (unalignedSequences.length > 0) {
            throw new Error(`Secuencias de IDs desalineadas: ${unalignedSequences.join(", ")}.`);
        }
        if (integrity.active_admins === 0) {
            throw new Error("No hay usuarios administradores activos tras la restauración.");
        }

        console.log("Conexión PostgreSQL verificada:", {
            database: rows[0].database_name,
            tls: tlsEnabled,
            migrationHistoryExists: rows[0].migration_history_exists,
            appliedMigrations: migrationFiles,
            rowCounts,
            integrity: {
                unvalidatedForeignKeys: integrity.unvalidated_foreign_keys,
                activeUsers: integrity.active_users,
                activeAdmins: integrity.active_admins,
                idSequencesAligned: idSequences.length,
            },
        });
    } finally {
        client.release();
    }
} catch (error) {
    console.error("No se pudo verificar Supabase:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
