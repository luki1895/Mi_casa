import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
const app = express();
app.use("/api/auth",authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
    res.json({
        mensaje: "Backend Mi Casa funcionando"
    });
});

export default app;