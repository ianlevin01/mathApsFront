import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

const LIMIT_COPY = {
  messages: {
    icon: "💬",
    title: "Límite de mensajes alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste tus mensajes diarios del plan Free. Mejorá tu plan para seguir resolviendo problemas."
        : "Agotaste tus mensajes diarios. Mejorar al plan Pro te da hasta 150 mensajes por día.",
  },
  images: {
    icon: "📷",
    title: "Límite de imágenes alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste el límite de imágenes del plan Free. Mejorá tu plan para seguir adjuntando fotos."
        : "Agotaste el límite de imágenes de hoy. El plan Pro incluye hasta 40 imágenes por día.",
  },
  flashcards: {
    icon: "🧠",
    title: "Límite de ejercicios alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste los ejercicios diarios del plan Free. Mejorá tu plan para seguir practicando."
        : "Agotaste los ejercicios de hoy. El plan Pro incluye hasta 40 ejercicios por día.",
  },
  devquestions: {
    icon: "✍️",
    title: "Límite de ejercicios alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste los ejercicios diarios del plan Free. Mejorá tu plan para seguir practicando."
        : "Agotaste los ejercicios de hoy. El plan Pro incluye hasta 40 ejercicios por día.",
  },
  folders: {
    icon: "📁",
    title: "Límite de carpetas alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Tu plan Free permite hasta 3 carpetas. Mejorá tu plan para crear más."
        : "Tu plan Plus permite hasta 6 carpetas. Mejorar a Pro te da carpetas ilimitadas.",
  },
  files: {
    icon: "📎",
    title: "Límite de archivos alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Alcanzaste el límite de archivos por carpeta de tu plan. Mejorá tu plan para subir más."
        : "Alcanzaste el límite de archivos por carpeta. El plan Pro permite hasta 10 archivos.",
  },
};

const PLAN_NEXT = {
  free: { label: "Plus o Pro", price: "desde $5.99/mes" },
  plus: { label: "Pro",        price: "$14.99/mes"      },
  pro:  { label: null,         price: null               },
};

export default function PlanLimitModal({ type, plan = "free", onClose }) {
  const navigate = useNavigate();
  const copy = LIMIT_COPY[type] || LIMIT_COPY.messages;
  const next = PLAN_NEXT[plan] || PLAN_NEXT.free;

  return createPortal(
    <div className="plan-limit-overlay" onClick={onClose}>
      <div className="plan-limit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="plan-limit-close" onClick={onClose}>✕</button>

        <div className="plan-limit-icon">{copy.icon}</div>
        <h2 className="plan-limit-title">{copy.title}</h2>
        <p className="plan-limit-desc">{copy.desc(plan)}</p>

        {next.label && (
          <div className="plan-limit-upgrade-box">
            <div className="plan-limit-upgrade-box__glow" />
            <div className="plan-limit-upgrade-box__left">
              <span className="plan-limit-upgrade-box__icon">⚡</span>
              <div>
                <span className="plan-limit-upgrade-box__title">Plan {next.label}</span>
                <span className="plan-limit-upgrade-box__price">{next.price}</span>
              </div>
            </div>
            <span className="plan-limit-upgrade-box__arrow">→</span>
          </div>
        )}

        <div className="plan-limit-actions">
          {next.label && (
            <button
              className="plan-limit-btn plan-limit-btn--primary"
              onClick={() => { onClose(); navigate("/plans"); }}
            >
              Ver planes →
            </button>
          )}
          <button className="plan-limit-btn plan-limit-btn--ghost" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
