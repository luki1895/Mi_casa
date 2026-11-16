
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { X509Certificate } from "node:crypto";
import { Pool } from "pg";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));

dotenv.config({
    path: path.join(backendDirectory, ".env"),
});

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Configúrala en backend/.env o en Vercel.");
}

let parsedConnectionString;

try {
    parsedConnectionString = new URL(connectionString);
} catch {
    throw new Error("DATABASE_URL no es una URL válida de PostgreSQL.");
}

if (!["postgres:", "postgresql:"].includes(parsedConnectionString.protocol)) {
    throw new Error("DATABASE_URL debe utilizar postgres:// o postgresql://.");
}

if (
    !parsedConnectionString.hostname ||
    !parsedConnectionString.username ||
    !parsedConnectionString.password ||
    parsedConnectionString.pathname.length < 2
) {
    throw new Error("DATABASE_URL debe incluir host, usuario y contraseña.");
}

const sslMode = parsedConnectionString.searchParams.get("sslmode")?.toLowerCase();

if (
    sslMode &&
    !["require", "verify-ca", "verify-full"].includes(sslMode)
) {
    throw new Error("DATABASE_URL tiene un sslmode no permitido.");
}

const rootCertificatePath = process.env.PGSSLROOTCERT?.trim();

// Permite PEM con saltos de línea reales o escritos como \n.
const rootCertificatePem = process.env.PGSSLROOTCERT_PEM
    ?.replace(/\\n/g, "\n")
    .trim();

const ssl = {
    rejectUnauthorized: true,
};

const validateRootCertificate = (certificate) => {
    const certificates = certificate.match(
        /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
    );

    const contentWithoutCertificates = certificate.replace(
        /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
        ""
    );

    if (!certificates?.length || contentWithoutCertificates.trim()) {
        throw new Error("El certificado raíz debe contener certificados PEM válidos.");
    }

    for (const pem of certificates) {
        if (!new X509Certificate(pem).ca) {
            throw new Error("PGSSLROOTCERT debe contener certificados de autoridad (CA).");
        }
    }

    return certificate;
};

// Primero utiliza el certificado PEM de Vercel.
// Si no existe, busca el archivo local.
if (rootCertificatePem) {
    ssl.ca = validateRootCertificate(rootCertificatePem);

} else if (rootCertificatePath) {
    try {
        const certificatePath = path.isAbsolute(rootCertificatePath)
            ? rootCertificatePath
            : path.resolve(backendDirectory, rootCertificatePath);

        const certificate = await readFile(certificatePath, "utf8");

        ssl.ca = validateRootCertificate(certificate);

    } catch (error) {
        throw new Error(
            `No se pudo cargar el certificado raíz PGSSLROOTCERT: ${error.message}`
        );
    }
}

const pool = new Pool({
    host: parsedConnectionString.hostname,
    port: parsedConnectionString.port
        ? Number(parsedConnectionString.port)
        : 5432,
    user: decodeURIComponent(parsedConnectionString.username),
    password: decodeURIComponent(parsedConnectionString.password),
    database: decodeURIComponent(parsedConnectionString.pathname.slice(1)),
    ssl,
    connectionTimeoutMillis: 10000,
    max: 10,
});

export default pool;
