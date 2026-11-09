import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pool from "./config/db.js";

const migrationDir = fileURLToPath(new URL("./migrations", import.meta.url));

try {
    const files = (await readdir(migrationDir))
        .filter((file) => file.endsWith(".sql"))
        .sort();

    for (const file of files) {
        const filePath = fileURLToPath(new URL(`./migrations/${file}`, import.meta.url));
        const sql = await readFile(filePath, "utf8");
        await pool.query(sql);
        console.log(`Migración ${file} aplicada correctamente.`);
    }
} catch (error) {
    console.error("No se pudo aplicar la migración:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
