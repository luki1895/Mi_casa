import axios from "axios";

const api = axios.create({
baseURL: import.meta.env.VITE_API_URL || "https://micasa-backend-tau.vercel.app/api",
timeout: 10000,
headers: {
"Content-Type": "application/json"
}
});

api.interceptors.request.use((config) => {
const usuarioGuardado = localStorage.getItem("mi_casa_usuario");

if (usuarioGuardado) {
try {
const { token } = JSON.parse(usuarioGuardado);
if (token) config.headers.Authorization = `Bearer ${token}`;
} catch {
localStorage.removeItem("mi_casa_usuario");
}
}

return config;
});

export default api;
