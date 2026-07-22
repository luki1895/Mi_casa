import api from "../api/axios";

const clienteService={

obtenerTodos:()=>api.get("/clientes"),

obtenerPorId:(id)=>api.get(`/clientes/${id}`),

crear:(datos)=>api.post("/clientes",datos),

actualizar:(id,datos)=>api.put(`/clientes/${id}`,datos),

eliminar:(id)=>api.delete(`/clientes/${id}`)

};

export default clienteService;