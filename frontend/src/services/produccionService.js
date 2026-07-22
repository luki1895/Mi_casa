import api from "../api/axios";

const produccionService={

listar:()=>api.get("/produccion"),

guardar:(datos)=>api.post("/produccion",datos),

actualizar:(id,datos)=>api.put(`/produccion/${id}`,datos)

};

export default produccionService;