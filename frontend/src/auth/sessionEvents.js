export const AUTH_STORAGE_KEY = "mi_casa_usuario";
export const SESSION_INVALID_EVENT = "mi-casa:session-invalid";

export function isInvalidSessionResponse(error) {
    const requestPath = (error.config?.url || "").split("?")[0].replace(/\/+$/, "");
    return error.response?.status === 401 && !requestPath.endsWith("/auth/login");
}

export function notifyInvalidSession() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
    }
}
