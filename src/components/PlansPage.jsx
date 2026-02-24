import { useNavigate } from "react-router-dom";
import "../styles/plans.css";

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
    buttonText: "Plan actual",
    buttonClass: "plans-page-btn plans-page-btn--ghost",
    footnote: "Sin tarjeta • Acceso inmediato",
    checkoutUrl: null,
  },
  {
    id: "plus",
    badge: "Recomendado",
    name: "Plus",
    price: "4.99",
    period: "/mes",
    desc: "Organización académica, modelos avanzados y seguimiento de progreso en una sola plataforma.",
    features: [
      "Carpetas ilimitadas para organizar materias",
      "Hasta 500 mensajes con IA por mes",
      "Flashcards ilimitadas",
      "Modelos matemáticos más avanzados",
      "Seguimiento de progreso por materia",
      "Exportación de exámenes en PDF",
    ],
    buttonText: "Pasar a Plus",
    buttonClass: "plans-page-btn plans-page-btn--primary",
    footnote: "Cancelás cuando quieras • Soporte prioritario",
    checkoutUrl: "https://mathaps.lemonsqueezy.com/checkout/buy/3ee3dff9-23c1-4cb3-b46d-c496f4982136",
  },
  {
    id: "pro",
    badge: "Más completo",
    name: "Pro",
    price: "9.99",
    period: "/mes",
    desc: "Capacidades extendidas y herramientas diseñadas para optimizar el estudio a nivel superior.",
    features: [
      "Hasta 2000 mensajes con IA por mes",
      "Prioridad de procesamiento",
      "Acceso a los mejores modelos matemáticos",
      "Generación automática de resúmenes por carpeta",
      "Estadísticas avanzadas de progreso",
      "Acceso anticipado a nuevas funcionalidades",
    ],
    buttonText: "Pasar a Pro",
    buttonClass: "plans-page-btn plans-page-btn--primary",
    footnote: "Cancelás cuando quieras • Soporte premium 24/7",
    checkoutUrl: "https://mathaps.lemonsqueezy.com/checkout/buy/21b4f93f-85f8-4105-8c43-f18a484e0f54",
  },
];

function openLemonSqueezy(url) {
  if (!url) return;
  // Abrir como popup de Lemon Squeezy
  window.LemonSqueezy?.Setup({ eventHandler: () => {} });
  // Si LemonSqueezy JS está cargado, usar su método de overlay
  if (window.createLemonSqueezy) {
    window.createLemonSqueezy();
  }
  // Agregar ?embed=1 para popup overlay
  const popupUrl = url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
  window.open(popupUrl, "_blank", "width=480,height=720,scrollbars=yes,resizable=yes");
}

export default function PlansPage() {
  const navigate = useNavigate();

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

      {/* Comparison highlight */}
      <div className="plans-page-highlight">
        <span className="plans-highlight-icon">⚡</span>
        <span>Los planes Premium incluyen acceso a modelos matemáticos más potentes y sin límites de organización</span>
      </div>

      {/* Cards */}
      <div className="plans-page-grid">
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`plans-page-card ${p.id !== "free" ? "plans-page-card--premium" : ""} ${p.id === "plus" ? "plans-page-card--featured" : ""}`}
          >
            {p.badge && <div className="plans-page-badge">{p.badge}</div>}

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
                onClick={() => openLemonSqueezy(p.checkoutUrl)}
                disabled={!p.checkoutUrl}
              >
                {p.buttonText}
              </button>
              <p className="plans-page-footnote">{p.footnote}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
