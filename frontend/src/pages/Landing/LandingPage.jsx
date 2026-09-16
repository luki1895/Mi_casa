import { Link, useNavigate } from "react-router-dom";

const estadisticas = [
    { label: "Especialidades", value: "18+" },
    { label: "Clientes felices", value: "1.2k" },
    { label: "Servicio", value: "24/7" },
];

const servicios = [
    "Menú ejecutivo del día",
    "Cocina fresca y casera",
    "Atención personalizada",
];

const platos = [
    { nombre: "Lomo a la parrilla", descripcion: "Con papas rústicas y salsa de hierbas", precio: "Bs 78" },
    { nombre: "Ceviche Mi Casa", descripcion: "Mariscos frescos, limón y ají", precio: "Bs 65" },
    { nombre: "Risotto de hongos", descripcion: "Textura cremosa y sabor intenso", precio: "Bs 72" },
    { nombre: "Pasta al pesto", descripcion: "Bajo sabor, fresco y equilibrado", precio: "Bs 60" },
];

const testimonios = [
    { nombre: "Andrea M.", texto: "Excelente atención, ambiente acogedor y una comida con toque elegante." },
    { nombre: "Carlos T.", texto: "La mejor experiencia para reunirme con mi familia. Todo muy bien cuidado." },
    { nombre: "Nora L.", texto: "La calidad del servicio y la cocina superan las expectativas cada vez." },
];

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#f8f5f2] text-slate-800">
            <header className="relative h-[620px] overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1600&q=80"
                    alt="Restaurante moderno"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/55" />

                <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/90 text-lg font-bold text-slate-900">
                            M
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">Mi Casa</p>
                            <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Restaurant</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20">
                            Iniciar sesión
                        </Link>
                    </div>
                </nav>

                <div className="relative z-10 mx-auto flex max-w-7xl items-center px-6 pt-16 lg:px-12">
                    <div className="max-w-2xl rounded-[32px] border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-md">
                        <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-amber-200">
                            Experiencia gastronómica premium
                        </p>
                        <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
                            Sabores que hacen sentirte en casa.
                        </h1>
                        <p className="mt-5 text-base text-slate-200 md:text-lg">
                            Cocina de autor, ambiente acogedor y un servicio pensado para hacer de cada visita una experiencia inolvidable.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <button
                                onClick={() => navigate("/login")}
                                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
                            >
                                Reservar ahora
                            </button>
                            <Link
                                to="/login"
                                className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                Ver menú
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
                <section className="grid gap-6 md:grid-cols-3">
                    {estadisticas.map((item) => (
                        <div key={item.label} className="rounded-3xl border border-amber-100 bg-white p-6 shadow-md shadow-amber-100/50">
                            <p className="text-3xl font-black text-slate-900">{item.value}</p>
                            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Nuestro compromiso</p>
                        <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">
                            Un lugar pensado para compartir momentos especiales.
                        </h2>
                        <div className="mt-8 space-y-4">
                            {servicios.map((servicio) => (
                                <div key={servicio} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">✓</span>
                                    <p className="text-lg text-slate-700">{servicio}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[32px] bg-white p-3 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                        <img
                            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
                            alt="Interior del restaurante"
                            className="h-[480px] w-full rounded-[24px] object-cover"
                        />
                    </div>
                </section>

                <section className="mt-20">
                    <div className="mb-8 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Nuestra carta</p>
                        <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">Platos destacados</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {platos.map((plato) => (
                            <article key={plato.nombre} className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                                <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 text-5xl">
                                    🍽️
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{plato.nombre}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{plato.descripcion}</p>
                                <div className="mt-5 flex items-center justify-between">
                                    <span className="text-lg font-black text-amber-700">{plato.precio}</span>
                                    <button className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Agregar</button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-20 rounded-[32px] bg-slate-900 p-8 text-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] md:p-12">
                    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">Reservas</p>
                            <h2 className="mt-3 text-3xl font-black md:text-4xl">Asegura tu mesa para momentos inolvidables.</h2>
                            <p className="mt-4 max-w-lg text-slate-300">
                                Diseña comidas con amigos, reuniones familiares o citas especiales. Te acompañamos con atención personalizada.
                            </p>
                        </div>

                        <div className="rounded-[28px] bg-white/5 p-6 ring-1 ring-white/10">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-white/5 p-4">
                                    <p className="text-sm text-slate-300">Fecha</p>
                                    <p className="mt-2 text-xl font-bold">Viernes, 18:30</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4">
                                    <p className="text-sm text-slate-300">Mesa</p>
                                    <p className="mt-2 text-xl font-bold">2 personas</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 md:col-span-2">
                                    <p className="text-sm text-slate-300">Especial</p>
                                    <p className="mt-2 text-xl font-bold">Cena romántica con vino</p>
                                </div>
                            </div>
                            <button onClick={() => navigate("/login")} className="mt-6 w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-300">
                                Reservar mesa
                            </button>
                        </div>
                    </div>
                </section>

                <section className="mt-20">
                    <div className="mb-8 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Testimonios</p>
                        <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">Lo que dicen nuestros clientes</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {testimonios.map((item) => (
                            <div key={item.nombre} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                                <div className="mb-4 flex items-center gap-1 text-amber-400">★★★★★</div>
                                <p className="text-slate-600">“{item.texto}”</p>
                                <div className="mt-5 border-t border-slate-200 pt-4">
                                    <p className="font-bold text-slate-900">{item.nombre}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default LandingPage;
