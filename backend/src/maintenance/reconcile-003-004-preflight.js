import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = fileURLToPath(new URL("../migrations/", import.meta.url));

const readMigration = (filename) =>
    readFile(path.join(migrationDirectory, filename), "utf8");

function parseMigration003(sql) {
    const targetHashes = new Map(
        [...sql.matchAll(/WHEN\s+'([^']+)'\s+THEN\s+'([^']+)'/g)]
            .map(([, username, hash]) => [username, hash]),
    );
    const priorHashes = new Map(
        [...sql.matchAll(/\(usuario\s*=\s*'([^']+)'\s+AND\s+password\s*=\s*'([^']+)'\)/g)]
            .map(([, username, hash]) => [username, hash]),
    );

    if (targetHashes.size !== 5 || priorHashes.size !== 5) {
        throw new Error("No se pudieron leer las cinco cuentas protegidas por 003.");
    }

    return { targetHashes, priorHashes };
}

function parseMigration004(sql) {
    const match = sql.match(
        /WHERE\s+usuario\s*=\s*'([^']+)'\s+AND\s+rol\s*=\s*'empleado'\s+AND\s+password\s*=\s*'([^']+)'/i,
    );
    if (!match) {
        throw new Error("No se pudo leer la precondición protegida por 004.");
    }
    return { username: match[1], passwordHash: match[2] };
}

export async function inspect003004(client) {
    const [sql003, sql004] = await Promise.all([
        readMigration("003_restaurar_usuarios_prueba.sql"),
        readMigration("004_maria_prueba_como_mesera.sql"),
    ]);
    const { targetHashes, priorHashes } = parseMigration003(sql003);
    const target004 = parseMigration004(sql004);
    const usernames = [...targetHashes.keys()];
    const { rows: accounts } = await client.query(
        `WITH expected AS (
             SELECT *
             FROM unnest($1::text[], $2::text[], $3::text[])
                 AS e(usuario, hash_003_previo, hash_003_objetivo)
         )
         SELECT e.usuario,
                u.id_usuario IS NOT NULL AS existe,
                u.rol,
                u.estado,
                CASE
                    WHEN u.password = e.hash_003_previo THEN 'hash_003_previo'
                    WHEN u.password = e.hash_003_objetivo THEN 'hash_003_objetivo'
                    ELSE 'hash_distinto'
                END AS estado_hash_003,
                (u.rol = 'empleado' AND u.password = $4) AS elegible_004,
                (u.rol = 'mesero' AND u.password = $4) AS coincide_poscondicion_004
         FROM expected e
         LEFT JOIN public.usuario u USING (usuario)
         ORDER BY e.usuario`,
        [
            usernames,
            usernames.map((username) => priorHashes.get(username)),
            usernames.map((username) => targetHashes.get(username)),
            target004.passwordHash,
        ],
    );
    const { rows: employeeRows } = await client.query(
        "SELECT count(*)::int AS total FROM public.usuario WHERE rol = 'empleado'",
    );
    const { rows: migrationHistory } = await client.query(
        `SELECT name
         FROM public.schema_migrations
         WHERE name = ANY($1::text[])
         ORDER BY name`,
        [
            [
                "003_restaurar_usuarios_prueba.sql",
                "004_maria_prueba_como_mesera.sql",
            ],
        ],
    );
    const { rows: historyCounts } = await client.query(
        `SELECT
             (SELECT count(*)::int FROM public.usuario) AS usuarios,
             (SELECT count(*)::int FROM public.pedido) AS pedidos,
             (SELECT count(*)::int FROM public.detalle_pedido) AS detalles_pedido,
             (SELECT count(*)::int FROM public.reserva) AS reservas,
             (SELECT count(*)::int FROM public.pago) AS pagos,
             (SELECT count(*)::int FROM public.caja) AS movimientos_caja,
             (SELECT count(*)::int FROM public.bitacora_operaciones) AS bitacora`,
    );
    const hasPendingGuardedChange = accounts.some(
        (account) => account.estado_hash_003 === "hash_003_previo" || account.elegible_004,
    );

    return {
        accounts,
        employeeAccounts: employeeRows[0].total,
        migrationHistory: migrationHistory.map(({ name }) => name),
        historyCounts: historyCounts[0],
        recommendation: hasPendingGuardedChange
            ? "REVISION_MANUAL_REQUERIDA; no se ejecutó SQL"
            : "SIN_PRECONDICIONES_PENDIENTES; no inferir ni registrar ejecuciones",
    };
}

async function main() {
    const { default: pool } = await import("../config/db.js");
    const client = await pool.connect();
    let transactionOpen = false;

    try {
        if (client.connection.stream.encrypted !== true) {
            throw new Error("La conexión PostgreSQL no usa TLS.");
        }
        await client.query("BEGIN READ ONLY");
        transactionOpen = true;
        const report = await inspect003004(client);
        await client.query("COMMIT");
        transactionOpen = false;
        console.log(JSON.stringify(report, null, 2));
    } finally {
        if (transactionOpen) {
            await client.query("ROLLBACK");
        }
        client.release();
        await pool.end();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
