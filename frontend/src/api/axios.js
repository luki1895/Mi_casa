import axios from "axios";
import {
    AUTH_STORAGE_KEY,
    isInvalidSessionResponse,
    notifyInvalidSession,
} from "../auth/sessionEvents";

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
const usuarioGuardado = localStorage.getItem(AUTH_STORAGE_KEY);

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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            isInvalidSessionResponse(error)
            && typeof window !== "undefined"
            && window.localStorage.getItem(AUTH_STORAGE_KEY)
        ) {
            notifyInvalidSession();
        }

        return Promise.reject(error);
    },
);

export default api;
