const validarCredenciales = (datos) => {
    const usuario = typeof datos?.usuario === "string" ? datos.usuario.trim() : "";
    const password = typeof datos?.password === "string" ? datos.password : "";

    if (!usuario || !password.trim()) {
        throw Object.assign(
            new Error("Debes ingresar tu usuario y contraseña."),
            { status: 400 },
        );
    }

    return { usuario, password };
};

export default validarCredenciales;
