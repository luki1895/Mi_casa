import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { Pool } from "pg";

const commandTimeout = 600_000;

function findPostgresBinDirectory() {
    if (process.env.PG_BIN) {
        return process.env.PG_BIN;
    }

    const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
    if (pgConfig.status === 0) {
        return pgConfig.stdout.trim();
    }

    if (process.platform === "win32") {
        const programFiles = process.env.ProgramFiles || "C:\\Program Files";
        return path.join(programFiles, "PostgreSQL", "18", "bin");
    }

    return "";
}

export function hasPostgresTestBinaries() {
    const binDirectory = findPostgresBinDirectory();
    const extension = process.platform === "win32" ? ".exe" : "";

    return Boolean(
        binDirectory
        && ["initdb", "pg_ctl"].every(
            (name) => existsSync(path.join(binDirectory, `${name}${extension}`)),
        ),
    );
}

function runPostgresBinary(binDirectory, executable, args, options = {}) {
    const extension = process.platform === "win32" ? ".exe" : "";
    const result = spawnSync(
        path.join(binDirectory, `${executable}${extension}`),
        args,
        { encoding: "utf8", timeout: commandTimeout, ...options },
    );
    if (result.error || result.status !== 0) {
        throw new Error(
            `${executable} falló: ${result.error?.message || result.stderr || result.status}`,
        );
    }
}

async function reserveLoopbackPort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address();
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
    return port;
}

export async function withPostgresTestCluster(callback) {
    const binDirectory = findPostgresBinDirectory();
    if (!hasPostgresTestBinaries()) {
        throw new Error("Instala PostgreSQL local o define PG_BIN para las pruebas SQL.");
    }

    const tempDirectory = await mkdtemp(path.join(tmpdir(), "mi-casa-postgres-test-"));
    const dataDirectory = path.join(tempDirectory, "data");
    const logPath = path.join(tempDirectory, "postgres.log");
    const port = await reserveLoopbackPort();
    let serverStarted = false;
    let pool;

    try {
        runPostgresBinary(binDirectory, "initdb", [
            "-D", dataDirectory,
            "-U", "postgres",
            "--auth=trust",
            "--encoding=UTF8",
            "--no-locale",
            "--no-sync",
        ], {
            env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: String(port) },
        });
        runPostgresBinary(binDirectory, "pg_ctl", [
            "start",
            "-D", dataDirectory,
            "-l", logPath,
            "-w",
            "-t", "60",
            "-o", `-h 127.0.0.1 -p ${port} -c listen_addresses=127.0.0.1 -c fsync=off`,
        ], { stdio: "ignore" });
        serverStarted = true;
        pool = new Pool({
            host: "127.0.0.1",
            port,
            user: "postgres",
            database: "postgres",
            ssl: false,
            connectionTimeoutMillis: 10_000,
        });
        await callback(pool, port);
    } finally {
        if (pool) {
            await pool.end();
        }
        try {
            if (serverStarted) {
                runPostgresBinary(binDirectory, "pg_ctl", [
                    "stop", "-D", dataDirectory, "-m", "fast", "-w",
                ], { stdio: "ignore" });
            }
        } finally {
            await rm(tempDirectory, { recursive: true, force: true });
        }
    }
}
