import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({

    host: process.env.DB_HOST || "localhost",

    user: process.env.DB_USER || "postgres",

    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME || "mi_casa",

    port: Number(process.env.DB_PORT || 5432),

    max: 10

});

export default pool;