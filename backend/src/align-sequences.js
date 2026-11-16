import pool from "./config/db.js";

const idSequences = [
    ["persona", "id_persona"],
    ["cliente", "id_cliente"],
    ["usuario", "id_usuario"],
    ["producto", "id_producto"],
    ["configuracion", "id_configuracion"],
    ["produccion_diaria", "id_produccion"],
    ["pedido", "id_pedido"],
    ["detalle_pedido", "id_detalle_pedido"],
    ["gasto", "id_gasto"],
    ["caja", "id_caja"],
    ["apertura_caja", "id_apertura"],
    ["cierre_caja", "id_cierre"],
    ["reserva", "id_reserva"],
    ["pago", "id_pago"],
    ["solicitud_adicional", "id_solicitud"],
    ["bitacora_operaciones", "id_operacion"],
];

try {
    const client = await pool.connect();
    try {
        if (client.connection.stream.encrypted !== true) {
            throw new Error("La conexión PostgreSQL no usa TLS; no se modificarán secuencias.");
        }

        const { rows: [history] } = await client.query(
            "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS history_exists",
        );
        if (!history.history_exists) {
            throw new Error("No existe el historial de migraciones; no se modificarán secuencias.");
        }

        const aligned = [];
        for (const [table, column] of idSequences) {
            const { rows: [maximum] } = await client.query(
                `SELECT MAX("${column}")::bigint AS max_id FROM public."${table}"`,
            );
            if (maximum.max_id === null) {
                aligned.push(table);
                continue;
            }

            const { rows: [sequence] } = await client.query(
                `SELECT last_value::bigint AS last_value, is_called
                 FROM public."${table}_${column}_seq"`,
            );
            const maxId = BigInt(maximum.max_id);
            const lastValue = BigInt(sequence.last_value);
            if (lastValue < maxId || (lastValue === maxId && !sequence.is_called)) {
                await client.query(
                    "SELECT setval(pg_get_serial_sequence($1, $2)::regclass, $3::bigint, TRUE)",
                    [`public.${table}`, column, maxId.toString()],
                );
            }
            aligned.push(table);
        }

        console.log("Secuencias de IDs alineadas con los datos:", aligned);
    } finally {
        client.release();
    }
} catch (error) {
    console.error("No se pudieron alinear las secuencias:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
