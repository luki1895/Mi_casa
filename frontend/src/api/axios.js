import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV
        ? "http://localhost:3000/api"
        : "https://micasa-backend-tau.vercel.app/api");

const api = axios.create({
baseURL,
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
