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
import DevQuestions from "./components/DevQuestions"; // ← NUEVO
import AccountPage from "./components/AccountPage";
import PlansPage from "./components/PlansPage";
import { getToken, removeToken } from "./auth.js";
import { normalizeMath } from "./utils/mathUtils";
import { interpretPlot } from "./utils/plotInterpreter";
import VerifyEmail from "./components/VerifyEmail";

// ⚠️ ORDEN IMPORTANTE: App.css y los específicos ANTES de index.css
// para que index.css no pise los estilos de componente
import "./App.css";
import "./styles/dashboard.css";
import "./styles/chat.css";
import "./styles/study.css";
import "./styles/plans.css";
import "./styles/chat_additions.css";
import "./index.css";          // ← movido al final
import "katex/dist/katex.min.css";

const DEVELOPERS = [
  {
    name: "Lucas Giarratana",
    role: "Frontend / UI",
    email: "lucas@email.com",
    githubLabel: "@lucas",
    githubUrl: "#",
    linkedinLabel: "/in/lucas",
    linkedinUrl: "#",
    image: `${import.meta.env.BASE_URL}GIARRA.jpg`,
  },
  {
    name: "Ian Levin",
    role: "Backend",
    email: "ian@email.com",
    githubLabel: "@ian",
    githubUrl: "#",
    linkedinLabel: "/in/ian",
    linkedinUrl: "#",
    image: `${import.meta.env.BASE_URL}IANLEVIN.jpg`,
  },
  {
    name: "IA Levin",
    role: "AI / Automation",
    email: "ialevi@email.com",
    githubLabel: "@ialevin",
    githubUrl: "#",
    linkedinLabel: "/in/ialevi",
    linkedinUrl: "#",
    image: `${import.meta.env.BASE_URL}IALEVIN.jpg`,
  },
];

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
      "Graficos limitados",
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
    desc: "Una solución integral que combina resolución de ejercicios, organización académica y generación automática de métodos de estudio en una única plataforma.",
    features: [
      "Carpetas ilimitadas para organizar materias y contenidos",
      "Hasta 500 mensajes con IA por mes",
      "Flashcards ilimitadas",
      "Modelos matemáticos más avanzados",
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
    desc: "Incluye capacidades extendidas, análisis avanzado y herramientas diseñadas para optimizar el estudio a un nivel superior.",
    features: [
      "Hasta 2000 mensajes con IA por mes",
      "Prioridad de procesamiento",
      "Acceso a los mejores modelos matemáticos",
      "Generación automática de resúmenes por carpeta",
      "Estadísticas avanzadas de progreso",
      "Acceso anticipado a nuevas funcionalidades",
    ],
    buttonText: "Pasar a Pro",
    buttonClass: "plan-button plan-button--primary",
    footnote: "Cancelás cuando quieras • Soporte premium 24/7",
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
          {/* Pública */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage onLogin={() => setShowLogin(true)} />
            }
          />

          {/* Legales - públicas */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protegidas */}
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/" replace />}
          />

          <Route
            path="/chat"
            element={isAuthenticated ? <ChatView /> : <Navigate to="/" replace />}
          />

          <Route
            path="/study"
            element={isAuthenticated ? <StudyHub /> : <Navigate to="/" replace />}
          />

          <Route
            path="/folder/:folderId"
            element={isAuthenticated ? <FolderChatView /> : <Navigate to="/" replace />}
          />

          <Route
            path="/folder/:folderId/flashcards"
            element={isAuthenticated ? <Flashcards /> : <Navigate to="/" replace />}
          />

          {/* ✅ NUEVA RUTA: Preguntas a desarrollo */}
          <Route
            path="/folder/:folderId/dev-questions"
            element={isAuthenticated ? <DevQuestions /> : <Navigate to="/" replace />}
          />

          <Route
            path="/plans"
            element={isAuthenticated ? <PlansPage /> : <Navigate to="/" replace />}
          />

          <Route path="/account" element={isAuthenticated ? <AccountPage onLogout={handleLogout} /> : <Navigate to="/" replace />} />

          {/* 404 */}
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
    <div className="page">
      <main className="main">
        <section className="calculator" id="top">
          <div className="hero">
            <div className="hero-left">
              <h1 className="hero-title">
                Resolvé ejercicios y <span className="shine-platinum">entendé el paso a paso</span>
              </h1>
              <p className="hero-subtitle">
                MathAPS (Math Advanced Problem Solver) te ayuda a resolver problemas,
                visualizar funciones y estudiar más rápido con explicaciones claras.
              </p>
              <div className="hero-badges">
                <span className="hero-badge">Paso a paso</span>
                <span className="hero-badge">Graficador 2D/3D</span>
                <span className="hero-badge">Export PDF/PNG</span>
                <span className="hero-badge">Ideal para parciales</span>
              </div>
              <ul className="hero-points">
                <li><strong>Para quién:</strong> estudiantes de secundaria, CBC/UTN, facultad y autodidactas.</li>
                <li><strong>Qué hace:</strong> resuelve, explica, y grafica (funciones, puntos, superficies).</li>
                <li><strong>Por qué usarlo:</strong> menos tiempo trabado, más tiempo practicando.</li>
              </ul>
              <div className="hero-cta">
                <button className="hero-btn hero-btn--primary" type="button" onClick={() => scrollToId("top")}>Probar ahora</button>
                <button className="hero-btn hero-btn--ghost" type="button" onClick={() => scrollToId("plans")}>Ver planes</button>
                <button className="hero-btn hero-btn--link" type="button" onClick={onLogin}>Desbloquear Premium</button>
              </div>
              <p className="hero-note">Tip: podés pegar el enunciado o adjuntar una imagen.</p>
            </div>
          </div>

          <div className="calculator-app">
            <CalculatorDemo />
          </div>
        </section>

        <section id="plans" className="section plans">
          <h2 className="section-title"><span className="shine-platinum">Planes</span></h2>
          <p className="section-subtitle">Elegí el plan según tu ritmo: práctica diaria gratis o Premium para parciales/finales.</p>
          <div className="plans-grid">
            {PLANS.map((p) => (
              <article key={p.id} className={`plan-card ${p.id === "plus" || p.id === "pro" ? "plan-card--premium" : ""}`}>
                <header className="plan-head">
                  {p.badge && <div className="plan-badge">{p.badge}</div>}
                  <h3 className="plan-name">{p.name}</h3>
                  <p className="plan-price">
                    <span className="plan-currency">$</span>{p.price}<span className="plan-period">{p.period}</span>
                  </p>
                  <p className="plan-desc">{p.desc}</p>
                </header>
                <ul className="plan-features">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <div className="plan-footer">
                  <button className={p.buttonClass} type="button" onClick={onLogin}>{p.buttonText}</button>
                  <p className="plan-footnote">{p.footnote}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="devs" className="section devs">
          <h2 className="section-title"><span className="shine-platinum">Desarrolladores</span></h2>
          <p className="section-subtitle">Equipo del proyecto — contacto directo para feedback, bugs o propuestas.</p>
          <div className="devs-grid">
            {DEVELOPERS.map((d) => (
              <article key={d.name} className="dev-card">
                <div className="dev-avatar"><img src={d.image} alt={`Avatar de ${d.name}`} /></div>
                <div className="dev-body">
                  <h3 className="dev-name">{d.name}</h3>
                  <p className="dev-role">{d.role}</p>
                  <ul className="dev-contact">
                    <li><span className="dev-label">Email:</span> <a className="dev-link" href={`mailto:${d.email}`}>{d.email}</a></li>
                    <li><span className="dev-label">GitHub:</span> <a className="dev-link" href={d.githubUrl} target="_blank" rel="noreferrer">{d.githubLabel}</a></li>
                    <li><span className="dev-label">LinkedIn:</span> <a className="dev-link" href={d.linkedinUrl} target="_blank" rel="noreferrer">{d.linkedinLabel}</a></li>
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div>
            <p className="footer-title">MathAPS</p>
            <p className="footer-text">Proyecto desarrollado por estudiantes — 2026</p>
          </div>
          <div className="footer-links">
            <a href="/terms" className="footer-link">Términos del Servicio</a>
            <span className="footer-divider"></span>
            <a href="/privacy" className="footer-link">Política de Privacidad</a>
            <span className="footer-divider"></span>
            <a href="mailto:support@mathaps.com" className="footer-link">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== CALCULATOR DEMO =====
function CalculatorDemo() {
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [plotSpec, setPlotSpec] = useState(null);
  const fileInputRef = useRef(null);

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageFound = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { imageFound = true; setImageFile(file); }
      }
    }
    if (imageFound) e.preventDefault();
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
      const res = await fetch("http://localhost:3000/math/guest", { method: "POST", body: formData });
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
    <>
      <h1>Math Web</h1>
      <textarea value={problemText} onChange={(e) => setProblemText(e.target.value)} onPaste={handlePaste} rows={4} placeholder="Escribí el problema o pegá una imagen (Ctrl+V)" disabled={isLoading} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>📎 Adjuntar</button>
        <button onClick={handleSolve} disabled={isLoading || !problemText.trim()}>{isLoading ? "Procesando..." : "Enviar"}</button>
        {imageFile && <span style={{ fontSize: "0.85rem", opacity: 0.85, display: "flex", gap: 8, alignItems: "center" }}>Imagen adjunta <button type="button" onClick={() => setImageFile(null)}>✕</button></span>}
      </div>
      {errorMsg && <p style={{ color: "red", marginTop: "0.5rem" }}>{errorMsg}</p>}
      {plotResult.error && <p style={{ color: "orange", marginTop: "0.5rem" }}>{plotResult.error}</p>}
      {answerText && (
        <div className="calc-answer-wrap" style={{ marginTop: "1rem" }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(answerText)}</ReactMarkdown>
        </div>
      )}
      {plotResult.model && <Plot data={plotResult.model.data} layout={plotResult.model.layout} useResizeHandler style={{ width: "100%", marginTop: "1rem" }} />}
      {answerText && <p style={{ marginTop: "1rem", fontSize: "13px", color: "rgba(255,255,255,0.65)", textAlign: "center" }}>💡 <strong>Iniciá sesión</strong> para guardar tu historial y usar funciones avanzadas</p>}
    </>
  );
}
