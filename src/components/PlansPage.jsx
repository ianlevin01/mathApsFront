import { useNavigate } from "react-router-dom";
import { getToken } from "../auth";
import "../styles/plans.css";

const API_BASE = "https://api.mathaps.online";

const PLANS = [
  {
    id: "free",
    badge: null,
    trialBadge: null,
    name: "Free",
    price: "0",
    period: "/mes",
    desc: "Para probar la plataforma y resolver problemas básicos.",
    features: [
      "Hasta 30 mensajes con IA por día",
      "Hasta 8 mensajes con imágenes por día",
      "Gráficos ilimitados",
      "Hasta 3 carpetas para organizar materias",
      "Hasta 5 ejercicios de práctica diarios",
      "Hasta 3 archivos de contenido por carpeta",
      "Modelo matemático mth-mini",
      "Seguimiento de avance por materia",
    ],
    buttonText: "Plan actual",
    buttonClass: "plans-page-btn plans-page-btn--ghost",
  },
  {
    id: "plus",
    badge: "Recomendado",
    trialBadge: "3 días gratis",
    name: "Plus",
    price: "5.99",
    period: "/mes",
    desc: "Organización académica, modelos avanzados y seguimiento de progreso en una sola plataforma.",
    features: [
      "Hasta 60 mensajes con IA por día",
      "Hasta 20 mensajes con imágenes por día",
      "Gráficos ilimitados",
      "Hasta 6 carpetas para organizar materias",
      "Hasta 15 ejercicios de práctica diarios",
      "Hasta 5 archivos de contenido por carpeta",
      "Modelos matemáticos avanzados",
      "Seguimiento de avance por materia",
    ],
    buttonText: "Empezar prueba gratis",
    buttonClass: "plans-page-btn plans-page-btn--primary",
  },
  {
    id: "pro",
    badge: "Más completo",
    trialBadge: null,
    name: "Pro",
    price: "14.99",
    period: "/mes",
    desc: "Capacidades extendidas y herramientas diseñadas para optimizar el estudio a nivel superior.",
    features: [
      "Hasta 150 mensajes con IA por día",
      "Hasta 40 mensajes con imágenes por día",
      "Gráficos ilimitados",
      "Carpetas ilimitadas para organizar materias",
      "Hasta 40 ejercicios de práctica diarios",
      "Hasta 10 archivos de contenido por carpeta",
      "Modelos matemáticos más avanzados",
      "Seguimiento de avance por materia",
    ],
    buttonText: "Pasar a Pro",
    buttonClass: "plans-page-btn plans-page-btn--primary",
  },
];

export default function PlansPage() {
  const navigate = useNavigate();

  async function handleCheckout(planId) {
    if (planId === "free") return;

    try {
      const token = getToken();

      if (!token) {
        alert("Debes iniciar sesión");
        return;
      }

      const response = await fetch(`${API_BASE}/webhook/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert("Error iniciando checkout");
        return;
      }

      const popupUrl = data.checkoutUrl.includes("?")
        ? `${data.checkoutUrl}&embed=1`
        : `${data.checkoutUrl}?embed=1`;

      const popup = window.open(
        popupUrl,
        "_blank",
        "width=480,height=720,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        window.location.href = data.checkoutUrl;
        return;
      }

      navigate("/account?section=billing");

    } catch (error) {
      console.error(error);
      alert("Error conectando con el servidor");
    }
  }

  return (
    <div className="plans-page">
      {/* Header */}
      <div className="plans-page-header">
        <button className="plans-page-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <div className="plans-page-heading">
          <h1 className="plans-page-title">
            Elegí tu <span className="shine-platinum">plan</span>
          </h1>
          <p className="plans-page-subtitle">
            Desbloqueá todo el potencial de MathAPS según tu ritmo de estudio
          </p>
        </div>
      </div>

      {/* Highlight */}
      <div className="plans-page-highlight">
        <span className="plans-highlight-icon">⚡</span>
        <span>
          Los planes Premium incluyen acceso a modelos matemáticos más potentes y sin límites de organización
        </span>
      </div>

      {/* Cards */}
      <div className="plans-page-grid">
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`plans-page-card ${
              p.id !== "free" ? "plans-page-card--premium" : ""
            } ${p.id === "plus" ? "plans-page-card--featured" : ""}`}
          >
            {/* Badges superiores */}
            <div className="plans-page-badges">
              {p.badge && <div className="plans-page-badge">{p.badge}</div>}
              {p.trialBadge && (
                <div className="plans-page-trial-badge">🎁 {p.trialBadge}</div>
              )}
            </div>

            <header className="plans-page-card-head">
              <h3 className="plans-page-name">{p.name}</h3>
              <p className="plans-page-price">
                <span className="plans-page-currency">$</span>
                {p.price}
                <span className="plans-page-period">{p.period}</span>
              </p>
              <p className="plans-page-desc">{p.desc}</p>
            </header>

            <ul className="plans-page-features">
              {p.features.map((f) => (
                <li key={f}>
                  <span className="plans-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="plans-page-footer">
              <button
                className={p.buttonClass}
                type="button"
                onClick={() => handleCheckout(p.id)}
                disabled={p.id === "free"}
              >
                {p.buttonText}
              </button>
              <p className="plans-page-footnote">
                {p.id === "free"
                  ? "Sin tarjeta • Acceso inmediato"
                  : p.id === "plus"
                  ? "3 días gratis • Sin tarjeta requerida"
                  : "Cancelás cuando quieras"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
