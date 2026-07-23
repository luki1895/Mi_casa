import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import clienteRoutes from "./routes/cliente.routes.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import configuracionRoutes from "./routes/configuracion.routes.js";
import pedidoRoutes from "./routes/pedido.routes.js";
import produccionRoutes from "./routes/produccion.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/pedidos",pedidoRoutes);
app.use("/api/produccion",produccionRoutes);

app.get("/", (req, res) => {
    res.json({
        mensaje: "Backend Mi Casa funcionando"
    });
});

export default app;