import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Header from "./components/Header";
import Login from "./auth.jsx";
import Dashboard from "./components/Dashboard";
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

import "./App.css";
import "./styles/dashboard.css";
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
    desc: "Para probar la plataforma y resolver problemas básicos.",
    features: [
      "Hasta 150 mensajes con IA por mes",
      "Gráficos limitados",
      "Hasta 3 carpetas",
      "Flashcards básicas",
      "Exportación simple",
    ],
    buttonText: "Empezar gratis",
    buttonClass: "plan-button plan-button--ghost",
    footnote: "Sin tarjeta • Acceso inmediato",
  },
  {
    id: "plus",
    badge: "Recomendado",
    name: "Plus",
    price: "4.99",
    period: "/mes",
    desc: "Resolución de ejercicios, organización académica y métodos de estudio en una sola plataforma.",
    features: [
      "Carpetas ilimitadas para organizar materias",
      "Hasta 500 mensajes con IA por mes",
      "Flashcards ilimitadas",
      "Modelos matemáticos avanzados",
      "Seguimiento de progreso por materia",
      "Exportación de exámenes en PDF",
    ],
    buttonText: "Pasar a Plus",
    buttonClass: "plan-button plan-button--primary",
    footnote: "Cancelás cuando quieras • Soporte prioritario",
  },
  {
    id: "pro",
    badge: "Más completo",
    name: "Pro",
    price: "9.99",
    period: "/mes",
    desc: "Capacidades extendidas y herramientas avanzadas para optimizar tu estudio al máximo.",
    features: [
      "Hasta 2000 mensajes con IA por mes",
      "Prioridad de procesamiento",
      "Acceso a los mejores modelos matemáticos",
      "Resúmenes automáticos por carpeta",
      "Estadísticas avanzadas de progreso",
      "Acceso anticipado a nuevas funcionalidades",
    ],
    buttonText: "Pasar a Pro",
    buttonClass: "plan-button plan-button--primary",
    footnote: "Cancelás cuando quieras • Soporte premium 24/7",
  },
];

const FEATURES = [
  {
    icon: "🧮",
    title: "Resolución paso a paso",
    desc: "La IA desglosa cada problema en pasos claros y explicados. Aprendés el razonamiento, no solo la respuesta.",
  },
  {
    icon: "📊",
    title: "Graficador 2D y 3D",
    desc: "Visualizá funciones, superficies y puntos críticos en tiempo real. Ideal para cálculo, álgebra y geometría.",
  },
  {
    icon: "🗂️",
    title: "Organizá por materia",
    desc: "Creá carpetas por materia o parcial. Todos tus chats y apuntes en un solo lugar, siempre accesibles.",
  },
  {
    icon: "🧠",
    title: "Flashcards automáticas",
    desc: "Generá tarjetas de repaso desde tus conversaciones. Repasá conceptos clave antes del examen.",
  },
  {
    icon: "📷",
    title: "Resolvé desde imagen",
    desc: "Sacale foto al enunciado o pegá una imagen. La IA reconoce el problema y lo resuelve al instante.",
  },
  {
    icon: "📄",
    title: "Exportá tu contenido",
    desc: "Descargá resoluciones y resúmenes en PDF. Perfectos para llevar a la facu o compartir.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Escribí o pegá tu problema",
    desc: "Texto, fórmula o foto de un enunciado. MathAPS lo entiende todo.",
  },
  {
    num: "02",
    title: "La IA lo analiza y resuelve",
    desc: "Paso a paso, con explicaciones en lenguaje natural y notación matemática precisa.",
  },
  {
    num: "03",
    title: "Entendés y avanzás",
    desc: "Preguntá más, generá flashcards y organizá todo por materia para el parcial.",
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

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
        />

        {showLogin && !isAuthenticated && (
          <div className="auth-overlay" onClick={() => setShowLogin(false)}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button className="auth-close" onClick={() => setShowLogin(false)}>✕</button>
              <Login onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated
                ? <Navigate to="/dashboard" replace />
                : <LandingPage onLogin={() => setShowLogin(true)} />
            }
          />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="/chat" element={isAuthenticated ? <ChatView /> : <Navigate to="/" replace />} />
          <Route path="/study" element={isAuthenticated ? <StudyHub /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId" element={isAuthenticated ? <FolderChatView /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId/flashcards" element={isAuthenticated ? <Flashcards /> : <Navigate to="/" replace />} />
          <Route path="/folder/:folderId/dev-questions" element={isAuthenticated ? <DevQuestions /> : <Navigate to="/" replace />} />
          <Route path="/plans" element={isAuthenticated ? <PlansPage /> : <Navigate to="/" replace />} />
          <Route path="/account" element={isAuthenticated ? <AccountPage onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
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

      {/* ── HERO ── */}
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
            IA especializada en matemáticas
          </div>

          <h1 className="lp-hero__title">
            Resolvé cualquier
            <span className="lp-hero__title-accent"> problema matemático</span>
            {" "}con IA paso a paso
          </h1>

          <p className="lp-hero__subtitle">
            MathAPS analiza tu ejercicio, lo resuelve con explicaciones claras
            y te ayuda a entender el razonamiento. Para secundaria, CBC, UTN y facultad.
          </p>

          <div className="lp-hero__actions">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLogin}>
              Empezar gratis
              <span className="lp-btn__arrow">→</span>
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
              Más de <strong>500 estudiantes</strong> ya resuelven sus parciales con MathAPS
            </p>
          </div>
        </div>

        <div className="lp-hero__demo-wrap" id="demo">
          <div className="lp-hero__demo-card">
            <div className="lp-hero__demo-header">
              <div className="lp-hero__demo-dots">
                <span /><span /><span />
              </div>
              <span className="lp-hero__demo-label">MathAPS · Demo</span>
            </div>
            <div className="lp-hero__demo-body">
              <CalculatorDemo onLogin={onLogin} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-section__inner">
          <div className="lp-section__label">Funcionalidades</div>
          <h2 className="lp-section__title">Todo lo que necesitás para estudiar mejor</h2>
          <p className="lp-section__subtitle">
            Más que un solver: una plataforma completa para entender, practicar y organizarte.
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

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-section__inner">
          <div className="lp-section__label">Cómo funciona</div>
          <h2 className="lp-section__title">De ejercicio a comprensión en segundos</h2>
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

      {/* ── PLANS ── */}
      <section className="lp-section lp-plans" id="plans">
        <div className="lp-section__inner">
          <div className="lp-section__label">Planes</div>
          <h2 className="lp-section__title">Elegí tu plan</h2>
          <p className="lp-section__subtitle">
            Empezá gratis. Actualizá cuando necesites más potencia para tus parciales o finales.
          </p>
          <div className="plans-grid">
            {PLANS.map((p) => (
              <article key={p.id} className={`plan-card ${p.id !== "free" ? "plan-card--premium" : ""}`}>
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

      {/* ── CTA FINAL ── */}
      <section className="lp-section lp-cta">
        <div className="lp-cta__inner">
          <div className="lp-cta__orb" />
          <div className="lp-section__label">Empezá hoy</div>
          <h2 className="lp-cta__title">
            Tu próximo parcial,{" "}
            <span className="lp-hero__title-accent">resuelto</span>
          </h2>
          <p className="lp-cta__subtitle">
            Unite a los estudiantes que ya usan MathAPS para estudiar mejor y perder menos tiempo.
          </p>
          <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLogin}>
            Crear cuenta gratis
            <span className="lp-btn__arrow">→</span>
          </button>
          <p className="lp-cta__note">Sin tarjeta de crédito • Empezás al instante</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <span className="lp-footer__brand-name">MathAPS</span>
            <span className="lp-footer__brand-tagline">Math Advanced Problem Solver</span>
          </div>
          <div className="lp-footer__links">
            <a href="/terms" className="lp-footer__link">Términos</a>
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
    "Derivá f(x) = x³ - 2x + 1",
    "Resolvé: 2x² + 5x - 3 = 0",
    "Integrá sen(x)·cos(x) dx",
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
    setIsLoading(true);
    setErrorMsg("");
    setAnswerText("");
    setPlotSpec(null);
    try {
      const formData = new FormData();
      formData.append("problem", problemText);
      if (imageFile) formData.append("image", imageFile);
      const res = await fetch("https://api.mathaps.online/math/guest", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setAnswerText(data?.answerText || "");
      setPlotSpec(data?.plotSpec || null);
      setProblemText("");
      setImageFile(null);
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
          <p className="calc-demo__examples-label">Probá un ejemplo:</p>
          <div className="calc-demo__chips">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="calc-demo__chip" onClick={() => setProblemText(ex)} type="button">
                {ex}
              </button>
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
          placeholder="Escribí tu problema o pegá una imagen (Ctrl+V)…"
          disabled={isLoading}
          className="calc-demo__textarea"
        />
        <div className="calc-demo__actions">
          <button type="button" className="calc-demo__attach" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Adjuntar imagen">
            📎
          </button>
          {imageFile && (
            <span className="calc-demo__file-badge">
              📷 {imageFile.name}
              <button type="button" onClick={() => setImageFile(null)}>✕</button>
            </span>
          )}
          <button className="lp-btn lp-btn--primary calc-demo__send" onClick={handleSolve} disabled={isLoading || !problemText.trim()} type="button">
            {isLoading ? <span className="calc-demo__spinner" /> : "Resolver →"}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />

      {errorMsg && <p className="calc-demo__error">{errorMsg}</p>}

      {isLoading && (
        <div className="calc-demo__loading">
          <div className="calc-demo__loading-bar" />
          <p>Analizando el problema…</p>
        </div>
      )}

      {answerText && (
        <div className="calc-demo__answer">
          <div className="calc-demo__answer-header">
            <span className="calc-demo__answer-badge">✓ Resuelto</span>
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
              <p>💡 <strong>Iniciá sesión</strong> para guardar historial, crear carpetas y generar flashcards</p>
              <button className="lp-btn lp-btn--primary" onClick={onLogin} type="button">Crear cuenta gratis →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}