import { Link, useNavigate } from "react-router-dom";

const stats = [
  { label: "Especialidades", value: "18+" },
  { label: "Clientes felices", value: "1.2k" },
  { label: "Servicio", value: "24/7" },
];

const services = [
  "Cocina casera y artesanal",
  "Atención cálida y personalizada",
  "Ambiente familiar y elegante",
];

const dishes = [
  { name: "Lomo a la parrilla", description: "Con papas rústicas y salsa de hierbas.", price: "Bs 78" },
  { name: "Ceviche Mi Casa", description: "Mariscos frescos con limón, ají y tradición.", price: "Bs 65" },
  { name: "Risotto de hongos", description: "Textura cremosa y sabor intenso.", price: "Bs 72" },
  { name: "Pasta al pesto", description: "Frescura de la cocina con un toque moderno.", price: "Bs 60" },
];

const reviews = [
  { name: "Andrea M.", text: "Excelente atención, ambiente encantador y una comida con sabor auténtico." },
  { name: "Carlos T.", text: "La mejor experiencia para reunirme con mi familia. Todo muy bien cuidado." },
  { name: "Nora L.", text: "La calidad del servicio y la cocina superan las expectativas cada vez." },
];

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#1f1a17]">
      <header className="relative overflow-hidden bg-[#f7f3ee]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(184,92,59,0.18),_transparent_40%)]" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
          <div className="flex items-center gap-4">
            <img src="/logo-mi-casa.svg" alt="Mi Casa" className="h-16 w-16 rounded-full object-cover shadow-[0_12px_30px_rgba(184,92,59,0.18)]" />
            <div>
              <p className="text-2xl font-black tracking-tight text-[#b85c3b]">Mi Casa</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#7d5b50]">Sabor y tradición</p>
            </div>
          </div>

          <Link
            to="/login"
            className="rounded-full border border-[#d9bda7] bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#403330] shadow-sm hover:bg-[#fffaf5]"
          >
            Iniciar sesión
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-12">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.30em] text-[#b85c3b]">
              Experiencia gastronómica premium
            </p>
            <h1 className="max-w-xl text-5xl font-black leading-[0.92] text-[#1f1a17] md:text-7xl">
              Sabor y tradición en un solo lugar.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#5f4d48]">
              Una propuesta moderna para disfrutar de comida casera, atención cálida y momentos memorables con familia y amigos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/login")}
                className="rounded-full bg-[#b85c3b] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(184,92,59,0.25)] hover:bg-[#8f422d]"
              >
                Reservar ahora
              </button>
              <Link
                to="/login"
                className="rounded-full border border-[#d9bda7] bg-white px-7 py-3.5 text-sm font-semibold text-[#2f261f] hover:bg-[#fffaf5]"
              >
                Ver menú
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#f4d7ac] blur-3xl" />
            <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#d58a67] opacity-25 blur-3xl" />
            <div className="soft-card relative overflow-hidden p-3">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
                alt="Interior de Mi Casa"
                className="h-[520px] w-full rounded-[24px] object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <section className="grid gap-6 md:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="soft-card flex flex-col justify-between p-7">
              <p className="text-4xl font-black text-[#1f1a17]">{item.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7d5b50]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b85c3b]">Nuestro compromiso</p>
            <h2 className="mt-3 text-3xl font-black text-[#1f1a17] md:text-4xl">
              Todo está pensado para que te sientas en casa.
            </h2>
            <div className="mt-8 space-y-4">
              {services.map((service) => (
                <div key={service} className="flex items-center gap-4 rounded-[22px] border border-[#eaded2] bg-white p-4 shadow-[0_12px_25px_rgba(31,26,23,0.04)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fbe7c8] text-lg text-[#b85c3b]">✓</span>
                  <p className="text-lg text-[#3a2d28]">{service}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card p-4">
            <img
              src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80"
              alt="Chef preparando comida"
              className="h-[400px] w-full rounded-[24px] object-cover"
            />
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b85c3b]">Nuestra carta</p>
            <h2 className="mt-3 text-3xl font-black text-[#1f1a17] md:text-4xl">Platos que marcan la diferencia</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {dishes.map((dish) => (
              <article key={dish.name} className="soft-card p-5">
                <div className="mb-5 flex h-40 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f9dfb1] via-[#f7e8d0] to-[#f9f2ea] text-5xl shadow-inner">
                  🍽️
                </div>
                <h3 className="text-xl font-bold text-[#1f1a17]">{dish.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f4d48]">{dish.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-black text-[#b85c3b]">{dish.price}</span>
                  <button className="rounded-full bg-[#1f1a17] px-3 py-2 text-xs font-semibold text-white hover:bg-[#342d29]">
                    Agregar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[32px] bg-[#201c1a] p-8 text-white shadow-[0_18px_50px_rgba(29,25,22,0.18)] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f4d7ac]">Reservas</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Asegura tu mesa para momentos inolvidables.</h2>
              <p className="mt-4 max-w-lg text-[#d4c3bd]">
                Diseño de cenas, reuniones familiares y encuentros especiales con un servicio atento y una experiencia gastronómica impecable.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] bg-white/5 p-4">
                  <p className="text-sm text-[#dcc5bb]">Fecha</p>
                  <p className="mt-2 text-xl font-bold">Viernes · 18:30</p>
                </div>
                <div className="rounded-[20px] bg-white/5 p-4">
                  <p className="text-sm text-[#dcc5bb]">Mesa</p>
                  <p className="mt-2 text-xl font-bold">2 personas</p>
                </div>
                <div className="rounded-[20px] bg-white/5 p-4 md:col-span-2">
                  <p className="text-sm text-[#dcc5bb]">Especial</p>
                  <p className="mt-2 text-xl font-bold">Cena romántica con vino</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="mt-6 w-full rounded-full bg-[#f4d7ac] px-5 py-3.5 text-sm font-bold text-[#1f1a17] hover:bg-[#e7c98a]"
              >
                Reservar ahora
              </button>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b85c3b]">Testimonios</p>
            <h2 className="mt-3 text-3xl font-black text-[#1f1a17] md:text-4xl">Lo que dicen nuestros clientes</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((item) => (
              <div key={item.name} className="soft-card p-6">
                <div className="mb-4 text-lg text-[#d59f52]">★★★★★</div>
                <p className="text-base leading-7 text-[#4b3d38]">“{item.text}”</p>
                <div className="mt-5 border-t border-[#eaded2] pt-4">
                  <p className="font-bold text-[#1f1a17]">{item.name}</p>
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
