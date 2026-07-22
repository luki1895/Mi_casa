import api from "../api/axios";

const usuarioService={

listar:()=>api.get("/usuarios"),

crear:(datos)=>api.post("/usuarios",datos),

editar:(id,datos)=>api.put(`/usuarios/${id}`,datos),

eliminar:(id)=>api.delete(`/usuarios/${id}`)

};

export default usuarioService;