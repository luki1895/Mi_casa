const roleAliases = new Map([
    ["admin", "admin"],
    ["administrador", "admin"],
    ["administrator", "admin"],
    ["caja", "caja"],
    ["cajero", "caja"],
    ["mesero", "mesero"],
    ["mesera", "mesero"],
    ["cliente", "cliente"],
    ["empleado", "empleado"],
]);

export function normalizeRole(value) {
    const role = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, " ");

    return roleAliases.get(role) || role;
}

export function normalizeSession(session) {
    if (!session || typeof session !== "object") return null;

    const role = normalizeRole(session.role ?? session.rol);
    if (!role) return null;

    return { ...session, role };
}
