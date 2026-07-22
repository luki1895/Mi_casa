import api from "../api/axios";

const cajaService={

abrir:(datos)=>api.post("/caja/abrir",datos),

cerrar:(datos)=>api.post("/caja/cerrar",datos),

obtener:()=>api.get("/caja"),

registrarGasto:(datos)=>api.post("/gastos",datos)

};

export default cajaService;