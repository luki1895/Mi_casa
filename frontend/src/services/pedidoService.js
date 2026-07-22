import api from "../api/axios";

const pedidoService={

obtenerTodos:()=>api.get("/pedidos"),

crear:(datos)=>api.post("/pedidos",datos),

detalle:(id)=>api.get(`/pedidos/${id}`),

cancelar:(id)=>api.put(`/pedidos/${id}/cancelar`)

};

export default pedidoService;