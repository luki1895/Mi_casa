import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import fechaRestaurante from "../../utils/fechaRestaurante";

const services = [
  "Cocina casera y artesanal",
  "Atención cálida y personalizada",
  "Ambiente familiar y elegante",
];

function LandingPage() {
  const [menu, setMenu] = useState([]);
  const [menuError, setMenuError] = useState("");

  useEffect(() => {
    api.get("/menu", { params: { fecha: fechaRestaurante() } })
      .then(({ data }) => setMenu(data.data || []))
      .catch((error) => setMenuError(error.response?.data?.mensaje || "No se pudo cargar el menú."));
  }, []);

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

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-full px-3 py-2.5 text-sm font-semibold text-[#403330] hover:bg-white/70 sm:px-5"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/reservar-platos"
              className="rounded-full border border-[#d9bda7] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#403330] shadow-sm hover:bg-[#fffaf5] sm:px-5"
            >
              Reservar platos
            </Link>
          </div>
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
              <Link
                to="/reservar-platos"
                className="rounded-full bg-[#b85c3b] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(184,92,59,0.25)] hover:bg-[#8f422d]"
              >
                Reservar platos
              </Link>
              <Link
                to="#menu"
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

        <section id="menu" className="mt-20 scroll-mt-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b85c3b]">Nuestra carta</p>
            <h2 className="mt-3 text-3xl font-black text-[#1f1a17] md:text-4xl">Platos que marcan la diferencia</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {menuError && <p role="alert" className="md:col-span-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{menuError}</p>}
            {!menuError && menu.length === 0 && <p className="md:col-span-2 rounded-xl bg-white p-4 text-center text-sm text-[#5f4d48]">No hay platos disponibles en el menú de hoy.</p>}
            {menu.map((dish) => (
              <article key={dish.id_producto} className="soft-card p-5">
                {dish.imagen_url
                  ? <img src={dish.imagen_url} alt={dish.nombre} className="mb-5 h-40 w-full rounded-[22px] object-cover" />
                  : <div aria-hidden="true" className="mb-5 flex h-40 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f9dfb1] via-[#f7e8d0] to-[#f9f2ea] text-5xl shadow-inner">🍽️</div>}
                <h3 className="text-xl font-bold text-[#1f1a17]">{dish.nombre}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f4d48]">{dish.categoria}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-black text-[#b85c3b]">Bs {dish.precio}</span>
                  <Link to="/reservar-platos" className="rounded-full bg-[#1f1a17] px-3 py-2 text-xs font-semibold text-white hover:bg-[#342d29]">Reservar</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[32px] bg-[#201c1a] p-8 text-white shadow-[0_18px_50px_rgba(29,25,22,0.18)] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f4d7ac]">Reservas</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Elige tus platos con anticipación.</h2>
              <p className="mt-4 max-w-lg text-[#d4c3bd]">
                Consulta el menú disponible y envía tu solicitud de reserva sin crear una cuenta. La disponibilidad se confirma al registrar la solicitud.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] bg-white/5 p-4 md:col-span-2">
                  <p className="text-sm text-[#dcc5bb]">Sin registro de cuenta</p>
                  <p className="mt-2 text-xl font-bold">Recibe un enlace privado para administrar tu solicitud.</p>
                </div>
              </div>
              <Link
                to="/reservar-platos"
                className="mt-6 w-full rounded-full bg-[#f4d7ac] px-5 py-3.5 text-sm font-bold text-[#1f1a17] hover:bg-[#e7c98a]"
              >
                Reservar platos
              </Link>
              <Link to="/eventos-privados" className="mt-3 block text-center text-sm font-semibold text-[#f4d7ac] underline">
                Consultar por eventos privados
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default LandingPage;
