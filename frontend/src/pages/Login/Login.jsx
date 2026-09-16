import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const usuariosDemo = [
    {
        username: "luis",
        password: "luis",
        name: "Luis",
        role: "admin",
        label: "Administrador",
    },
    {
        username: "maria",
        password: "maria",
        name: "María",
        role: "empleado",
        label: "Empleado",
    },
    {
        username: "fernando",
        password: "fernando",
        name: "Fernando",
        role: "cliente",
        label: "Cliente",
    },
];

function Login() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const usuarioEncontrado = usuariosDemo.find(
            (usuario) =>
                usuario.username === form.username.trim().toLowerCase() &&
                usuario.password === form.password.trim()
        );

        if (!usuarioEncontrado) {
            setError("Usuario o contraseña incorrectos.");
            return;
        }

        login({
            ...usuarioEncontrado,
            username: usuarioEncontrado.username,
            role: usuarioEncontrado.role,
        });

        if (usuarioEncontrado.role === "cliente") {
            navigate("/cliente");
            return;
        }

        navigate("/dashboard");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff6e5,_#f8f5f2_40%,_#efe9e0)] p-6">
            <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.12)] lg:grid-cols-2">
                <div className="relative hidden min-h-[620px] bg-slate-900 lg:block">
                    <img
                        src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80"
                        alt="Restaurante"
                        className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Mi Casa</p>
                        <h2 className="mt-4 text-4xl font-black">Disfruta de la mejor experiencia gastronómica.</h2>
                    </div>
                </div>

                <div className="flex items-center justify-center p-8 md:p-12">
                    <div className="w-full max-w-md">
                        <div className="mb-8 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-600">Acceso</p>
                            <h1 className="mt-3 text-4xl font-black text-slate-900">Iniciar sesión</h1>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Usuario</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="Ingrese su usuario"
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Ingrese su contraseña"
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                                Entrar al sistema
                            </button>
                        </form>

                        <div className="mt-8 rounded-2xl bg-amber-50 p-4 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">Cuentas demo:</p>
                            <ul className="mt-2 space-y-1">
                                <li>Administrador: luis / luis</li>
                                <li>Empleado: maria / maria</li>
                                <li>Cliente: fernando / fernando</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;