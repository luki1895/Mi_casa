import app from "./app.js";
import pool from "./config/db.js";

const PORT = Number(process.env.PORT || 3000);

try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
        console.log(`Servidor iniciado en puerto ${PORT}`);
    });
} catch (error) {
    console.error("No se pudo conectar a PostgreSQL; el servidor no se inició:", error.message);
    await pool.end();
    process.exitCode = 1;
}