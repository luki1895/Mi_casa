import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Configúrala en backend/.env o en el entorno del servidor.");
}

let parsedConnectionString;

try {
    parsedConnectionString = new URL(connectionString);
} catch {
    throw new Error("DATABASE_URL no es una URL válida de PostgreSQL.");
}

if (!["postgres:", "postgresql:"].includes(parsedConnectionString.protocol)) {
    throw new Error("DATABASE_URL debe usar el protocolo postgres:// o postgresql://.");
}

if (
    !parsedConnectionString.hostname
    || !parsedConnectionString.username
    || !parsedConnectionString.password
    || parsedConnectionString.pathname.length < 2
) {
    throw new Error("DATABASE_URL debe incluir host, usuario y contraseña.");
}

const sslMode = parsedConnectionString.searchParams.get("sslmode")?.toLowerCase();

if (sslMode && !["require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw new Error("DATABASE_URL debe usar sslmode=require o una modalidad de verificación más estricta.");
}

const rootCertificatePath = process.env.PGSSLROOTCERT?.trim();
const ssl = { rejectUnauthorized: true };

if (rootCertificatePath) {
    try {
        ssl.ca = await readFile(
            path.isAbsolute(rootCertificatePath)
                ? rootCertificatePath
                : path.resolve(backendDirectory, rootCertificatePath),
            "utf8",
        );
    } catch (error) {
        throw new Error(`No se pudo leer el certificado raíz PGSSLROOTCERT: ${error.message}`);
    }
}

const pool = new Pool({
    host: parsedConnectionString.hostname,
    port: parsedConnectionString.port ? Number(parsedConnectionString.port) : 5432,
    user: decodeURIComponent(parsedConnectionString.username),
    password: decodeURIComponent(parsedConnectionString.password),
    database: decodeURIComponent(parsedConnectionString.pathname.slice(1)),
    ssl,
    connectionTimeoutMillis: 10000,
    max: 10,
});

export default pool;