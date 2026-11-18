import express from "express";
import cors from "cors";
import morgan from "morgan";
import errorMiddleware from "./middlewares/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import clienteRoutes from "./routes/cliente.routes.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import configuracionRoutes from "./routes/configuracion.routes.js";
import pedidoRoutes from "./routes/pedido.routes.js";
import produccionRoutes from "./routes/produccion.routes.js";
import cajaRoutes from "./routes/caja.routes.js";
import gastoRoutes from "./routes/gasto.routes.js";
import reporteRoutes from "./routes/reporte.routes.js";
import productoRoutes from "./routes/producto.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import reservaPlatoRoutes from "./routes/reservaPlato.routes.js";
import atencionMesaRoutes from "./routes/atencionMesa.routes.js";
import eventoPrivadoRoutes from "./routes/eventoPrivado.routes.js";



const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/produccion", produccionRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/gastos", gastoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/reservas-platos", reservaPlatoRoutes);
app.use("/api/atenciones-mesa", atencionMesaRoutes);
app.use("/api/eventos-privados", eventoPrivadoRoutes);

app.get("/", (req, res) => {
    res.json({
        mensaje: "Backend Mi Casa funcionando"
    });
});

app.use(errorMiddleware);

export default app;