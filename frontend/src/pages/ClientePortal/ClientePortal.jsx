import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const consumo = [
    { fecha: "12 Sep", descripcion: "Almuerzo ejecutivo", monto: "Bs 85" },
    { fecha: "08 Sep", descripcion: "Cena familiar", monto: "Bs 120" },
    { fecha: "03 Sep", descripcion: "Desayuno gourmet", monto: "Bs 65" },
];

const beneficios = [
    { label: "Almuerzos restantes", value: "4" },
    { label: "Puntos activos", value: "320" },
    { label: "Reservas", value: "2" },
];

const planSemanal = [
    { dia: "Lun", comida: "Almuerzo ejecutivo" },
    { dia: "Mar", comida: "Cena familiar" },
    { dia: "Jue", comida: "Reserva especial" },
    { dia: "Vie", comida: "Menú premium" },
];

function ClientePortal() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-[#f8f5f2] text-slate-800">
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Mi Casa</p>
                        <h1 className="text-2xl font-black text-slate-900">Portal del cliente</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Bienvenido</p>
                            <p className="font-semibold text-slate-900">{usuario?.name || "Fernando"}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-10">
                <section className="grid gap-6 md:grid-cols-3">
                    {beneficios.map((item) => (
                        <div key={item.label} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                            <p className="mt-4 text-4xl font-black text-slate-900">{item.value}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900">Último consumo</h2>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Activo
                            </span>
                        </div>

                        <div className="space-y-4">
                            {consumo.map((item) => (
                                <div key={`${item.fecha}-${item.descripcion}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                                    <div>
                                        <p className="text-sm text-slate-500">{item.fecha}</p>
                                        <p className="font-semibold text-slate-800">{item.descripcion}</p>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900">{item.monto}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 p-6 text-white shadow-lg">
                        <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Resumen</p>
                        <h2 className="mt-4 text-3xl font-black">Tu experiencia</h2>

                        <div className="mt-8 space-y-5">
                            <div>
                                <p className="text-sm text-slate-200">Cuenta premium</p>
                                <p className="mt-1 text-2xl font-bold">Activa</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-200">Próxima reserva</p>
                                <p className="mt-1 text-2xl font-bold">Viernes 18:30</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-200">Historial</p>
                                <p className="mt-1 text-2xl font-bold">12 visitas</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900">Tu plan semanal</h3>
                        <div className="mt-6 space-y-4">
                            {planSemanal.map((item) => (
                                <div key={item.dia} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                                    <div>
                                        <p className="text-sm text-slate-500">{item.dia}</p>
                                        <p className="font-semibold text-slate-800">{item.comida}</p>
                                    </div>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Confirmado</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm ring-1 ring-amber-100">
                        <p className="text-sm uppercase tracking-[0.2em] text-amber-700">Recomendaciones</p>
                        <h3 className="mt-3 text-2xl font-black text-slate-900">Próximas sugerencias</h3>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <p className="text-2xl">🍲</p>
                                <p className="mt-3 font-bold text-slate-900">Menú saludable</p>
                                <p className="text-sm text-slate-600">Perfecto para una comida ligera.</p>
                            </div>
                            <div className="rounded-2xl bg-white p-4 shadow-sm">
                                <p className="text-2xl">🥂</p>
                                <p className="mt-3 font-bold text-slate-900">Cena romántica</p>
                                <p className="text-sm text-slate-600">Ideal para celebrar en pareja.</p>
                            </div>
                            <div className="rounded-2xl bg-white p-4 shadow-sm sm:col-span-2">
                                <p className="text-2xl">🎁</p>
                                <p className="mt-3 font-bold text-slate-900">Beneficio especial</p>
                                <p className="text-sm text-slate-600">Acumulas puntos dobles en tus próximas visitas durante esta semana.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default ClientePortal;
