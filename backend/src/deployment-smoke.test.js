import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { X509Certificate } from "node:crypto";
import { fileURLToPath } from "node:url";
import app from "./index.js";
import pool from "./config/db.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));

test("backend entry files pass Node syntax checks", () => {
    for (const file of [
        "src/config/db.js",
        "src/index.js",
        "src/server.js",
        "src/app.js",
    ]) {
        const result = spawnSync(process.execPath, ["--check", path.join(backendDirectory, file)], {
            encoding: "utf8",
        });
        assert.equal(result.status, 0, `${file}: ${result.stderr}`);
    }
});

test("the Vercel entry handles the health route without starting a local listener", async () => {
    const server = createServer(app);
    const address = await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => resolve(server.address()));
    });

    try {
        const response = await fetch(`http://127.0.0.1:${address.port}/`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            mensaje: "Backend Mi Casa funcionando",
        });
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
        await pool.end();
    }
});

test("Vercel config is valid and targets the exported function", async () => {
    const configPath = path.join(backendDirectory, "vercel.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));

    assert.equal(typeof config.functions["src/index.js"].includeFiles, "string");
    assert.equal(config.functions["src/index.js"].includeFiles, "**/*.crt");
});

test("the local CA exists and is a valid CA certificate", async () => {
    const certificatePath = path.join(backendDirectory, "prod-ca-2021.crt");
    const contents = await readFile(certificatePath, "utf8");
    const certificate = new X509Certificate(contents);

    assert.equal(certificate.ca, true);
});

test("inline CA env config takes precedence over a file path and keeps TLS verification on", async () => {
    const certificatePem = await readFile(
        path.join(backendDirectory, "prod-ca-2021.crt"),
        "utf8",
    );
    const certificate = spawnSync(
        process.execPath,
        [
            "--input-type=module",
            "-e",
            `const { default: pool } = await import("./src/config/db.js");
             console.log("TLS_CONFIG:" + JSON.stringify({
                 rejectUnauthorized: pool.options.ssl.rejectUnauthorized,
                 hasCa: Boolean(pool.options.ssl.ca)
             }));
             await pool.end();`,
        ],
        {
            cwd: backendDirectory,
            encoding: "utf8",
            env: {
                ...process.env,
                DATABASE_URL: "postgresql://test:test@127.0.0.1/test",
                PGSSLROOTCERT: "certificate-that-is-not-packaged.crt",
                PGSSLROOTCERT_PEM: certificatePem,
            },
        },
    );

    assert.equal(certificate.status, 0, certificate.stderr);
    const configLine = certificate.stdout
        .split(/\r?\n/)
        .find((line) => line.startsWith("TLS_CONFIG:"));
    assert.ok(configLine, "child process should report only TLS config flags");

    const config = JSON.parse(configLine.slice("TLS_CONFIG:".length));
    assert.equal(config.rejectUnauthorized, true);
});
