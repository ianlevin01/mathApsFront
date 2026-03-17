import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Header from "./components/Header";
import Login from "./auth.jsx";
import ChatView from "./components/ChatView";
import StudyHub from "./components/StudyHub";
import FolderChatView from "./components/FolderChatView";
import TermsOfService from "./components/TermsOfService";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Flashcards from "./components/Flashcards";
import DevQuestions from "./components/DevQuestions";
import AccountPage from "./components/AccountPage";
import PlansPage from "./components/PlansPage";
import { getToken, removeToken } from "./auth.js";
import { normalizeMath } from "./utils/mathUtils";
import { interpretPlot } from "./utils/plotInterpreter";
import VerifyEmail from "./components/VerifyEmail";
import ResetPassword from "./components/ResetPassword";
import "./App.css";
import "./styles/chat.css";
import "./styles/study.css";
import "./styles/plans.css";
import "./styles/chat_additions.css";
import "./index.css";
import "katex/dist/katex.min.css";

const PLANS = [
  {
    id: "free",
    badge: null,
    name: "Free",
    price: "0",
    period: "/mes",
    desc: "Para probar la plataforma y resolver problemas basicos.",
    features: [
      "Hasta 150 mensajes con IA por mes",
      "Graficos limitados",
      "Hasta 3 carpetas",
      "Flashcards basicas",
      "Exportacion simple",
    ],
    buttonText: "Empezar gratis",
    buttonClass: "plan-button plan-button--ghost",
    footnote: "Sin tarjeta - Acceso inmediato",
  },
  {
    id: "plus",
    badge: "Recomendado",
    name: "Plus",
    price: "4.99",
    period: "/mes",
    desc: "Resolucion de ejercicios, organizacion academica y metodos de estudio en una sola plataforma.",
    features: [
      "Carpetas ilimitadas para organizar materias",
      "Hasta 500 mensajes con IA por mes",
      "Flashcards ilimitadas",
      "Modelos matematicos avanzados",
      "Seguimiento de progreso por materia",
      "Exportacion de examenes en PDF",
    ],
    buttonText: "Pasar a Plus",
    buttonClass: "plan-button plan-button--primary",
    footnote: "Cancelas cuando quieras - Soporte prioritario",
  },
  {
    id: "pro",
    badge: "Mas completo",
    name: "Pro",
    price: "9.99",
    period: "/mes",
    desc: "Capacidades extendidas y herramientas avanzadas para optimizar tu estudio al maximo.",
    features: [
      "Hasta 2000 mensajes con IA por mes",
      "Prioridad de procesamiento",
      "Acceso a los mejores modelos matematicos",
      "Resumenes automaticos por carpeta",
      "Estadisticas avanzadas de progreso",
      "Acceso anticipado a nuevas funcionalidades",
    ],
    buttonText: "Pasar a Pro",
    buttonClass: "plan-button plan-button--primary",
    footnote: "Cancelas cuando quieras - Soporte premium 24/7",
  },
];

const FEATURES = [
  {
    icon: "\u{1F9EE}",
    title: "Resolucion paso a paso",
    desc: "La IA desglosa cada problema en pasos claros y explicados. Aprendes el razonamiento, no solo la respuesta.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Graficador 2D y 3D",
    desc: "Visualiza funciones, superficies y puntos criticos en tiempo real. Ideal para calculo, algebra y geometria.",
  },
  {
    icon: "\u{1F5C2}\uFE0F",
    title: "Organiza por materia",
    desc: "Crea carpetas por materia o parcial. Todos tus chats y apuntes en un solo lugar, siempre accesibles.",
  },
  {
    icon: "\u{1F9E0}",
    title: "Flashcards automaticas",
    desc: "Genera tarjetas de repaso desde tus conversaciones. Repasa conceptos clave antes del examen.",
  },
  {
    icon: "\u{1F4F7}",
    title: "Resolve desde imagen",
    desc: "Sacale foto al enunciado o pega una imagen. La IA reconoce el problema y lo resuelve al instante.",
  },
  {
    icon: "\u{1F4C4}",
    title: "Exporta tu contenido",
    desc: "Descarga resoluciones y resumenes en PDF. Perfectos para llevar a la facu o compartir.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Escribi o pega tu problema",
    desc: "Texto, formula o foto de un enunciado. MathAPS lo entiende todo.",
  },
  {
    num: "02",
    title: "La IA lo analiza y resuelve",
    desc: "Paso a paso, con explicaciones en lenguaje natural y notacion matematica precisa.",
  },
  {
    num: "03",
    title: "Entiendes y avanzas",
    desc: "Pregunta mas, genera flashcards y organiza todo por materia para el parcial.",
  },
];

const TESTIMONIALS = [
  {
    name: "Valentina M.",
    role: "Estudiante de Ingenieria, UTN",
    initial: "V",
    color: "",
    stars: 5,
    text: "Antes me quedaba horas trabada en un ejercicio de Analisis. Con MathAPS entiendo el razonamiento paso a paso, no solo la respuesta. Aprobe el parcial con 8.",
  },
  {
    name: "Tomas R.",
    role: "CBC, UBA - Matematica",
    initial: "T",
    color: "lp-tcard__avatar--orange",
    stars: 5,
    text: "Lo uso para repasar antes de los examenes con las flashcards. Es increible como genera preguntas exactas de lo que estudie. Una herramienta que no sabia que necesitaba.",
  },
  {
    name: "Lucia F.",
    role: "Profesorado de Matematica",
    initial: "L",
    color: "lp-tcard__avatar--green",
    stars: 5,
    text: "Los graficos 3D me ayudan a visualizar funciones de varias variables que antes costaba mucho entender solo con formulas. Muy recomendable.",
  },
  {
    name: "Agustin P.",
    role: "Ingenieria Civil, 3er año",
    initial: "A",
    color: "lp-tcard__avatar--blue",
    stars: 5,
    text: "Resolvi integrales dobles y triples que en clase me parecian imposibles. Las explicaciones son claras y en español. Vale cada peso del plan Plus.",
  },
  {
    name: "Camila S.",
    role: "Contador Publico, UBA",
    initial: "C",
    color: "lp-tcard__avatar--pink",
    stars: 5,
    text: "Lo uso para estadistica y probabilidad. Puedo pegarle foto al enunciado y me lo resuelve al instante con explicacion. Me ahorro horas de tutorias.",
  },
  {
    name: "Mateo G.",
    role: "Preparatorio universitario",
    initial: "M",
    color: "lp-tcard__avatar--teal",
    stars: 5,
    text: "Entre sin base de matematica y con MathAPS pude ponerme al dia antes de empezar la facultad. Las carpetas me ayudan a organizar todo por tema.",
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) return null;

  function handleLoginSuccess() {
    setIsAuthenticated(true);
    setShowLogin(false);
  }

  function handleLogout() {
    removeToken();
    setIsAuthenticated(false);
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Header
          isAuthenticated={isAuthenticated}
          onLogin={() => setShowLogin(true)}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {showLogin && !isAuthenticated && (
          <div className="auth-overlay" onClick={() => setShowLogin(false)}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button className="auth-close" onClick={() => setShowLogin(false)}>x</button>
              <Login onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/chat" replace /> : <LandingPage onLogin={() => setShowLogin(true)} />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/chat" element={isAuthenticated ? <ChatView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} /> : <Navigate to="/" replace />} />
          <Route path="/study" element={isAuthenticated ? <StudyHub /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId" element={isAuthenticated ? <FolderChatView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId/flashcards" element={isAuthenticated ? <Flashcards /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId/dev-questions" element={isAuthenticated ? <DevQuestions /> : <Navigate to="/" replace />} />
          <Route path="/plans" element={isAuthenticated ? <PlansPage /> : <Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={isAuthenticated ? <AccountPage onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// ===== TESTIMONIOS CAROUSEL =====
function TestimonialsSection() {
  const total = TESTIMONIALS.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  function next() {
    setCurrent((c) => (c + 1) % total);
  }
  function prev() {
    setCurrent((c) => (c - 1 + total) % total);
  }

  useEffect(() => {
    if (paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(next, 3500);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  // Duplicamos para efecto loop visual
  const items = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="lp-section lp-testimonials" id="testimonios">
      <div className="lp-section__inner">
        <div className="lp-section__label">Testimonios</div>
        <h2 className="lp-section__title" style={{ textAlign: "center" }}>
          Lo que dicen nuestros estudiantes
        </h2>

        <div className="lp-testimonials__rating">
          <span className="lp-testimonials__rating-score">4.9</span>
          <div className="lp-testimonials__rating-right">
            <div className="lp-testimonials__rating-stars">
              {[0,1,2,3,4].map((i) => (
                <span key={i} style={{ color: "#f59e0b", fontSize: "20px" }}>&#9733;</span>
              ))}
            </div>
            <span className="lp-testimonials__rating-count">Basado en +500 estudiantes</span>
          </div>
        </div>

        {/* Slider */}
        <div
          className="lp-tslider"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button className="lp-tslider__arrow lp-tslider__arrow--left" onClick={prev} aria-label="Anterior">
            &#8249;
          </button>

          <div className="lp-tslider__viewport">
            <div
              className="lp-tslider__track"
              style={{ transform: `translateX(calc(-${(current + total) * (100 / 3)}%))` }}
            >
              {items.map((t, idx) => (
                <div key={idx} className="lp-tslider__item">
                  <div className="lp-tcard">
                    <span className="lp-tcard__quote-icon">&#8220;</span>
                    <div className="lp-tcard__stars">
                      {[0,1,2,3,4].map((i) => (
                        <span key={i} style={{ color: "#f59e0b", fontSize: "15px" }}>&#9733;</span>
                      ))}
                    </div>
                    <p className="lp-tcard__text">{t.text}</p>
                    <div className="lp-tcard__footer">
                      <div className={"lp-tcard__avatar " + t.color}>{t.initial}</div>
                      <div className="lp-tcard__info">
                        <span className="lp-tcard__name">{t.name}</span>
                        <span className="lp-tcard__role">{t.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="lp-tslider__arrow lp-tslider__arrow--right" onClick={next} aria-label="Siguiente">
            &#8250;
          </button>
        </div>

        {/* Dots */}
        <div className="lp-tslider__dots">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              className={"lp-tslider__dot" + (i === current ? " active" : "")}
              onClick={() => setCurrent(i)}
              aria-label={"Testimonio " + (i + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== LANDING PAGE =====
function LandingPage({ onLogin }) {
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="landing">

      {/* HERO */}
      <section className="lp-hero" id="top">
        <div className="lp-hero__bg">
          <div className="lp-hero__orb lp-hero__orb--1" />
          <div className="lp-hero__orb lp-hero__orb--2" />
          <div className="lp-hero__orb lp-hero__orb--3" />
          <div className="lp-hero__grid" />
        </div>
        <div className="lp-hero__content">
          <div className="lp-hero__badge">
            <span className="lp-hero__badge-dot" />
            IA especializada en matematicas
          </div>
          <h1 className="lp-hero__title">
            Resolve cualquier
            <span className="lp-hero__title-accent"> problema matematico</span>
            {" "}con IA paso a paso
          </h1>
          <p className="lp-hero__subtitle">
            MathAPS analiza tu ejercicio, lo resuelve con explicaciones claras
            y te ayuda a entender el razonamiento. Para secundaria, CBC, UTN y facultad.
          </p>
          <div className="lp-hero__actions">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLogin}>
              Empezar gratis
              <span className="lp-btn__arrow">&#8594;</span>
            </button>
            <button className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => scrollToId("demo")}>
              Ver demo
            </button>
          </div>
          <div className="lp-hero__social-proof">
            <div className="lp-hero__avatars">
              {["E","M","A","L"].map(l => (
                <div key={l} className="lp-hero__avatar">{l}</div>
              ))}
            </div>
            <p className="lp-hero__proof-text">
              Mas de <strong>500 estudiantes</strong> ya resuelven sus parciales con MathAPS
            </p>
          </div>
        </div>
        <div className="lp-hero__demo-wrap" id="demo">
          <div className="lp-hero__demo-card">
            <div className="lp-hero__demo-header">
              <div className="lp-hero__demo-dots"><span /><span /><span /></div>
              <span className="lp-hero__demo-label">MathAPS - Demo</span>
            </div>
            <div className="lp-hero__demo-body">
              <CalculatorDemo onLogin={onLogin} />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-section__inner">
          <div className="lp-section__label">Funcionalidades</div>
          <h2 className="lp-section__title">Todo lo que necesitas para estudiar mejor</h2>
          <p className="lp-section__subtitle">
            Mas que un solver: una plataforma completa para entender, practicar y organizarte.
          </p>
          <div className="lp-features__grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-section__inner">
          <div className="lp-section__label">Como funciona</div>
          <h2 className="lp-section__title">De ejercicio a comprension en segundos</h2>
          <div className="lp-how__steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="lp-step">
                <div className="lp-step__left">
                  <div className="lp-step__num">{s.num}</div>
                  {i < STEPS.length - 1 && <div className="lp-step__line" />}
                </div>
                <div className="lp-step__body">
                  <h3 className="lp-step__title">{s.title}</h3>
                  <p className="lp-step__desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="lp-section lp-plans" id="plans">
        <div className="lp-section__inner">
          <div className="lp-section__label">Planes</div>
          <h2 className="lp-section__title">Elegi tu plan</h2>
          <p className="lp-section__subtitle">
            Empieza gratis. Actualiza cuando necesites mas potencia para tus parciales o finales.
          </p>
          <div className="plans-grid">
            {PLANS.map((p) => (
              <article key={p.id} className={"plan-card " + (p.id !== "free" ? "plan-card--premium" : "")}>
                <header className="plan-head">
                  {p.badge && <div className="plan-badge">{p.badge}</div>}
                  <h3 className="plan-name">{p.name}</h3>
                  <p className="plan-price">
                    <span className="plan-currency">$</span>{p.price}
                    <span className="plan-period">{p.period}</span>
                  </p>
                  <p className="plan-desc">{p.desc}</p>
                </header>
                <ul className="plan-features">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <div className="plan-footer">
                  <button className={p.buttonClass} type="button" onClick={onLogin}>{p.buttonText}</button>
                  <p className="plan-footnote">{p.footnote}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <TestimonialsSection />

      {/* CTA FINAL */}
      <section className="lp-section lp-cta">
        <div className="lp-cta__inner">
          <div className="lp-cta__orb" />
          <div className="lp-section__label">Empieza hoy</div>
          <h2 className="lp-cta__title">
            Tu proximo parcial,{" "}
            <span className="lp-hero__title-accent">resuelto</span>
          </h2>
          <p className="lp-cta__subtitle">
            Unite a los estudiantes que ya usan MathAPS para estudiar mejor y perder menos tiempo.
          </p>
          <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLogin}>
            Crear cuenta gratis
            <span className="lp-btn__arrow">&#8594;</span>
          </button>
          <p className="lp-cta__note">Sin tarjeta de credito - Empieza al instante</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <span className="lp-footer__brand-name">MathAPS</span>
            <span className="lp-footer__brand-tagline">Math Advanced Problem Solver</span>
          </div>
          <div className="lp-footer__links">
            <a href="/terms" className="lp-footer__link">Terminos</a>
            <a href="/privacy" className="lp-footer__link">Privacidad</a>
            <a href="mailto:support@mathaps.com" className="lp-footer__link">Contacto</a>
          </div>
          <p className="lp-footer__copy">© 2026 MathAPS. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

// ===== CALCULATOR DEMO =====
function CalculatorDemo({ onLogin }) {
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [plotSpec, setPlotSpec] = useState(null);
  const fileInputRef = useRef(null);

  const EXAMPLES = [
    "Deriva f(x) = x3 - 2x + 1",
    "Resolve: 2x2 + 5x - 3 = 0",
    "Integra sen(x)cos(x) dx",
  ];

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let found = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { found = true; setImageFile(file); }
      }
    }
    if (found) e.preventDefault();
  }

  async function handleSolve() {
    if (!problemText.trim()) return;
    setIsLoading(true); setErrorMsg(""); setAnswerText(""); setPlotSpec(null);
    try {
      const formData = new FormData();
      formData.append("problem", problemText);
      if (imageFile) formData.append("image", imageFile);
      const res = await fetch("https://api.mathaps.online/math/guest", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error " + res.status);
      const data = await res.json();
      setAnswerText(data?.answerText || "");
      setPlotSpec(data?.plotSpec || null);
      setProblemText(""); setImageFile(null);
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  const plotResult = plotSpec ? interpretPlot(plotSpec) : { model: null, error: "" };

  return (
    <div className="calc-demo">
      {!answerText && !isLoading && (
        <div className="calc-demo__examples">
          <p className="calc-demo__examples-label">Proba un ejemplo:</p>
          <div className="calc-demo__chips">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="calc-demo__chip" onClick={() => setProblemText(ex)} type="button">{ex}</button>
            ))}
          </div>
        </div>
      )}
      <div className="calc-demo__input-wrap">
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSolve(); } }}
          rows={3}
          placeholder="Escribi tu problema o pega una imagen (Ctrl+V)..."
          disabled={isLoading}
          className="calc-demo__textarea"
        />
        <div className="calc-demo__actions">
          <button type="button" className="calc-demo__attach" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Adjuntar imagen">
            &#128206;
          </button>
          {imageFile && (
            <span className="calc-demo__file-badge">
              &#128247; {imageFile.name}
              <button type="button" onClick={() => setImageFile(null)}>x</button>
            </span>
          )}
          <button className="lp-btn lp-btn--primary calc-demo__send" onClick={handleSolve} disabled={isLoading || !problemText.trim()} type="button">
            {isLoading ? <span className="calc-demo__spinner" /> : "Resolver →;"}
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      {errorMsg && <p className="calc-demo__error">{errorMsg}</p>}
      {isLoading && (
        <div className="calc-demo__loading">
          <div className="calc-demo__loading-bar" />
          <p>Analizando el problema...</p>
        </div>
      )}
      {answerText && (
        <div className="calc-demo__answer">
          <div className="calc-demo__answer-header">
            <span className="calc-demo__answer-badge">&#10003; Resuelto</span>
          </div>
          <div className="calc-demo__answer-body">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeMath(answerText)}
            </ReactMarkdown>
          </div>
          {plotResult.model && (
            <Plot
              data={plotResult.model.data}
              layout={{ ...plotResult.model.layout, autosize: true, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(18,18,26,0.6)", font: { color: "#e0e0e0" } }}
              useResizeHandler
              style={{ width: "100%", marginTop: "12px" }}
              config={{ responsive: true, displayModeBar: false }}
            />
          )}
          {onLogin && (
            <div className="calc-demo__upsell">
              <p>&#128161; <strong>Inicia sesion</strong> para guardar historial, crear carpetas y generar flashcards</p>
              <button className="lp-btn lp-btn--primary" onClick={onLogin} type="button">Crear cuenta gratis &#8594;</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
