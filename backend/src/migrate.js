import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";

const migrationPath = fileURLToPath(new URL("./migrations/001_operaciones_restaurante.sql", import.meta.url));

try {
    const sql = await readFile(migrationPath, "utf8");
    await pool.query(sql);
    console.log("Migración 001 aplicada correctamente.");
} catch (error) {
    console.error("No se pudo aplicar la migración 001:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
